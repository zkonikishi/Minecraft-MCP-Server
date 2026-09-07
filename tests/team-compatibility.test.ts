import test from 'ava';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);

test('pinned Mineflayer passes native wire and legacy team lifecycle regressions', t => {
  const output = execFileSync(process.execPath, ['--test', require.resolve('mineflayer/tools/team-regression.js')], {
    encoding: 'utf8', timeout: 30000, windowsHide: true
  });
  t.regex(output, /(?:pass 3|# pass 3)/);
});
