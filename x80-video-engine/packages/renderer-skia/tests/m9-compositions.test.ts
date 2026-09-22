/**
 * M9 composition tests: all 7 representative videos render end to end
 * (timeline → scene → Skia pixels) deterministically at 540x960, with
 * one golden PNG each. Real assets: cafe clip (cut2.mp4), stills from
 * my-video/public. No new engine features — primitives only.
 */
import { renderFrame } from '@x80/core';
import type { VideoPlan } from '@x80/core';
import { decodeVideoFrames, probeImage, probeVideo } from '@x80/media';
import { renderToMp4 } from '@x80/encoding';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildCafeReel,
  buildCaptionHeavy,
  buildExplainer,
  buildMontage,
  buildMotionGraphics,
  buildProductPromo,
  buildTalkingHead,
  CAFE_CLIP_SRC,
  CAFE_PHOTO_SRC,
  PHOTO_A,
  PHOTO_B,
  PHOTO_C,
} from '../../../examples/m9/index.js';
import {
  clipResolver,
  createSkiaMeasurer,
  framesToCanvases,
  preloadImages,
  registerFontFile,
  SkiaRenderer,
  skiaTransitionApplier,
} from '../src/index.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(DIR, 'golden-m9');
const FONTS = join(DIR, 'fonts');
const CAFE = '/kaggle/working/my-video/public/cafe/cut2.mp4';
const ASSETS = '/kaggle/working/my-video/public/assets';
const SANS = 'M9 Noto Sans';

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();

let images: Map<string, unknown>;
let imageDims: Map<string, { width: number; height: number }>;
let clips: Record<string, ReturnType<typeof framesToCanvases>>;
let clipMeta: Awaited<ReturnType<typeof probeVideo>>;

beforeAll(async () => {
  registerFontFile(join(FONTS, 'NotoSans-Regular.ttf'), SANS);
  registerFontFile(join(FONTS, 'NotoSans-Bold.ttf'), SANS);
  const entries = {
    [PHOTO_A]: join(ASSETS, 'cracked-mud.jpg'),
    [PHOTO_B]: join(ASSETS, 'drought.jpg'),
    [PHOTO_C]: join(ASSETS, 'water-pump.jpg'),
    [CAFE_PHOTO_SRC]: join(ASSETS, 'woman-water.jpg'),
  };
  images = await preloadImages(entries);
  imageDims = new Map();
  for (const [id, src] of Object.entries(entries)) {
    const info = await probeImage(src);
    imageDims.set(id, { width: info.width, height: info.height });
  }
  clipMeta = await probeVideo(CAFE);
  const decoded = await decodeVideoFrames(CAFE);
  clips = { [CAFE_CLIP_SRC]: framesToCanvases(decoded) };
  mkdirSync(GOLDEN, { recursive: true });
}, 180000);

const options = () => ({
  measureText: measure,
  resolveAsset: (src: string) => images.get(src),
  assetInfo: (src: string) => {
    if (src === CAFE_CLIP_SRC) {
      return {
        width: clipMeta.width,
        height: clipMeta.height,
        durationSec: clipMeta.durationSec,
        fps: clipMeta.fps,
      };
    }
    return imageDims.get(src);
  },
  resolveVideoFrame: clipResolver(clips),
  transitionApplier: skiaTransitionApplier(renderer),
});

const render = (p: VideoPlan, frame: number) => {
  const surface = renderer.createSurface(p.composition.width, p.composition.height);
  try {
    renderer.clear(surface, '#000000');
    renderFrame(renderer, surface, p, frame, options());
    return renderer.readPixels(surface);
  } finally {
    renderer.destroySurface(surface);
  }
};

const lit = (data: Uint8ClampedArray): number => {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]! + data[i + 1]! + data[i + 2]! > 60) {
      n += 1;
    }
  }
  return n;
};

const CASES: Array<[string, () => VideoPlan, number[]]> = [
  ['talking-head', buildTalkingHead, [0, 45, 89]],
  ['cafe-reel', buildCafeReel, [10, 60, 110]],
  ['explainer', buildExplainer, [5, 60, 115]],
  ['motion-graphics', buildMotionGraphics, [0, 45, 89]],
  ['montage', buildMontage, [10, 50, 80]],
  ['caption-heavy', buildCaptionHeavy, [10, 45, 89]],
  ['product-promo', buildProductPromo, [10, 60, 90]],
];

describe('M9 compositions', () => {
  for (const [name, build, frames] of CASES) {
    it(`${name} renders all sample frames deterministically`, async () => {
      const p = build();
      expect(p.composition.width).toBe(540);
      expect(p.composition.height).toBe(960);
      expect(p.composition.fps).toBe(30);
      for (const f of frames) {
        const fb = render(p, f);
        expect(fb.width).toBe(540);
        expect(fb.height).toBe(960);
        expect(lit(fb.data)).toBeGreaterThan(5000);
        const again = render(p, f);
        expect(Buffer.from(fb.data).equals(Buffer.from(again.data))).toBe(true);
      }
    }, 120000);
  }

  it('writes one golden per composition (mid frame)', async () => {
    for (const [name, build, frames] of CASES) {
      const p = build();
      const mid = frames[1] as number;
      const surface = renderer.createSurface(540, 960);
      try {
        renderer.clear(surface, '#000000');
        renderFrame(renderer, surface, p, mid, options());
        writeFileSync(join(GOLDEN, `${name}.png`), await renderer.encodePng(surface));
      } finally {
        renderer.destroySurface(surface);
      }
    }
  }, 180000);

  it('caption-heavy encodes a valid H.264 MP4 end to end', async () => {
    const p = buildCaptionHeavy();
    const surface = renderer.createSurface(540, 960);
    try {
      const mp4 = await renderToMp4({
        width: 540,
        height: 960,
        fps: 30,
        frameCount: 60,
        renderFrame: (f) => {
          renderer.clear(surface, '#000000');
          renderFrame(renderer, surface, p, f, options());
          return Buffer.from(renderer.readPixels(surface).data);
        },
      });
      expect(mp4.subarray(4, 8).toString()).toBe('ftyp');
      expect(mp4.length).toBeGreaterThan(5000);
      const path = join(tmpdir(), 'x80-m9-caption-heavy.mp4');
      writeFileSync(path, mp4);
      let probe = '';
      try {
        probe = execFileSync(
          'ffprobe',
          ['-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'csv', path],
          { encoding: 'utf8' },
        );
      } catch {
        probe = '';
      }
      expect(probe).toContain('h264');
      expect(probe).toContain('540,960');
    } finally {
      renderer.destroySurface(surface);
    }
  }, 300000);
});
