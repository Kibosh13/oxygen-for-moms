/* oxygen for moms — «шлейф»: летящие полупрозрачные шифоновые ленты на WebGL
   Каждая лента — сетка треугольников, которая изгибается и скручивается во времени.
   Шифон: прозрачнее там, где ткань смотрит на нас, и плотнее на изгибах и складках.
   — на телефоне меньше лент и до 30 кадров/с; вне экрана анимация на паузе
   — prefers-reduced-motion: один статичный кадр
   — без WebGL: мягкий CSS-градиент (класс .silk-fallback) */
(function () {
  'use strict';

  // фон, тёмный тон ткани, светлый тон ткани, плотность
  var PALETTES = {
    olive:  { bg: '#F1ECE2', dark: '#2F3A16', light: '#8F9A5C', alpha: 0.80 },
    sage:   { bg: '#EFEFE6', dark: '#4C5D43', light: '#AEBD9E', alpha: 0.72 },
    bronze: { bg: '#F3E7DC', dark: '#5A2E10', light: '#C98F55', alpha: 0.78 },
    sand:   { bg: '#F2EADF', dark: '#7A5838', light: '#D8BC98', alpha: 0.60 }
  };

  // раскладка лент: угол, смещение, ширина, амплитуда, скорость, сид
  var LAYOUTS = {
    hero: [
      { ang: -0.62, off: [-0.55, -0.70], w: 1.15, amp: 0.60, sp: 1.00, seed: 0.3 },
      { ang: -0.30, off: [ 0.75,  0.78], w: 0.95, amp: 0.50, sp: 0.85, seed: 1.7 },
      { ang:  1.05, off: [ 1.45, -0.20], w: 0.85, amp: 0.45, sp: 1.10, seed: 2.9 },
      { ang: -0.80, off: [-1.45,  0.55], w: 0.80, amp: 0.42, sp: 0.95, seed: 4.2 },
      { ang: -0.15, off: [ 0.40, -1.05], w: 0.70, amp: 0.35, sp: 1.25, seed: 5.6 }
    ],
    heroM: [
      { ang: -0.18, off: [ 0.10,  1.05], w: 0.95, amp: 0.45, sp: 0.95, seed: 0.3 },
      { ang:  0.22, off: [-0.10, -1.10], w: 1.05, amp: 0.50, sp: 0.85, seed: 1.7 },
      { ang: -1.25, off: [ 0.95, -0.10], w: 0.55, amp: 0.30, sp: 1.10, seed: 2.9 }
    ],
    soft: [
      { ang: -0.45, off: [-0.85, -0.70], w: 1.05, amp: 0.55, sp: 0.80, seed: 7.1 },
      { ang:  0.60, off: [ 1.15,  0.60], w: 0.90, amp: 0.45, sp: 0.90, seed: 8.4 },
      { ang: -0.30, off: [ 0.70, -1.00], w: 0.70, amp: 0.36, sp: 1.10, seed: 9.9 }
    ]
  };

  var VERT = [
    'attribute vec2 a;',
    'uniform float uT,uSeed,uW,uAmp,uAng,uAspect,uScale;uniform vec2 uOff,uMouse;',
    'varying vec3 vN;varying float vV,vU,vL;',
    'vec3 P(float u,float v){',
    '  float t=uT+uSeed*13.;',
    '  float x=mix(-2.3,2.3,u);',
    '  float y=uAmp*(.62*sin(x*1.15+t*.52+uSeed)+.28*sin(x*2.35-t*.71+uSeed*2.1)+.10*sin(x*4.2+t*1.05));',
    '  float z=.45*sin(x*1.6+t*.43+uSeed*3.3)+.2*sin(x*3.1-t*.6);',
    '  float tw=1.9*sin(x*.95+t*.38+uSeed*1.7)+.9*sin(x*2.05-t*.47+uSeed);',
    '  float w=uW*(.45+.55*abs(sin(x*1.1+t*.29+uSeed*.7)));',
    '  vec3 s=vec3(.25*sin(tw*.5),cos(tw),sin(tw));',
    '  vec3 p=vec3(x,y,z)+s*v*w;',
    '  float c=cos(uAng),sn=sin(uAng);',
    '  p.xy=mat2(c,sn,-sn,c)*p.xy+uOff+uMouse*(.08+.04*uSeed/10.);',
    '  return p;',
    '}',
    'void main(){',
    '  float e=.004;',
    '  vec3 p=P(a.x,a.y);',
    '  vec3 du=P(a.x+e,a.y)-p, dv=P(a.x,a.y+e)-p;',
    '  vN=normalize(cross(du,dv));',
    '  vV=a.y;vU=a.x;',
    '  vL=clamp(.5+.5*dot(vN,normalize(vec3(-.35,.55,.75))),0.,1.);',
    '  float persp=1./(1.+p.z*.18);',
    '  vec2 q=p.xy*persp*uScale;',
    '  gl_Position=vec4(q.x/uAspect,q.y,0.,1.);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'uniform vec3 uDark,uLight;uniform float uAlpha,uClear;uniform vec2 uRes;',
    'varying vec3 vN;varying float vV,vU,vL;',
    'void main(){',
    '  vec3 n=normalize(vN);',
    '  float facing=abs(n.z);',
    '  float edge=pow(1.-facing,1.25);',
    '  float a=uAlpha*(.22+.78*edge);',
    '  a*=smoothstep(1.,.35,abs(vV))*.75+.25*smoothstep(1.,.9,abs(vV));',
    '  a*=smoothstep(0.,.12,vU)*smoothstep(1.,.88,vU);',
    '  vec2 sc=(gl_FragCoord.xy/uRes-.5)*vec2(1.5,1.15);',
    '  a*=mix(1.,smoothstep(.12,.62,length(sc)),uClear);',
    '  float l=vL*vL;',
    '  vec3 col=mix(uDark,uLight,l*.85+facing*.15);',
    '  float hi=pow(clamp(dot(reflect(vec3(.35,-.55,-.75),n),vec3(0.,0.,1.)),0.,1.),18.);',
    '  col+=vec3(1.,.98,.92)*hi*.35;',
    '  a+=hi*.12;',
    '  gl_FragColor=vec4(col*a,a);',
    '}'
  ].join('\n');

  function hex(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16) / 255; }); }
  function palette(name) { var p = PALETTES[name] || PALETTES.olive; return { bg: hex(p.bg), dark: hex(p.dark), light: hex(p.light), alpha: p.alpha }; }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(max-width: 900px)').matches;

  function Silk(canvas) {
    var gl = canvas.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!gl) { canvas.parentNode.classList.add('silk-fallback'); return; }
    var self = this;
    this.canvas = canvas; this.gl = gl;
    this.cur = palette(canvas.dataset.palette); this.target = palette(canvas.dataset.palette);
    var lname = canvas.dataset.layout || 'hero';
    if (small && LAYOUTS[lname + 'M']) lname += 'M';
    var layout = LAYOUTS[lname];
    this.ribbons = small ? layout.slice(0, 3) : layout.slice(0, 4);
    this.clear = parseFloat(canvas.dataset.clear || '0') * (small ? 0.45 : 1);
    this.scale = parseFloat(canvas.dataset.scale || (small ? '0.9' : '1'));
    this.mouse = [0, 0]; this.mouseT = [0, 0];
    this.t0 = performance.now() - 20000 - Math.random() * 20000; this.last = 0;

    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.parentNode.classList.add('silk-fallback'); this.gl = null; return; }
    gl.useProgram(prog);

    // сетка ленты: NU сегментов по длине × NV по ширине
    var NU = small ? 110 : 180, NV = small ? 14 : 22, verts = [], idx = [];
    for (var i = 0; i <= NU; i++) for (var j = 0; j <= NV; j++) verts.push(i / NU, j / NV * 2 - 1);
    for (i = 0; i < NU; i++) for (j = 0; j < NV; j++) {
      var k = i * (NV + 1) + j;
      idx.push(k, k + NV + 1, k + 1, k + 1, k + NV + 1, k + NV + 2);
    }
    this.count = idx.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    ['uT', 'uSeed', 'uW', 'uAmp', 'uAng', 'uAspect', 'uScale', 'uOff', 'uMouse', 'uDark', 'uLight', 'uAlpha', 'uClear', 'uRes'].forEach(function (n) { self.u[n] = gl.getUniformLocation(prog, n); });
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.resize(); window.addEventListener('resize', function () { self.resize(); self.draw(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; if (self.visible) self.loop(); }, { rootMargin: '100px' }).observe(canvas);
    } else this.visible = true;
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self.loop(); });
    if (!small && !reduce) window.addEventListener('mousemove', function (e) {
      self.mouseT = [(e.clientX / window.innerWidth - .5), -(e.clientY / window.innerHeight - .5)];
    }, { passive: true });

    this.draw();
    if (!reduce) this.loop();
  }

  Silk.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
    this.canvas.width = Math.max(2, Math.round(r.width * dpr));
    this.canvas.height = Math.max(2, Math.round(r.height * dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  };

  Silk.prototype.setPalette = function (name) {
    this.target = palette(name);
    if (reduce) { this.cur = palette(name); this.draw(); }
  };

  Silk.prototype.draw = function (now) {
    var gl = this.gl, u = this.u, c = this.cur, tg = this.target;
    var nowMs = now || performance.now(), dt = Math.min(100, nowMs - (this.prev || nowMs)); this.prev = nowMs;
    var k = 1 - Math.exp(-dt / 500);
    ['bg', 'dark', 'light'].forEach(function (key) { for (var i = 0; i < 3; i++) c[key][i] += (tg[key][i] - c[key][i]) * k; });
    c.alpha += (tg.alpha - c.alpha) * k;
    this.mouse[0] += (this.mouseT[0] - this.mouse[0]) * 0.03; this.mouse[1] += (this.mouseT[1] - this.mouse[1]) * 0.03;

    var t = reduce ? 30 : (nowMs - this.t0) / 1000 * 0.32;
    gl.clearColor(c.bg[0], c.bg[1], c.bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.uT, t);
    gl.uniform1f(u.uAspect, this.canvas.width / this.canvas.height);
    gl.uniform1f(u.uScale, this.scale);
    gl.uniform1f(u.uClear, this.clear);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uMouse, this.mouse[0], this.mouse[1]);
    gl.uniform3fv(u.uDark, c.dark); gl.uniform3fv(u.uLight, c.light);
    for (var i = 0; i < this.ribbons.length; i++) {
      var r = this.ribbons[i];
      gl.uniform1f(u.uSeed, r.seed); gl.uniform1f(u.uW, r.w); gl.uniform1f(u.uAmp, r.amp);
      gl.uniform1f(u.uAng, r.ang); gl.uniform2f(u.uOff, r.off[0], r.off[1]);
      gl.uniform1f(u.uAlpha, c.alpha * (i === 0 ? 1 : 0.85));
      gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }
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
  document.querySelectorAll('canvas[data-silk]').forEach(function (cv) {
    var s = new Silk(cv);
    if (s.gl) window.OxygenSilk.instances.push(s);
  });
})();
