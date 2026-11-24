/* Native details is the fallback. Enhanced scrolls exchange their invitation
   for a small close control, preserving focus and the existing lazy lifecycles. */
(function(){
  var reduced=matchMedia('(prefers-reduced-motion: reduce)');
  var classes=document.querySelector('.classes'), stage=document.querySelector('[data-class-stage]');
  var choices=document.querySelector('.class-choice-controls'), art=stage&&stage.querySelector('.class-art');
  var compactAnimations=[], compactTicket=0;
  function finishCompact(){
    ++compactTicket;
    compactAnimations.forEach(function(a){a.cancel();});compactAnimations=[];
    if(!stage||!art)return;
    stage.classList.remove('is-compacting');art.removeAttribute('data-memory-resizing');
    art.dispatchEvent(new Event('hw:memory-layout'));
  }
  function compact(open,animate){
    if(!classes||!stage||!art||classes.classList.contains('is-vocation-open')===open)return;
    var panel=stage.querySelector('.class-panel:not([hidden])');
    var text=panel&&panel.querySelector('.class-copy');
    var base=stage.getBoundingClientRect(),oldArt=art.getBoundingClientRect();
    var from=base.height,oldTop=text&&text.getBoundingClientRect().top,oldLeft=text&&text.getBoundingClientRect().left;
    var oldWidth=text&&text.getBoundingClientRect().width;
    var heading=text&&text.querySelector('h3'),prose=text&&text.querySelector('p:not(.kicker)');
    var oldHeading=heading&&getComputedStyle(heading).fontSize,oldProse=prose&&getComputedStyle(prose).fontSize;
    var surface=art.querySelector('.memory-canvas')||art.querySelector('img'),oldOpacity=getComputedStyle(surface).opacity;
    finishCompact();classes.classList.toggle('is-vocation-open',open);
    if(!animate||reduced.matches||!panel)return;
    var to=stage.getBoundingClientRect().height, offset=oldTop-text.getBoundingClientRect().top;
    var newBase=stage.getBoundingClientRect(),newArt=art.getBoundingClientRect();
    // The frame/crop can flow continuously while the renderer retains its
    // backing buffer. It makes one final resolution adjustment on completion.
    art.setAttribute('data-memory-resizing','');
    stage.classList.add('is-compacting');
    var options={duration:580,easing:'cubic-bezier(.22,.65,.28,1)',fill:'both'};
    var frame=stage.animate([{height:from+'px'},{height:to+'px'}],options);
    var copy=panel.animate([{transform:'translate('+(oldLeft-text.getBoundingClientRect().left)+'px,'+offset+'px)'},{transform:'translate(0,0)'}],options);
    var painting=art.animate([
      {left:oldArt.left-base.left+'px',top:oldArt.top-base.top+'px',width:oldArt.width+'px',height:oldArt.height+'px',maxWidth:'none',bottom:'auto',right:'auto'},
      {left:newArt.left-newBase.left+'px',top:newArt.top-newBase.top+'px',width:newArt.width+'px',height:newArt.height+'px',maxWidth:'none',bottom:'auto',right:'auto'}
    ],options);
    compactAnimations=[frame,copy,painting,surface.animate([{opacity:oldOpacity},{opacity:getComputedStyle(surface).opacity}],options),
      text.animate([{width:oldWidth+'px',maxWidth:'none'},{width:text.getBoundingClientRect().width+'px',maxWidth:'none'}],options),
      heading.animate([{fontSize:oldHeading},{fontSize:getComputedStyle(heading).fontSize}],options),
      prose.animate([{fontSize:oldProse},{fontSize:getComputedStyle(prose).fontSize}],options)];var ticket=compactTicket;
    frame.onfinish=function(){if(ticket===compactTicket)finishCompact();};
  }
  function frameClasses(){
    if(!choices||!stage)return;
    var nav=document.querySelector('header[data-hwnav]');
    var top=(nav?nav.getBoundingClientRect().height:74)+8;
    var naturalTop=stage.getBoundingClientRect().top-choices.offsetHeight;
    if(Math.abs(naturalTop-top)>24)window.scrollTo({top:Math.max(0,window.scrollY+naturalTop-top),behavior:reduced.matches?'instant':'smooth'});
  }
  choices&&choices.addEventListener('click',finishCompact,true);
  choices&&choices.addEventListener('keydown',finishCompact,true);
  window.addEventListener('resize',finishCompact,{passive:true});

  document.querySelectorAll('.field-guide,.vocation-gallery').forEach(function(details){
    var summary=details.querySelector(':scope > summary');
    var body=details.querySelector(':scope > .field-guide-body,:scope > .vocation-body');
    if(!summary||!body||!body.animate)return;
    var vocation=details.classList.contains('vocation-gallery');
    var fold=document.createElement('div');fold.className='disclosure-fold';
    body.before(fold);fold.append(body);
    var close=document.createElement('button');close.type='button';close.className='disclosure-close';
    close.textContent=vocation?'Close Vocations':'Close field guide';
    close.setAttribute('aria-label',close.textContent);
    body.id=body.id||(vocation?'vocation-content':'field-guide-content');
    close.setAttribute('aria-controls',body.id);summary.setAttribute('aria-controls',body.id);
    body.prepend(close);details.classList.add('disclosure-scroll');
    var animation=null, headerAnimation=null,wanted=details.open;
    function cancel(){
      if(animation){animation.cancel();animation=null;}
      if(headerAnimation){headerAnimation.cancel();headerAnimation=null;}
    }
    function mode(){
      details.classList.toggle('is-unfurled',wanted);
      summary.inert=wanted;
      if(wanted)summary.setAttribute('aria-hidden','true');else summary.removeAttribute('aria-hidden');
      fold.inert=!wanted;
    }
    function settle(){
      cancel();details.open=wanted;mode();fold.classList.remove('is-unfolding');
      if(!wanted)fold.inert=false;
    }
    function snapshot(){
      var style=getComputedStyle(summary);
      return {height:details.open?fold.getBoundingClientRect().height:0,opacity:getComputedStyle(fold).opacity,header:{height:summary.getBoundingClientRect().height+'px',minHeight:'0px',paddingTop:style.paddingTop,paddingBottom:style.paddingBottom,opacity:style.opacity,transform:style.transform,visibility:'visible'}};
    }
    function move(from){
      cancel();
      var style=getComputedStyle(summary),to=wanted?body.getBoundingClientRect().height:0;
      fold.classList.add('is-unfolding');
      var options={duration:500,easing:'cubic-bezier(.22,.65,.28,1)',fill:'both'};
      animation=fold.animate([{height:from.height+'px',opacity:from.opacity},{height:to+'px',opacity:wanted?1:.78}],options);
      headerAnimation=summary.animate([from.header,{height:summary.getBoundingClientRect().height+'px',minHeight:'0px',paddingTop:style.paddingTop,paddingBottom:style.paddingBottom,opacity:wanted?0:1,transform:wanted?'translateY(-18px)':'translateY(0)',visibility:'visible'}],options);
      var current=animation;
      current.onfinish=function(){if(animation===current)settle();};
    }
    function request(open,user){
      var from=snapshot(),summaryFocused=summary.contains(document.activeElement);
      var restoreFocus=!open&&(body.contains(document.activeElement)||summaryFocused);
      cancel();wanted=open;
      if(wanted)details.open=true;
      mode();
      if(vocation)compact(wanted,user);
      details.dispatchEvent(new CustomEvent('hw:disclosure-intent',{detail:{open:wanted}}));
      if(reduced.matches||!user)settle();else move(from);
      if(wanted&&summaryFocused)close.focus({preventScroll:true});
      else if(restoreFocus){summary.focus({preventScroll:true});}
      if(wanted&&vocation&&user)frameClasses();
    }
    summary.addEventListener('click',function(event){
      if(event.defaultPrevented||event.button>0||event.target.closest('a,button'))return;
      event.preventDefault();request(animation?!wanted:!details.open,true);
    });
    close.addEventListener('click',function(){request(false,true);});
    close.addEventListener('keydown',function(event){if(event.key==='Escape'){event.preventDefault();request(false,true);}});
    // Only content growth can retarget the unfolding; animated header dimensions
    // are deliberately not observed. Late art and trees remain fully visible.
    new ResizeObserver(function(){
      if(animation&&wanted){var from=snapshot();cancel();mode();move(from);}
    }).observe(body);
    details.addEventListener('toggle',function(){
      if(details.open===wanted)return;
      request(details.open,false);
    });
    reduced.addEventListener('change',function(){if(reduced.matches){finishCompact();if(animation)settle();}});
    mode();if(vocation)compact(wanted,false);if(!wanted)fold.inert=false;
  });
})();
