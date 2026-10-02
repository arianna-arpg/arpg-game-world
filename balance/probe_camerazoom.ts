import assert from 'node:assert/strict';
import { CAMERA_CFG, cameraZoomOf, cameraModeOf, placeCamera, couchFit, couchConfineRect } from '../src/render/camera';
import { makeSettings, serializeSettings, deserializeSettings } from '../src/meta/settings';
import { COUCH_CFG } from '../src/data/couch';

const original=makeSettings(),saved=serializeSettings(original);delete saved.cameraZoom;
assert.equal(deserializeSettings(saved)!.cameraZoom,1);
for(const bad of [null,undefined,NaN,Infinity,-Infinity,'1.5',{},[]])
 assert.equal(deserializeSettings({...saved,cameraZoom:bad} as never)!.cameraZoom,1);
for(const [input,expected] of [[-10,.85],[50,1.6],[1.45,1.45]]){
 const settings=makeSettings();settings.cameraZoom=input;
 assert.equal(deserializeSettings(serializeSettings(settings))!.cameraZoom,expected);
 assert.deepEqual({...serializeSettings(settings),cameraZoom:undefined},{...serializeSettings(original),cameraZoom:undefined});
}
console.log('PASS additive zoom preference survives serialization; malformed values restore classic framing and valid values stay bounded');
const focus={x:-1930,y:761},arena={w:2000,h:2000,boundless:true};
for(const userZoom of [.85,1,1.6]){
 const z=CAMERA_CFG.zoom.base*cameraZoomOf(userZoom),native=placeCamera(cameraModeOf('hero'),focus,1280/z,850/z,arena);
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
console.log('PASS solo focus, pixel-resolution independence and native couch fit/edge geometry across the zoom range');
