//! Lexicon keeps two JSON documents in the operating system's app-data folder:
//! `vocabulary.json` (the library) and `profile.json` (name, activity, streaks).
//! The format is byte-for-byte the one the web version wrote to `data/`.
//!
//! Every save is validated, written to a temporary file, flushed to disk, and only then
//! swapped into place, so a crash or power cut leaves either the old file or the new one,
//! never half of each. The previous version is kept beside it as `<name>.bak`.

use serde_json::Value;
use std::fs::{self, File};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

/// One stored document and the rules for accepting it.
pub struct Doc {
    pub file: &'static str,
    label: &'static str,
    fallback: &'static str,
    max_bytes: usize,
    validate: fn(&Value) -> bool,
}

pub const WORDS: Doc = Doc {
    file: "vocabulary.json",
    label: "vocabulary",
    fallback: "[]",
    max_bytes: 5_000_000,
    validate: is_words,
};

pub const PROFILE: Doc = Doc {
    file: "profile.json",
    label: "profile",
    fallback: r#"{"name":"","days":{}}"#,
    max_bytes: 1_000_000,
    validate: is_profile,
};

/// How many pre-restore snapshots to keep before the oldest is removed.
const KEEP_SNAPSHOTS: usize = 10;
const SNAPSHOT_DIR: &str = "snapshots";

pub struct Store {
    dir: PathBuf,
    /// Serialises disk access so two saves can never interleave.
    lock: Mutex<()>,
}

impl Store {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir, lock: Mutex::new(()) }
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }

    pub fn path(&self, doc: &Doc) -> PathBuf {
        self.dir.join(doc.file)
    }

    fn guard(&self) -> MutexGuard<'_, ()> {
        // A panic while holding the lock cannot leave a half-written file (writes are atomic),
        // so a poisoned lock is safe to keep using.
        self.lock.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    /// Returns the document's JSON text, or the empty default if it has never been saved.
    /// A damaged file is reported, never replaced: the app refuses to load rather than overwrite it.
    pub fn load(&self, doc: &Doc) -> Result<String, String> {
        let _guard = self.guard();
        let path = self.path(doc);
        match fs::read_to_string(&path) {
            Ok(text) => {
                serde_json::from_str::<Value>(&text).map_err(|e| {
                    format!(
                        "{} is damaged ({e}). Nothing was changed. The previous version is {}.bak in the same folder.",
                        path.display(),
                        doc.file
                    )
                })?;
                Ok(text)
            }
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(doc.fallback.to_owned()),
            Err(e) => Err(format!("Couldn't read {}: {e}", path.display())),
        }
    }

    /// Validates and atomically replaces the document.
    pub fn save(&self, doc: &Doc, json: &str) -> Result<(), String> {
        if json.len() > doc.max_bytes {
            return Err(format!("The {} is too large to save.", doc.label));
        }
        let value: Value = serde_json::from_str(json)
            .map_err(|e| format!("Refused to save the {}: not valid JSON ({e}).", doc.label))?;
        if !(doc.validate)(&value) {
            return Err(format!("Refused to save the {}: it isn't in the expected shape.", doc.label));
        }
        let mut text = serde_json::to_string_pretty(&value).map_err(|e| e.to_string())?;
        text.push('\n');

        let _guard = self.guard();
        fs::create_dir_all(&self.dir).map_err(|e| format!("Couldn't create {}: {e}", self.dir.display()))?;
        let path = self.path(doc);
        let tmp = path.with_extension("json.tmp");
        write_synced(&tmp, text.as_bytes()).map_err(|e| format!("Couldn't write {}: {e}", tmp.display()))?;
        if path.exists() {
            fs::copy(&path, path.with_extension("json.bak"))
                .map_err(|e| format!("Couldn't keep a backup of {}: {e}", path.display()))?;
        }
        replace(&tmp, &path).map_err(|e| format!("Couldn't save {}: {e}", path.display()))?;
        sync_dir(&self.dir);
        Ok(())
    }

    /// Copies both documents into `snapshots/<UTC time>/` and prunes old snapshots.
    /// Taken before a restore so replacing a library is always reversible.
    pub fn snapshot(&self, unix_seconds: u64) -> Result<PathBuf, String> {
        let _guard = self.guard();
        let root = self.dir.join(SNAPSHOT_DIR);
        let mut target = root.join(utc_stamp(unix_seconds));
        let mut n = 1;
        while target.exists() {
            n += 1;
            target = root.join(format!("{} ({n})", utc_stamp(unix_seconds)));
        }
        fs::create_dir_all(&target).map_err(|e| format!("Couldn't create {}: {e}", target.display()))?;
        for doc in [&WORDS, &PROFILE] {
            let source = self.path(doc);
            if source.exists() {
                fs::copy(&source, target.join(doc.file)).map_err(|e| format!("Couldn't copy {}: {e}", source.display()))?;
            }
        }
        prune(&root, KEEP_SNAPSHOTS);
        Ok(target)
    }
}

