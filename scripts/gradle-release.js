// Runs the Android Gradle wrapper for a release bundle. Invoked directly by
// path (not through a shell's PATH lookup) so it works the same whether npm
// resolves its script-shell to cmd.exe or a POSIX sh (e.g. Git Bash) - the
// latter doesn't know how to execute a bare `gradlew.bat` the way cmd does.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const androidDir = path.resolve(__dirname, '..', 'android');
// Deliberately a cwd-relative filename, not a full path: this project's
// path has a space in it ("Files Manager"), and cmd.exe's own /c re-parsing
// of the command line mangles a spaced path passed as an argument no matter
// how it's quoted. cwd (below) is a separate OS-level spawn parameter, not
// part of the command line string, so referring to the wrapper relative to
// it sidesteps that. The explicit .\ / ./ prefix matters on top of that:
// this machine has NoDefaultCurrentDirectoryInExePath set, which disables
// cmd.exe's implicit current-directory lookup for a bare filename - without
// the prefix it reports "not recognized" even though the file is right there.
const wrapper = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
const task = process.argv[2] || 'bundleRelease';

const env = { ...process.env };
if (!env.JAVA_HOME) {
  // Gradle needs a JDK on JAVA_HOME - Android Studio ships one (JBR) that
  // most machines with the Android toolchain already have, so fall back to
  // it instead of requiring a separate global JAVA_HOME setup.
  const candidates =
    process.platform === 'win32'
      ? ['C:\\Program Files\\Android\\Android Studio\\jbr', `${process.env.LOCALAPPDATA}\\Programs\\Android Studio\\jbr`]
      : process.platform === 'darwin'
      ? ['/Applications/Android Studio.app/Contents/jbr/Contents/Home']
      : ['/opt/android-studio/jbr', `${process.env.HOME}/android-studio/jbr`];

  const found = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (found) {
    env.JAVA_HOME = found;
    console.log(`JAVA_HOME not set - using Android Studio's bundled JDK: ${found}`);
  } else {
    console.warn('JAVA_HOME not set and no bundled Android Studio JDK found - this will likely fail.');
  }
}

// gradlew.bat is a batch script, not a PE executable - spawning it with
// shell:false silently fails (Node can't CreateProcess a .bat file
// directly), so it needs to go through cmd.exe. shell:true handles that; it
// only matters that `wrapper` above has no spaces to be mangled by cmd's own
// command-line re-parsing (the actual project path does, hence running by
// bare filename with cwd set below rather than a full path).
const result = spawnSync(wrapper, [task], { cwd: androidDir, stdio: 'inherit', shell: process.platform === 'win32', env });
if (result.error) {
  console.error('Failed to launch the Gradle wrapper:', result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
