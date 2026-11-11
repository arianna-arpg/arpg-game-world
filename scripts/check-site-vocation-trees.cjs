// npx electron scripts/check-site-vocation-trees.cjs
// Real-page tree parity, lazy delivery, interaction, races and responsive controls.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-vocation-tree-ui-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
const roster=JSON.parse(fs.readFileSync(path.join(root,'data/classes.json'))).filter(c=>['warrior','necromancer','ranger'].includes(c.id));
let requests=[],fail=false,delay=false;const results=[];
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';requests.push(name);
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 if(name==='/data/classes.json'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(roster));}
 if(fail&&name.endsWith('/gravebinder.json')){res.writeHead(503);return res.end();}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 const send=()=>{if(res.destroyed)return;res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);};
 if(delay&&name.endsWith('/plaguelord.json'))setTimeout(send,700);else send();
});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(name,ok){results.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{
 let win;const timeout=setTimeout(()=>{console.error('Tree checks timed out');app.exit(1);},60000);
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  win=new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});
  const js=code=>win.webContents.executeJavaScript(code),until=async code=>{for(let i=0;i<100;i++){if(await js('!!('+code+')'))return true;await wait(50);}throw new Error('Timed out: '+code);};
  await win.loadURL('http://127.0.0.1:'+server.address().port);await until('document.querySelector("[data-class-shuffle]")&&!document.querySelector("[data-class-shuffle]").hidden');
  check('closed gallery requests no tree code or graph',!requests.some(p=>p.includes('vocation-tree.js')||p.includes('/data/vocations/')));
  check('duplicate overview and all-classes links removed',await js('![...document.querySelectorAll("a")].some(a=>/Explore the overview|View all 39 classes/i.test(a.textContent))'));
  const choose=id=>js(`document.querySelector('[data-class="${id}"]').click();true`);
  const openTree=async name=>until(`document.querySelector('.vocation-tree-frame svg')?.getAttribute('aria-label')===${JSON.stringify(name+' passive tree')}`);
  await choose('warrior');await js('document.querySelector("[data-vocation-gallery]>summary").click();true');await openTree('Warbringer');
  check('opening downloads only selected Vocation',requests.filter(p=>p.includes('/data/vocations/')).join(',')==='/data/vocations/warbringer.json');
  const game=JSON.parse(fs.readFileSync(path.join(root,'data/vocations/warbringer.json')));
  check('rendered nodes and edges exactly match the exported game graph',await js(`(()=>{const tree=${JSON.stringify(game)},svg=document.querySelector('.vocation-tree-frame svg');return svg.querySelectorAll('[data-vocation-node]').length===tree.nodes.length&&svg.querySelectorAll('line').length===tree.edges.length&&tree.nodes.every(n=>svg.querySelector('[data-vocation-node="'+n.id+'"]').getAttribute('transform')==='translate('+n.x+' '+n.y+')')})()`));
  await js('document.querySelector("[data-vocation-node]").dispatchEvent(new PointerEvent("pointerenter",{pointerType:"mouse"}));true');
  check('mouse hover shows authored node description',await js(`!document.querySelector('.vocation-node-tip').hidden&&document.querySelector('.vocation-node-tip').textContent.includes(${JSON.stringify(game.nodes.find(n=>n.id===game.root).description)})`));
  await js('document.querySelector("[data-vocation-node]").focus();document.activeElement.dispatchEvent(new KeyboardEvent("keydown",{key:"End",bubbles:true}));true');
  check('keyboard navigation moves focus with one tab stop',await js('document.activeElement===[...document.querySelectorAll("[data-vocation-node]")].at(-1)&&[...document.querySelectorAll("[data-vocation-node]")].filter(node=>node.tabIndex===0).length===1'));
  await js('document.activeElement.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));true');
  check('Escape dismisses inspection',await js('document.querySelector(".vocation-node-tip").hidden'));
  const choice=game.nodes.find(n=>n.choice);
  if(choice){await js(`document.querySelector('[data-vocation-node="${choice.id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));true`);check('choice tooltip includes every real doctrine option',await js(`${JSON.stringify(choice.choice.options.map(o=>o.name))}.every(name=>document.querySelector('.vocation-node-tip').textContent.includes(name))`));}
  await js('document.querySelector(".vocation-tree-expand").click();true');
  check('expanded view moves the same graph into a modal',await js('document.querySelector(".vocation-tree-dialog").open&&document.querySelectorAll(".vocation-tree-frame svg").length===1&&!!document.querySelector(".vocation-tree-dialog svg")'));
  await js('document.querySelector(".vocation-tree-dialog [data-vocation-node]").dispatchEvent(new MouseEvent("click",{bubbles:true}));true');
  check('tap tooltip stays visible above expanded tree',await js('!document.querySelector(".vocation-tree-dialog .vocation-node-tip").hidden'));
  await js('document.querySelector(".vocation-tree-dialog-heading button").click();true');await wait(30);
  check('closing expansion returns graph to card',await js('!!document.querySelector("[data-vocation-tree] svg")&&!document.querySelector(".vocation-tree-dialog").open'));
  fail=true;await choose('necromancer');await until('document.querySelector(".vocation-tree-retry")');
  check('failed graph keeps an actionable retry',await js('document.querySelector(".vocation-tree-status").textContent.includes("could not load")&&!document.querySelector("[data-vocation-tree] svg")'));
  fail=false;await js('document.querySelector(".vocation-tree-retry").click();true');await openTree('Gravebinder');
  check('retry restores the selected calling',true);
  delay=true;await js('document.getElementById("vocation-tab-plaguelord").click();true');await until('document.querySelector("[data-vocation-tree]").hasAttribute("aria-busy")');
  await choose('warrior');await openTree('Warbringer');await wait(800);
  check('late graph delivery never replaces the current calling',await js('document.querySelector(".vocation-tree-frame svg").getAttribute("aria-label")==="Warbringer passive tree"'));
  await choose('ranger');await openTree('Wildstalker');
  check('secret tree stays unfetched until reveal',!requests.includes('/data/vocations/greenwarden.json'));
  await js('document.querySelector("[data-vocation-secret] button").click();true');await openTree('Greenwarden');
  check('explicit reveal loads the secret tree',requests.includes('/data/vocations/greenwarden.json'));
  await js('document.querySelector(".vocation-tree-expand").click();document.querySelector("[data-vocation-gallery]>summary").click();true');await wait(450);
  check('closing the disclosure closes modal and tooltip',await js('!document.querySelector(".vocation-tree-dialog").open&&document.querySelector(".vocation-node-tip").hidden'));
  const count=requests.filter(p=>p.includes('/data/vocations/')).length;await choose('necromancer');await wait(100);
  check('closed class changes do not load trees',requests.filter(p=>p.includes('/data/vocations/')).length===count);
  await js('document.querySelector("[data-vocation-gallery]>summary").click();true');await openTree('Gravebinder');
  for(const width of [320,390,760,1265,1440]){
   win.setContentSize(width,900);await wait(120);
   check('responsive tree and class shuffle fit '+width,await js('(()=>{const b=document.querySelector("[data-class-shuffle]"),r=b.getBoundingClientRect(),tabs=document.querySelector(".class-tabs").getBoundingClientRect(),s=document.querySelector("[data-vocation-tree] svg").getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth&&r.bottom<=tabs.top&&r.left>=0&&r.right<=innerWidth&&s.width>200&&parseFloat(getComputedStyle(b).opacity)<.8})()'));
   await js('document.querySelector(".vocation-tree-expand").scrollIntoView({behavior:"instant",block:"center"});true');
   check('section rail does not intercept tree control at '+width,await js('(()=>{const b=document.querySelector(".vocation-tree-expand"),r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("button")===b})()'));
  }
  check('tree loading never fetches full passive database',!requests.includes('/data/passives.json'));
  console.log('VOCATION TREES '+results.filter(Boolean).length+'/'+results.length);if(results.some(ok=>!ok))process.exitCode=1;
 }catch(error){console.error(error);process.exitCode=1;}
 finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}
});
