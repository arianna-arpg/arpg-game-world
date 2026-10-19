import assert from 'node:assert/strict';
import { cameraModeOf, placeCamera, couchFit, couchConfineRect } from '../src/render/camera';
import { makeSettings, serializeSettings, deserializeSettings } from '../src/meta/settings';
import { COUCH_CFG } from '../src/data/couch';

const original=makeSettings(),saved=serializeSettings(original);
for(const oldZoom of [undefined,.85,1,1.6,50,null,'1.5']) {
 const restored=deserializeSettings({...saved,cameraZoom:oldZoom} as never)!;
 assert.deepEqual(restored,original,'obsolete game zoom cannot alter loaded settings');
 assert.deepEqual(serializeSettings(restored),saved,'obsolete game zoom is not saved again');
}
console.log('PASS old game zoom preferences are ignored without changing other settings');
const focus={x:-1930,y:761},arena={w:2000,h:2000,boundless:true};
{
 const z=1.3,native=placeCamera(cameraModeOf('hero'),focus,1280/z,850/z,arena);
 for(const pixel of [.55,.75,1]){
  assert.deepEqual(placeCamera(cameraModeOf('hero'),focus,1280*pixel/(z*pixel),850*pixel/(z*pixel),arena),native);
 }
 const heroScreen={x:(focus.x-native.x)*z,y:(focus.y-native.y)*z};
 assert.ok(Math.abs(heroScreen.x-640)<1e-8&&Math.abs(heroScreen.y-425)<1e-8);
 const eyes=[focus,{x:focus.x+610,y:focus.y+280}],fit=couchFit(eyes,1280,850,z,COUCH_CFG.camera);
 for(const pixel of [.55,.75,1]){
  const scaled=couchFit(eyes,1280*pixel,850*pixel,z*pixel,COUCH_CFG.camera);
  assert.deepEqual(scaled.focus,fit.focus);assert.ok(Math.abs(scaled.stretch-fit.stretch)<1e-12);
 }
 const cam=placeCamera(cameraModeOf('hero'),fit.focus,1280/(z*fit.stretch),850/(z*fit.stretch),arena);
 const rect=couchConfineRect(cam,1280/(z*fit.stretch),850/(z*fit.stretch),COUCH_CFG.camera);
 for(const eye of eyes)assert.ok(eye.x>=rect.x&&eye.x<=rect.x+rect.w&&eye.y>=rect.y&&eye.y<=rect.y+rect.h);
}
console.log('PASS solo focus, pixel-resolution independence and native couch fit/edge geometry at main game scale');
