/**
 * M3 — Frame compositor (backend-agnostic).
 *
 * Pipeline: VideoPlan timeline → resolveTimeline → visible leaves →
 * scene-node lookup → declarative bindings evaluated at leaf localFrame →
 * Renderer interface calls. No backend imports here: Pixi/Vello/GPU backends
 * can reuse this file unchanged.
 */

import { isColorBinding, resolveAnimColor, resolveAnimNumber } from '../animation/bindings.js';
import {
  activePageIndexAt,
  activeTokenIndexAt,
  captionTimeMsAtFrame,
  createTikTokStyleCaptions,
  pageDisplayText,
  pageEndMs,
  pageExitOpacity,
  tokenEnterOpacity,
  tokenProgressAt,
  tokenStatesAt,
} from '../captions/index.js';
import type { CaptionNode } from '../scene/types.js';
import { layoutText, layoutWords } from '../text/layout.js';
import type { TextMeasurer } from '../text/types.js';
import { collectLeaves, resolveTimeline } from '../timeline/resolve.js';
import type { Renderer, Surface, TextShadowSpec } from '../renderer/types.js';
import type { Effect, Fill, SceneNode, TextShadow, VideoPlan } from '../scene/types.js';
import { computeFit, mediaFrameIndexAt } from './fit.js';

/** Sync lookup of a preloaded backend-native asset handle (image, svg, …). */
export type AssetResolver = (src: string) => unknown;

/** Sync lookup of a predecoded video frame handle by source frame index. */
export type VideoFrameResolver = (src: string, mediaFrameIndex: number) => unknown;

export interface AssetInfo {
  width: number;
  height: number;
  durationSec?: number;
  fps?: number;
}

/**
 * Sync lookup of intrinsic asset metadata (decode-once at preload).
 * width/height MUST describe the resolved handle's actual pixels (e.g. a
 * 540x960 proxy decodes to 540x960 handles — never report container dims):
 * the compositor builds its source-crop rect from these numbers.
 */
export type AssetInfoResolver = (src: string) => AssetInfo | undefined;

export interface FrameContext {
  frame: number;
  fps: number;
  /** Composition size (effect temp surfaces + bounds). */
  width: number;
  height: number;
}

export interface FrameStats {
  resolveMs: number;
  drawMs: number;
  leaves: number;
}

export interface TransitionSpec {
  type: string;
  params: Record<string, unknown>;
  /** Eased 0..1. */
  progress: number;
}

/** Blend two pre-rendered scene surfaces. Implemented per backend. */
export type TransitionApplier = (
  target: Surface,
  a: Surface,
  b: Surface,
  spec: TransitionSpec,
) => void;

const indexScene = (root: SceneNode): Map<string, SceneNode> => {
  const map = new Map<string, SceneNode>();
  const walk = (node: SceneNode): void => {
    if (map.has(node.id)) {
      throw new Error(`Duplicate scene node id: ${node.id}`);
    }
    map.set(node.id, node);
    for (const child of node.children ?? []) {
      walk(child);
    }
  };
  walk(root);
  return map;
};

/**
 * Resolve AnimNumber bindings inside effect params (recursively through
 * plain objects/arrays) against the node's local frame. Lets blur amount,
 * glow intensity, etc. animate with the same engine.
 */
export const resolveEffectParams = (
  params: Record<string, unknown> | undefined,
  frame: number,
  fps: number,
): Record<string, unknown> => {
  if (params === undefined) {
    return {};
  }
  const resolveValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(resolveValue);
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (typeof obj.binding === 'string') {
        return resolveAnimNumber(obj as never, frame, fps);
      }
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = resolveValue(v);
      }
      return out;
    }
    return value;
  };
  return resolveValue(params) as Record<string, unknown>;
};

/**
 * M8 — Caption leaf painter: timed TikTok-style captions on M4 layout.
 * (plan captions, localFrame, fps) → per-word draws with highlight
 * colors, background boxes, reveal hiding, typewriter slicing, and
 * enter/exit fades. Deterministic: same inputs → same draw calls.
 */
