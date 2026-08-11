import mineflayer from 'mineflayer';
import fs from 'node:fs';
const out = process.argv[2] ?? 'coretools-mythic-pages-20260811.json';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const result = { startedAt: new Date().toISOString(), server: '127.0.0.1:29565', pages: [], errors: [], chat: [] };
const bot = mineflayer.createBot({host:'127.0.0.1',port:29565,username:'MCPTestBot',auth:'offline',version:'26.2',hideErrors:false});
bot.on('messagestr', message => { result.chat.push(message); if (result.chat.length > 120) result.chat.shift(); });
bot.on('error', error => result.errors.push(String(error?.stack ?? error)));
bot.on('kicked', reason => result.errors.push(`kicked: ${typeof reason === 'string' ? reason : JSON.stringify(reason)}`));
const completedResourcePacks = new Set();
bot.on('resourcePack', (_url, uuid) => {
  const packId=String(uuid); if(completedResourcePacks.has(packId))return; completedResourcePacks.add(packId);
  result.chat.push('RESOURCE_PACK_HANDSHAKE_3_4_0');
  bot._client.write('resource_pack_receive', {uuid,result:3});
  setTimeout(()=>bot._client.write('resource_pack_receive',{uuid,result:4}),100);
  setTimeout(()=>bot._client.write('resource_pack_receive',{uuid,result:0}),200);
});
function waitWindow(timeout=7000){return new Promise(resolve=>{const timer=setTimeout(()=>resolve(null),timeout);bot.once('windowOpen',window=>{clearTimeout(timer);resolve(window)});});}
async function open(command, expected, enterStation=false){
  if(bot.currentWindow)bot.closeWindow(bot.currentWindow); await sleep(300); bot.chat(command); const window=await waitWindow();
  const entry={command,opened:Boolean(window),expected,title:window?JSON.stringify(window.title):null}; entry.titleMatched=Boolean(window)&&entry.title.includes(expected);
  if(window&&enterStation){try{await bot.clickWindow(15,0,0);const station=await waitWindow();entry.stationOpened=Boolean(station);entry.stationTitle=station?JSON.stringify(station.title):null;if(station)bot.closeWindow(station);}catch(error){entry.stationOpened=false;entry.stationError=String(error);}}
  else if(window)bot.closeWindow(window); result.pages.push(entry); await sleep(500);
}
bot.once('spawn',async()=>{try{
  const pages=[
    ['/mythicidentify','\u795e\u8bdd\u9274\u5b9a\u5de5\u574a',false],['/mythicupgrade','\u795e\u8bdd\u5f3a\u5316\u5de5\u574a',false],
    ['/mythicgem','\u795e\u8bdd\u5b9d\u77f3\u5de5\u574a',false],['/mythicreroll','\u795e\u8bdd\u8bcd\u6761\u91cd\u968f\u5de5\u574a',false],
    ['/mythicmerge','\u795e\u8bdd\u878d\u5408\u5de5\u574a',false],['/mythicmodifiers','\u795e\u8bdd\u8bcd\u6761\u5de5\u574a',false],
    ['/mythicgrade','\u795e\u8bdd\u54c1\u7ea7\u8c03\u6574\u7bb1',false],['/mythicdeconstruct','\u795e\u8bdd\u5206\u89e3\u5de5\u574a',true],
    ['/mythicreforge','\u795e\u8bdd\u57fa\u7840\u91cd\u94f8\u5de5\u574a',true],['/mythicrepair','\u795e\u8bdd\u4fee\u590d\u5de5\u574a',true],
    ['/mythicselling','\u795e\u8bdd\u51fa\u552e\u5de5\u574a',true],['/mythictransmog','\u795e\u8bdd\u5e7b\u5316\u5de5\u574a',true],
  ]; for(const page of pages)await open(...page);
}catch(error){result.errors.push(String(error?.stack??error));}finally{result.finishedAt=new Date().toISOString();fs.writeFileSync(out,JSON.stringify(result,null,2));bot.quit('CoreTools Mythic page test complete');setTimeout(()=>process.exit(0),800);}});
setTimeout(()=>{result.errors.push('global timeout');fs.writeFileSync(out,JSON.stringify(result,null,2));try{bot.end()}catch{}process.exit(2);},120000);
