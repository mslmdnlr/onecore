/** Nokta başına kayan sayı: x, y (CSS px), boyut (CSS px), r, g, b, a */
export const STRIDE = 7;

const VERT = `
attribute vec2 a_pos;
attribute float a_size;
attribute vec4 a_col;
uniform vec2 u_res;
uniform float u_dpr;
uniform float u_halo;
varying vec4 v_col;
varying float v_halo;
void main() {
  vec2 c = a_pos / u_res * 2.0 - 1.0;
  // Halo geçişinde sönük noktalar ekran dışına atılır; yalnızca parlaklar ışır
  bool skip = u_halo > 0.5 && a_col.a < 0.45;
  gl_Position = skip ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(c.x, -c.y, 0.0, 1.0);
  gl_PointSize = max(1.0, a_size * u_dpr * (1.0 + u_halo * 2.6));
  v_col = a_col;
  v_halo = u_halo;
}`;

// Halo geçişinde yalnızca parlak noktalar (alfa²) yumuşak bir ışıma bırakır
const FRAG = `
precision mediump float;
varying vec4 v_col;
varying float v_halo;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = v_halo > 0.5
    ? exp(-d * d * 18.0) * v_col.a * v_col.a * 0.2
    : (1.0 - smoothstep(0.12, 0.5, d)) * v_col.a;
  gl_FragColor = vec4(v_col.rgb * a, a);
}`;

/** Binlerce yumuşak, eklemeli (additive) noktayı tek çağrıda çizen WebGL katmanı */
export class PointRenderer {
  readonly data: Float32Array;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGLRenderingContext,
    private readonly uRes: WebGLUniformLocation,
    private readonly uDpr: WebGLUniformLocation,
    private readonly uHalo: WebGLUniformLocation,
    capacity: number,
  ) {
    this.data = new Float32Array(capacity * STRIDE);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
  }

  static create(canvas: HTMLCanvasElement, capacity: number): PointRenderer | null {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) return null;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    const bytes = STRIDE * 4;
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, bytes, offset);
    };
    attr('a_pos', 2, 0);
    attr('a_size', 1, 8);
    attr('a_col', 4, 12);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    return new PointRenderer(
      canvas,
      gl,
      gl.getUniformLocation(prog, 'u_res')!,
      gl.getUniformLocation(prog, 'u_dpr')!,
      gl.getUniformLocation(prog, 'u_halo')!,
      capacity,
    );
  }

  resize(width: number, height: number, dpr: number) {
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.uRes, width, height);
    this.gl.uniform1f(this.uDpr, dpr);
  }

  draw(count: number) {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, count * STRIDE));
    // Önce geniş ve sönük ışıma, ardından keskin çekirdek
    gl.uniform1f(this.uHalo, 1);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.uniform1f(this.uHalo, 0);
    gl.drawArrays(gl.POINTS, 0, count);
  }
}