const paintCaption = (
  renderer: Renderer,
  surface: Surface,
  node: CaptionNode,
  fctx: FrameContext,
  measureText: TextMeasurer | undefined,
): void => {
  if (!Array.isArray(node.captions) || node.captions.length === 0) {
    return;
  }
  if (!Number.isFinite(node.combineMs) || node.combineMs <= 0) {
    throw new Error(`Caption node "${node.id}" needs a positive finite combineMs`);
  }
  if (node.maxCharsPerLine !== undefined) {
    if (!Number.isFinite(node.maxCharsPerLine) || node.maxCharsPerLine <= 0) {
      throw new Error(`Caption node "${node.id}" needs a positive finite maxCharsPerLine`);
    }
  }
  if (node.backgroundPadding !== undefined) {
    if (!Number.isFinite(node.backgroundPadding) || node.backgroundPadding < 0) {
      throw new Error(`Caption node "${node.id}" needs a non-negative finite backgroundPadding`);
    }
  }
  const highlight = node.highlight ?? 'phrase';
  if (highlight !== 'word' && highlight !== 'phrase' && highlight !== 'none') {
    throw new Error(`Unknown caption highlight: ${highlight as string}`);
  }
  const reveal = node.reveal ?? 'none';
  if (reveal !== 'none' && reveal !== 'word-reveal' && reveal !== 'line-reveal' && reveal !== 'typewriter') {
    throw new Error(`Unknown caption reveal: ${reveal as string}`);
  }

  const timeMs = captionTimeMsAtFrame(fctx.frame, fctx.fps);
  const { pages } = createTikTokStyleCaptions({
    captions: node.captions,
    combineTokensWithinMilliseconds: node.combineMs,
    ...(node.breakSilenceMs !== undefined
      ? { breakOnSilenceAfterMilliseconds: node.breakSilenceMs }
      : {}),
  });
  const pageIndex = activePageIndexAt(pages, timeMs);
  if (pageIndex < 0) {
    return;
  }
  const page = pages[pageIndex] as NonNullable<(typeof pages)[number]>;
  const endMs = pageEndMs(page);
  const exitOp = pageExitOpacity(endMs, timeMs, node.exitFadeMs);
  if (exitOp <= 0) {
    return;
  }
  const displayText = pageDisplayText(page, node.maxCharsPerLine);

  const baseFill = node.fill ?? '#ffffff';
  const spokenFill = node.highlightFill ?? '#ffe14d';
  const style = {
    fontFamily: node.fontFamily,
    fontSize: node.fontSize,
    fontWeight: node.fontWeight,
    fontStyle: node.fontStyle,
    letterSpacing: node.letterSpacing,
    lineHeight: node.lineHeight,
    textAlign: node.textAlign,
    textTransform: node.textTransform,
    maxWidth: node.maxWidth,
  };
  const textOpts = {
    fontFamily: node.fontFamily,
    fontSize: node.fontSize,
    fontWeight: node.fontWeight,
    fontStyle: node.fontStyle,
    letterSpacing: node.letterSpacing,
    fill: baseFill,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
    shadow: node.shadow
      ? {
          color: node.shadow.color,
          blur: node.shadow.blur,
          offsetX: node.shadow.offsetX,
          offsetY: node.shadow.offsetY,
        }
      : undefined,
  };

  if (measureText === undefined) {
    renderer.drawText(surface, displayText, 0, 0, {
      ...textOpts,
      textAlign: node.textAlign,
      maxWidth: node.maxWidth,
    });
    return;
  }

  const laid = layoutText(displayText, style, measureText);
  const laidWords = layoutWords(laid, style, measureText);
  if (laidWords.length === 0) {
    return;
  }

  // Map laid words → token indices by consuming each token's word quota
  // in order (multi-word tokens own several laid words; hard-broken
  // pieces stick to their token; extras clamp to the last token).
  const nonEmpty: number[] = [];
  const quotas: number[] = [];
  page.tokens.forEach((token, i) => {
    const count = token.text.split(/\s+/).filter(Boolean).length;
    if (count > 0) {
      nonEmpty.push(i);
      quotas.push(count);
    }
  });
  const wordToken: number[] = new Array<number>(laidWords.length);
  let quotaPos = 0;
  let quotaLeft = quotas[0] ?? 0;
  for (let w = 0; w < laidWords.length; w++) {
    const tokenIdx = nonEmpty[Math.min(quotaPos, nonEmpty.length - 1)] as number;
    wordToken[w] = tokenIdx;
    quotaLeft -= 1;
    if (quotaLeft <= 0 && quotaPos < nonEmpty.length - 1) {
      quotaPos += 1;
      quotaLeft = quotas[quotaPos] as number;
    }
  }

  const states = tokenStatesAt(page, timeMs);
  const activeToken = activeTokenIndexAt(page, timeMs);
  let activeLine = -1;
  for (let w = 0; w < laidWords.length; w++) {
    if ((wordToken[w] as number) <= activeToken) {
      activeLine = Math.max(activeLine, (laidWords[w] as { line: number }).line);
    }
  }
  // Typewriter budgets: visible graphemes per active-token laid word.
  const typeBudgets = new Map<number, number>();
  if (reveal === 'typewriter' && activeToken >= 0) {
    const activeTokenObj = page.tokens[activeToken];
    if (activeTokenObj !== undefined) {
      const owned: number[] = [];
      for (let w = 0; w < laidWords.length; w++) {
        if (wordToken[w] === activeToken) {
          owned.push(w);
        }
      }
      const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
      const totals = owned.map(
        (w) => [...seg.segment((laidWords[w] as { word: string }).word)].length,
      );
      const total = totals.reduce((a, b) => a + b, 0);
      const progress = tokenProgressAt(activeTokenObj, timeMs);
      let budget = timeMs >= activeTokenObj.toMs ? total : Math.max(1, Math.round(progress * total));
      budget = Math.min(budget, total);
      for (let k = 0; k < owned.length; k++) {
        const take = Math.min(totals[k] as number, budget);
        typeBudgets.set(owned[k] as number, take);
        budget -= take;
      }
    }
  }

  const pad = node.backgroundPadding ?? 0;
  for (let w = 0; w < laidWords.length; w++) {
    const laidWord = laidWords[w] as { word: string; line: number; x: number; y: number; width: number };
    const tokenIdx = wordToken[w] as number;
    const token = page.tokens[tokenIdx] as import('../captions/types.js').TikTokToken;
    const state = states[tokenIdx] as string;

    let visible = true;
    if (reveal === 'word-reveal' || reveal === 'typewriter') {
      visible = tokenIdx <= activeToken;
    } else if (reveal === 'line-reveal') {
      visible = laidWord.line <= activeLine;
    }
    if (!visible) {
      continue;
    }

    let text = laidWord.word;
    if (reveal === 'typewriter' && tokenIdx === activeToken) {
      const keep = typeBudgets.get(w) ?? text.length;
      const graphs = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text)].map(
        (s) => s.segment,
      );
      text = graphs.slice(0, keep).join('');
      if (text === '') {
        continue;
      }
    }

    const spoken = state === 'spoken' || state === 'active';
    let fill: string | undefined = baseFill;
    if (highlight === 'word') {
      fill = tokenIdx === activeToken ? spokenFill : baseFill;
    } else if (highlight === 'phrase') {
      fill = spoken ? spokenFill : baseFill;
    }
    const boxFill = spoken ? (node.activeBackground ?? node.background) : node.background;

    const opacity = tokenEnterOpacity(token, timeMs, node.enterFadeMs) * exitOp;
    const faded = opacity < 1;
    if (faded) {
      renderer.save(surface);
      renderer.setOpacity(surface, Math.max(0, opacity));
    }
    try {
      if (boxFill !== undefined) {
        const bx = laidWord.x - pad;
        const by = laidWord.y - pad / 2;
        const bw = laidWord.width + pad * 2;
        const bh = laid.lineHeightPx + pad;
        if (node.backgroundRadius !== undefined) {
          renderer.drawRoundedRect(surface, bx, by, bw, bh, {
            radius: node.backgroundRadius,
            fill: boxFill,
          });
        } else {
          renderer.drawRect(surface, bx, by, bw, bh, { fill: boxFill });
        }
      }
      renderer.drawText(surface, text, laidWord.x, laidWord.y, {
        ...textOpts,
        fill,
        textAlign: 'left',
      });
    } finally {
      if (faded) {
        renderer.restore(surface);
      }
    }
  }
};

