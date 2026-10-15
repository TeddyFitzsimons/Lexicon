# Installing Lexicon

Lexicon is a small vocabulary app I made for fun. It's free, it runs on your computer, and your words never leave it. There's no account and no internet needed once it's installed.

Your computer will warn you the first time you open it. That's because I haven't paid Apple or Microsoft to sign the app, not because anything is wrong. The steps below get you past the warning once; after that it opens like any other app.

## 1. Download

Go to the latest release:

**https://github.com/TeddyFitzsimons/Lexicon/releases/latest**

Under **Assets**, download one file:

| Your computer | File to download |
| --- | --- |
| Mac on macOS 13 Ventura or newer, Apple chip or Intel | `Lexicon_<version>_universal.dmg` |
| Windows 10 or 11 | `Lexicon_<version>_x64-setup.exe` |

You can ignore the other files. `SHA256SUMS.txt` is there if you want to check the download wasn't corrupted.

## 2a. Install on a Mac

1. Open the `.dmg` you downloaded.
2. Drag **Lexicon** into the **Applications** folder.
3. Open **Lexicon** from Applications. macOS will say it can't verify the app. Click **Done** (not Move to Trash).
4. Open **System Settings → Privacy & Security** and scroll down to the **Security** section. You'll see a note that Lexicon was blocked. Click **Open Anyway**.
5. Confirm with **Open Anyway** again and enter your Mac password.

Lexicon opens, and from now on it opens normally. On older macOS versions (Sonoma and earlier) you can instead right-click Lexicon in Applications and choose **Open**.

You can eject the `.dmg` and delete it afterward.

## 2b. Install on Windows

1. Your browser may say the file isn't commonly downloaded. In Edge, click **…** next to the download, then **Keep**, then **Keep anyway**. In Chrome, choose **Keep**.
2. Run the installer. If a blue box says **Windows protected your PC**, click **More info**, then **Run anyway**.
3. Click through the installer. It installs just for your user account and doesn't need an administrator password.

Lexicon appears in the Start menu. If you're on an older Windows 10 machine, the installer may need internet once to add a Microsoft component (WebView2) that Lexicon uses to draw its window.

## Updating

Download the newest file from the same link and install it over the old one. On a Mac, drag it into Applications and choose **Replace**. On Windows, just run the new installer.

Your words, streaks and profile are kept. They're stored separately from the app, so updating or reinstalling never touches them. You may need to repeat the **Open Anyway** step once after each update on a Mac.

## Where your words are stored

| Computer | Folder |
| --- | --- |
| Mac | `~/Library/Application Support/io.github.teddyfitzsimons.lexicon/` |
| Windows | `%APPDATA%\io.github.teddyfitzsimons.lexicon\` |

You don't need to open these folders. To get there quickly, use **Profile → Show data folder** in Lexicon.

## Backing up

In Lexicon, go to **Profile → Back up and restore → Back up…**. It saves one file with all your words, your streaks and your profile. Keep it somewhere safe, like iCloud Drive, OneDrive or a USB stick.

To restore, or to move your library to a new computer, use **Profile → Restore from backup** and pick that file. Lexicon asks before replacing anything and keeps a copy of what was there in the `snapshots` folder inside the data folder.

To send words to a friend, use **Profile → Share your Lexicon** instead. They add them with **Add words from a file**, which never touches their own streaks or favorites.

## Pronunciation audio

Lexicon reads words aloud using the voices built into your computer, so audio quality depends on which voices you have installed. If audio is silent or sounds robotic:

- **Mac:** System Settings → Accessibility → Spoken Content → System Voice → Manage Voices, and add an English (US) voice.
- **Windows:** Settings → Time & language → Speech → Add voices, and add English (United States).

## Uninstalling

- **Mac:** drag Lexicon from Applications to the Trash.
- **Windows:** Settings → Apps → Installed apps → Lexicon → Uninstall.

Uninstalling leaves your words in place, in case you reinstall. To erase them completely, delete the folder listed under *Where your words are stored*.

## Something broken?

Open an issue at **https://github.com/TeddyFitzsimons/Lexicon/issues**, or just text me. Tell me whether you're on Mac or Windows and what you clicked before it went wrong.
