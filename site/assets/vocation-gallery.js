import { VOCATION_SCENES, visibleVocations } from './vocation-scenes.js?v=hw16';

export function mountVocationGallery(root, { entries=VOCATION_SCENES, unlockedVocationIds=null, classId=null, className='This class' }={}) {
  const list=root.querySelector('[data-vocation-tabs]');
  const panel=root.querySelector('[data-vocation-panel]');
  const art=root.querySelector('[data-vocation-art]');
  const img=art.querySelector('img');
  const secret=root.querySelector('[data-vocation-secret]');
  const status=root.querySelector('[data-vocation-status]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const loaded=new Map();
  let currentClass, revealSecrets=false, entriesShown=[], buttons=[], shown=null, intent=0;
  // Native details stays open during its closing animation. That departing
  // content is inert already and must not start fetching a new character.
  const isOpen=()=>root.open&&!root.querySelector('.disclosure-fold')?.inert;
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
    panel.setAttribute('role',buttons.length?'tabpanel':'region');
    panel.setAttribute('aria-labelledby',buttons.length?'vocation-tab-'+scene.id:'vocation-name');
    panel.hidden=false;shown=scene.id;mark(shown);
  }
  async function select(scene) {
    const ticket=++intent;mark(scene.id);status.replaceChildren();
    if(shown===scene.id&&img.getAttribute('src')===scene.src){panel.removeAttribute('aria-busy');art.classList.remove('is-changing');return;}
    panel.setAttribute('aria-busy','true');
    try {
      await load(scene.src);
      if(ticket!==intent||!isOpen())return;
      if(shown&&!reduced.matches){art.classList.add('is-changing');await new Promise(resolve=>setTimeout(resolve,120));}
      if(ticket!==intent||!isOpen())return;
      present(scene,scene.src);
      await img.decode().catch(()=>{});
    } catch (_) {
      if(ticket!==intent||!isOpen())return;
      if(!shown)present(scene,'assets/art/hand.webp');else mark(shown);
      const retry=document.createElement('button');retry.type='button';retry.className='vocation-retry';retry.textContent='Try loading the painting again';
      retry.addEventListener('click',()=>select(scene));
      status.replaceChildren(document.createTextNode('This painting could not load. '),retry);
    } finally {
      if(ticket===intent){panel.removeAttribute('aria-busy');art.classList.remove('is-changing');}
    }
  }
  function buildTabs() {
    entriesShown=visibleVocations(entries,{classId:currentClass,unlockedVocationIds,revealSecrets});
    // One calling needs no redundant selector. Multiple paths retain real tabs.
    buttons=entriesShown.length<2?[]:entriesShown.map((scene,index)=>{
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
    list.replaceChildren(...buttons);list.hidden=!buttons.length;mark(shown||entriesShown[0]?.id);
    if(shown){panel.setAttribute('role',buttons.length?'tabpanel':'region');panel.setAttribute('aria-labelledby',buttons.length?'vocation-tab-'+shown:'vocation-name');}
    secret.hidden=unlockedVocationIds!==null||revealSecrets||!entries.some(entry=>entry.classIds.includes(currentClass)&&entry.secret);
  }
  function setClass(id,name='This class') {
    root.querySelector('[data-vocation-class-label]').textContent='The '+name+'’s calling';
    if(currentClass===id)return;
    currentClass=id;root.dataset.vocationClass=id||'';
    // Invalidate pending loads and hide the previous person before a new fetch.
    ++intent;shown=null;revealSecrets=false;panel.hidden=true;
    panel.removeAttribute('aria-busy');art.classList.remove('is-changing');
    img.removeAttribute('src');img.alt='';
    for(const key of ['name','style','title','description'])root.querySelector('[data-vocation-'+key+']').textContent='';
    status.replaceChildren();buildTabs();
    if(!entriesShown.length)status.textContent=secret.hidden?'This class does not currently have a Vocation.':'A calling waits to be discovered.';
    else if(isOpen())select(entriesShown[0]);
  }
  secret.querySelector('button').addEventListener('click',()=>{
    revealSecrets=true;buildTabs();const scene=entriesShown.find(entry=>entry.secret);
    if(scene){
      const tab=buttons.find(button=>button.dataset.vocation===scene.id), owner=currentClass;
      tab?.focus();
      select(scene).then(()=>{
        if(!tab&&root.open&&currentClass===owner&&shown===scene.id){
          const heading=root.querySelector('[data-vocation-name]');heading.tabIndex=-1;heading.focus({preventScroll:true});
        }
      });
    }
  });
  function syncDisclosure(open) {
    if(!open){++intent;mark(shown||entriesShown[0]?.id);panel.removeAttribute('aria-busy');art.classList.remove('is-changing');}
    else if(!shown&&entriesShown.length)select(entriesShown[0]);
  }
  root.addEventListener('toggle',()=>syncDisclosure(isOpen()));
  root.addEventListener('hw:disclosure-intent',event=>syncDisclosure(event.detail.open));
  // A missing class is deliberately an empty preview, never the full catalogue.
  setClass(classId,className);root.dataset.vocationReady='true';
  return {setClass};
}
