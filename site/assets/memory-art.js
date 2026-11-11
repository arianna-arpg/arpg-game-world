/* Paintings dissolve into the page through the cinema's memory-rim vocabulary.
   Adapted from this project's cinema-theater.js: slow domain-warped noise,
   a rounded eye and smoke in the feather. Here the rim removes alpha instead
   of painting ink, so the real page atmosphere remains visible underneath. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var still = function () { return reduced.matches || !!(navigator.connection && navigator.connection.saveData); };
  var views = [], frame = 0, last = 0;
  var covered = document.documentElement.classList.contains('hwcine-covered');
  var vertex = `attribute vec2 aPos; varying vec2 vUv;
    void main(){vUv=vec2((aPos.x+1.)*.5,(1.-aPos.y)*.5);gl_Position=vec4(aPos,0.,1.);}`;
  var fragment = `precision highp float;
    varying vec2 vUv; uniform sampler2D uImage; uniform vec4 uCrop;
    uniform float uAspect; uniform float uTime; uniform float uFeather; uniform float uRadius;
    uniform vec4 uFrame; uniform float uShade; uniform vec3 uPageBg;
    uniform float uLiving; uniform float uMotion;
    float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      float a=mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y);
      float b=mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y);
      return mix(a,b,f.z)*2.-1.;}
    float mist(vec3 p){float s=0.,a=.5;for(int k=0;k<3;k++){s+=a*noise(p);p=p*2.03+vec3(17.1,5.3,3.7);a*=.5;}return s;}
    float grove(vec2 uv,vec2 center,vec2 radius){return exp(-pow(length((uv-center)/radius),4.));}
    float channel(vec2 uv,vec2 a,vec2 b,float width){
      vec2 ab=b-a; float t=clamp(dot(uv-a,ab)/dot(ab,ab),0.,1.);
      return 1.-smoothstep(width*.35,width,length(uv-a-ab*t));
    }
    void main(){
      // The texture keeps its original crop; the canvas includes room outside it.
      vec2 uv=(vUv-uFrame.xy)/uFrame.zw;
      vec2 p=(uv-.5)*vec2(uAspect,1.);vec2 b=vec2(uAspect*.5,.5);
      float r=min(uRadius,min(b.x,b.y));vec2 q=abs(p)-(b-r);
      float d=length(max(q,0.))+min(max(q.x,q.y),0.)-r;
      float alpha=1.; float wisp=0.; vec2 drift=vec2(0.);
      if(d>-.43){
        float angle=uTime*.065+1.8*length(p);
        vec2 sw=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*p*3.4;
        vec3 s=vec3(sw,uTime*.055);
        vec2 w=vec2(mist(s+vec3(1.7,9.2,0)),mist(s+vec3(8.3,2.8,0)));
        float n=mist(s+vec3(w*1.6,0));
        alpha=1.-smoothstep(-uFeather,-.015,d+.075*n*2.2);
        alpha=clamp(alpha+.24*mist(vec3(sw*2.4,uTime*.088+4.))*alpha*(1.-alpha)*2.4,0.,1.);
        // The same flow continues outside the image as sparse curling filaments.
        // Its envelope dies well before the expanded canvas, never on the image box.
        float curl=sin(d*37.+atan(p.y,p.x)*3.2+n*7.-uTime*.19);
        float envelope=exp(-pow((d+.025)/.115,2.));
        wisp=pow(max(0.,curl),3.)*envelope*(.14+.1*n)*(1.-alpha);
        drift=w*.035*smoothstep(-.18,.08,d);
      }
      vec2 sampleUV=clamp(uv+drift,vec2(.002),vec2(.998));
      vec2 sourceUV=uCrop.xy+sampleUV*uCrop.zw;
      float river=0.;
      // Motion is anchored to the source painting, so responsive crops cannot
      // move a water mask onto the traveler, castle or trees.
      if(uLiving==1. && uMotion>0.){
        float trees=grove(sourceUV,vec2(.055,.77),vec2(.07,.18))
          +grove(sourceUV,vec2(.315,.63),vec2(.045,.075))
          +grove(sourceUV,vec2(.795,.65),vec2(.065,.11))
          +grove(sourceUV,vec2(.95,.285),vec2(.045,.06));
        sourceUV.x+=sin(uTime*.72+sourceUV.y*19.+sourceUV.x*7.)*.00085*min(trees,1.);
        river=max(channel(sourceUV,vec2(.61,.42),vec2(.55,.46),.009),
          channel(sourceUV,vec2(.55,.46),vec2(.68,.535),.012));
        river=max(river,channel(sourceUV,vec2(.68,.535),vec2(.545,.60),.012));
        river=max(river,channel(sourceUV,vec2(.545,.60),vec2(.58,.69),.012));
        sourceUV.x+=sin(sourceUV.y*460.-uTime*.75)*river*.00065;
        sourceUV.y+=cos(sourceUV.x*260.+uTime*.55)*river*.0003;
      }
      vec3 color=texture2D(uImage,clamp(sourceUV,vec2(.002),vec2(.998))).rgb;
      if(uMotion>0.){
        color*=1.+river*.018*sin(sourceUV.y*390.-uTime*.9);
        if(uLiving==2.){
          // Animate illumination, never facial anatomy or weapon grips.
          float chroma=max(color.r,max(color.g,color.b))-min(color.r,min(color.g,color.b));
          float glow=smoothstep(.16,.38,chroma)*smoothstep(.2,.55,max(color.r,max(color.g,color.b)));
          color*=1.+glow*(.018*sin(uTime*.85+sourceUV.x*8.)+.008*sin(uTime*1.7));
        }
      }
      vec3 smoke=mix(color,vec3(.18,.25,.27),.30);
      float combined=alpha+wisp;
      color=(color*alpha+smoke*wisp)/max(combined,.0001);
      // Readability shading shares the image alpha, so it cannot leave a box.
      float shade=0.;
      if(uShade==1.) shade=.93*(1.-smoothstep(0.,.7,uv.x));
      if(uShade==2.) shade=.87*smoothstep(.15,1.,uv.y);
      if(uShade==3.) {
        shade=mix(.60,.12,smoothstep(0.,.47,uv.y));
        combined*=1.-smoothstep(.64,1.,uv.y);
      }
      color=mix(color,uPageBg,shade);
      vec2 edge=min(vUv,1.-vUv)*vec2(uAspect/uFrame.z,1./uFrame.w);
      combined*=smoothstep(0.,.075,min(edge.x,edge.y));
      gl_FragColor=vec4(color*combined,combined);
    }`;

  function wake() {
    if (!frame && !covered && !document.hidden && views.some(function (v) { return v.visible && v.ready; })) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    if (document.hidden || covered) return;
    // The drift is intentionally slow. Cap this layer at 20fps, independently
    // of the original pointer-responsive atmosphere and Observer.
    if (now - last > 50) {
      views.forEach(function (view) { if (view.visible && view.ready) view.draw(still() ? 12 : now / 1000); });
      last = now;
    }
    if (!still()) wake();
  }
  function mount(host) {
    var isClass = host.classList.contains('class-art');
    var img = host.querySelector('img'), canvas = document.createElement('canvas');
    canvas.className = 'memory-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    // Preserve the CSS image until this painting approaches the viewport.
    // In particular, a closed Vocation never owns a GPU context or texture.
    var gl = null, dirty = true, pending = true;
    var view = { host: host, visible: false, near: false, ready: false };
    var program, texture, buffer, uniforms;
    function fallback() {
      view.ready = false;
      host.classList.remove('memory-ready');
      canvas.style.display = 'none';
    }
    function init() {
      function compile(type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('Memory art shader unavailable'); }
        return shader;
      }
      var vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
      program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Memory art program unavailable');
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      var pos = gl.getAttribLocation(program, 'aPos');
      gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      uniforms = {};
      ['uImage','uCrop','uAspect','uTime','uFeather','uRadius','uFrame','uShade','uPageBg','uLiving','uMotion'].forEach(function (name) { uniforms[name] = gl.getUniformLocation(program, name); });
      gl.uniform1i(uniforms.uImage, 0);
      var rgb = getComputedStyle(document.documentElement).getPropertyValue('--bg-rgb').trim().split(',').map(Number);
      if (rgb.length !== 3 || rgb.some(function (n) { return !Number.isFinite(n); })) rgb = [9,13,16];
      gl.uniform3f(uniforms.uPageBg,rgb[0]/255,rgb[1]/255,rgb[2]/255);
      // Class faces and companions need a clearer center in the shallow showcase.
      gl.uniform1f(uniforms.uRadius, isClass ? .22 : .42);
    }
    function layout() {
      var width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return false;
      var pad = Math.ceil(height * .20), outerWidth = width + pad*2, outerHeight = height + pad*2;
      canvas.style.left = canvas.style.top = -pad + 'px';
      canvas.style.width = outerWidth + 'px'; canvas.style.height = outerHeight + 'px';
      var scale = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(1000000 / (outerWidth * outerHeight)));
      var w = Math.max(1, Math.floor(outerWidth * scale)), h = Math.max(1, Math.floor(outerHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      var fit = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      var x = width / (img.naturalWidth * fit), y = height / (img.naturalHeight * fit);
      var position = getComputedStyle(img).objectPosition.split(' ').map(function (n) { return parseFloat(n) / 100; });
      gl.uniform4f(uniforms.uCrop, (1-x)*position[0], (1-y)*position[1], x, y);
      gl.uniform4f(uniforms.uFrame, pad/outerWidth, pad/outerHeight, width/outerWidth, height/outerHeight);
      gl.uniform1f(uniforms.uAspect, width / height);
      gl.uniform1f(uniforms.uShade, isClass ? (matchMedia('(max-width:760px)').matches ? 2 : 1) : host.classList.contains('hero-scenery') ? 3 : 0);
      gl.uniform1f(uniforms.uFeather, isClass ? (width < 600 ? .11 : .14) : .32);
      gl.uniform1f(uniforms.uLiving, host.dataset.livingArt === 'landscape' ? 1 : host.dataset.livingArt === 'light' ? 2 : 0);
      dirty = false;
      return true;
    }
    view.draw = function (time) {
      if (covered || document.hidden || !view.ready) return;
      if (dirty && !layout()) return;
      gl.uniform1f(uniforms.uTime, time);
      gl.uniform1f(uniforms.uMotion, still() ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    function upload() {
      if (!view.near || covered || document.hidden || !img.complete || !img.naturalWidth || !host.clientHeight) return;
      try {
        if (!gl) {
          gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
          if (!gl) return;
          init();
        }
        if (gl.isContextLost()) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        view.ready = true;
        dirty = true; pending = false;
        view.draw(still() ? 12 : performance.now() / 1000);
        canvas.style.display = '';
        host.classList.add('memory-ready');
        wake();
      } catch (_) { fallback(); }
    }
    host.appendChild(canvas);
    views.push(view);
    view.prepare = function () { if (pending) upload(); };
    img.addEventListener('load', upload);
    img.addEventListener('error', fallback);
    // Never leave the previous class painting visible while its successor loads.
    new MutationObserver(function () { pending = true; dirty = true; fallback(); if (img.complete) upload(); }).observe(img, { attributes: true, attributeFilter: ['src', 'style', 'srcset'] });
    canvas.addEventListener('webglcontextlost', function (event) { event.preventDefault(); fallback(); });
    canvas.addEventListener('webglcontextrestored', function () { try { init(); pending = true; upload(); } catch (_) { fallback(); } });
    function resized() { dirty = true; if (view.visible && view.ready) view.draw(still() ? 12 : performance.now() / 1000); }
    new ResizeObserver(resized).observe(host);
    window.addEventListener('resize', resized, {passive:true});
    new IntersectionObserver(function (entries) { view.near = entries[0].isIntersecting; view.prepare(); }, {rootMargin:'200px 0px'}).observe(host);
    new IntersectionObserver(function (entries) { view.visible = entries[0].isIntersecting; if (view.visible) { view.near = true; view.prepare(); if (view.ready) view.draw(still() ? 12 : performance.now() / 1000); wake(); } }).observe(host);
  }
  document.querySelectorAll('[data-memory-art]').forEach(mount);
  reduced.addEventListener('change', function () { last = 0; wake(); });
  function resume() { views.forEach(function (view) { view.prepare(); }); wake(); }
  document.addEventListener('visibilitychange', resume);
  document.addEventListener('hw:cinema-coverage', function (event) { covered = event.detail.covered; if (!covered) resume(); });
  window.addEventListener('pagehide', function () { cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', resume);
})();
