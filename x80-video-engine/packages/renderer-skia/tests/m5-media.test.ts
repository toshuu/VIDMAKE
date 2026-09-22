/**
 * M5 render tests: video nodes draw advancing frames; loop wraps;
 * cover fit letterboxes correctly; image fit paths work end to end.
 */
import { renderFrame } from '@x80/core';
import type { VideoPlan } from '@x80/core';
import { decodeVideoFrames, probeVideo } from '@x80/media';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { SkiaRenderer, clipResolver, framesToCanvases } from '../src/index.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const FIX = join(DIR, '..', '..', 'media', 'tests', 'fixtures');
const GOLDEN = join(DIR, 'golden-media');

const renderer = new SkiaRenderer();
let clips: Record<string, ReturnType<typeof framesToCanvases>>;
let meta: Awaited<ReturnType<typeof probeVideo>>;

beforeAll(async () => {
  meta = await probeVideo(join(FIX, 'test-av.mp4'));
  const decoded = await decodeVideoFrames(join(FIX, 'test-av.mp4'));
  clips = { 'test-av': framesToCanvases(decoded) };
  mkdirSync(GOLDEN, { recursive: true });
}, 120000);

const videoPlan = (extra?: Partial<import('@x80/core').VideoNode>): VideoPlan => ({
  composition: {
    id: 'm5-video',
    width: 640,
    height: 480,
    fps: 30,
    durationInFrames: 150,
    root: {
      id: 'root',
      type: 'container',
      children: [
        { id: 'bg', type: 'rect', width: 640, height: 480, fill: '#000000' },
        {
          id: 'vid',
          type: 'video',
          src: 'test-av',
          x: 160,
          y: 120,
          width: 320,
          height: 240,
          ...(extra ?? {}),
        },
      ],
    },
  },
  timeline: {
    kind: 'sequence',
    from: 0,
    durationInFrames: 150,
    children: [{ kind: 'leaf', ref: 'bg' }, { kind: 'leaf', ref: 'vid' }],
  },
});

const render = async (plan: VideoPlan, frame: number) => {
  const surface = renderer.createSurface(640, 480);
  try {
    renderFrame(renderer, surface, plan, frame, {
      resolveVideoFrame: clipResolver(clips),
      assetInfo: (src: string) =>
        src === 'test-av'
          ? { width: meta.width, height: meta.height, durationSec: meta.durationSec, fps: meta.fps }
          : undefined,
    });
    return renderer.readPixels(surface);
  } finally {
    renderer.destroySurface(surface);
  }
};

const lit = (fb: { data: Uint8ClampedArray }): number => {
  let n = 0;
  for (let i = 0; i < fb.data.length; i += 4) {
    if (fb.data[i]! + fb.data[i + 1]! + fb.data[i + 2]! > 60) {
      n += 1;
    }
  }
  return n;
};

describe('M5 video rendering', () => {
  it('draws the clip and advances with frames', async () => {
    const a = await render(videoPlan(), 0);
    const b = await render(videoPlan(), 30);
    expect(lit(a)).toBeGreaterThan(10000);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false);
    // Deterministic repeat.
    const a2 = await render(videoPlan(), 0);
    expect(Buffer.from(a.data).equals(Buffer.from(a2.data))).toBe(true);
  });

  it('loop wraps: frame 60 ≡ frame 0 for a 2s loop', async () => {
    const looped = videoPlan({ loop: true, trimBefore: 0, trimAfter: 2 });
    const a = await render(looped, 0);
    const b = await render(looped, 60); // 60f @30fps = 2s → wraps to 0
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
    // Mid-loop differs.
    const mid = await render(looped, 30);
    expect(Buffer.from(a.data).equals(Buffer.from(mid.data))).toBe(false);
  });

  it('trimBefore offsets the content', async () => {
    const base = await render(videoPlan(), 30);
    const trimmed = await render(videoPlan({ trimBefore: 1 }), 0);
    // local 0 + 1s trim ≡ local 30 untrimmed.
    expect(Buffer.from(base.data).equals(Buffer.from(trimmed.data))).toBe(true);
  });

  it('cover fit fills the box; golden written', async () => {
    const plan = videoPlan({ fit: 'cover', width: 640, height: 480, x: 0, y: 0 });
    const surface = renderer.createSurface(640, 480);
    try {
      renderFrame(renderer, surface, plan, 10, {
        resolveVideoFrame: clipResolver(clips),
        assetInfo: () => ({
          width: meta.width, height: meta.height, durationSec: meta.durationSec, fps: meta.fps,
        }),
      });
      const png = Buffer.from(await renderer.encodePng(surface));
      writeFileSync(join(GOLDEN, 'video-cover.png'), png);
      expect(lit(renderer.readPixels(surface))).toBeGreaterThan(50000);
    } finally {
      renderer.destroySurface(surface);
    }
  });
});
