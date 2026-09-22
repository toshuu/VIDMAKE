/**
 * M5 — Image probing/loading (JPEG/PNG/WebP/SVG via the 2D engine).
 * Decode-once: probe caches dims; handles cached by the caller asset map.
 */
import { loadImage } from '@napi-rs/canvas';

export interface ImageInfo {
  width: number;
  height: number;
  /** 'jpeg' | 'png' | 'webp' | 'svg' | 'unknown' (best effort). */
  kind: string;
}

export const probeImage = async (src: string | Buffer): Promise<ImageInfo> => {
  const img = await loadImage(src);
  let kind = 'unknown';
  if (typeof src === 'string') {
    const lower = src.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      kind = 'jpeg';
    } else if (lower.endsWith('.png')) {
      kind = 'png';
    } else if (lower.endsWith('.webp')) {
      kind = 'webp';
    } else if (lower.endsWith('.svg')) {
      kind = 'svg';
    }
  }
  return { width: img.width, height: img.height, kind };
};

export const loadImageHandle = async (src: string | Buffer): Promise<unknown> =>
  loadImage(src);
