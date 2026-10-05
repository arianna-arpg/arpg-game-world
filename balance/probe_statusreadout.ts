import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { STATUS_DEFS, type ActiveStatus } from '../src/engine/status';
import { afflictionPressureOf } from '../src/engine/afflictionPressure';
import { statusReadoutRows, statusReadoutTime, statusReadoutAnchor } from '../src/render/vis/statusReadout';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { CLASSES } from '../src/data/classes';
import { NullInput } from '../src/net/intent';
const restore=seedGlobalRandom(77521);
const status=(id:string,remaining=6,stacks=1,dps=0):ActiveStatus=>({id,remaining,stacks,dps,sourceName:'Probe'});
try{
 const statuses=[status('poison',6,2,10),status('poison',2,1,10),status('stun',1.2),status('burn',4,1,30),
  status('chill',3),status('rallied',2),status('bleed',0)];
 const before=JSON.stringify(statuses),rows=statusReadoutRows(statuses,{burn:1,poison:.2});
 assert.deepEqual(rows.map(r=>r.id),['stun','burn','poison','chill']);
 assert.equal(rows[0].detail,'Unable to move or act');assert.equal(rows[1].detail,'Severe damage over time');
 assert.equal(rows[2].stacks,3);assert.equal(statusReadoutTime(rows[2]),'2.0s–6.0s');
 assert.equal(JSON.stringify(statuses),before);assert.deepEqual(statusReadoutRows([...statuses].reverse(),{burn:1,poison:.2}),rows);
 assert.deepEqual(statusReadoutRows(statuses,{},true),[]);
 assert.equal(statusReadoutRows([status('poison',6,1,0)],{})[0].detail,'','zero tick presence cannot claim damage');
 console.log('PASS native names, stacks, multiple expiry clocks, stable priority, quiet beneficial/expired effects and read-only derivation');
 const w=makeSimWorld('warrior',77521),p=w.player;p.statuses=[];
 p.applyStatus('poison',10,1,'Adder');p.applyStatus('poison',10,1,'Adder');
 assert.equal(statusReadoutRows(p.statuses,afflictionPressureOf(p))[0].stacks,2);
 p.updateTimers(.3);assert.equal(statusReadoutTime(statusReadoutRows(p.statuses,{})[0]),'5.7s');
 p.updateTimers(6);assert.deepEqual(statusReadoutRows(p.statuses,{}),[]);
 p.applyStatus('poison',10,1,'Adder');p.endStatus('poison');assert.deepEqual(statusReadoutRows(p.statuses,{}),[]);
 console.log('PASS actual application, stack, clock decay, native expiry and cleanse remove the readout');
 const guest=w.addSeat('p1',CLASSES[0],new NullInput());guest.actor.statuses=[status('poison',1.2,3,30)];
 guest.actor.life=20;guest.actor.es=0;p.statuses=[status('burn',2.5,1,5)];
 const client=makeSimWorld('warrior',77522);client.clientSeatId='p1';
 const snapshot=serializeSnapshot(w,1);applySnapshot(client,snapshot);
 const hostRows=statusReadoutRows(guest.actor.statuses,afflictionPressureOf(guest.actor));
 assert.deepEqual(statusReadoutRows(client.player.statuses,afflictionPressureOf(client.player)),hostRows);
 assert.equal(statusReadoutTime(hostRows[0]),'1.2s');
 for(const a of snapshot.actors)for(const s of a.st??[])delete s.rem;
 applySnapshot(client,snapshot);
 const legacy=statusReadoutRows(client.player.statuses,afflictionPressureOf(client.player));
 assert.equal(legacy[0].label,STATUS_DEFS.poison.label);assert.equal(legacy[0].remaining,undefined);
 assert.equal(statusReadoutTime(legacy[0]),'','legacy 99-second placeholder is never advertised');
 guest.actor.endStatus('poison');applySnapshot(client,serializeSnapshot(w,2));
 assert.deepEqual(statusReadoutRows(client.player.statuses,{}),[]);
 console.log('PASS remote owning seat receives real expiry and severity, legacy wire omits invented countdown, native cleanse reconciles');
}finally{restore();}

const {makeSettings,serializeSettings,deserializeSettings}=await import('../src/meta/settings');
const defaults=makeSettings();
assert.equal(defaults.crowdedMeters,false);assert.equal(defaults.castMovementHint,false);assert.equal(defaults.statusReadout,'hover');
for(const mode of ['hover','focus','corner','off'] as const)for(const effects of ['gentle','still','off'] as const){
 const saved=serializeSettings({...defaults,statusReadout:mode,afflictionOverlays:effects,crowdedMeters:true,castMovementHint:true});
 const restored=deserializeSettings(saved)!;
 assert.equal(restored.statusReadout,mode);assert.equal(restored.afflictionOverlays,effects);
 assert.equal(restored.crowdedMeters,true);assert.equal(restored.castMovementHint,true);
}
const old=serializeSettings(defaults);delete old.crowdedMeters;delete old.castMovementHint;delete old.statusReadout;
assert.deepEqual(deserializeSettings(old),defaults);
for(const [width,height]of [[1280,850],[600,600],[400,460]])for(const side of [undefined,'left','right'] as const){
 const a=statusReadoutAnchor({x:width/2,y:height/2},width,height,side);
 assert.ok(a.x>=0&&a.x+a.width<=width&&a.y>0&&a.y+102<height);
}
const {collectActiveFx}=await import('../src/render/screenFx');
const {composeAfflictionEdge}=await import('../src/render/vis/afflictionEdge');
const cues=collectActiveFx([status('mired'),status('befuddlement')]);
const edge=composeAfflictionEdge(cues,{},'gentle',1)!;
assert.deepEqual(new Set(edge.layers.map(l=>l.family)),new Set(['mire','befuddlement']));
assert.ok(edge.layers.every(l=>l.alpha>0));assert.equal(composeAfflictionEdge(cues,{},'off',1),undefined);
assert.equal(composeAfflictionEdge(cues,{},'still',1)!.seconds,0);
console.log('PASS independent persisted preferences, old-save defaults, bounded focus readouts and distinct Mired/Befuddled cues');

const legacyFocus=serializeSettings({...defaults,statusReadout:'focus'});delete legacyFocus.statusReadoutVersion;
assert.equal(deserializeSettings(legacyFocus)!.statusReadout,'hover');
for(const mode of ['corner','off'] as const){legacyFocus.statusReadout=mode;assert.equal(deserializeSettings(legacyFocus)!.statusReadout,mode);}
assert.equal(defaults.skillArtwork,true);
assert.equal(deserializeSettings(serializeSettings({...defaults,skillArtwork:false}))!.skillArtwork,false);
assert.equal(deserializeSettings(serializeSettings({...defaults,skillArtwork:true}))!.skillArtwork,true);
