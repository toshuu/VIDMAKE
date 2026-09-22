/**
 * M3 — Skia backend for the agnostic Renderer interface.
 * Implemented on @napi-rs/canvas (Skia). No timeline/animation logic here:
 * all frame math happens in @x80/core's compositor; this file only turns
 * draw calls into pixels.
 *
 * Conventions (documented, M4 may refine text):
 * - setTransform COMPOSES onto the current transform: T · A · R · S · A⁻¹
 *   (callers bracket with save/restore).
 * - Circle geometry: bounding box (0,0,2r,2r), center (r,r).
 * - Text y = TOP of the em box (textBaseline 'top'); 'justify' → 'left'.
 */

import { Path2D, createCanvas } from '@napi-rs/canvas';
import type { Canvas, SKRSContext2D } from '@napi-rs/canvas';
import { applyEffect as applyFxEffect, applyTransitionByName } from '@x80/effects';
import type { CanvasLike, CtxLike, EffectContext, GradientLike, TempSurface } from '@x80/effects';
import type {
  ColorInput,
  DrawImageOptions,
  DrawRectOptions,
  DrawRoundedRectOptions,
  DrawTextOptions,
  FrameBuffer,
  Renderer,
  Surface,
  TransitionApplier,
  TransitionSpec,
} from '@x80/core';

interface SkiaState {
  canvas: Canvas;
  ctx: SKRSContext2D;
  alphaStack: number[];
}

/** Adapt napi canvas to the backend-agnostic effect surface. */
const adaptCtx = (ctx: SKRSContext2D): CtxLike => ({
  getImageData: (sx, sy, sw, sh) => ctx.getImageData(sx, sy, sw, sh) as unknown as ImageData,
  putImageData: (img, dx, dy) => ctx.putImageData(img as never, dx, dy),
  createImageData: (w, h) => ctx.createImageData(w, h) as unknown as ImageData,
  drawImage: (img: unknown, ...args: number[]) =>
    (ctx.drawImage as (...a: never[]) => void)(img as never, ...args as never[]),
  save: () => ctx.save(),
  restore: () => ctx.restore(),
  beginPath: () => ctx.beginPath(),
  rect: (x, y, w, h) => ctx.rect(x, y, w, h),
  clip: () => ctx.clip(),
  arc: (x, y, r, a0, a1) => ctx.arc(x, y, r, a0, a1),
  moveTo: (x, y) => ctx.moveTo(x, y),
  lineTo: (x, y) => ctx.lineTo(x, y),
  fill: () => ctx.fill(),
  stroke: () => ctx.stroke(),
  translate: (x, y) => ctx.translate(x, y),
  scale: (x, y) => ctx.scale(x, y),
  rotate: (a) => ctx.rotate(a),
  fillRect: (x, y, w, h) => ctx.fillRect(x, y, w, h),
  createLinearGradient: (x0, y0, x1, y1) =>
    ctx.createLinearGradient(x0, y0, x1, y1) as unknown as GradientLike,
  createRadialGradient: (x0, y0, r0, x1, y1, r1) =>
    ctx.createRadialGradient(x0, y0, r0, x1, y1, r1) as unknown as GradientLike,
  get globalAlpha() {
    return ctx.globalAlpha;
  },
  set globalAlpha(v: number) {
    ctx.globalAlpha = v;
  },
  get globalCompositeOperation() {
    return ctx.globalCompositeOperation as string;
  },
  set globalCompositeOperation(v: string) {
    ctx.globalCompositeOperation = v as never;
  },
  get fillStyle() {
    return String(ctx.fillStyle);
  },
  set fillStyle(v: string | GradientLike) {
    ctx.fillStyle = v as string;
  },
  get strokeStyle() {
    return String(ctx.strokeStyle);
  },
  set strokeStyle(v: string | GradientLike) {
    ctx.strokeStyle = v as string;
  },
  get lineWidth() {
    return ctx.lineWidth;
  },
  set lineWidth(v: number) {
    ctx.lineWidth = v;
  },
  get filter() {
    return ctx.filter as string;
  },
  set filter(v: string) {
    ctx.filter = v;
  },
});

const adaptCanvas = (canvas: Canvas): CanvasLike =>
  // Keep the NATIVE handle: drawImage targets need it, and it
  // structurally satisfies width/height/getContext.
  canvas as unknown as CanvasLike;

const makeTemp = (w: number, h: number): TempSurface => {
  const canvas = createCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  return { canvas: canvas as unknown as CanvasLike, ctx: adaptCtx(canvas.getContext('2d')) };
};

const colorToCss = (color: ColorInput): string => {
  if (typeof color === 'string') {
    return color;
  }
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
};

