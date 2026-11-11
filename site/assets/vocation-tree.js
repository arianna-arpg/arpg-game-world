/* A read-only window onto the game's exported graph. One selected tree, one
   tooltip, no full passive database and no simulated allocation state. */
const SVG='http://www.w3.org/2000/svg';
const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
const svgElement=(tag,attrs)=>{const el=document.createElementNS(SVG,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));return el;};

export function mountVocationTree(host) {
  if(!host)return {show(){},clear(){},hideTooltip(){}};
  const head=element('div','vocation-tree-heading');
  head.append(element('span','kicker','Vocation tree'));
  const expand=element('button','vocation-tree-expand','Expand ↗');expand.type='button';expand.disabled=true;expand.setAttribute('aria-label','Expand Vocation tree');head.append(expand);
  const frame=element('div','vocation-tree-frame');
  const status=element('p','vocation-tree-status');status.setAttribute('role','status');
  const hint=element('p','vocation-tree-hint','Hover, focus, or tap a node to inspect.');
  host.append(head,frame,status,hint);
  const tip=element('div','vocation-node-tip');tip.id='vocation-node-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
  const dialog=element('dialog','vocation-tree-dialog');dialog.setAttribute('aria-label','Vocation tree');
  const dialogHead=element('div','vocation-tree-dialog-heading'),title=element('h3');
  const close=element('button','','Close ×');close.type='button';dialogHead.append(title,close);dialog.append(dialogHead);document.body.append(dialog);
  const disclosure=host.closest('details'),cache=new Map();
  let epoch=0,current=null,active=null,pinned=false,buttons=[],pending=null;
  function hideTooltip(){if(active){active.removeAttribute('aria-describedby');active.classList.remove('is-inspected');}active=null;pinned=false;tip.hidden=true;}
  function positionTip(){
    if(!active)return;
    const box=active.getBoundingClientRect(),viewport=document.documentElement.clientWidth,width=Math.min(340,viewport-24);
    tip.style.width=width+'px';tip.style.left=Math.min(viewport-width-12,Math.max(12,box.left+box.width/2-width/2))+'px';
    tip.style.maxHeight=Math.max(120,innerHeight-24)+'px';
    const height=tip.getBoundingClientRect().height;
    const above=box.top-height-12,below=box.bottom+12;
    tip.style.top=Math.max(12,Math.min(innerHeight-height-12,above>=12?above:below))+'px';
  }
  function showTooltip(button,node,pin=false){
    hideTooltip();active=button;pinned=pin;button.classList.add('is-inspected');button.setAttribute('aria-describedby',tip.id);
    tip.replaceChildren(element('strong','vocation-node-title',node.name),element('div','vocation-node-meta',node.kindLabel+' · '+current.name),element('p','',node.description));
    for(const line of node.attributes||[])tip.append(element('p','vocation-node-attribute',line));
    if(node.choice){
      const choice=node.choice;
      tip.append(element('p','vocation-node-choice',choice.name+' · Pick '+choice.pick+' of '+choice.options.length));
      if(choice.unique==='character')tip.append(element('p','','Each option once per character.'));
      if(choice.deal==='sole')tip.append(element('p','','One node of this cluster, ever.'));
      if(choice.deal==='first')tip.append(element('p','','Only the first node taken deals; the rest become plain paths.'));
      // These are the same options shown by the game's separate choice popup.
      const options=element('dl','vocation-node-options');
      for(const option of choice.options)options.append(element('dt','',option.name),element('dd','',option.description));
      tip.append(options);
    }
    (dialog.open?dialog:document.body).append(tip);tip.hidden=false;positionTip();
  }
  function restoreInline(){hideTooltip();document.body.append(tip);head.after(frame);}
  function closeExpanded(){if(dialog.open){dialog.close();restoreInline();}}
  // Native Escape also closes the dialog. Ignore a delayed close event if the
  // visitor has already reopened it; that event must not move the new view.
  dialog.addEventListener('close',()=>{if(!dialog.open)restoreInline();});
  close.addEventListener('click',closeExpanded);
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeExpanded();});
  expand.addEventListener('click',()=>{
    if(!current)return;hideTooltip();title.textContent=current.name;dialog.setAttribute('aria-label',current.name+' Vocation tree');dialog.append(frame);dialog.showModal();
  });
  function clear(){++epoch;pending?.abort();pending=null;hideTooltip();closeExpanded();current=null;buttons=[];frame.replaceChildren();status.replaceChildren();expand.disabled=true;host.removeAttribute('aria-busy');}
  async function show(id){
    if(current?.id===id)return;
    clear();const ticket=epoch;host.setAttribute('aria-busy','true');status.textContent='Opening the Vocation tree…';
    try {
      let tree=cache.get(id);
      if(!tree){
        pending=new AbortController();
        const response=await fetch('data/vocations/'+encodeURIComponent(id)+'.json',{signal:pending.signal,cache:'no-cache'});
        if(!response.ok)throw new Error('Tree unavailable');
        tree=await response.json();
        if(tree.id!==id||!tree.nodes?.length||!tree.bounds)throw new Error('Invalid tree');
        cache.set(id,tree);
      }
      if(ticket!==epoch)return;
      current=tree;frame.style.setProperty('--vocation-color',/^#[0-9a-f]{3,8}$/i.test(tree.color)?tree.color:'#d6bd89');
      const bounds=tree.bounds,svg=svgElement('svg',{viewBox:[bounds.x,bounds.y,bounds.width,bounds.height].join(' '),'aria-label':tree.name+' passive tree',role:'group'});
      const nodes=new Map(tree.nodes.map(node=>[node.id,node]));
      for(const [from,to] of tree.edges){const a=nodes.get(from),b=nodes.get(to);if(a&&b)svg.append(svgElement('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'vocation-tree-edge','aria-hidden':true}));}
      const ordered=[...tree.nodes].sort((a,b)=>(a.id===tree.root?-1:b.id===tree.root?1:a.y-b.y||a.x-b.x));
      buttons=ordered.map((node,index)=>{
        const button=svgElement('g',{transform:'translate('+node.x+' '+node.y+')',role:'button',tabindex:index===0?0:-1,'aria-label':node.name+' · '+node.kindLabel,'data-vocation-node':node.id,class:'vocation-tree-node'});
        button.append(svgElement('circle',{r:24,class:'vocation-tree-hit'}));
        button.append(svgElement('circle',{r:node.radius,fill:node.fill,stroke:node.stroke,'stroke-width':node.strokeWidth,...(node.kind==='choice'?{'stroke-dasharray':'4 3'}:{}),class:'vocation-tree-orb'}));
        button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&!pinned)showTooltip(button,node);});
        button.addEventListener('pointerleave',()=>{if(active===button&&!pinned&&document.activeElement!==button)hideTooltip();});
        button.addEventListener('focus',()=>{buttons.forEach(other=>other.setAttribute('tabindex',other===button?'0':'-1'));showTooltip(button,node);});
        button.addEventListener('blur',()=>{if(active===button)hideTooltip();});
        button.addEventListener('click',()=>{if(active===button&&pinned)hideTooltip();else showTooltip(button,node,true);});
        button.addEventListener('keydown',event=>{
          if(event.key==='Escape'){if(!tip.hidden){event.preventDefault();event.stopPropagation();hideTooltip();}return;}
          if(event.key==='Enter'||event.key===' '){event.preventDefault();showTooltip(button,node,true);return;}
          let next;
          if(event.key==='Home')next=buttons[0];
          else if(event.key==='End')next=buttons.at(-1);
          else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
            const horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight',sign=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1;
            const candidates=ordered.map((other,i)=>{const along=(horizontal?other.x-node.x:other.y-node.y)*sign,cross=Math.abs(horizontal?other.y-node.y:other.x-node.x);return {i,along,score:Math.hypot(other.x-node.x,other.y-node.y)+cross*2};}).filter(other=>other.along>0).sort((a,b)=>a.score-b.score);
            next=buttons[candidates[0]?.i];
          }else return;
          event.preventDefault();next?.focus({preventScroll:true});
        });
        svg.append(button);return button;
      });
      frame.replaceChildren(svg);status.textContent='';expand.disabled=false;
    }catch(error){
      if(ticket!==epoch||error.name==='AbortError')return;
      status.textContent='The tree could not load. ';
      const retry=element('button','vocation-tree-retry','Try again');retry.type='button';retry.addEventListener('click',()=>show(id));status.append(retry);
    }finally{if(ticket===epoch){pending=null;host.removeAttribute('aria-busy');}}
  }
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('[data-vocation-node]')&&!tip.contains(event.target))hideTooltip();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hideTooltip();});
  window.addEventListener('scroll',hideTooltip,{passive:true});window.addEventListener('resize',hideTooltip);
  if(disclosure){
    disclosure.addEventListener('toggle',()=>{if(!disclosure.open){hideTooltip();closeExpanded();}});
    disclosure.addEventListener('hw:disclosure-intent',event=>{if(!event.detail.open){hideTooltip();closeExpanded();}});
  }
  return {show,clear,hideTooltip};
}
