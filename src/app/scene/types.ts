export type SceneMode = 'datacenter' | 'galaxy' | 'network' | 'radar';
export type Accent = 'radar' | 'topology' | null;
export type FxKind = 'dive' | 'scan' | 'cascade';

/** Her parçacığın gitmek istediği konum, renk (0-1) ve boyut */
export interface Targets {
  pos: Float32Array;
  col: Float32Array;
  size: Float32Array;
}

export interface Projected {
  x: number;
  y: number;
  /** Perspektif katsayısı */
  k: number;
  /** Kamera derinliği; negatif değerler öndedir */
  z: number;
}

export interface FrameInfo {
  t: number;
  dt: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
  scale: number;
  pointer: { x: number; y: number } | null;
  accent: Accent;
  project(x: number, y: number, z: number, out?: Projected): Projected;
  /** Efekt tetiklendiğinden bu yana geçen saniye */
  fxAge(kind: FxKind): number;
}

export interface Formation {
  write(T: Targets, f: FrameInfo): void;
  overlay?(g: CanvasRenderingContext2D, f: FrameInfo): void;
  reset?(): void;
}

export interface HoverInfo {
  title: string;
  subtitle: string;
  color: string;
}

export interface RadarStats {
  events: number;
  alarms: number;
  correlations: number;
}
