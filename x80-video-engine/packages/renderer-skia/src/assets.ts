/**
 * M3 — Asset helpers for the Skia backend.
 * Decoding is async and happens ONCE before rendering; the compositor's
 * AssetResolver is a sync map lookup during frame rendering.
 */
import { loadImage } from '@napi-rs/canvas';
import type { Image } from '@napi-rs/canvas';

export type ImageHandle = Image;

export const loadImageAsset = async (src: string | Buffer): Promise<ImageHandle> =>
  loadImage(src);

export const createAssetMap = (): Map<string, unknown> => new Map<string, unknown>();

export const preloadImages = async (
  entries: Readonly<Record<string, string | Buffer>>,
  into: Map<string, unknown> = createAssetMap(),
): Promise<Map<string, unknown>> => {
  for (const [id, src] of Object.entries(entries)) {
    into.set(id, await loadImageAsset(src));
  }
  return into;
};
