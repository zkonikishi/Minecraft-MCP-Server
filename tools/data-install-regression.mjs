import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validateDataInstall } from './data-install-guard.mjs'
test('data install rejects unknown version and divergent files before writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mineflayer-data-'))
  const source = join(root, 'source')
  const destination = join(root, 'destination')
  await mkdir(source)
  await mkdir(destination)
  await writeFile(join(root, 'package.json'), JSON.stringify({ version: '99.0.0' }))
  await assert.rejects(validateDataInstall(root, source, destination, {}), /Unreviewed/)
  await writeFile(join(root, 'package.json'), JSON.stringify({ version: '3.116.0' }))
  await assert.rejects(validateDataInstall(root, source, destination, null), /paths/)
  await writeFile(join(source, 'protocol.json'), '{"value":1}')
  await writeFile(join(destination, 'protocol.json'), '{"value":2}')
  await assert.rejects(validateDataInstall(root, source, destination, {}), /Refusing/)
  assert.equal(await readFile(join(destination, 'protocol.json'), 'utf8'), '{"value":2}')
  await writeFile(join(destination, 'protocol.json'), '{ "value": 1 }')
  await validateDataInstall(root, source, destination, {})
  await validateDataInstall(root, source, join(root, 'absent'), {})
})
