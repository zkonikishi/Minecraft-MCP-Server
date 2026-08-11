import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const c = new Client({name:'stop-test-server',version:'1'});
const t = new StdioClientTransport({command:process.execPath,args:['dist/main.js','--host','127.0.0.1','--port','29565','--username','MCPTestBot','--auth','offline','--version','26.2'],cwd:process.cwd(),stderr:'pipe'});
t.stderr?.on('data',d=>process.stderr.write(d)); await c.connect(t); await sleep(9000);
await c.callTool({name:'send-chat',arguments:{message:'/md leave'}}); await sleep(1000);
await c.callTool({name:'send-chat',arguments:{message:'/stop'}}); await sleep(8000);
try { await c.close(); } catch {}
