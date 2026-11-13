/* Small shared artwork adapter. No catalogue download and no eager image pool. */
(function(){
 'use strict';
 var source=document.currentScript?.src,siteRoot=source?new URL('../',source):new URL(document.documentElement.dataset.page==='home'?'./':'../',location.href),pending=new Set(),observed=new WeakSet();
 var esc=function(value){return String(value).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
 function url(entry,kind){return entry&&['skill','support','unique'].includes(kind)&&/^[a-z0-9_-]+$/.test(entry.id||'')&&/^[a-f0-9]{12}$/.test(entry.icon||'')?new URL('assets/art/icons/'+kind+'/'+entry.id+'.'+entry.icon+'.webp',siteRoot).href:null;}
 function html(entry,kind,fallback){
  var src=url(entry,kind),mark=fallback||'<span class="hw-icon-letter">'+esc({skill:'◇',support:'✧',unique:'◆'}[kind]||'◇')+'</span>';
  return '<span class="hw-icon" aria-hidden="true"><span class="hw-icon-fallback">'+mark+'</span>'+(src?'<img data-hw-icon="'+esc(src)+'" width="256" height="256" alt="" decoding="async" loading="lazy">':'')+'</span>';
 }
 function load(img){
  pending.delete(img);observer?.unobserve(img);if(!img.isConnected)return;
  img.addEventListener('load',function(){img.parentElement?.classList.add('is-ready');},{once:true});
  img.addEventListener('error',function(){img.remove();},{once:true});
  img.src=img.dataset.hwIcon;delete img.dataset.hwIcon;
 }
 var observer=typeof IntersectionObserver==='function'?new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)load(entry.target);});},{rootMargin:'250px 0px'}):null;
 function watch(root){
  pending.forEach(function(img){if(!img.isConnected){observer?.unobserve(img);pending.delete(img);}});
  root.querySelectorAll('img[data-hw-icon]').forEach(function(img){if(observed.has(img))return;observed.add(img);if(observer){pending.add(img);observer.observe(img);}else load(img);});
 }
 window.HWIcons={html:html,watch:watch,url:url};
 var style=document.createElement('style');style.textContent=
 '.hw-icon{position:relative;display:inline-grid;place-items:center;width:40px;height:40px;flex:0 0 auto;overflow:hidden;border:1px solid #ae946844;background:#13131b;box-shadow:inset 0 0 0 2px #0003;vertical-align:middle;color:var(--c,var(--accent,#b8a077))}'+
 '.hw-icon-fallback{display:grid;place-items:center;width:100%;height:100%}.hw-icon-fallback svg{width:75%;height:75%}.hw-icon-letter{font:25px Georgia,serif}'+
 '.hw-icon img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;opacity:0}.hw-icon.is-ready img{opacity:1}.hw-icon.is-ready .hw-icon-fallback{visibility:hidden}'+
 '.hwsc-chip>.hw-icon{width:40px;height:40px}.hwsc-tip>.hw-icon{float:right;width:76px;height:76px;margin:0 0 10px 14px}.hwsc-tip:after{content:"";display:table;clear:both}'+
 '.card>.hw-icon{float:left;width:48px;height:48px;margin:0 12px 7px 0}.card.has-icon .cname{display:block;min-height:48px}.card.has-icon .cname .dot{display:none}.card.has-icon .kindpill{display:inline-block;margin-left:6px}.card.has-icon .cdesc{clear:both}'+
 '.drawer .dhead>.hw-icon{width:64px;height:64px}.drawer .dhead .titles{min-width:0}.db-unique-mods{padding:0;list-style:none;color:var(--ink-dim)}.db-unique-mods li{margin-bottom:9px}.db-unique-flavor{color:var(--ink-faint);font-style:italic;margin:18px 0}'+
 '@media(max-width:760px){.hwsc-chip>.hw-icon{width:34px;height:34px}}@media(max-width:420px){.drawer .dhead{padding:18px 16px;gap:10px}.drawer .dhead>.hw-icon{width:48px;height:48px}.drawer h2{font-size:22px}}';document.head.appendChild(style);
})();
