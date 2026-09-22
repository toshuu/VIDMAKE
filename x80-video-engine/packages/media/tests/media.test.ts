/**
 * M5 media tests: probe/decode fixtures + pure mixing math.
 * Fixtures: test-av.mp4 (testsrc 5s 30fps 320x240 + 440Hz AAC),
 * tone.wav (880Hz stereo 2s).
 */
import { describe, expect, it } from 'vitest';
import { decodeAudioToPCM, mixTracks, writeWav } from '../src/audio.js';
import { probeImage } from '../src/image.js';
import { decodeVideoFrames, probeVideo } from '../src/video.js';
import { createCanvas } from '@napi-rs/canvas';

const FIX = new URL('./fixtures/', import.meta.url);

const sine = (freq: number, seconds: number, sr = 44100): Float32Array => {
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i += 1) {
    const v = Math.sin((2 * Math.PI * freq * i) / sr) * 0.5;
    out[i * 2] = v;
    out[i * 2 + 1] = v;
  }
  return out;
};

describe('video probe/decode', () => {
  it('probes the fixture', async () => {
    const meta = await probeVideo(new URL('test-av.mp4', FIX).pathname);
    expect(meta.width).toBe(320);
    expect(meta.height).toBe(240);
    expect(meta.durationSec).toBeCloseTo(5, 0);
    expect(meta.fps).toBeCloseTo(30, 0);
    expect(meta.codec).toBe('h264');
  });

  it('decodes all frames deterministically', async () => {
    const a = await decodeVideoFrames(new URL('test-av.mp4', FIX).pathname);
    expect(a.frameCount).toBe(150);
    expect(a.frames[0]?.length).toBe(320 * 240 * 4);
    // testsrc is colorful: variance check on frame 0.
    const f0 = a.frames[0] as Buffer;
    let sum = 0;
    let sum2 = 0;
    for (let i = 0; i < f0.length; i += 4) {
      const v = f0[i] as number;
      sum += v;
      sum2 += v * v;
    }
    const mean = sum / (f0.length / 4);
    const variance = sum2 / (f0.length / 4) - mean * mean;
    expect(variance).toBeGreaterThan(1000);
    const b = await decodeVideoFrames(new URL('test-av.mp4', FIX).pathname);
    expect((b.frames[0] as Buffer).equals(f0)).toBe(true);
    // Frames advance over time.
    expect((a.frames[30] as Buffer).equals(f0)).toBe(false);
  });

  it('rejects non-video input', async () => {
    await expect(
      probeVideo(new URL('tone.wav', FIX).pathname),
    ).rejects.toThrow();
  });
});

describe('audio decode', () => {
  it('decodes the tone fixture', async () => {
    const decoded = await decodeAudioToPCM(new URL('tone.wav', FIX).pathname);
    expect(decoded.sampleRate).toBe(44100);
    expect(decoded.channels).toBe(2);
    expect(decoded.samples.length).toBe(2 * 44100 * 2);
    let peak = 0;
    for (const v of decoded.samples) {
      peak = Math.max(peak, Math.abs(v));
    }
    // ffmpeg sine default level is quiet (~0.088); assert present, not loud.
    expect(peak).toBeGreaterThan(0.05);
  });
});