fn write_synced(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let mut file = File::create(path)?;
    file.write_all(bytes)?;
    file.sync_all()
}

/// Renames over the destination. On Windows a virus scanner or indexer can briefly hold the
/// file open, so a few short retries turn a rare failure into a short pause.
fn replace(from: &Path, to: &Path) -> std::io::Result<()> {
    let mut attempt = 0;
    loop {
        match fs::rename(from, to) {
            Err(e) if cfg!(windows) && e.kind() == ErrorKind::PermissionDenied && attempt < 5 => {
                attempt += 1;
                std::thread::sleep(std::time::Duration::from_millis(80));
            }
            result => return result,
        }
    }
}

/// Makes the rename itself durable on macOS and Linux. Windows has no directory handles to flush.
fn sync_dir(dir: &Path) {
    #[cfg(unix)]
    if let Ok(handle) = File::open(dir) {
        let _ = handle.sync_all();
    }
    #[cfg(not(unix))]
    let _ = dir;
}

fn prune(root: &Path, keep: usize) {
    let Ok(entries) = fs::read_dir(root) else { return };
    let mut names: Vec<PathBuf> = entries.flatten().map(|e| e.path()).filter(|p| p.is_dir()).collect();
    names.sort();
    let excess = names.len().saturating_sub(keep);
    for old in names.into_iter().take(excess) {
        let _ = fs::remove_dir_all(old);
    }
}

/// `2026-10-15 20-47-03 UTC`: sorts by time and is readable in Finder and File Explorer.
fn utc_stamp(unix_seconds: u64) -> String {
    let days = (unix_seconds / 86_400) as i64;
    let secs = unix_seconds % 86_400;
    // Howard Hinnant's days-to-civil algorithm.
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    format!(
        "{year:04}-{month:02}-{day:02} {:02}-{:02}-{:02} UTC",
        secs / 3_600,
        secs % 3_600 / 60,
        secs % 60
    )
}

// Validation mirrors the rules the web version's dev server enforced (vite.config.ts).

fn is_str(v: &Value, key: &str) -> bool {
    v.get(key).is_some_and(Value::is_string)
}

fn str_len_at_most(v: &Value, max: usize) -> bool {
    v.as_str().is_some_and(|s| s.encode_utf16().count() <= max)
}

fn is_count(v: &Value) -> bool {
    v.as_u64().is_some() || v.as_f64().is_some_and(|f| f >= 0.0 && f.fract() == 0.0)
}

fn is_day_key(key: &str) -> bool {
    let b = key.as_bytes();
    b.len() == 10
        && b.iter().enumerate().all(|(i, c)| if i == 4 || i == 7 { *c == b'-' } else { c.is_ascii_digit() })
}

pub fn is_words(value: &Value) -> bool {
    value.as_array().is_some_and(|words| {
        words.iter().all(|w| {
            w.is_object() && ["id", "term", "definition", "partOfSpeech", "example"].iter().all(|k| is_str(w, k))
        })
    })
}

