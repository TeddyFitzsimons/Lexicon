// On launch, ask GitHub Releases if there is a newer, signed Lexicon build.
// If there is, show a native dialog; if accepted, download, verify the signature,
// install, and restart the app. Browser builds skip this entirely.

import {isDesktop} from './platform';

export async function checkForUpdatesOnLaunch(): Promise<void> {
  if (!isDesktop()) return;
  try {
    const [{check}, {ask, message}, {relaunch}] = await Promise.all([
      import('@tauri-apps/plugin-updater'),
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-process'),
    ]);
    const update = await check();
    if (!update) return;
    const wantsIt = await ask(
      `Lexicon ${update.version} is available. You have ${update.currentVersion}.\n\nInstall it now? Lexicon will restart; your words stay on this computer.`,
      {title: 'Update Lexicon', kind: 'info', okLabel: 'Install', cancelLabel: 'Later'},
    );
    if (!wantsIt) return;
    await update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    // A failed update check should never break launch. Surface it quietly.
    console.warn('Update check failed:', e);
  }
}
