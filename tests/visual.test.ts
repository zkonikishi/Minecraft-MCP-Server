import test from 'ava';
import sinon from 'sinon';
import { inflateSync } from 'node:zlib';
import type { Bot } from 'mineflayer';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BotConnection } from '../src/bot-connection.js';
import { ToolFactory } from '../src/tool-factory.js';
import { registerVisualTools } from '../src/tools/visual-tools.js';
import { encodePng } from '../src/visual/png.js';
import { renderBlockView, type ViewSource } from '../src/visual/block-view.js';

const cube = [[0, 0, 0, 1, 1, 1]];
const options = { width: 160, distance: 8, fov: 70 };
const source = (): ViewSource => ({
  origin: { x: 0.5, y: 1.6, z: 0.5 }, yaw: 0, pitch: 0, isCurrent: () => true,
  blockAt: p => p.z === -3 ? { name: 'stone', shapes: cube } : { name: 'air', shapes: [] }
});

test('PNG uses valid signature, dimensions and lossless RGB rows', t => {
  const png = encodePng(2, 1, new Uint8Array([255, 0, 0, 0, 255, 0]));
  t.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  t.is(png.readUInt32BE(16), 2);
  t.is(png.readUInt32BE(20), 1);
  t.deepEqual([...inflateSync(png.subarray(41, 41 + png.readUInt32BE(33)))], [0, 255, 0, 0, 0, 255, 0]);
  t.throws(() => encodePng(481, 270, new Uint8Array()), { message: /dimensions/ });
});

test('forward is negative Z; turning around hides the wall', async t => {
  const front = await renderBlockView(source(), options);
  const back = await renderBlockView({ ...source(), yaw: Math.PI }, options);
  t.is(front.metadata.hitPixels, 160 * 90);
  t.is(back.metadata.hitPixels, 0);
  t.is(front.metadata.visibleBlocks.stone, 160 * 90);
  t.notDeepEqual(front.png, back.png);
});

test('near geometry occludes far geometry', async t => {
  const scene = source();
  scene.blockAt = p => p.z === -2 ? { name: 'dirt', shapes: cube }
    : p.z === -4 ? { name: 'stone', shapes: cube } : { name: 'air', shapes: [] };
  const image = await renderBlockView(scene, options);
  t.is(image.metadata.visibleBlocks.dirt, 160 * 90);
  t.false('stone' in image.metadata.visibleBlocks);
});

test('empty geometry does not occlude; partial shapes remain partial', async t => {
  const scene = source();
  scene.blockAt = p => p.z === -2 && p.y === 1
    ? { name: 'stone_slab', shapes: [[0, 0, 0, 1, 0.5, 1]] } : { name: 'air', shapes: [] };
  const image = await renderBlockView(scene, options);
  t.true(image.metadata.hitPixels > 0);
  t.true(image.metadata.hitPixels < 160 * 90);
});

test('unloaded regions are marked unknown rather than rendered as air', async t => {
  const scene = source();
  scene.blockAt = p => p.z < 0 ? null : { name: 'air', shapes: [] };
  const image = await renderBlockView(scene, options);
  t.is(image.metadata.unknownPixels, 160 * 90);
  t.is(image.metadata.hitPixels, 0);
  t.true(image.metadata.limitations.includes('Not a game-client screenshot'));
});

test('rejects unloaded camera and invalid or oversized captures', async t => {
  await t.throwsAsync(renderBlockView({ ...source(), blockAt: () => null }, options), { message: /not loaded/ });
  await t.throwsAsync(renderBlockView(source(), { ...options, width: 9999 }), { message: /Invalid/ });
  await t.throwsAsync(renderBlockView(source(), { ...options, distance: Infinity }), { message: /Invalid/ });
  await t.throwsAsync(renderBlockView({ ...source(), yaw: NaN }, options), { message: /Invalid/ });
});

test('aborts capture after the connection changes', async t => {
  await t.throwsAsync(renderBlockView({ ...source(), isCurrent: () => false }, options), { message: /disconnected/ });
});

test('MCP image response contains PNG and its limitations', t => {
  const factory = new ToolFactory({} as McpServer, {} as BotConnection);
  const png = encodePng(1, 1, new Uint8Array([1, 2, 3]));
  const response = factory.createImageResponse(png, 'schematic');
  t.deepEqual(response.content[0], { type: 'text', text: 'schematic' });
  t.deepEqual(response.content[1], { type: 'image', mimeType: 'image/png', data: png.toString('base64') });
});

test('visual tool enforces one capture and resets busy state afterward', async t => {
  const server = { tool: sinon.stub() };
  const connection = { checkConnectionAndReconnect: sinon.stub().resolves({ connected: true }) };
  const bot = { entity: { position: { x: 0.5, y: 0, z: 0.5 }, height: 1.8, yaw: 0, pitch: 0 },
    _client: { state: 'play' }, blockAt: source().blockAt } as unknown as Bot;
  registerVisualTools(new ToolFactory(server as unknown as McpServer, connection as unknown as BotConnection), () => bot);
  const execute = server.tool.firstCall.args[3];
  const first = execute(options);
  const second = await execute(options);
  t.true(second.isError);
  t.regex(second.content[0].text, /in progress/);
  t.is((await first).content[1].type, 'image');
  t.is((await execute(options)).content[1].type, 'image');
  t.true((await execute({ width: 10000 })).isError);
});
