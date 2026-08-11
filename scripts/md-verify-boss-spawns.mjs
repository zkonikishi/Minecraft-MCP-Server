import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const c = new Client({ name: 'md-verify-boss-spawns', version: '1' });
const t = new StdioClientTransport({ command: process.execPath, args: [
  'dist/main.js','--host','127.0.0.1','--port','29565','--username','MCPTestBot','--auth','offline','--version','26.2'
], cwd: process.cwd(), stderr: 'pipe' });
t.stderr?.on('data', d => process.stderr.write(d)); await c.connect(t);
const call = (name,args={}) => c.callTool({name,arguments:args});
await sleep(9000);
const cases = [
  ['ZDungeon_AmethystGolem', 0,64,0], ['ZDungeon_DeerGodHana',53,-56,0],
  ['ZDungeon_DragonMonk',18,291,-32], ['ZDungeon_FireElemental',-19,58,-35],
  ['ZDungeon_SlimePrincess',61,69,71], ['ZDungeon_OrcKing',-94,-35,35]
];
const report=[];
for (const [d,x,y,z] of cases) {
  await call('send-chat',{message:'/md leave'}); await sleep(1600);
  await call('send-chat',{message:`/md reload ${d}`}); await sleep(1200);
  await call('send-chat',{message:`/md play ${d}`}); await sleep(6500);
  await call('send-chat',{message:`/tp zowonya ${x} ${y+2} ${z}`}); await sleep(1800);
  report.push({dungeon:d, position:await call('get-position'), entities:await call('list-nearby-entities',{radius:32})});
}
await call('send-chat',{message:'/md leave'}); await sleep(1200);
console.log(JSON.stringify(report,null,2)); await c.close();
