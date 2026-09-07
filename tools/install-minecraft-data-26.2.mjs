import { validateDataInstall } from './data-install-guard.mjs'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageRoot = dirname(require.resolve('minecraft-data/package.json'));
const dataRoot = join(packageRoot, 'minecraft-data', 'data');
const source = join(projectRoot, 'vendor', 'minecraft-data', 'pc', '26.2');
const destination = join(dataRoot, 'pc', '26.2');


const dataPathsFile = join(dataRoot, 'dataPaths.json');
const dataPaths = JSON.parse(await readFile(dataPathsFile, 'utf8'));
const inherited = dataPaths.pc['26.1'];

if (!inherited) {
  throw new Error('minecraft-data 26.1 paths are unavailable');
}

await validateDataInstall(packageRoot, source, destination, inherited)
await mkdir(destination, { recursive: true })
await cp(source, destination, { recursive: true, force: true })

dataPaths.pc['26.2'] = Object.fromEntries(
  Object.entries(inherited).map(([key, value]) => [
    key,
    typeof value === 'string' && value === 'pc/26.1' ? 'pc/26.2' : value
  ])
);
await writeFile(dataPathsFile, `${JSON.stringify(dataPaths, null, 2)}\n`);

await import(pathToFileURL(join(packageRoot, 'bin', 'generate_data.js')).href);

const installed = require('minecraft-data')('26.2');
if (installed.version.version !== 776 || !installed.protocol || !installed.blocks || !installed.items) {
  throw new Error('minecraft-data 26.2 installation verification failed');
}

console.log('Installed native minecraft-data 26.2 (protocol 776)');
