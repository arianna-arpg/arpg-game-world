/* The sleeping insignia stays shared; only its brief manifestation changes.
   Authored SVG geometry, no image downloads or continuously running animation. */
(function () {
  'use strict';
  var serial = 0;
  var options = [
    { id: 'starless', name: 'The Starless Eye', letter: 'A', description: 'An ancient celestial seal becomes a dark sun. Gold filaments bend into its pupil; a few stars escape the ring.' },
    { id: 'chorus', name: 'The Watching Chorus', letter: 'B', description: 'The seal briefly becomes a living intelligence. Branching tendrils and smaller watchful eyes grow from its three points.' },
    { id: 'rift', name: 'The Violet Rupture', letter: 'C', description: 'A violet fracture opens behind the eye. The ring splinters into luminous slivers, then quietly gathers itself again.' }
  ];
  function point(radius, angle) { return [(16 + radius*Math.cos(angle)).toFixed(3), (16 + radius*Math.sin(angle)).toFixed(3)].join(' '); }
  function path(d, stroke, width, opacity) { return '<path d="'+d+'" fill="none" stroke="'+stroke+'" stroke-width="'+width+'" opacity="'+opacity+'" stroke-linecap="round"/>'; }
  function art(id) {
    var uid = 'obs-art-'+ ++serial, chorus=id==='chorus', rift=id==='rift';
    var gold = rift ? '#c6a5e0' : chorus ? '#b6d5bc' : '#d8c08c';
    var teal = rift ? '#8275b3' : '#548f8c';
    var fibers='', filaments='', stars='', detail='';
    for(var i=0;i<176;i++) {
      var a=i/176*Math.PI*2, bend=Math.sin(i*13.7)*.12;
      var inner=1.25 + .20*Math.sin(i*7.3), outer=4.82;
      fibers+=path('M'+point(inner,a)+'Q'+point(2.8,a+bend)+' '+point(outer,a+.045),i%4 ? gold : teal,(.012+(i%5)*.007).toFixed(3),(.22+(i%7)*.075).toFixed(2));
    }
    for(var j=0;j<31;j++) {
      var theta=j*2.39996, radius=5.3+(j%8)*1.1;
      stars+='<circle cx="'+(16+Math.cos(theta)*radius).toFixed(3)+'" cy="'+(16+Math.sin(theta)*radius).toFixed(3)+'" r="'+(j%5===0 ? '.065' : '.025')+'" fill="'+gold+'" opacity="'+(.25+(j%5)*.12)+'"/>';
    }
    if(chorus) {
      for(var t=0;t<27;t++) {
        var angle=t/27*Math.PI*2, len=7.6+(t%5)*1.65;
        var curve='M'+point(4.45,angle)+'C'+point(6.8,angle+.20)+' '+point(len,angle-.19)+' '+point(len+.7,angle+.20);
        filaments+=path(curve,'#071517',.22,.92)+path(curve,gold,.027,.52);
        if(t%3===0) filaments+=path('M'+point(len-1,angle+.04)+'Q'+point(len+.4,angle-.15)+' '+point(len+1.5,angle-.13),teal,.035,.55);
      }
      for(var e=0;e<3;e++) {
        var deg=e*120, eye='<g transform="rotate('+deg+' 16 16)"><path d="M15.12 4Q16 2.85 16.88 4Q16 5.1 15.12 4" fill="#102b29" stroke="'+gold+'" stroke-width=".065"/><ellipse cx="16" cy="4" rx=".27" ry=".52" fill="'+gold+'"/><ellipse cx="16" cy="4" rx=".11" ry=".41" fill="#02090d"/></g>';
        detail+=eye;
      }
    } else if(rift) {
      for(var r=0;r<33;r++) {
        var ra=r/33*Math.PI*2, end=8.5+(r%6)*.8;
        var tear='M'+point(4.5,ra)+'L'+point(6.8,ra+.09)+' '+point(7.2,ra-.055)+' '+point(end,ra+.10)+' '+point(end+.7,ra+.08);
        filaments+=path(tear,'#101321',.28,.8)+path(tear,'#9e8ec3',r%3 ? .025 : .06,r%3 ? .35 : .7);
      }
      for(var s=0;s<18;s++) {
        var sa=s/18*Math.PI*2, rr=12.2+(s%3)*.18;
        detail+=path('M'+point(rr,sa)+'A'+rr+' '+rr+' 0 0 1 '+point(rr,sa+.20),gold,.075,.63);
      }
    } else {
      for(var f=0;f<21;f++) {
        var fa=f/21*Math.PI*2, reach=6.5+(f%4)*1.6;
        filaments+=path('M'+point(4.5,fa)+'C'+point(5.4,fa+.32)+' '+point(reach,fa+.55)+' '+point(reach+.9,fa+.72),f%3 ? teal : gold,.027,.48);
      }
      detail=path('M'+point(12.5,.22)+'A12.5 12.5 0 0 1 '+point(12.5,1.85),gold,.065,.55)+path('M'+point(12.5,3.2)+'A12.5 12.5 0 0 1 '+point(12.5,4.9),teal,.05,.5);
    }
    return '<svg class="hero-eye observer-art" data-observer-art="'+id+'" viewBox="0 0 32 32" fill="none" aria-hidden="true">'+
      '<defs><radialGradient id="'+uid+'-iris"><stop stop-color="#02070a"/><stop offset=".26" stop-color="#071116"/><stop offset=".34" stop-color="'+gold+'"/><stop offset=".49" stop-color="'+teal+'"/><stop offset=".78" stop-color="#203d43"/><stop offset="1" stop-color="#030a10"/></radialGradient>'+
      '<radialGradient id="'+uid+'-halo"><stop offset=".2" stop-color="#02060b" stop-opacity=".95"/><stop offset=".4" stop-color="'+teal+'" stop-opacity=".26"/><stop offset=".75" stop-color="'+teal+'" stop-opacity=".04"/><stop offset="1" stop-opacity="0"/></radialGradient>'+
      '<radialGradient id="'+uid+'-cornea" cx="35%" cy="24%"><stop stop-color="#e2e5d9" stop-opacity=".23"/><stop offset=".43" stop-color="#a0c9c5" stop-opacity=".025"/><stop offset="1" stop-opacity="0"/></radialGradient>'+
      '<clipPath id="'+uid+'-aperture"><circle cx="16" cy="16" r="4.37"/></clipPath></defs>'+
      '<g class="observer-manifest" opacity="0"><circle cx="16" cy="16" r="15.4" fill="url(#'+uid+'-halo)"/><g class="observer-filaments">'+filaments+'</g><g class="observer-constellation">'+stars+detail+'</g></g>'+
      '<g class="hw-eyeg" opacity="0" transform="translate(16 16) scale(1 0) translate(-16 -16)"><g clip-path="url(#'+uid+'-aperture)"><circle cx="16" cy="16" r="4.4" fill="#071318"/>'+
      '<g class="hw-gaze"><circle cx="16" cy="16" r="5.3" fill="url(#'+uid+'-iris)"/><g class="observer-iris-fibers">'+fibers+'</g>'+
      (chorus ? '<path d="M16 14.45C15.18 15.26 15.18 16.74 16 17.55C16.82 16.74 16.82 15.26 16 14.45Z" fill="#010609"/>' : '<circle cx="16" cy="16" r="1.29" fill="#010509"/>')+
      '<circle cx="16" cy="16" r="1.32" stroke="'+gold+'" stroke-width=".038" opacity=".72"/><path d="M14.35 13.5Q15.2 12.95 16.1 13.2" stroke="#dfebe1" stroke-width=".065" opacity=".55"/></g>'+
      '<circle cx="16" cy="16" r="4.38" fill="url(#'+uid+'-cornea)"/></g><circle cx="16" cy="16" r="4.37" stroke="'+gold+'" stroke-width=".045" opacity=".8"/></g></svg>';
  }
  function mount(host, id) {
    id=options.some(function(o){return o.id===id;}) ? id : 'rift';
    host.querySelectorAll('.hero-eye').forEach(function(el){el.remove();});
    host.insertAdjacentHTML('beforeend',art(id));
    host.dataset.observerVariant=id;
    return host.querySelector('.observer-art');
  }
  function set(host,k,px,py,time) {
    var svg=host.querySelector('.observer-art'); if(!svg)return;
    var opening=Math.max(0,Math.min(1,k));
    var eye=svg.querySelector('.hw-eyeg');
    eye.setAttribute('opacity',opening<.005 ? '0' : '1');
    eye.setAttribute('transform','translate(16 16) scale(1 '+opening.toFixed(3)+') translate(-16 -16)');
    svg.querySelector('.hw-gaze').setAttribute('transform','translate('+px.toFixed(2)+' '+py.toFixed(2)+')');
    svg.querySelector('.observer-manifest').setAttribute('opacity',Math.pow(opening,1.5).toFixed(3));
    svg.querySelector('.observer-filaments').setAttribute('transform','rotate('+(Math.sin((time||0)*.7)*2.3*opening).toFixed(3)+' 16 16)');
    svg.querySelector('.observer-iris-fibers').setAttribute('transform','rotate('+(Math.sin((time||0)*.33)*3*opening).toFixed(3)+' 16 16)');
    host.style.setProperty('--observer-open',opening.toFixed(3));
  }
  window.HollowObserverArt={options:options,mount:mount,set:set};
  var host=document.querySelector('.hero-mark-wrap');
  if(host)mount(host,host.dataset.observerVariant);
})();
