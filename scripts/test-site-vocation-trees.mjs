import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeTempDir} from './temp-dir.cjs';
import {projectVocationTrees} from './site-vocation-data.mjs';

test('every exported Vocation preserves its resolved in-game nodes, positions and edges',t=>{
  const out=makeTempDir('hollow-vocation-trees-');t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
  execFileSync(process.execPath,['--import','tsx','scripts/export-web-data.ts'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,WEB_DATA_OUT:out},stdio:'pipe'});
  const read=name=>JSON.parse(fs.readFileSync(path.join(out,name)));
  const graph=read('passives.json'),files=fs.readdirSync(path.join(out,'vocations'));
  assert.equal(files.length,read('meta.json').counts.vocations);
  for(const file of files){
    const tree=read('vocations/'+file),source=graph.nodes.filter(node=>node.vocation===tree.id),crest=source.find(node=>node.kind==='vocation');
    assert.equal(tree.nodes.length,source.length);
    assert.equal(tree.root,crest.id);
    const ids=new Set(source.map(node=>node.id)),edges=new Set();
    for(const node of source)for(const next of graph.adjacency[node.id]||[])if(ids.has(next))edges.add([node.id,next].sort().join('|'));
    assert.deepEqual(new Set(tree.edges.map(edge=>edge.join('|'))),edges);
    for(const node of tree.nodes){
      const game=source.find(entry=>entry.id===node.id);
      assert.deepEqual([node.x,node.y,node.name,node.description,node.kind],[game.x-crest.x,game.y-crest.y,game.name,game.description,game.kind]);
      assert.ok(node.x>=tree.bounds.x&&node.x<=tree.bounds.x+tree.bounds.width);
      assert.ok(node.y>=tree.bounds.y&&node.y<=tree.bounds.y+tree.bounds.height);
      assert.equal('mods' in node,false,'tooltips do not duplicate engine modifier text');
      if(game.choice){assert.ok(node.choice.options.length>0);assert.ok(node.choice.pick>=1);assert.equal('allocatedDefault' in node.choice,false);}
    }
    assert.ok(fs.statSync(path.join(out,'vocations',file)).size<25000,'each calling stays a small independent request');
  }
});

test('projection retains irregular topology and complete choice descriptions without inventing allocation state',()=>{
  const nodes=[{id:'crest',vocation:'example',kind:'vocation',name:'Example',x:300,y:400,description:'The crest'},
    {id:'choice',vocation:'example',kind:'choice',name:'Turning Point',x:91,y:537,description:'A choice',attributes:{wisdom:2},attributesPct:{willpower:.15},choice:{group:'paths'}},
    {id:'final',vocation:'example',kind:'keystone',name:'Keystone',x:529,y:201,description:'A cost and a power.'}];
  const [tree]=projectVocationTrees({vocations:{example:{id:'example',name:'Example',color:'#abc'}},nodes,
    adjacency:{crest:['choice','external-gate'],choice:['crest','final'],final:['choice']},attributes:{wisdom:{label:'Wisdom'},willpower:{label:'Willpower'}},
    choices:{choiceGroupOf:node=>node.choice?{name:'Three roads',options:[{id:'a',name:'First road',description:'Its actual effect.'}],unique:'character',deal:'sole'}:null,choicePickLimit:()=>1}});
  assert.deepEqual(tree.nodes.map(node=>[node.x,node.y]),[[0,0],[-209,137],[229,-199]]);
  assert.equal(tree.edges.length,2);
  assert.deepEqual(tree.nodes[1].attributes,['+2 Wisdom','15% increased Willpower']);
  assert.deepEqual(tree.nodes[1].choice,{name:'Three roads',pick:1,unique:'character',deal:'sole',options:[{id:'a',name:'First road',description:'Its actual effect.'}]});
  assert.equal(tree.nodes[1].radius,15);
});
