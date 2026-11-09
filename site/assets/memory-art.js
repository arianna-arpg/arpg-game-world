/* Paintings dissolve into the page through the cinema's memory-rim vocabulary.
   Adapted from this project's cinema-theater.js: slow domain-warped noise,
   a rounded eye and smoke in the feather. Here the rim removes alpha instead
   of painting ink, so the real page atmosphere remains visible underneath. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var still = function () { return reduced.matches || !!(navigator.connection && navigator.connection.saveData); };
  var views = [], frame = 0, last = 0;
  var vertex = `attribute vec2 aPos; varying vec2 vUv;
    void main(){vUv=vec2((aPos.x+1.)*.5,(1.-aPos.y)*.5);gl_Position=vec4(aPos,0.,1.);}`;
  var fragment = `precision highp float;
    varying vec2 vUv; uniform sampler2D uImage; uniform vec4 uCrop;
    uniform float uAspect; uniform float uTime; uniform float uFeather; uniform float uRadius;
    float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      float a=mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y);
      float b=mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y);
      return mix(a,b,f.z)*2.-1.;}
    float mist(vec3 p){float s=0.,a=.5;for(int k=0;k<3;k++){s+=a*noise(p);p=p*2.03+vec3(17.1,5.3,3.7);a*=.5;}return s;}
    void main(){
      vec2 p=(vUv-.5)*vec2(uAspect,1.);vec2 b=vec2(uAspect*.5,.5);
      float r=min(uRadius,min(b.x,b.y));vec2 q=abs(p)-(b-r);
      float d=length(max(q,0.))+min(max(q.x,q.y),0.)-r;
      float alpha=1.;
      if(d>-.43){
        float angle=uTime*.065+1.8*length(p);
        vec2 sw=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*p*3.4;
        vec3 s=vec3(sw,uTime*.055);
        vec2 w=vec2(mist(s+vec3(1.7,9.2,0)),mist(s+vec3(8.3,2.8,0)));
        float n=mist(s+vec3(w*1.6,0));
        alpha=1.-smoothstep(-uFeather,-.015,d+.075*n*2.2);
        alpha=clamp(alpha+.24*mist(vec3(sw*2.4,uTime*.088+4.))*alpha*(1.-alpha)*2.4,0.,1.);
        // Always disappear before the image boundary, even at a noise crest.
        vec2 edge=min(vUv,1.-vUv)*vec2(uAspect,1.);
        alpha*=smoothstep(0.,.055,min(edge.x,edge.y));
      }
      vec3 color=texture2D(uImage,uCrop.xy+vUv*uCrop.zw).rgb;
      gl_FragColor=vec4(color*alpha,alpha);
    }`;

  function wake() {
    if (!frame && !document.hidden && views.some(function (v) { return v.visible && v.ready; })) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    if (document.hidden) return;
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
    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    if (!gl) return;
    var view = { host: host, visible: false, ready: false };
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
      ['uImage','uCrop','uAspect','uTime','uFeather','uRadius'].forEach(function (name) { uniforms[name] = gl.getUniformLocation(program, name); });
      gl.uniform1i(uniforms.uImage, 0);
      // Class faces and companions need a clearer center in the shallow showcase.
      gl.uniform1f(uniforms.uRadius, isClass ? .22 : .42);
    }
    view.draw = function (time) {
      var width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      var scale = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(1000000 / (width * height)));
      var w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      var fit = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      var x = width / (img.naturalWidth * fit), y = height / (img.naturalHeight * fit);
      var position = getComputedStyle(img).objectPosition.split(' ').map(function (n) { return parseFloat(n) / 100; });
      gl.uniform4f(uniforms.uCrop, (1-x)*position[0], (1-y)*position[1], x, y);
      gl.uniform1f(uniforms.uAspect, width / height);
      gl.uniform1f(uniforms.uFeather, isClass ? (width < 600 ? .11 : .14) : .32);
      gl.uniform1f(uniforms.uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    function upload() {
      if (!img.complete || !img.naturalWidth || gl.isContextLost()) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        view.ready = true;
        view.draw(still() ? 12 : performance.now() / 1000);
        canvas.style.display = '';
        host.classList.add('memory-ready');
        wake();
      } catch (_) { fallback(); }
    }
    try { init(); } catch (_) { fallback(); return; }
    host.appendChild(canvas);
    views.push(view);
    img.addEventListener('load', upload);
    img.addEventListener('error', fallback);
    // Never leave the previous class painting visible while its successor loads.
    new MutationObserver(function () { fallback(); if (img.complete) upload(); }).observe(img, { attributes: true, attributeFilter: ['src'] });
    canvas.addEventListener('webglcontextlost', function (event) { event.preventDefault(); fallback(); });
    canvas.addEventListener('webglcontextrestored', function () { try { init(); upload(); } catch (_) { fallback(); } });
    new ResizeObserver(function () { if (view.ready) view.draw(still() ? 12 : performance.now() / 1000); }).observe(host);
    new IntersectionObserver(function (entries) { view.visible = entries[0].isIntersecting; if (view.visible && view.ready) { view.draw(still() ? 12 : performance.now() / 1000); wake(); } }).observe(host);
    upload();
  }
  document.querySelectorAll('[data-memory-art]').forEach(mount);
  reduced.addEventListener('change', function () { last = 0; wake(); });
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('pagehide', function () { cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', wake);
})();
