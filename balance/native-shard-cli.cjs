const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.HOLLOW_WAKE_SHARD_CLI_OUTPUT||path.join(__dirname,'reports/native-shard-cli'));fs.mkdirSync(out,{recursive:true});
const run=args=>{const child=spawn(process.execPath,['--import','tsx','server/shard.ts',...args],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});let text='';child.stdout.on('data',b=>text+=b);child.stderr.on('data',b=>text+=b);const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});return{child,done,read:()=>text};};
const wait=async(test,word)=>{const until=Date.now()+120000;while(!test()&&Date.now()<until)await new Promise(r=>setTimeout(r,30));assert(test(),word);};
(async()=>{let live;try{
 const conflict=run(['--native','--worldmass','--ephemeral']);const refused=await conflict.done;fs.writeFileSync(path.join(out,'conflicting-flags.log'),conflict.read());assert.notEqual(refused.code,0);assert.match(conflict.read(),/Choose one hosted world mode/);
 live=run(['--native','--ephemeral','--seed','1231','--host','127.0.0.1','--port','0','--name','Retained CLI verification']);await wait(()=>/listening on ws:\/\/127\.0\.0\.1:\d+/.test(live.read()),'real native CLI bound a listener');
 const port=Number(/listening on ws:\/\/127\.0\.0\.1:(\d+)/.exec(live.read())[1]),url='http://127.0.0.1:'+port+'/status';let status;for(let i=0;i<50;i++){status=await(await fetch(url)).json();if(status.ticks>0)break;await new Promise(r=>setTimeout(r,25));}
 assert.equal(status.world,'retained native');assert.equal(status.seed,'0x000004cf');assert.equal(status.saving,'ephemeral');assert(status.zone);assert(status.ticks>0);assert.equal(status.faults,0);assert.equal(status.broken,false);assert.deepEqual(status.seats,[]);
 const result={actualNativeCli:true,mutuallyExclusiveModes:true,actualHttpStatus:true,zone:status.zone,ticks:status.ticks,noFaults:true,ephemeral:true};fs.writeFileSync(path.join(out,'REPORT.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{if(live){fs.writeFileSync(path.join(out,'native-cli.log'),live.read());live.child.kill();await live.done;}}
})().catch(error=>{console.error(error);process.exitCode=1;});
