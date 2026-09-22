/**
 * ENCODING tests: MP4 bytes are a valid H.264/AAC container (ffprobe),
 * audio round-trips at the right pitch, errors are loud.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultVideoBitrate, renderToMp4 } from '../src/index.js';

const ffprobeStreams = (path: string): string => {
  try {
    return execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,sample_rate', '-of', 'csv', path],
      { encoding: 'utf8' },
    );
  } catch {
    return '';
  }
};

const solidFrame = (w: number, h: number, v: number): Buffer => Buffer.alloc(w * h * 4, v);

const sineStereo = (freq: number, seconds: number, sr = 44100): Float32Array => {
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i += 1) {
    const v = Math.sin((2 * Math.PI * freq * i) / sr) * 0.4;
    out[i * 2] = v;
    out[i * 2 + 1] = v;
  }
  return out;
};

describe('renderToMp4', () => {
  it('encodes H.264 video-only MP4', async () => {
    const mp4 = await renderToMp4({
      width: 320,
      height: 240,
      fps: 30,
      frameCount: 30,
      renderFrame: (f) => solidFrame(320, 240, (f * 8) % 256),
    });
    expect(mp4.subarray(4, 8).toString()).toBe('ftyp');
    // Solid-color frames compress extremely well; validity proven by ffprobe below.
    expect(mp4.length).toBeGreaterThan(1500);
    const path = join(tmpdir(), 'x80-enc-video.mp4');
    writeFileSync(path, mp4);
    const probe = ffprobeStreams(path);
    expect(probe).toContain('h264');
  }, 120000);

  it('muxes AAC audio with correct pitch', async () => {
    const mp4 = await renderToMp4({
      width: 320,
      height: 240,
      fps: 30,
      frameCount: 30,
      renderFrame: (f) => solidFrame(320, 240, (f * 8) % 256),
      audio: { pcm: sineStereo(440, 1), sampleRate: 44100, channels: 2 },
    });
    const path = join(tmpdir(), 'x80-enc-av.mp4');
    writeFileSync(path, mp4);
    const probe = ffprobeStreams(path);
    expect(probe).toContain('h264');
    expect(probe).toContain('aac');
    // Decode the muxed audio and verify 440Hz survived.
    const raw = execFileSync('ffmpeg', [
      '-v', 'error', '-i', path, '-ac', '1', '-ar', '44100', '-f', 'f32le', 'pipe:1',
    ]);
    const f = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
    let zc = 0;
    const n = Math.min(22050, f.length);
    for (let i = 1; i < n; i += 1) {
      if ((f[i - 1]! < 0) !== (f[i]! < 0)) {
        zc += 1;
      }
    }
    expect(zc).toBeGreaterThan(380);
    expect(zc).toBeLessThan(500);
  }, 180000);

  it('rejects odd dimensions and bad frames loudly', async () => {
    await expect(
      renderToMp4({ width: 321, height: 240, fps: 30, frameCount: 2, renderFrame: () => Buffer.alloc(321 * 240 * 4) }),
    ).rejects.toThrow('even dimensions');
    await expect(
      renderToMp4({ width: 320, height: 240, fps: 30, frameCount: 2, renderFrame: () => Buffer.alloc(10) }),
    ).rejects.toThrow('need 307200');
  });

  it('defaultVideoBitrate scales with pixels', () => {
    expect(defaultVideoBitrate(1080, 1920, 30)).toBeGreaterThan(defaultVideoBitrate(320, 240, 30));
    expect(defaultVideoBitrate(320, 240, 30)).toBeGreaterThanOrEqual(1_000_000);
  });
});
