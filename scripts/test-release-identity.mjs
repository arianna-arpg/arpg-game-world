import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {releaseIdentityPlugin} from './release-identity-plugin.mjs';
test('local identity resolves the configured project while a save fixture changes cwd',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url)),before=process.cwd();
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'release-identity-'));
  try {
    process.chdir(temporary);
    const plugin=releaseIdentityPlugin();plugin.configResolved({root});
    const html=plugin.transformIndexHtml('<html><head></head><body></body></html>');
    assert.ok(html.includes('"local":true'));
    assert.ok(html.includes('"version":'+JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version)));
    assert.ok(html.includes('game-build-identity'));
  } finally {process.chdir(before);fs.rmdirSync(temporary);}
});

test('visible identity distinguishes releases of the same source and labels offline/local copies',async()=>{
  const {runInNewContext}=await import('node:vm');
  const client=fs.readFileSync(new URL('./release-client.js',import.meta.url),'utf8');
  for(const [offline,local,mode] of [[false,false,'Released'],[true,false,'Offline copy'],[false,true,'Local development']]){
    let badge;
    const window={__HOLLOW_WAKE_BUILD__:{branch:'main',commit:'a'.repeat(40),buildId:'b'.repeat(24),version:'1.0.0',local},__HOLLOW_WAKE_OFFLINE__:offline,__HOLLOW_WAKE_STORAGE_SCOPE__:'desktop:existing'};
    const document={readyState:'complete',createElement:()=>({style:{},dataset:{}}),body:{append:node=>{badge=node}},getElementById:id=>id==='start-menu'?{classList:{contains:()=>false}}:null};
    runInNewContext(client,{window,document,MutationObserver:class{observe(){}}});
    assert.ok(badge.textContent.includes('aaaaaaaa.bbbbbbbb'));
    assert.ok(badge.textContent.endsWith(mode));assert.equal(badge.hidden,false);
    assert.equal(window.__HOLLOW_WAKE_STORAGE_SCOPE__,'desktop:existing');
  }
});
