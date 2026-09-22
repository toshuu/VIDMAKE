/**
 * M0 — Renderer backend abstraction.
 * Timeline/animation code must NEVER know which backend produces pixels.
 * Backends: Skia (first) | GPU | Vello | Pixi | browser fallback.
 */

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ColorInput = string | RgbaColor;

export interface Surface {
  readonly width: number;
  readonly height: number;
  readonly backend: string;
  /** Opaque native handle (canvas, texture, …). */
  readonly handle: unknown;
}

export interface FrameBuffer {
  readonly width: number;
  readonly height: number;
  /** Packed RGBA bytes, row-major, width*height*4. */
  readonly data: Uint8ClampedArray;
}

export interface DrawRectOptions {
  fill?: ColorInput;
  stroke?: ColorInput;
  strokeWidth?: number;
}

export interface DrawRoundedRectOptions extends DrawRectOptions {
  radius: number | [number, number, number, number];
}

export interface DrawImageOptions {
  /** Source rect (crop) in source pixels. */
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
  /** Dest rect on the surface. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  opacity?: number;
}

export interface TextShadowSpec {
  color: ColorInput;
  blur?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface DrawTextOptions {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number | string;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fill?: ColorInput;
  stroke?: ColorInput;
  strokeWidth?: number;
  maxWidth?: number;
  shadow?: TextShadowSpec;
}

export interface Renderer {
  readonly name: string;
  createSurface(width: number, height: number): Surface;
  destroySurface(surface: Surface): void;
  clear(surface: Surface, color?: ColorInput): void;
  save(surface: Surface): void;
  restore(surface: Surface): void;
  setOpacity(surface: Surface, opacity: number): void;
  /** Optional; compositor uses it only when a node sets a non-default blendMode. */
  setBlendMode?(surface: Surface, blendMode: string): void;
  setTransform(
    surface: Surface,
    transform: {
      translateX?: number;
      translateY?: number;
      scaleX?: number;
      scaleY?: number;
      rotation?: number;
      anchorX?: number;
      anchorY?: number;
    },
  ): void;
  clipRect(surface: Surface, rect: { x: number; y: number; width: number; height: number }): void;
  drawRect(
    surface: Surface,
    x: number,
    y: number,
    width: number,
    height: number,
    opts?: DrawRectOptions,
  ): void;
  drawRoundedRect(
    surface: Surface,
    x: number,
    y: number,
    width: number,
    height: number,
    opts: DrawRoundedRectOptions,
  ): void;
  drawCircle(
    surface: Surface,
    cx: number,
    cy: number,
    radius: number,
    opts?: DrawRectOptions,
  ): void;
  drawPath(surface: Surface, d: string, opts?: DrawRectOptions): void;
  drawImage(
    surface: Surface,
    image: unknown,
    opts: DrawImageOptions,
  ): void;
  drawText(surface: Surface, text: string, x: number, y: number, opts: DrawTextOptions): void;
  drawVideoFrame(
    surface: Surface,
    videoFrame: unknown,
    opts: DrawImageOptions,
  ): void;
  /** Run one named effect over a region; params validated by effects package. */
  applyEffect(
    surface: Surface,
    effect: { type: string; params?: Record<string, unknown>; disabled?: boolean },
    region?: { x: number; y: number; width: number; height: number },
  ): void;
  composite(
    target: Surface,
    source: Surface,
    opts?: { x?: number; y?: number; opacity?: number; blendMode?: string },
  ): void;
  readPixels(surface: Surface): FrameBuffer;
}
