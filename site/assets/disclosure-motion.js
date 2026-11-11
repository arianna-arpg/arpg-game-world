/* Native details remains the fallback; motion only enhances an intentional toggle. */
(function(){
  var reduced=matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.field-guide,.vocation-gallery').forEach(function(details){
    var summary=details.querySelector(':scope > summary');
    var body=details.querySelector(':scope > .field-guide-body,:scope > .vocation-body');
    if(!summary||!body||!body.animate)return;
    var fold=document.createElement('div');fold.className='disclosure-fold';
    body.before(fold);fold.append(body);
    var animation=null,wanted=details.open;
    function settle(){
      if(animation){animation.cancel();animation=null;}
      details.open=wanted;fold.classList.remove('is-unfolding');
      fold.style.height='';fold.style.opacity='';
      fold.inert=false;
    }
    function move(from){
      if(animation)animation.cancel();
      var to=wanted?body.getBoundingClientRect().height:0;
      fold.classList.add('is-unfolding');
      fold.inert=!wanted;
      animation=fold.animate([{height:from+'px',opacity:wanted?.78:1},{height:to+'px',opacity:wanted?1:.78}],{duration:420,easing:'cubic-bezier(.22,.65,.28,1)',fill:'both'});
      var current=animation;
      current.onfinish=function(){if(animation===current)settle();};
    }
    summary.addEventListener('click',function(event){
      if(event.defaultPrevented||event.button>0||event.target.closest('a,button'))return;
      if(reduced.matches)return;
      event.preventDefault();
      var from=details.open?fold.getBoundingClientRect().height:0;
      wanted=animation?!wanted:!details.open;
      if(wanted)details.open=true;
      move(from);
      details.dispatchEvent(new CustomEvent('hw:disclosure-intent',{detail:{open:wanted}}));
    });
    // Lazy-loaded Vocation content can grow while its panel is still unfolding.
    new ResizeObserver(function(){
      if(animation&&wanted)move(fold.getBoundingClientRect().height);
    }).observe(body);
    details.addEventListener('toggle',function(){
      if(animation&&!details.open){wanted=false;settle();}
      if(!animation)wanted=details.open;
    });
    reduced.addEventListener('change',function(){if(reduced.matches&&animation)settle();});
  });
})();