const drawNode = (
  renderer: Renderer,
  surface: Surface,
  node: SceneNode,
  fctx: FrameContext,
  resolveAsset: AssetResolver | undefined,
  measureText: TextMeasurer | undefined,
  resolveVideoFrame: VideoFrameResolver | undefined,
  assetInfo: AssetInfoResolver | undefined,
): void => {
  if (node.visible === false) {
    return;
  }
  if (node.mask !== undefined) {
    throw new Error(`Mask nodes are staged for a later milestone (node "${node.id}")`);
  }

  const { frame, fps } = fctx;
  renderer.save(surface);
  try {
    renderer.setOpacity(surface, resolveAnimNumber(node.opacity ?? 1, frame, fps));
    if (node.blendMode !== undefined && node.blendMode !== 'source-over') {
      if (typeof renderer.setBlendMode !== 'function') {
        throw new Error(
          `blendMode "${node.blendMode}" needs Renderer.setBlendMode (node "${node.id}")`,
        );
      }
      renderer.setBlendMode(surface, node.blendMode);
    }
    if (node.filter !== undefined) {
      if (typeof renderer.setFilter !== 'function') {
        throw new Error(`filter needs Renderer.setFilter (node "${node.id}")`);
      }
      renderer.setFilter(surface, toFilterString(node.id, node.filter));
    }
    renderer.setTransform(surface, {
      translateX: resolveAnimNumber(node.x ?? 0, frame, fps),
      translateY: resolveAnimNumber(node.y ?? 0, frame, fps),
      scaleX: resolveAnimNumber(node.scaleX ?? 1, frame, fps),
      scaleY: resolveAnimNumber(node.scaleY ?? 1, frame, fps),
      rotation: resolveAnimNumber(node.rotation ?? 0, frame, fps),
      anchorX: node.anchorX ?? 0,
      anchorY: node.anchorY ?? 0,
    });
    if (node.clip) {
      renderer.clipRect(surface, node.clip);
    }
    if (node.crop) {
      renderer.clipRect(surface, node.crop);
    }
    const enabledEffects: Effect[] = (node.effects ?? []).filter(
      (effect) => effect.disabled !== true,
    );

    if (enabledEffects.length === 0) {
      paintNode(renderer, surface, node, fctx, resolveAsset, measureText, resolveVideoFrame, assetInfo);
      for (const child of node.children ?? []) {
        drawNode(renderer, surface, child, fctx, resolveAsset, measureText, resolveVideoFrame, assetInfo);
      }
    } else {      // Effect pipeline: paint the subtree into a full-size temp surface,
      // run the effect chain there, composite back under this node's transform.
      const temp = renderer.createSurface(fctx.width, fctx.height);
      try {
        renderer.clear(temp, '#00000000');
        paintNode(renderer, temp, node, fctx, resolveAsset, measureText, resolveVideoFrame, assetInfo);
        for (const child of node.children ?? []) {
          drawNode(renderer, temp, child, fctx, resolveAsset, measureText, resolveVideoFrame, assetInfo);
        }
      for (const effect of enabledEffects) {
        renderer.applyEffect(temp, {
          ...effect,
          params: resolveEffectParams(effect.params, frame, fps),
        });
      }
        renderer.composite(surface, temp, { x: 0, y: 0, opacity: 1 });
      } finally {
        renderer.destroySurface(temp);
      }
    }
  } finally {
    renderer.restore(surface);
  }
};