describe('mixTracks (pure math)', () => {
  const SR = 44100;
  const FPS = 30;

  it('places a track at fromFrame with gain', () => {
    const pcm = sine(440, 1);
    const out = mixTracks(
      [{ pcm, sampleRate: SR, channels: 2, fromFrame: 30, volume: 0.5 }],
      { fps: FPS, durationFrames: 90 },
    );
    expect(out.length).toBe(3 * SR * 2);
    // Silence before 1s.
    expect(out[0]).toBe(0);
    expect(out[SR * 2 - 1]).toBe(0);
    // Content at 1s, halved.
    const expected = Math.sin((2 * Math.PI * 440 * 10) / SR) * 0.5 * 0.5;
    expect(out[(SR + 10) * 2]).toBeCloseTo(expected, 4);
  });

  it('trim + duration bound the region', () => {
    const pcm = sine(440, 2);
    const out = mixTracks(
      [{
        pcm, sampleRate: SR, channels: 2, fromFrame: 0,
        trimBeforeFrames: 30, durationFrames: 30,
      }],
      { fps: FPS, durationFrames: 90 },
    );
    // First output sample = source sample at 1s.
    const expected = Math.sin((2 * Math.PI * 440 * SR) / SR) * 0.5;
    expect(out[0]).toBeCloseTo(expected, 4);
    // Past 1s of output: silence.
    expect(out[SR * 2]).toBe(0);
  });

  it('linear fades ramp gain', () => {
    const pcm = new Float32Array(SR * 2 * 2).fill(1); // 2s stereo
    const out = mixTracks(
      [{
        pcm, sampleRate: SR, channels: 2, fromFrame: 0,
        durationFrames: 60, fadeInFrames: 30, fadeOutFrames: 30,
      }],
      { fps: FPS, durationFrames: 90 },
    );
    expect(out[0]).toBe(0);
    expect(out[Math.floor(SR / 2) * 2]).toBeCloseTo(0.5, 2);
    // Sustain region (past fade-in, before fade-out): full gain.
    expect(out[(SR + 100) * 2]).toBeCloseTo(1, 2);
    const last = (2 * SR - 1) * 2;
    expect(Math.abs(out[last] as number)).toBeLessThan(0.01);
  });

  it('loop wraps the source', () => {
    const pcm = sine(440, 1);
    const out = mixTracks(
      [{ pcm, sampleRate: SR, channels: 2, fromFrame: 0, durationFrames: 90, loop: true }],
      { fps: FPS, durationFrames: 90 },
    );
    // Sample at 2s equals sample at 1s (1s loop).
    expect(out[2 * SR * 2]).toBeCloseTo(out[SR * 2] as number, 4);
  });

  it('layers sum (voice + music + sfx)', () => {
    const voice = sine(440, 3);
    const music = sine(220, 3);
    const sfx = sine(880, 3);
    const out = mixTracks(
      [
        { pcm: voice, sampleRate: SR, channels: 2, fromFrame: 0, volume: 1 },
        { pcm: music, sampleRate: SR, channels: 2, fromFrame: 0, volume: 0.3 },
        { pcm: sfx, sampleRate: SR, channels: 2, fromFrame: 60, volume: 0.5 },
      ],
      { fps: FPS, durationFrames: 90 },
    );
    const i = 10;
    const expected =
      Math.sin((2 * Math.PI * 440 * i) / SR) * 0.5 +
      Math.sin((2 * Math.PI * 220 * i) / SR) * 0.5 * 0.3;
    expect(out[i * 2]).toBeCloseTo(expected, 4);
  });
});

describe('AV integration', () => {
  it('extracts fixture audio and mixes a 150-frame bed', async () => {
    const decoded = await decodeAudioToPCM(new URL('test-av.mp4', FIX).pathname);
    expect(decoded.channels).toBe(2);
    const out = mixTracks(
      [{
        pcm: decoded.samples, sampleRate: decoded.sampleRate, channels: 2,
        fromFrame: 0, durationFrames: 150, volume: 0.8, fadeInFrames: 15, fadeOutFrames: 15,
      }],
      { fps: 30, durationFrames: 150 },
    );
    expect(out.length).toBe(5 * 44100 * 2);
    const wav = writeWav(out, 44100, 2);
    expect(wav.length).toBe(44 + out.length * 2);
    let peak = 0;
    for (const v of out) {
      peak = Math.max(peak, Math.abs(v));
    }
    expect(peak).toBeGreaterThan(0.01);
  });
});

describe('writeWav', () => {  it('emits a valid 16-bit WAV', () => {
    const pcm = sine(440, 0.1);
    const wav = writeWav(pcm, 44100, 2);
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
    expect(wav.readUInt32LE(40)).toBe(pcm.length * 2);
    expect(wav.length).toBe(44 + pcm.length * 2);
  });
});

describe('probeImage', () => {
  it('reads intrinsic dims for png/jpeg/webp/svg', async () => {
    const canvas = createCanvas(100, 80);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, 100, 80);
    for (const [name, buf] of [
      ['png', await canvas.encode('png')],
      ['jpeg', await canvas.encode('jpeg')],
      ['webp', await canvas.encode('webp')],
    ] as Array<[string, Buffer]>) {
      const info = await probeImage(buf);
      expect([info.width, info.height], name).toEqual([100, 80]);
    }
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40"><rect width="60" height="40" fill="red"/></svg>',
    );
    expect(await probeImage(svg)).toMatchObject({ width: 60, height: 40 });
  });
});
