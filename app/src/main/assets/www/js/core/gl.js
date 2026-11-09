// Небольшой помощник для WebGL2-игр (чернила, стекающая краска, пальчиковые краски):
// шейдерные программы, текстуры-«мишени» (FBO), двойные мишени для пинг-понга, полноэкранный проход.

export const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** Общие функции для фрагментных шейдеров: шум. */
export const NOISE = `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`;

export class GL {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, desynchronized: true });
    if (!gl) throw new Error('webgl2');
    this.gl = gl;
    // рендер в текстуры с плавающей точкой (нужно для скоростей жидкости)
    this.floatOk = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
  }

  program(fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      u[name] = { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size };
    }
    return { p, u };
  }

  /** Текстура-мишень. kind: 'f16' (RGBA16F), 'r16' (R16F), 'u8' (RGBA8). */
  target(w, h, kind = 'f16', filter = true) {
    const gl = this.gl;
    const fmt = {
      f16: [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT],
      rg16: [gl.RG16F, gl.RG, gl.HALF_FLOAT],
      r16: [gl.R16F, gl.RED, gl.HALF_FLOAT],
      u8: [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE],
    }[kind];
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt[0], w, h, 0, fmt[1], fmt[2], null);
    const f = filter ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb, w, h, texel: [1 / w, 1 / h] };
  }

  /** Двойная мишень: читаем из read, пишем в write, потом swap(). */
  double(w, h, kind = 'f16', filter = true) {
    const d = { read: this.target(w, h, kind, filter), write: this.target(w, h, kind, filter), w, h };
    d.texel = [1 / w, 1 / h];
    d.swap = () => { const t = d.read; d.read = d.write; d.write = t; };
    return d;
  }

  free(t) {
    if (!t) return;
    const gl = this.gl;
    if (t.read) { this.free(t.read); this.free(t.write); return; }
    gl.deleteTexture(t.tex);
    gl.deleteFramebuffer(t.fb);
  }

  clear(t, r = 0, g = 0, b = 0, a = 0) {
    const gl = this.gl;
    for (const x of t.read ? [t.read, t.write] : [t]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, x.fb);
      gl.viewport(0, 0, x.w, x.h);
      gl.clearColor(r, g, b, a);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Полноэкранный проход программой prog в мишень dst (null — экран).
   * uniforms: число → float, [a,b] → vec2 …, {tex} (мишень) → sampler, {i: n} → int.
   */
  run(prog, uniforms, dst, w, h) {
    const gl = this.gl;
    gl.useProgram(prog.p);
    let unit = 0;
    for (const [name, v] of Object.entries(uniforms)) {
      const u = prog.u[name];
      if (!u) continue;
      if (v && v.tex) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, v.tex);
        gl.uniform1i(u.loc, unit++);
      } else if (v && v.read) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, v.read.tex);
        gl.uniform1i(u.loc, unit++);
      } else if (v && typeof v === 'object' && 'iv' in v) {
        gl.uniform2i(u.loc, v.iv[0], v.iv[1]);
      } else if (v && typeof v === 'object' && 'i' in v) {
        gl.uniform1i(u.loc, v.i);
      } else if (typeof v === 'number') {
        gl.uniform1f(u.loc, v);
      } else if (v instanceof Float32Array) {
        if (u.type === gl.FLOAT_VEC4) gl.uniform4fv(u.loc, v);
        else if (u.type === gl.FLOAT_VEC3) gl.uniform3fv(u.loc, v);
        else if (u.type === gl.FLOAT_VEC2) gl.uniform2fv(u.loc, v);
        else gl.uniform1fv(u.loc, v);
      } else if (Array.isArray(v)) {
        [gl.uniform1f, gl.uniform1f, gl.uniform2f, gl.uniform3f, gl.uniform4f][v.length].call(gl, u.loc, ...v);
      }
    }
    if (dst) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, dst.w, dst.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
    }
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Проход в двойную мишень с автоматическим обменом. */
  step(prog, uniforms, dbl) {
    this.run(prog, uniforms, dbl.write);
    dbl.swap();
  }

  destroy() {
    const ext = this.gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  }
}

// Палитра для «красочных» игр: цвет на белой бумаге и его плотность пигмента (-ln цвета).
export const PAINTS = [
  [1.0, 0.84, 0.12],   // жёлтый
  [0.13, 0.42, 0.92],  // синий
  [0.93, 0.18, 0.24],  // красный
  [0.28, 0.74, 0.32],  // зелёный
  [1.0, 0.55, 0.12],   // оранжевый
  [0.55, 0.28, 0.82],  // фиолетовый
  [1.0, 0.45, 0.68],   // розовый
  [0.08, 0.68, 0.74],  // бирюзовый
];
export const absorb = (c) => c.map((v) => -Math.log(Math.max(0.03, v)));