/**
 * Paint a node's own geometry (no transform/opacity/effects orchestration).
 * Children are painted by the caller so effect temps include subtrees.
 */
const toShadowSpec = (shadow: TextShadow | undefined): TextShadowSpec | undefined =>
  shadow === undefined
    ? undefined
    : {
        color: shadow.color,
        blur: shadow.blur,
        offsetX: shadow.offsetX,
        offsetY: shadow.offsetY,
      };

/** Resolve a shape/text fill: keyframed colors via strict grammar, all else through. */
const resolveFill = (
  fill: Fill | undefined,
  frame: number,
): import('../renderer/types.js').FillInput | undefined => {
  if (fill === undefined) {
    return undefined;
  }
  if (isColorBinding(fill)) {
    return resolveAnimColor(fill, frame);
  }
  if (typeof fill === 'string' || 'r' in fill || 'kind' in fill) {
    return fill;
  }
  throw new Error('Bad fill: need a color string, gradient, or {binding: "color"}');
};

/**
 * Build a CSS filter string from a declarative NodeFilter. Static per
 * node (filter animation is not a used pattern — fade nodes instead).
 * Throws loudly on non-finite or negative values.
 */
const toFilterString = (
  nodeId: string,
  filter: import('../scene/types.js').NodeFilter,
): string => {
  const parts: string[] = [];
  const check = (name: 'blur' | 'brightness' | 'contrast' | 'saturate' | 'grayscale'): void => {
    const v = filter[name];
    if (v === undefined) {
      return;
    }
    if (!Number.isFinite(v) || v < 0) {
      throw new Error(`filter.${name} on "${nodeId}" must be finite and >= 0 (got ${String(v)})`);
    }
    parts.push(name === 'blur' ? `blur(${v}px)` : `${name}(${v})`);
  };
  check('blur');
  check('brightness');
  check('contrast');
  check('saturate');
  check('grayscale');
  if (parts.length === 0) {
    throw new Error(`filter on "${nodeId}" sets no operation`);
  }
  return parts.join(' ');
};

