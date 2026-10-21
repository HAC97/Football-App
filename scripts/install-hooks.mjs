// Runs from `npm install` (the "prepare" script): points git at the versioned hooks in .githooks.
import { execFileSync } from 'node:child_process';

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
} catch {
  // Not a git checkout (a tarball, or a host that installs without .git): there is nothing to hook, and install must not fail.
}
