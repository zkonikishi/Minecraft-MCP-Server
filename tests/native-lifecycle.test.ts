import test from 'ava';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);

for (const [script, count] of [['game-lifecycle-regression.js', 4], ['time-regression.js', 2]] as const) {
  test(`pinned Mineflayer passes ${script}`, t => {
    const output = execFileSync(process.execPath, ['--test', require.resolve(`mineflayer/tools/${script}`)], {
      encoding: 'utf8', timeout: 30000, windowsHide: true
    });
    t.regex(output, new RegExp(`(?:pass ${count}|# pass ${count})`));
  });
}
test('native installer fails closed before overwriting unknown data', t => {
  const output = execFileSync(process.execPath, ['--test', fileURLToPath(new URL('../tools/data-install-regression.mjs', import.meta.url))], {
    encoding: 'utf8', timeout: 30000, windowsHide: true
  });
  t.regex(output, /(?:pass 1|# pass 1)/);
});
