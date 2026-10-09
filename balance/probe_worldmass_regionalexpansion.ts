import assert from 'node:assert/strict';
import { composeRegionalSites, regionalRoutesPreserved, type RegionalLandformSite } from '../src/worldmass/regionalLandformComposition';
import type { MassLandformShape } from '../src/worldmass/landforms';
import { canonical, massDigest } from '../src/worldmass/random';

const CELL=30,N=120,dry=(c:string|undefined)=>c==='g'||c==='c';
let passed=0;
function test(name:string,run:()=>void){run();passed++;console.log('PASS '+name);}
function fixture(shoulders=true):MassLandformShape {
  const rows=Array.from({length:N},()=>Array<string>(N).fill('.'));
  const paint=(x:number,y:number,c:string)=>{if(c==='g'||rows[y][x]==='.')rows[y][x]=c;};
  for(let d=2;d<N-2;d++)for(let side=shoulders?-4:-1;side<=(shoulders?4:1);side++) {
    paint(d,60+side,Math.abs(side)<=1?'g':'b');paint(60+side,d,Math.abs(side)<=1?'g':'b');
  }
  // A separate solid outcrop contributes native obstacle material without
  // changing the cross's traversable graph or these local site fixtures.
  for(let y=10;y<30;y++)for(let x=10;x<30;x++)rows[y][x]='b';
  return {id:'expansion-cross',source:'probe/expansion',builder:'probe',params:{},rows:rows.map(row=>row.join('')),
    navigation:[{x:4,y:60},{x:N-5,y:60},{x:60,y:4},{x:60,y:N-5}],
    ports:[{x:2,y:60,dx:-1,dy:0},{x:N-3,y:60,dx:1,dy:0},{x:60,y:2,dx:0,dy:-1},{x:60,y:N-3,dx:0,dy:1}]};
}
const site=(id:string,x:number,y:number,radius:number):RegionalLandformSite=>({id,x:(x+.5)*CELL,y:(y+.5)*CELL,radius});
function protectedCells(shape:MassLandformShape,sites:readonly RegionalLandformSite[]):void {
  for(let y=0;y<N;y++)for(let x=0;x<N;x++)for(const site of sites) {
    const dx=Math.max(x*CELL-site.x,0,site.x-(x+1)*CELL),dy=Math.max(y*CELL-site.y,0,site.y-(y+1)*CELL);
    if(dx*dx+dy*dy<=site.radius**2)assert.equal(shape.rows[y][x],'.','protected circle '+site.id+' at '+x+','+y);
  }
}
function portsAndBorder(shape:MassLandformShape):void {
  for(let i=0;i<N;i++)for(const [x,y] of [[i,0],[i,N-1],[0,i],[N-1,i]])assert.equal(shape.rows[y][x],'.','transparent frame');
  for(const p of shape.ports!) {
    assert.ok(dry(shape.rows[p.y][p.x]),'port retains dry source floor');
    for(const side of [-1,0,1])assert.equal(shape.rows[p.y+p.dy+p.dx*side][p.x+p.dx-p.dy*side],'.','real exterior contact preserved');
  }
}
/** Independent radius-15 stand graph at 15-unit samples. No original/noise
 * terrain participates, so both sides must connect around the protected hole. */