const paintNode = (
  renderer: Renderer,
  surface: Surface,
  node: SceneNode,
  fctx: FrameContext,
  resolveAsset: AssetResolver | undefined,
  measureText: TextMeasurer | undefined,
  resolveVideoFrame: VideoFrameResolver | undefined,
  assetInfo: AssetInfoResolver | undefined,
): void => {
  const { frame, fps } = fctx;

    switch (node.type) {
      case 'container':
      case 'group':
        break;
      case 'rect': {
        renderer.drawRect(surface, 0, 0, node.width, node.height, {
          fill: resolveFill(node.fill, frame),
          stroke: node.stroke,
          strokeWidth: node.strokeWidth,
          shadow: toShadowSpec(node.shadow),
        });
        break;
      }
      case 'rrect': {
        renderer.drawRoundedRect(surface, 0, 0, node.width, node.height, {
          radius: node.radius,
          fill: resolveFill(node.fill, frame),
          stroke: node.stroke,
          strokeWidth: node.strokeWidth,
          shadow: toShadowSpec(node.shadow),
        });
        break;
      }
      case 'circle': {
        // Local geometry: bounding box (0,0,2r,2r), center (r,r).
        renderer.drawCircle(surface, node.radius, node.radius, node.radius, {
          fill: resolveFill(node.fill, frame),
          stroke: node.stroke,
          strokeWidth: node.strokeWidth,
          shadow: toShadowSpec(node.shadow),
        });
        break;
      }
      case 'path': {
        renderer.drawPath(surface, node.d, {
          fill: resolveFill(node.fill, frame),
          stroke: node.stroke,
          strokeWidth: node.strokeWidth,
        });
        break;
      }
      case 'image':
      case 'svg': {
        if (resolveAsset === undefined) {
          throw new Error(`Image/svg node "${node.id}" needs an asset resolver`);
        }
        const key = node.type === 'image' ? node.src : node.svg;
        const handle = resolveAsset(key);
        if (handle === undefined || handle === null) {
          throw new Error(
            `Asset not resolved: "${key}" (preload before render, node "${node.id}")`,
          );
        }
        const info = assetInfo?.(key);
        const w = node.width ?? info?.width;
        const h = node.height ?? info?.height;
        if (w === undefined || h === undefined) {
          throw new Error(
            `Image/svg node "${node.id}" needs explicit width/height or asset info`,
          );
        }
        const fit = node.type === 'image' ? (node.fit ?? 'fill') : 'fill';
        if (fit === 'fill' || info === undefined) {
          renderer.drawImage(surface, handle, { dx: 0, dy: 0, dw: w, dh: h });
        } else {
          renderer.drawImage(surface, handle, computeFit(info.width, info.height, w, h, fit));
        }
        break;
      }
      case 'text': {
        const fontSize = resolveAnimNumber(node.fontSize, frame, fps);
        if (!Number.isFinite(fontSize) || fontSize <= 0) {
          throw new Error(`Text node "${node.id}" resolved to bad fontSize ${String(fontSize)}`);
        }
        const letterSpacing = resolveAnimNumber(node.letterSpacing ?? 0, frame, fps);
        const shadow = node.shadow
          ? {
              color: node.shadow.color,
              blur: node.shadow.blur,
              offsetX: node.shadow.offsetX,
              offsetY: node.shadow.offsetY,
            }
          : undefined;
        const baseOpts = {
          fontFamily: node.fontFamily,
          fontSize,
          fontWeight: node.fontWeight,
          fontStyle: node.fontStyle,
          letterSpacing,
          fill: resolveFill(node.fill, frame),
          stroke: node.stroke,
          strokeWidth: node.strokeWidth,
          shadow,
        };
        if (measureText !== undefined) {
          const style = {
            fontFamily: node.fontFamily,
            fontSize,
            fontWeight: node.fontWeight,
            fontStyle: node.fontStyle,
            letterSpacing,
            lineHeight: node.lineHeight,
            textAlign: node.textAlign,
            textTransform: node.textTransform,
            maxWidth: node.maxWidth,
          };
          const laid = layoutText(node.text, style, measureText);
          if ((node.textAlign ?? 'left') === 'justify' && node.maxWidth !== undefined) {
            for (const word of layoutWords(laid, style, measureText)) {
              renderer.drawText(surface, word.word, word.x, word.y, {
                ...baseOpts,
                textAlign: 'left',
              });
            }
          } else {
            for (const line of laid.lines) {
              renderer.drawText(surface, line.text, line.x, line.y, {
                ...baseOpts,
                textAlign: 'left',
              });
            }
          }
        } else {
          renderer.drawText(surface, node.text, 0, 0, {
            ...baseOpts,
            textAlign: node.textAlign,
            maxWidth: node.maxWidth,
          });
        }
        break;
      }
      case 'caption': {
        paintCaption(renderer, surface, node, fctx, measureText);
        break;
      }
      case 'video': {
        if (resolveVideoFrame === undefined) {
          throw new Error(
            `Video node "${node.id}" needs a video frame resolver (preload + map first)`,
          );
        }
        const info = assetInfo?.(node.src);
        const videoFps = info?.fps;
        const durationSec = info?.durationSec;
        if (videoFps === undefined || durationSec === undefined) {
          throw new Error(
            `Video node "${node.id}" needs asset info with fps + durationSec`,
          );
        }
        const index = mediaFrameIndexAt(frame, fps, videoFps, durationSec, {
          startFrom: node.startFrom,
          trimBefore: node.trimBefore,
          trimAfter: node.trimAfter,
          playbackRate: node.playbackRate,
          loop: node.loop,
        });
        const handle = resolveVideoFrame(node.src, index);
        if (handle === undefined || handle === null) {
          throw new Error(`Video frame not resolved: "${node.src}" #${index}`);
        }
        const w = node.width ?? info?.width;
        const h = node.height ?? info?.height;
        if (w === undefined || h === undefined) {
          throw new Error(`Video node "${node.id}" needs explicit width/height or asset info`);
        }
        const fit = node.fit ?? 'fill';
        if (fit === 'fill' || info?.width === undefined || info?.height === undefined) {
          renderer.drawImage(surface, handle, { dx: 0, dy: 0, dw: w, dh: h });
        } else {
          renderer.drawImage(
            surface,
            handle,
            computeFit(info.width, info.height, w, h, fit),
          );
        }
        break;
      }
      case 'shape':
      case 'mask': {
        throw new Error(`Node type "${node.type}" is staged for a later milestone`);
      }
      case 'effectLayer': {
        // Full-frame grade: applies to everything beneath in paint order
        // (i.e. the current surface content), in place. Children draw after,
        // ungraded, on top.
        if (node.effect.disabled !== true) {
          renderer.applyEffect(surface, {
            ...node.effect,
            params: resolveEffectParams(node.effect.params, frame, fps),
          });
        }
        break;
      }
      default: {
        const unexpected = node as { type: string };
        throw new Error(`Unknown scene node type: ${unexpected.type}`);
      }
    }
};

