import assert from 'node:assert/strict';
import {Server} from 'node:http';
import {connect} from 'node:net';
import {NativeShardHost} from '../server/nativeShardHost';
const hosts:NativeShardHost[]=[];
const reachable=(port:number)=>new Promise<boolean>(resolve=>{const s=connect({host:'127.0.0.1',port});s.setTimeout(1500);s.once('connect',()=>{s.destroy();resolve(true);});s.once('error',()=>{s.destroy();resolve(false);});s.once('timeout',()=>{s.destroy();resolve(false);});});
const make=()=>{const h=new NativeShardHost({seed:1231,saveDir:null,log:()=>{}});hosts.push(h);return h;};
const immediate=()=>new Promise<void>(r=>setImmediate(r));
const listen=Server.prototype.listen;let release:(()=>void)|undefined;
try {
 const first=make(),opening=first.listen(0,'127.0.0.1').then(port=>({port}),error=>({error})),closing=first.stop({persist:false});await closing;const opened=await opening;
 const immediateLeak='port' in opened&&await reachable(opened.port);await first.net.close();
 const second=make();let boundPort=0,boundResolve!:()=>void;const bound=new Promise<void>(r=>boundResolve=r);
 Server.prototype.listen=function(this:Server,...args:unknown[]){const callback=args.pop() as ()=>void;return Reflect.apply(listen,this,[...args,()=>{boundPort=(this.address() as {port:number}).port;release=()=>Reflect.apply(callback,this,[]);boundResolve();}]);} as typeof Server.prototype.listen;
 const pending=second.listen(0,'127.0.0.1').then(port=>({port}),error=>({error}));await bound;let stopped=false;const stopping=second.stop({persist:false}).then(()=>{stopped=true;});await immediate();const stoppedBeforeBoundCallback=stopped;release!();release=undefined;await pending;await stopping;const bindingLeak=await reachable(boundPort);await second.net.close();
 const result={immediateLeak,stoppedBeforeBoundCallback,bindingLeak,firstRetired:!first.runtime.ready,secondRetired:!second.runtime.ready};console.log(JSON.stringify(result));assert.equal(immediateLeak,false,'stop owns the pre-ready listen continuation');assert.equal(stoppedBeforeBoundCallback,false,'stop waits for its real pending listener');assert.equal(bindingLeak,false,'stopped host leaves no listener after actual bind callback');
}finally {Server.prototype.listen=listen;release?.();for(const h of hosts.reverse()){await h.stop({persist:false});await h.net.close();}}
