"""End-to-end test of the real Lexicon binary (frontend embedded, no dev server), driven
through tauri-driver and WebKitWebDriver. Linux only, because macOS has no WKWebView driver.

  npx tauri build --debug --no-bundle
  cargo install tauri-driver --locked
  tauri-driver &            # needs WebKitWebDriver (Ubuntu: webkit2gtk-driver)
  python3 e2e/run.py        # under a display; in CI: xvfb-run

It replaces the app's data folder with e2e/fixtures, so don't run it on a machine whose
Lexicon library you care about.
"""
import json, os, shutil, subprocess, sys, time, datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.options import ArgOptions
from selenium.webdriver.remote.file_detector import UselessFileDetector

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.environ.get("LEXICON_APP", os.path.join(HERE, "..", "src-tauri", "target", "debug", "lexicon"))
DATA = os.path.expanduser("~/.local/share/io.github.teddyfitzsimons.lexicon")
SHOTS = os.environ.get("LEXICON_SHOTS", "/tmp/lexicon-e2e")
os.makedirs(SHOTS, exist_ok=True)
results = []

def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)

def session():
    opts = ArgOptions()
    opts.set_capability("browserName", "wry")
    opts.set_capability("tauri:options", {"application": APP})
    d = webdriver.Remote("http://127.0.0.1:4444", options=opts)
    d.set_window_size(1280, 840)
    d.file_detector = UselessFileDetector()  # pass local paths straight to WebKitWebDriver
    return d

def wait(d, css, t=15):
    return WebDriverWait(d, t).until(lambda x: x.find_element(By.CSS_SELECTOR, css))

def nav(d, label):
    for b in d.find_elements(By.CSS_SELECTOR, ".workspace-tabs button"):
        if label in b.text:
            b.click(); time.sleep(0.8); return
    raise RuntimeError("no nav " + label)

def disk(name):
    with open(os.path.join(DATA, name)) as f:
        return json.load(f)

shutil.rmtree(DATA, ignore_errors=True)
os.makedirs(DATA)
for name in ("vocabulary.json", "profile.json"):
    shutil.copy(os.path.join(HERE, "fixtures", name), DATA)
today = datetime.date.today().isoformat()

d = session()
try:
    wait(d, ".words-table")
    terms = [e.text for e in d.find_elements(By.CSS_SELECTOR, ".term-button")]
    check("launches without a dev server and loads the library from the app-data folder", len(terms) == 12, f"{len(terms)} words")
    check("no load error shown", not d.find_elements(By.CSS_SELECTOR, ".error"))
    url = d.current_url
    check("page served from Tauri's own protocol, not a server", url.startswith("tauri://") or "tauri.localhost" in url, url)
    bg = d.execute_script("return getComputedStyle(document.body).backgroundColor")
    check("stylesheets load under the CSP", bg == "rgb(244, 243, 236)", bg)
    fonts = d.execute_async_script("const done=arguments[0];document.fonts.ready.then(()=>done([...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.style)))")
    check("bundled Fraunces and DM Sans load offline", any("Fraunces" in f for f in fonts) and any("DM Sans" in f for f in fonts), ", ".join(sorted(set(fonts))))
    imgs = d.execute_script("return [...document.images].map(i=>[i.src.split('/').pop(),i.complete&&i.naturalWidth>0])")
    check("mascot and logo images load", imgs and all(ok for _, ok in imgs), str(imgs))
    d.save_screenshot(f"{SHOTS}/1-library.png")

    star = d.find_element(By.CSS_SELECTOR, "button[aria-label='Add laconic to favorites']")
    star.click()
    WebDriverWait(d, 8).until(lambda x: x.find_elements(By.CSS_SELECTOR, ".save-toast"))
    time.sleep(0.5)
    saved = {w["term"]: w for w in disk("vocabulary.json")}
    check("a change is written to vocabulary.json on disk", saved["laconic"]["favorite"] is True)
    check("the previous version is kept as vocabulary.json.bak", os.path.exists(os.path.join(DATA, "vocabulary.json.bak")))
    prof = disk("profile.json")
    check("activity for today is recorded in profile.json (streaks)", prof["days"].get(today, {}).get("edited") == 1, str(prof["days"].get(today)))

    for label, css, shot in [("Manage", ".ed-term, .ed-head", "2-manage"), ("Flashcards", ".panel, .study-setup", "3-flashcards"),
                             ("Games", ".games-hub-heading, .game-heading", "4-games"), ("Tests", ".test-setup, .panel, .test-view, section", "5-tests"),
                             ("Profile", ".pf-page", "6-profile")]:
        nav(d, label)
        ok = bool(d.find_elements(By.CSS_SELECTOR, css)) and not d.find_elements(By.CSS_SELECTOR, ".error")
        check(f"{label} page renders", ok)
        d.save_screenshot(f"{SHOTS}/{shot}.png")

    # Restore: a backup with three words replaces the library after confirmation, with a snapshot first.
    backup = {"format": "lexicon-backup", "version": 1, "exportedAt": "2026-10-01T10:00:00.000Z",
              "words": disk("vocabulary.json")[:3], "profile": {"name": "Restored", "days": {"2026-09-30": {"practiced": 2}}, "events": []}}
    path = "/tmp/lexicon-backup-test.json"
    json.dump(backup, open(path, "w"))
    inp = d.find_element(By.CSS_SELECTOR, ".pf-backup input[type=file]")
    d.execute_script("arguments[0].hidden=false", inp)
    inp.send_keys(path)
    dialog = wait(d, "[aria-labelledby=restore-title]")
    check("restore asks before replacing", "Replace" in dialog.text, dialog.text.replace("\n", " ")[:140])
    d.save_screenshot(f"{SHOTS}/7-restore.png")
    [b for b in dialog.find_elements(By.TAG_NAME, "button") if b.text == "Replace"][0].click()
    WebDriverWait(d, 8).until(lambda x: x.find_elements(By.CSS_SELECTOR, ".pf-backup .pf-done"))
    check("restore replaces words and profile on disk", len(disk("vocabulary.json")) == 3 and disk("profile.json")["name"] == "Restored")
    snaps = os.listdir(os.path.join(DATA, "snapshots")) if os.path.isdir(os.path.join(DATA, "snapshots")) else []
    snap_ok = len(snaps) == 1 and len(json.load(open(os.path.join(DATA, "snapshots", snaps[0], "vocabulary.json")))) == 12
    check("a snapshot of the previous 12-word library was taken first", snap_ok, str(snaps))

    # External link: must not navigate the app window away.
    nav(d, "My library")
    links = d.find_elements(By.CSS_SELECTOR, ".library-related a")
    if links:
        links[0].click(); time.sleep(1)
        check("dictionary links don't navigate the app window", d.current_url == url, d.current_url)
finally:
    d.quit()

time.sleep(1)
d = session()
try:
    wait(d, ".words-table")
    n = len(d.find_elements(By.CSS_SELECTOR, ".term-button"))
    nav(d, "Profile")
    name = d.find_element(By.CSS_SELECTOR, ".pf-name").text
    check("after quitting and relaunching, the restored data is still there", n == 3 and "Restored" in name, f"{n} words, name {name!r}")
finally:
    d.quit()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