const applyFillStroke = (
  ctx: SKRSContext2D,
  opts: DrawRectOptions | undefined,
  fillPath: () => void,
): void => {
  if (opts?.fill !== undefined) {
    ctx.fillStyle = colorToCss(opts.fill);
    fillPath();
    ctx.fill();
  }
  if (opts?.stroke !== undefined) {
    ctx.strokeStyle = colorToCss(opts.stroke);
    ctx.lineWidth = opts.strokeWidth ?? 1;
    fillPath();
    ctx.stroke();
  }
};

const roundedRectPath = (
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | [number, number, number, number],
): void => {
  const [tl, tr, br, bl] = typeof radius === 'number'
    ? [radius, radius, radius, radius]
    : radius;
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
};

export class SkiaRenderer implements Renderer {
  readonly name = 'skia (@napi-rs/canvas)';

  private readonly states = new WeakMap<Surface, SkiaState>();

  private stateOf(surface: Surface): SkiaState {
    const state = this.states.get(surface);
    if (!state) {
      throw new Error('Unknown surface (create it with this renderer)');
    }
    return state;
  }

  createSurface(width: number, height: number): Surface {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const surface: Surface = {
      width,
      height,
      backend: this.name,
      handle: canvas,
    };
    this.states.set(surface, { canvas, ctx, alphaStack: [] });
    return surface;
  }

  destroySurface(surface: Surface): void {
    this.states.delete(surface);
  }

  clear(surface: Surface, color: ColorInput = '#00000000'): void {
    const { ctx } = this.stateOf(surface);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colorToCss(color);
    ctx.fillRect(0, 0, surface.width, surface.height);
    ctx.restore();
  }

  save(surface: Surface): void {
    const state = this.stateOf(surface);
    state.alphaStack.push(state.ctx.globalAlpha);
    state.ctx.save();
  }

  restore(surface: Surface): void {
    const state = this.stateOf(surface);
    state.ctx.restore();
    state.alphaStack.pop();
  }

  setOpacity(surface: Surface, opacity: number): void {
    const state = this.stateOf(surface);
    const base = state.alphaStack.length > 0
      ? (state.alphaStack[state.alphaStack.length - 1] as number)
      : 1;
    state.ctx.globalAlpha = base * opacity;
  }

