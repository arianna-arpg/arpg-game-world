/* Short, demand-driven handoffs. One owner per surface; no cloned cards,
   animation loops, or work left running after a disclosure/page is hidden. */
(function(){
  var reduced=matchMedia('(prefers-reduced-motion: reduce)'), active=new Map(),images=new Map();
  var easing='cubic-bezier(.22,.65,.28,1)';
  var covered=document.documentElement.classList.contains('hwcine-covered');
  function visible(host){
    var r=host.getBoundingClientRect(),d=host.closest('details');
    return !reduced.matches&&!document.hidden&&!covered&&(!d||(d.open&&!d.querySelector('.disclosure-fold')?.inert))&&r.top<innerHeight&&r.bottom>0;
  }
  function release(state){
    state.effects.forEach(function(a){a.cancel();});state.effects=[];
    state.host.inert=false;state.host.style.overflow='';state.host.removeAttribute('data-content-changing');
    if(active.get(state.host)===state)active.delete(state.host);
  }
  function cancel(host){
    var state=active.get(host);if(!state)return;
    release(state);state.resolve(false);
  }
  function enter(state,fromHeight){
    var host=state.host,to=host.getBoundingClientRect().height;
    if(!visible(host)||(!to&&!fromHeight)){release(state);return;}
    state.targets.filter(function(el){return el.isConnected&&!el.hidden;}).forEach(function(el,i){
      state.effects.push(el.animate([{opacity:.55,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:440,delay:Math.min(i*24,96),easing:easing,fill:'both'}));
    });
    if(Math.abs(to-fromHeight)>1&&!host.closest('.is-unfolding')){
      host.style.overflow='clip';
      state.effects.push(host.animate([{height:fromHeight+'px'},{height:to+'px'}],{duration:440,easing:easing,fill:'both'}));
    }
    Promise.all(state.effects.map(function(a){return a.finished.catch(function(){});})).then(function(){if(active.get(host)===state)release(state);});
  }
  function swap(host,commit,options){
    if(!host){commit();return Promise.resolve(true);}
    options=options||{};
    var height=host.getBoundingClientRect().height;
    cancel(host);
    return new Promise(function(resolve){
      var state={host:host,commit:commit,resolve:resolve,effects:[],targets:options.targets||[host],committed:false};
      active.set(host,state);host.setAttribute('data-content-changing','');
      function apply(animate){
        if(active.get(host)!==state)return;
        state.effects.forEach(function(a){a.cancel();});state.effects=[];
        state.committed=true;commit();host.inert=false;resolve(true);
        if(animate)enter(state,height);else release(state);
      }
      state.finish=function(){if(state.committed)release(state);else apply(false);};
      function begin(){
        if(active.get(host)!==state||state.committed)return;
        if(!visible(host)||height<2){apply(visible(host));return;}
        host.inert=true;
        state.targets.forEach(function(el){state.effects.push(el.animate([{opacity:getComputedStyle(el).opacity,transform:getComputedStyle(el).transform},{opacity:.5,transform:'translateY(-6px)'}],{duration:130,easing:easing,fill:'both'}));});
        Promise.all(state.effects.map(function(a){return a.finished.catch(function(){});})).then(function(){if(active.get(host)===state&&!state.committed)apply(true);});
      }
      if(options.ready)Promise.resolve(options.ready).catch(function(){}).then(begin);else begin();
    });
  }
  function reveal(host){
    if(!host||!visible(host))return;
    cancel(host);
    var state={host:host,targets:[host],effects:[],resolve:function(){},committed:true};
    state.finish=function(){release(state);};active.set(host,state);enter(state,host.getBoundingClientRect().height);
  }
  function finish(){Array.from(active.values()).forEach(function(state){state.finish();});}
  function warm(sources){
    return Promise.all(sources.map(function(src){
      if(!images.has(src)){
        var img=new Image();img.decoding='async';img.src=src;
        images.set(src,img.decode().catch(function(){images.delete(src);}));
        if(images.size>12)images.delete(images.keys().next().value);
      }
      return images.get(src);
    }));
  }
  document.addEventListener('visibilitychange',function(){if(document.hidden)finish();});
  window.addEventListener('pagehide',finish);
  window.addEventListener('resize',finish,{passive:true});
  document.addEventListener('hw:cinema-coverage',function(event){covered=event.detail.covered;if(covered)finish();});
  reduced.addEventListener('change',function(){if(reduced.matches)finish();});
  window.HWContentMotion={swap:swap,cancel:cancel,reveal:reveal,warm:warm};
})();