function bodyConnected(shape:MassLandformShape):void {
  const n=N*2,stands=new Uint8Array(n*n),seen=new Uint8Array(n*n),queue=new Int32Array(n*n);let total=0,head=0,tail=0;
  for(let y=1;y<n;y++)for(let x=1;x<n;x++) {
    const px=x*15,py=y*15;let clear=true;
    for(let yy=Math.floor((py-15)/CELL);yy<=Math.floor((py+15)/CELL)&&clear;yy++)
      for(let xx=Math.floor((px-15)/CELL);xx<=Math.floor((px+15)/CELL);xx++) {
        const dx=Math.max(xx*CELL-px,0,px-(xx+1)*CELL),dy=Math.max(yy*CELL-py,0,py-(yy+1)*CELL);
        if(dx*dx+dy*dy<225-1e-8&&!dry(shape.rows[yy]?.[xx])){clear=false;break;}
      }
    if(clear){const k=y*n+x;stands[k]=1;total++;if(!tail){queue[tail++]=k;seen[k]=1;}}
  }
  while(head<tail){const k=queue[head++],x=k%n,y=Math.floor(k/n);
    for(const j of [x?k-1:-1,x+1<n?k+1:-1,y?k-n:-1,y+1<n?k+n:-1])if(j>=0&&stands[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}
  assert.ok(total>100);assert.equal(tail,total,'all body-clear dry stands remain connected');
}

test('a site crossing an arm gains a bounded dry detour and retains every protected cell',()=>{
  const before=fixture(),sites=[site('arm-site',30,60,150)],reasons:string[]=[];
  assert.equal(composeRegionalSites(before,sites,CELL,120,.12,r=>reasons.push(r)),null,'historical silhouette cannot fit this detour');
  assert.deepEqual(reasons,['unconnected']);
  const after=composeRegionalSites(before,sites,CELL,120,.12,undefined,true);assert.ok(after);
  assert.ok(after.rows.some((row,y)=>[...row].some((c,x)=>c==='g'&&before.rows[y][x]==='.')),'dry collar extends the original outline');
  protectedCells(after,sites);portsAndBorder(after);bodyConnected(after);assert.ok(regionalRoutesPreserved(before,after,CELL));
  const added=after.rows.reduce((sum,row,y)=>sum+[...row].filter((c,x)=>c!=='.'&&before.rows[y][x]==='.').length,0);
  assert.ok(added>0&&added<=Math.floor(.12*N*N));
});

test('unrelated sites create no isolated collars and all supplied circles protect overlapping growth',()=>{
  const before=fixture(),unrelated=site('unrelated',100,20,60);
  assert.equal(canonical(composeRegionalSites(before,[unrelated],CELL,120,.12,undefined,true)),canonical(composeRegionalSites(before,[],CELL,120,.12,undefined,true)));
  const sites=[site('large-arm-site',30,60,240),site('originally-unrelated',30,71,30)];
  const after=composeRegionalSites(before,sites,CELL,120,.12,undefined,true);assert.ok(after);
  protectedCells(after,sites);bodyConnected(after);
  const reverse=composeRegionalSites(before,[...sites].reverse(),CELL,120,.12,undefined,true);assert.ok(reverse);
  assert.deepEqual(reverse.rows,after.rows,'collar growth cannot depend on which protected circle was processed first');
});

test('expansion preserves the original exterior contacts and refuses a covered ingress',()=>{
  const before=fixture(),sites=[site('near-contact',7,60,60)];
  const after=composeRegionalSites(before,sites,CELL,120,.12,undefined,true);assert.ok(after);
  protectedCells(after,sites);portsAndBorder(after);bodyConnected(after);
  const reasons:string[]=[];assert.equal(composeRegionalSites(before,[site('covered-ingress',2,60,60)],CELL,120,.12,r=>reasons.push(r),true),null);
  assert.ok(reasons.some(r=>r==='port'||r==='terminal'||r==='unconnected'),'covered ingress refuses instead of carving a new exterior contact');
});

test('new ownership has a separate area cap even when no original obstacle changes',()=>{
  const before=fixture(false),reasons:string[]=[];
  assert.equal(composeRegionalSites(before,[site('arm-site',30,60,150)],CELL,120,.005,r=>reasons.push(r),true),null);
  assert.deepEqual(reasons,['expansion-area']);
  const obstacleReasons:string[]=[];
  assert.equal(composeRegionalSites(fixture(),[site('arm-site',30,60,150)],CELL,120,.001,r=>obstacleReasons.push(r),true),null);
  assert.deepEqual(obstacleReasons,['altered'],'the original obstacle budget still applies independently');
});

test('a connected expanded collar still refuses a route that detours too far',()=>{
  const before={...fixture(),navigation:[{x:18,y:60},{x:43,y:60},{x:60,y:4},{x:60,y:N-5}]},reasons:string[]=[];
  assert.equal(composeRegionalSites(before,[site('long-detour',30,60,300)],CELL,120,.12,r=>reasons.push(r),true),null);
  assert.deepEqual(reasons,['detour'],'new collar growth cannot weaken terminal-distance limits');
});

test('omitted expansion keeps committed legacy composition byte identity',()=>{
  const before=fixture(),sites=[site('shoulder-site',30,56,15)];
  const legacy=composeRegionalSites(before,sites,CELL,120,.12);assert.ok(legacy);
  assert.equal(canonical(legacy),canonical(composeRegionalSites(before,sites,CELL,120,.12,undefined,false)));
  // Filled from the committed pre-expansion implementation using this fixture.
  assert.equal(massDigest(legacy),'498b51cb29ba0ca5');
});
console.log('worldmass_regionalexpansion: '+passed+' courses passed');