  setBlendMode(surface: Surface, blendMode: string): void {
    this.stateOf(surface).ctx.globalCompositeOperation = blendMode as never;
  }

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
  ): void {
    const { ctx } = this.stateOf(surface);
    const tx = transform.translateX ?? 0;
    const ty = transform.translateY ?? 0;
    const sx = transform.scaleX ?? 1;
    const sy = transform.scaleY ?? 1;
    const deg = transform.rotation ?? 0;
    const ax = transform.anchorX ?? 0;
    const ay = transform.anchorY ?? 0;
    ctx.translate(tx, ty);
    if (ax !== 0 || ay !== 0) {
      ctx.translate(ax, ay);
    }
    if (deg !== 0) {
      ctx.rotate((deg * Math.PI) / 180);
    }
    if (sx !== 1 || sy !== 1) {
      ctx.scale(sx, sy);
    }
    if (ax !== 0 || ay !== 0) {
      ctx.translate(-ax, -ay);
    }
  }

  clipRect(
    surface: Surface,
    rect: { x: number; y: number; width: number; height: number },
  ): void {
    const { ctx } = this.stateOf(surface);
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
  }

  drawRect(
    surface: Surface,
    x: number,
    y: number,
    width: number,
    height: number,
    opts?: DrawRectOptions,
  ): void {
    const { ctx } = this.stateOf(surface);
    applyFillStroke(ctx, opts, () => {
      ctx.beginPath();
      ctx.rect(x, y, width, height);
    });
  }

  drawRoundedRect(
    surface: Surface,
    x: number,
    y: number,
    width: number,
    height: number,
    opts: DrawRoundedRectOptions,
  ): void {
    const { ctx } = this.stateOf(surface);
    applyFillStroke(ctx, opts, () => {
      ctx.beginPath();
      roundedRectPath(ctx, x, y, width, height, opts.radius);
    });
  }

  drawCircle(
    surface: Surface,
    cx: number,
    cy: number,
    radius: number,
    opts?: DrawRectOptions,
  ): void {
    const { ctx } = this.stateOf(surface);
    applyFillStroke(ctx, opts, () => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    });
  }

  drawPath(surface: Surface, d: string, opts?: DrawRectOptions): void {
    const { ctx } = this.stateOf(surface);
    const path = new Path2D(d);
    if (opts?.fill !== undefined) {
      ctx.fillStyle = colorToCss(opts.fill);
      ctx.fill(path);
    }
    if (opts?.stroke !== undefined) {
      ctx.strokeStyle = colorToCss(opts.stroke);
      ctx.lineWidth = opts.strokeWidth ?? 1;
      ctx.stroke(path);
    }
  }

  drawImage(surface: Surface, image: unknown, opts: DrawImageOptions): void {
    const { ctx } = this.stateOf(surface);
    const img = image as Parameters<SKRSContext2D['drawImage']>[0];
    if (
      opts.sx !== undefined &&
      opts.sy !== undefined &&
      opts.sw !== undefined &&
      opts.sh !== undefined
    ) {
      ctx.drawImage(img, opts.sx, opts.sy, opts.sw, opts.sh, opts.dx, opts.dy, opts.dw, opts.dh);
    } else {
      ctx.drawImage(img, opts.dx, opts.dy, opts.dw, opts.dh);
    }
  }

  drawText(surface: Surface, text: string, x: number, y: number, opts: DrawTextOptions): void {
    const { ctx } = this.stateOf(surface);
    const weight = opts.fontWeight === undefined ? '400' : String(opts.fontWeight);
    const style = opts.fontStyle ?? 'normal';
    ctx.font = `${style} ${weight} ${opts.fontSize}px "${opts.fontFamily}", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign =
      opts.textAlign === 'center' || opts.textAlign === 'right' ? opts.textAlign : 'left';
    if (opts.shadow !== undefined) {
      ctx.shadowColor = colorToCss(opts.shadow.color);
      ctx.shadowBlur = opts.shadow.blur ?? 0;
      ctx.shadowOffsetX = opts.shadow.offsetX ?? 0;
      ctx.shadowOffsetY = opts.shadow.offsetY ?? 0;
    }
    try {
      (ctx as SKRSContext2D & { letterSpacing?: string }).letterSpacing =
        `${opts.letterSpacing ?? 0}px`;
    } catch {
      // letterSpacing unsupported — non-fatal in M3.
    }
    if (opts.fill !== undefined) {
      ctx.fillStyle = colorToCss(opts.fill);
      ctx.fillText(text, x, y, opts.maxWidth);
    }
    if (opts.stroke !== undefined) {
      ctx.strokeStyle = colorToCss(opts.stroke);
      ctx.lineWidth = opts.strokeWidth ?? 1;
      ctx.strokeText(text, x, y, opts.maxWidth);
    }
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  drawVideoFrame(): void {
    throw new Error('Video frame drawing arrives in M5');
  }

  applyEffect(
    surface: Surface,
    effect: { type: string; params?: Record<string, unknown>; disabled?: boolean },
    region?: { x: number; y: number; width: number; height: number },
  ): void {
    const state = this.stateOf(surface);
    const ecx: EffectContext = {
      canvas: adaptCanvas(state.canvas),
      ctx: adaptCtx(state.ctx),
      width: surface.width,
      height: surface.height,
      createTemp: makeTemp,
    };
    applyFxEffect(ecx, effect, region);
  }

  applyTransition(target: Surface, a: Surface, b: Surface, spec: TransitionSpec): void {
    const t = this.stateOf(target);
    const sa = this.states.get(a);
    const sb = this.states.get(b);
    if (!sa || !sb) {
      throw new Error('Transition sources must be surfaces from this renderer');
    }
    applyTransitionByName(
      {
        ctx: adaptCtx(t.ctx),
        width: target.width,
        height: target.height,
        a: sa.canvas,
        b: sb.canvas,
        createTemp: makeTemp,
      },
      spec.type,
      spec.progress,
      spec.params,
    );
  }

  composite(
    target: Surface,
    source: Surface,
    opts?: { x?: number; y?: number; opacity?: number; blendMode?: string },
  ): void {
    const t = this.stateOf(target);
    const s = this.states.get(source);
    if (!s) {
      throw new Error('composite source must be a surface from this renderer');
    }
    t.ctx.save();
    try {
      t.ctx.globalAlpha = opts?.opacity ?? 1;
      if (opts?.blendMode) {
        t.ctx.globalCompositeOperation = opts.blendMode as never;
      }
      t.ctx.drawImage(s.canvas, opts?.x ?? 0, opts?.y ?? 0);
    } finally {
      t.ctx.restore();
    }
  }

  readPixels(surface: Surface): FrameBuffer {
    const state = this.stateOf(surface);
    const data = state.ctx.getImageData(0, 0, surface.width, surface.height).data;
    return { width: surface.width, height: surface.height, data };
  }

  /** M3 helper: PNG-encode a surface (test/CLI use, not part of the interface). */
  async encodePng(surface: Surface): Promise<Buffer> {
    const state = this.stateOf(surface);
    return state.canvas.encode('png');
  }
}

/** RenderFrameOptions.transitionApplier wiring for this backend. */
export const skiaTransitionApplier = (
  renderer: SkiaRenderer,
): TransitionApplier => (target, a, b, spec) => renderer.applyTransition(target, a, b, spec);