export interface RenderFrameOptions {
  resolveAsset?: AssetResolver;
  /** Backend text measurer; enables wrap/align/justify layout. */
  measureText?: TextMeasurer;
  /** Predecoded video frames by source frame index. */
  resolveVideoFrame?: VideoFrameResolver;
  /** Intrinsic asset metadata (decode-once at preload). */
  assetInfo?: AssetInfoResolver;
  /** Backend transition blender (required when a transition leaf is hit). */
  transitionApplier?: TransitionApplier;
}

/**
 * Transition path: render both scene subtrees to temps at their mapped
 * local frames, then blend via the backend applier.
 */
const renderTransition = (
  renderer: Renderer,
  surface: Surface,
  plan: VideoPlan,
  comp: VideoPlan['composition'],
  transition: {
    type: string;
    params: Record<string, unknown>;
    progress: number;
    a: string;
    b: string;
    aFrame: number;
    bFrame: number;
  },
  options?: RenderFrameOptions,
): void => {
  if (options?.transitionApplier === undefined) {
    throw new Error(
      `Transition "${transition.type}" needs RenderFrameOptions.transitionApplier (wire the backend blender)`,
    );
  }
  const sceneIndex = indexScene(comp.root);
  const nodeA = sceneIndex.get(transition.a);
  const nodeB = sceneIndex.get(transition.b);
  if (!nodeA || !nodeB) {
    throw new Error(`Transition references unknown scene node "${!nodeA ? transition.a : transition.b}"`);
  }
  const tempA = renderer.createSurface(comp.width, comp.height);
  const tempB = renderer.createSurface(comp.width, comp.height);
  try {
    renderer.clear(tempA, '#00000000');
    renderer.clear(tempB, '#00000000');
    drawNode(
      renderer, tempA, nodeA,
      { frame: transition.aFrame, fps: comp.fps, width: comp.width, height: comp.height },
      options?.resolveAsset, options?.measureText, options?.resolveVideoFrame, options?.assetInfo,
    );
    drawNode(
      renderer, tempB, nodeB,
      { frame: transition.bFrame, fps: comp.fps, width: comp.width, height: comp.height },
      options?.resolveAsset, options?.measureText, options?.resolveVideoFrame, options?.assetInfo,
    );
    options.transitionApplier(surface, tempA, tempB, {
      type: transition.type,
      params: resolveEffectParams(transition.params, transition.bFrame, comp.fps),
      progress: transition.progress,
    });
  } finally {
    renderer.destroySurface(tempA);
    renderer.destroySurface(tempB);
  }
};

