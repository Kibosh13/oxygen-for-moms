/* oxygen for moms — «живой шёлк» на WebGL
   Лёгкий фрагментный шейдер: процедурные складки ткани, медленно текущие во времени.
   — рендер в пониженном разрешении (на телефоне ещё ниже), ~30 fps на мобильных
   — пауза, когда холст вне экрана или вкладка скрыта
   — prefers-reduced-motion: один статичный кадр
   — без WebGL: CSS-градиент (класс .silk-fallback) */
(function () {
  'use strict';

  var PALETTES = {
    //        светлый      средний      тень         блик
    sage:  ['#EEF0E7', '#C8D1BB', '#7E8D71', '#FFFFFF'],
    olive: ['#46523D', '#2F3A2B', '#141A13', '#AEB99B'],
    sand:  ['#F4EBDF', '#DEC7AA', '#A8835F', '#FFF7EA']
  };

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    'precision mediump float;',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uCenter;',
    'uniform vec3 uA,uB,uC,uD;',
    'float h(vec2 p){',
    '  float t=uTime*.02;',
    '  vec2 q=p+uMouse*.35;',
    '  float w=sin(q.y*.85+t)*.9+sin(q.y*.43-t*.7+1.3)*1.3+sin(q.x*.33+q.y*.2+t*.45)*.8;',
    '  float a=sin(q.x*2.1+w);',
    '  float b=sin(q.x*1.05-w*.6+q.y*.35+t*.5+2.);',
    '  float c=sin(q.x*4.3+w*1.4-t*.6);',
    '  return .5+.32*a+.14*b+.04*c;',
    '}',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/uRes;',
    '  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y*3.2;',
    '  p=mat2(.82,-.57,.57,.82)*p;',
    '  float e=.006;',
    '  float c=h(p),cx=h(p+vec2(e,0.)),cy=h(p+vec2(0.,e));',
    '  vec3 n=normalize(vec3((c-cx)/e*.55,(c-cy)/e*.55,1.));',
    '  vec3 l=normalize(vec3(-.5,.6,.62));',
    '  float diff=clamp(dot(n,l),0.,1.);',
    '  diff=smoothstep(.2,1.,diff);',
    '  float spec=pow(clamp(dot(reflect(-l,n),vec3(0.,0.,1.)),0.,1.),20.);',
    '  vec3 col=mix(uB,uA,smoothstep(.15,.95,c));',
    '  col=mix(uC,col,.12+.88*diff);',
    '  col+=uD*spec*.38;',
    '  float v=smoothstep(.9,.0,length((uv-.5)*vec2(1.4,1.)));',
    '  col=mix(col,uA,v*uCenter);',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function hex(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16) / 255; }); }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(max-width: 900px)').matches;

  function Silk(canvas) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) { canvas.parentNode.classList.add('silk-fallback'); return; }
    var self = this;
    this.canvas = canvas; this.gl = gl;
    this.scale = small ? 0.42 : 0.6;
    this.center = parseFloat(canvas.dataset.center || '0.45');
    var pal = PALETTES[canvas.dataset.palette || 'sage'];
    this.cur = pal.map(hex); this.target = this.cur.map(function (c) { return c.slice(); });
    this.mouse = [0, 0]; this.mouseT = [0, 0];
    this.visible = false; this.t0 = performance.now() - Math.random() * 40000; this.last = 0;

    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.parentNode.classList.add('silk-fallback'); return; }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    ['uRes', 'uTime', 'uMouse', 'uCenter', 'uA', 'uB', 'uC', 'uD'].forEach(function (n) { self.u[n] = gl.getUniformLocation(prog, n); });

    this.resize(); window.addEventListener('resize', function () { self.resize(); self.draw(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; if (self.visible) self.loop(); }, { rootMargin: '80px' }).observe(canvas);
    } else { this.visible = true; }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self.loop(); });
    if (!small && !reduce) window.addEventListener('mousemove', function (e) {
      self.mouseT = [(e.clientX / window.innerWidth - .5), (e.clientY / window.innerHeight - .5)];
    }, { passive: true });

    this.draw();
    if (!reduce) this.loop();
  }

  Silk.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(2, Math.round(r.width * dpr * this.scale));
    this.canvas.height = Math.max(2, Math.round(r.height * dpr * this.scale));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  };

  Silk.prototype.setPalette = function (name, center) {
    var pal = PALETTES[name]; if (!pal) return;
    this.target = pal.map(hex);
    if (typeof center === 'number') this.centerT = center;
    if (reduce) { this.cur = this.target; if (this.centerT != null) this.center = this.centerT; this.draw(); }
  };

  Silk.prototype.draw = function (now) {
    var gl = this.gl, u = this.u;
    var t = reduce ? 12000 : ((now || performance.now()) - this.t0);
    // плавное приближение цветов (≈1.5 с независимо от частоты кадров) и мыши
    var nowMs = now || performance.now(), dt = Math.min(100, nowMs - (this.prev || nowMs)); this.prev = nowMs;
    var a = 1 - Math.exp(-dt / 450);
    for (var i = 0; i < 4; i++) for (var k = 0; k < 3; k++) this.cur[i][k] += (this.target[i][k] - this.cur[i][k]) * a;
    if (this.centerT != null) this.center += (this.centerT - this.center) * a;
    this.mouse[0] += (this.mouseT[0] - this.mouse[0]) * 0.02; this.mouse[1] += (this.mouseT[1] - this.mouse[1]) * 0.02;
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, t / 1000 * 10);
    gl.uniform2f(u.uMouse, this.mouse[0], this.mouse[1]);
    gl.uniform1f(u.uCenter, this.center);
    gl.uniform3fv(u.uA, this.cur[0]); gl.uniform3fv(u.uB, this.cur[1]); gl.uniform3fv(u.uC, this.cur[2]); gl.uniform3fv(u.uD, this.cur[3]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  Silk.prototype.loop = function () {
    if (this.running || reduce) return;
    var self = this, minDt = small ? 33 : 16;
    this.running = true;
    (function frame(now) {
      if (!self.visible || document.hidden) { self.running = false; return; }
      if (now - self.last >= minDt) { self.last = now; self.draw(now); }
      requestAnimationFrame(frame);
    })(performance.now());
  };

  window.OxygenSilk = { instances: [] };
  document.querySelectorAll('canvas[data-silk]').forEach(function (c) {
    var s = new Silk(c);
    if (s.gl) window.OxygenSilk.instances.push(s);
  });
})();
