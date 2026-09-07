import test from 'ava';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import ts from 'typescript';

const require = createRequire(import.meta.url);

test('native CLI and tooling compiler API remain on separate major versions', t => {
  const nativeRoot = dirname(require.resolve('@typescript/native/package.json'));
  const compatibilityRoot = dirname(require.resolve('typescript/package.json'));
  const cliVersion = (root: string, bin: string) => execFileSync(
    process.execPath, [join(root, 'bin', bin), '--version'],
    { encoding: 'utf8', timeout: 15000, windowsHide: true }
  ).trim();
  t.regex(cliVersion(nativeRoot, 'tsc'), /^Version 7\./);
  t.regex(cliVersion(compatibilityRoot, 'tsc6'), /^Version 6\./);
  t.regex(ts.version, /^6\./);
  const source = ts.createSourceFile('probe.ts', 'const value: number = 1;', ts.ScriptTarget.ES2022, true);
  t.is(source.statements.length, 1);
  t.true(ts.isVariableStatement(source.statements[0]));
});