/**
 * Render one frame: (plan, frame, fps) → pixels on surface.
 * Deterministic: same inputs → same draw calls in the same order.
 */
export const renderFrame = (
  renderer: Renderer,
  surface: Surface,
  plan: VideoPlan,
  frame: number,
  options?: RenderFrameOptions,
): FrameStats => {
  const comp = plan.composition;
  const t0 = performance.now();
  const root =
    plan.timeline ??
    ({
      kind: 'sequence',
      from: 0,
      durationInFrames: comp.durationInFrames,
    } as const);
  const resolved = resolveTimeline(root, frame, comp.durationInFrames);
  const leaves = collectLeaves(resolved);
  const sceneIndex = indexScene(comp.root);
  const t1 = performance.now();

  for (const leaf of leaves) {
    if (leaf.transition !== undefined) {
      renderTransition(renderer, surface, plan, comp, leaf.transition, options);
      continue;
    }
    const node = sceneIndex.get(leaf.ref);
    if (node === undefined) {
      throw new Error(`Timeline leaf references unknown scene node: "${leaf.ref}"`);
    }
    drawNode(
      renderer,
      surface,
      node,
      { frame: leaf.localFrame, fps: comp.fps, width: comp.width, height: comp.height },
      options?.resolveAsset,
      options?.measureText,
      options?.resolveVideoFrame,
      options?.assetInfo,
    );
  }
  const t2 = performance.now();
  return { resolveMs: t1 - t0, drawMs: t2 - t1, leaves: leaves.length };
};