pub fn is_profile(value: &Value) -> bool {
    let Some(p) = value.as_object() else { return false };
    let name_ok = p.get("name").is_some_and(|n| str_len_at_most(n, 80));
    let days_ok = p.get("days").and_then(Value::as_object).is_some_and(|days| {
        days.iter().all(|(day, log)| {
            is_day_key(day) && log.as_object().is_some_and(|counts| counts.values().all(is_count))
        })
    });
    let events_ok = match p.get("events") {
        None => true,
        Some(events) => events.as_array().is_some_and(|list| {
            list.len() <= 300
                && list.iter().all(|e| {
                    is_str(e, "at")
                        && matches!(e.get("kind").and_then(Value::as_str), Some("added" | "imported"))
                        && e.get("count").and_then(Value::as_u64).is_some_and(|c| c > 0)
                        && e.get("words").and_then(Value::as_array).is_some_and(|ws| {
                            ws.len() <= 50 && ws.iter().all(|w| str_len_at_most(w, 100))
                        })
                        && e.get("from").is_none_or(|f| str_len_at_most(f, 40))
                })
        }),
    };
    name_ok && days_ok && events_ok
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    fn temp_store() -> Store {
        static N: AtomicUsize = AtomicUsize::new(0);
        let dir = std::env::temp_dir().join(format!(
            "lexicon-test-{}-{}",
            std::process::id(),
            N.fetch_add(1, Ordering::SeqCst)
        ));
        let _ = fs::remove_dir_all(&dir);
        Store::new(dir)
    }

    const WORD: &str = r#"[{"id":"w1","term":"placid","definition":"Calm.","partOfSpeech":"Adjective","example":"","favorite":true}]"#;

    #[test]
    fn missing_documents_load_as_empty_defaults() {
        let store = temp_store();
        assert_eq!(store.load(&WORDS).unwrap(), "[]");
        assert_eq!(store.load(&PROFILE).unwrap(), r#"{"name":"","days":{}}"#);
    }

    #[test]
    fn saves_round_trip_in_the_web_versions_format() {
        let store = temp_store();
        store.save(&WORDS, WORD).unwrap();
        let text = store.load(&WORDS).unwrap();
        assert!(text.starts_with("[\n  {\n    \"id\": \"w1\""), "pretty-printed, key order kept: {text}");
        assert!(text.ends_with("]\n"));
        let back: Value = serde_json::from_str(&text).unwrap();
        assert_eq!(back, serde_json::from_str::<Value>(WORD).unwrap());
    }

    #[test]
    fn each_save_keeps_the_previous_version_and_leaves_no_temp_file() {
        let store = temp_store();
        store.save(&WORDS, "[]").unwrap();
        store.save(&WORDS, WORD).unwrap();
        let bak = fs::read_to_string(store.dir().join("vocabulary.json.bak")).unwrap();
        assert_eq!(bak, "[]\n");
        assert!(!store.dir().join("vocabulary.json.tmp").exists());
    }

    #[test]
    fn invalid_data_is_refused_and_nothing_changes() {
        let store = temp_store();
        store.save(&WORDS, WORD).unwrap();
        let before = store.load(&WORDS).unwrap();
        for bad in ["{", "{}", r#"[{"term":"x"}]"#, r#"[{"id":1,"term":"x","definition":"","partOfSpeech":"","example":""}]"#] {
            assert!(store.save(&WORDS, bad).is_err(), "accepted {bad}");
        }
        assert!(store.save(&WORDS, &format!("[\"{}\"]", "x".repeat(5_000_001))).is_err());
        assert_eq!(store.load(&WORDS).unwrap(), before);
    }

    #[test]
    fn a_damaged_file_is_reported_not_replaced() {
        let store = temp_store();
        fs::create_dir_all(store.dir()).unwrap();
        fs::write(store.path(&WORDS), "[{\"id\":").unwrap();
        let err = store.load(&WORDS).unwrap_err();
        assert!(err.contains("damaged") && err.contains("vocabulary.json.bak"), "{err}");
        assert_eq!(fs::read_to_string(store.path(&WORDS)).unwrap(), "[{\"id\":");
    }

    #[test]
    fn profile_rules_match_the_web_version() {
        let ok = |s: &str| is_profile(&serde_json::from_str(s).unwrap());
        assert!(ok(r#"{"name":"","days":{}}"#));
        assert!(ok(r#"{"name":"Teddy","days":{"2026-10-15":{"practiced":3,"tested":0}},"events":[{"at":"2026-10-15T12:00:00.000Z","kind":"imported","count":2,"words":["a","b"],"from":"Sam"}]}"#));
        assert!(!ok(r#"{"days":{}}"#));
        assert!(!ok(r#"{"name":"","days":{"15-10-2026":{}}}"#));
        assert!(!ok(r#"{"name":"","days":{"2026-10-15":{"practiced":-1}}}"#));
        assert!(!ok(r#"{"name":"","days":{"2026-10-15":{"practiced":1.5}}}"#));
        assert!(!ok(r#"{"name":"","days":{},"events":[{"at":"x","kind":"deleted","count":1,"words":[]}]}"#));
        assert!(!ok(&format!(r#"{{"name":"{}","days":{{}}}}"#, "n".repeat(81))));
    }

    #[test]
    fn snapshots_copy_both_documents_and_keep_only_the_newest() {
        let store = temp_store();
        store.save(&WORDS, WORD).unwrap();
        store.save(&PROFILE, r#"{"name":"T","days":{}}"#).unwrap();
        let first = store.snapshot(1_760_000_000).unwrap();
        assert!(first.ends_with("2025-10-09 08-53-20 UTC"), "{}", first.display());
        assert!(first.join("vocabulary.json").exists() && first.join("profile.json").exists());
        for i in 1..=KEEP_SNAPSHOTS as u64 + 2 {
            store.snapshot(1_760_000_000 + i * 60).unwrap();
        }
        let kept = fs::read_dir(store.dir().join(SNAPSHOT_DIR)).unwrap().count();
        assert_eq!(kept, KEEP_SNAPSHOTS);
        assert!(!first.exists(), "oldest snapshot pruned");
    }

    #[test]
    fn utc_stamps_handle_leap_years_and_epoch() {
        assert_eq!(utc_stamp(0), "1970-01-01 00-00-00 UTC");
        assert_eq!(utc_stamp(951_782_400), "2000-02-29 00-00-00 UTC");
        assert_eq!(utc_stamp(1_791_590_399), "2026-10-09 23-59-59 UTC");
    }
}
