(function(){
  'use strict';
  var art=window.HollowObserverArt, section=document.querySelector('.observer-options');
  var motion=matchMedia('(prefers-reduced-motion: reduce)'), hold=document.querySelector('#hold-open');
  var hosts=[], epoch=0, frame=0, pointer={x:0,y:0};
  art.options.forEach(function(option){
    var card=document.createElement('article');card.className='observer-option';
    card.innerHTML='<div class="study-sigil"><img class="hero-mark" src="assets/brand/observer-sigil.svg" alt="" width="32" height="32"></div><h2><span>OPTION '+option.letter+'</span>'+option.name+'</h2><p>'+option.description+'</p>';
    section.append(card);var host=card.querySelector('.study-sigil');art.mount(host,option.id);hosts.push(host);
  });
  function paint(k,time){hosts.forEach(function(host){var b=host.getBoundingClientRect(),dx=pointer.x-(b.left+b.width/2),dy=pointer.y-(b.top+b.height/2),len=Math.hypot(dx,dy)||1;art.set(host,k,dx/len*.62,dy/len*.62,time);});}
  function rest(){++epoch;cancelAnimationFrame(frame);paint(hold.checked?1:0,4);}
  function replay(){
    hold.checked=false;rest();
    if(motion.matches){hold.checked=true;rest();document.querySelector('#study-status').textContent='Still view · reduced motion is enabled.';return;}
    var ticket=++epoch,start=performance.now();document.querySelector('#study-status').textContent='A brief glance. Then the seal returns.';
    function tick(now){if(ticket!==epoch)return;var t=now-start,k=0;
      if(t<350)k=0;else if(t<790)k=(t-350)/440;else if(t<1990)k=1;else if(t<2430)k=1-(t-1990)/440;
      k=k*k*(3-2*k);paint(k,t/1000);
      if(t<2430)frame=requestAnimationFrame(tick);else document.querySelector('#study-status').textContent='Replay, or hold the eyes open to compare.';
    }frame=requestAnimationFrame(tick);
  }
  document.querySelector('#replay-all').addEventListener('click',replay);
  hold.addEventListener('change',rest);
  window.addEventListener('pointermove',function(e){pointer.x=e.clientX;pointer.y=e.clientY;if(hold.checked)paint(1,4);},{passive:true});
  document.addEventListener('visibilitychange',function(){if(document.hidden)rest();});
  window.addEventListener('pagehide',function(){++epoch;cancelAnimationFrame(frame);});
  motion.addEventListener('change',rest);
  rest();
  var scenes={
    flagellant:{src:'assets/art/classes/flagellant.webp',name:'Flagellant',kicker:'Fortitude / a new beginning',description:'Pain, notarized. A covenant that feeds on its keeper and repays exactly when the flesh runs short. Whole men owe; the broken are owed.',alt:'A hooded Flagellant surrounded by red magic in a ruined cathedral'},
    discovery:{src:'assets/art/world/discovery.webp',name:'Follow the unknown',kicker:'Beyond the last light',description:'Forests, frozen lakes, ruined labyrinths. There is always another road.',alt:'A lantern-bearing traveler approaches a ruined gateway and frozen lake'},
    refuge:{src:'assets/art/world/refuge.webp',name:'Keep a light close',kicker:'A little light against the Gloaming',description:'Lamps and campfires become refuges. Decide how much farther you dare to go.',alt:'A traveler rests beside a campfire under an ancient stone arch'}
  };
  document.querySelectorAll('[data-scene]').forEach(function(button){button.addEventListener('click',function(){
    document.querySelectorAll('[data-scene]').forEach(function(b){b.setAttribute('aria-pressed',String(b===button));});
    var scene=scenes[button.dataset.scene],panel=document.querySelector('.study-painting'),img=panel.querySelector('img');
    img.src=scene.src;img.alt=scene.alt;panel.querySelector('h3').textContent=scene.name;panel.querySelector('.kicker').textContent=scene.kicker;panel.querySelector('.class-copy>p:last-child').textContent=scene.description;
  });});
})();
