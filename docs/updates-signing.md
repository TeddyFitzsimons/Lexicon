# Auto-updates: how the signing works

Lexicon ships with [`tauri-plugin-updater`](https://v2.tauri.app/plugin/updater/).
On launch, the installed app asks GitHub Releases for `latest.json`, verifies
the signature of the new build against a public key baked into the app, and
only then offers to install it.

## The keys

- **Private key:** `~/.tauri/lexicon-updater.key` on your development machine.
  **Never commit this.** If you lose it, you can't ship updates to existing
  installs without them reinstalling by hand.
- **Public key:** `~/.tauri/lexicon-updater.key.pub`, mirrored into
  `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`. Public by design.

## GitHub secrets you need (one-time)

In the repo settings → *Secrets and variables* → *Actions*, add:

| Name                                 | Value                                                   |
|--------------------------------------|---------------------------------------------------------|
| `TAURI_SIGNING_PRIVATE_KEY`          | The full contents of `~/.tauri/lexicon-updater.key`.    |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The password you set when generating the key (empty if none). |

Without these, the release workflow still builds installers, but the `.sig`
files (and therefore `latest.json`) come out empty and the installed app
can't verify updates.

## Release flow

1. Bump `package.json` version and add a `## X.Y.Z` section to `CHANGELOG.md`.
2. `git tag vX.Y.Z && git push --tags`.
3. CI builds macOS universal + Windows x64, signs the updater artifacts with
   the secret key, generates `latest.json`, and creates a **draft** release
   with everything attached.
4. Open the draft on GitHub, review it, press **Publish**. The moment you do,
   `releases/latest/download/latest.json` starts returning the new manifest
   and installed apps will see the update on their next launch.

## The first-install-after-updater-was-added caveat

Lexicon installs made before auto-updates existed (2.2.0 and earlier) have no
updater plugin, so they don't check for anything. 2.3.0 is the first version
that *looks* for updates; every version from 2.3.1 onward can be installed
directly through the "Update Lexicon" prompt.

## Rotating the key

If the private key is ever leaked:

1. Generate a new one: `npx tauri signer generate -w ~/.tauri/lexicon-updater.key --force`.
2. Replace `plugins.updater.pubkey` in `tauri.conf.json` with the new `.pub`.
3. Replace both GitHub secrets.
4. Ship a new release. Installs on the old key can't verify this release, so
   they'll need a manual reinstall from the GitHub release page.
