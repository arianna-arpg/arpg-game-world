import { VOCATION_SCENES, visibleVocations } from './vocation-scenes.js?v=hw11';

export function mountVocationGallery(root, { entries=VOCATION_SCENES, unlockedVocationIds=null }={}) {
  const list=root.querySelector('[data-vocation-tabs]');
  const panel=root.querySelector('[data-vocation-panel]');
  const art=root.querySelector('[data-vocation-art]');
  const img=art.querySelector('img');
  const secret=root.querySelector('[data-vocation-secret]');
  const status=root.querySelector('[data-vocation-status]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const loaded=new Map();
  let revealSecrets=false, entriesShown=[], buttons=[], shown=null, intent=0;
  function mark(id) {
    buttons.forEach(button=>{const selected=button.dataset.vocation===id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
  }
  function load(src) {
    if(!loaded.has(src))loaded.set(src,new Promise((resolve,reject)=>{
      const next=new Image();next.onload=()=>next.decode().then(resolve,resolve);next.onerror=reject;next.src=src;
    }).catch(error=>{loaded.delete(src);throw error;}));
    return loaded.get(src);
  }
  function present(scene,source) {
    img.alt=source===scene.src?scene.alt:'A spectral hand cradles a curling flame of pale light';
    img.src=source;
    root.querySelector('[data-vocation-name]').textContent=scene.name;
    root.querySelector('[data-vocation-style]').textContent=scene.style;
    root.querySelector('[data-vocation-title]').textContent=scene.title;
    root.querySelector('[data-vocation-description]').textContent=scene.description;
    panel.setAttribute('aria-labelledby','vocation-tab-'+scene.id);
    shown=scene.id;mark(shown);
  }
  async function select(scene) {
    const ticket=++intent;mark(scene.id);status.textContent='';
    if(shown===scene.id&&img.getAttribute('src')===scene.src){panel.removeAttribute('aria-busy');art.classList.remove('is-changing');return;}
    panel.setAttribute('aria-busy','true');
    try {
      await load(scene.src);
      if(ticket!==intent||!root.open)return;
      if(shown&&!reduced.matches){art.classList.add('is-changing');await new Promise(resolve=>setTimeout(resolve,120));}
      if(ticket!==intent||!root.open)return;
      present(scene,scene.src);
      await img.decode().catch(()=>{});
      if(ticket!==intent)return;
    } catch (_) {
      if(ticket!==intent||!root.open)return;
      if(!shown)present(scene,'assets/art/hand.webp');else mark(shown);
      status.textContent='This painting could not load. Select a calling to try again.';
    } finally {
      if(ticket===intent){panel.removeAttribute('aria-busy');art.classList.remove('is-changing');}
    }
  }
  function buildTabs() {
    entriesShown=visibleVocations(entries,{unlockedVocationIds,revealSecrets});
    buttons=entriesShown.map((scene,index)=>{
      const button=document.createElement('button');button.type='button';button.id='vocation-tab-'+scene.id;
      button.dataset.vocation=scene.id;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);
      button.textContent=scene.name;button.setAttribute('aria-selected','false');button.tabIndex=-1;
      button.addEventListener('click',()=>select(scene));
      button.addEventListener('keydown',event=>{
        let next;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%buttons.length;
        if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index+buttons.length-1)%buttons.length;
        if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;
        if(next===undefined)return;event.preventDefault();buttons[next].focus();select(entriesShown[next]);
      });return button;
    });
    list.replaceChildren(...buttons);mark(shown||entriesShown[0]?.id);
    secret.hidden=unlockedVocationIds!==null||revealSecrets||!entries.some(entry=>entry.secret);
  }
  secret.querySelector('button').addEventListener('click',()=>{
    revealSecrets=true;buildTabs();const scene=entriesShown.find(entry=>entry.secret);
    if(scene){buttons.find(button=>button.dataset.vocation===scene.id).focus();select(scene);}
  });
  root.addEventListener('toggle',()=>{
    if(!root.open){++intent;mark(shown||entriesShown[0]?.id);panel.removeAttribute('aria-busy');art.classList.remove('is-changing');}
    else if(!shown&&entriesShown.length)select(entriesShown[0]);
  });
  buildTabs();root.dataset.vocationReady='true';
  if(root.open&&entriesShown.length)select(entriesShown[0]);
  if(!entriesShown.length){panel.hidden=true;status.textContent='No callings are available to preview yet.';}
}
