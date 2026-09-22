/**
 * M5 — Audio decode + deterministic mixing (pure math, no AI).
 * Pipeline: ffmpeg decodes each asset ONCE to f32 stereo PCM; mixTracks()
 * places/trims/fades/loops/gains them sample-accurately; writeWav() emits
 * a 16-bit WAV for the mux stage. Compositor never touches audio.
 */
import { execFile } from 'node:child_process';
import { endianness } from 'node:os';

export const MIX_SAMPLE_RATE = 44100;
export const MIX_CHANNELS = 2;

export interface DecodedAudio {
  /** Interleaved float32, channels-major per frame. */
  samples: Float32Array;
  sampleRate: number;
  channels: number;
}

/** Decode any ffmpeg-readable audio (or AV file) to f32le stereo PCM. */
export const decodeAudioToPCM = async (
  src: string,
  opts?: { sampleRate?: number; channels?: number; ffmpeg?: string },
): Promise<DecodedAudio> => {
  if (endianness() !== 'LE') {
    throw new Error('decodeAudioToPCM assumes little-endian float output');
  }
  const sampleRate = opts?.sampleRate ?? MIX_SAMPLE_RATE;
  const channels = opts?.channels ?? MIX_CHANNELS;
  const bin = opts?.ffmpeg ?? process.env.X80_FFMPEG ?? 'ffmpeg';
  const raw: Buffer = await new Promise((resolve, reject) => {
    const child = execFile(
      bin,
      ['-v', 'error', '-i', src, '-ac', String(channels), '-ar', String(sampleRate),
        '-f', 'f32le', '-acodec', 'pcm_f32le', 'pipe:1'],
      { encoding: 'buffer', maxBuffer: 512 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`ffmpeg audio decode failed: ${String(stderr).slice(0, 300)}`));
          return;
        }
        resolve(stdout as Buffer);
      },
    );
    void child;
  });
  const floats = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  return { samples: Float32Array.from(floats), sampleRate, channels };
};

export interface MixTrack {
  pcm: Float32Array;
  sampleRate: number;
  channels: number;
  /** Placement on the composition timeline. */
  fromFrame: number;
  trimBeforeFrames?: number;
  durationFrames?: number;
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  loop?: boolean;
  /** Linear-resample playback rate (1 = native). */
  rate?: number;
}

export interface MixOptions {
  fps: number;
  durationFrames: number;
  sampleRate?: number;
  channels?: number;
}

const toFrames = (frames: number, fps: number, sampleRate: number): number =>
  Math.round((frames * sampleRate) / fps);

/** Sample-accurate stereo mix. Pure in (tracks, options). */
export const mixTracks = (tracks: MixTrack[], options: MixOptions): Float32Array => {
  const sampleRate = options.sampleRate ?? MIX_SAMPLE_RATE;
  const channels = options.channels ?? MIX_CHANNELS;
  if (channels !== MIX_CHANNELS) {
    throw new Error(`M5 mixer supports exactly ${MIX_CHANNELS} channels`);
  }
  const totalSamples = toFrames(options.durationFrames, options.fps, sampleRate);
  const out = new Float32Array(totalSamples * channels);

  for (const track of tracks) {
    if (track.sampleRate !== sampleRate || track.channels !== channels) {
      throw new Error(
        `Track sample format ${track.sampleRate}Hz/${track.channels}ch ≠ mix ${sampleRate}Hz/${channels}ch (resample staged)`,
      );
    }
    const rate = track.rate ?? 1;
    if (!(rate > 0) || !Number.isFinite(rate)) {
      throw new Error(`Track rate must be positive finite (got ${rate})`);
    }
    const volume = track.volume ?? 1;
    const startSample = toFrames(track.fromFrame, options.fps, sampleRate);
    const trimSamples = toFrames(track.trimBeforeFrames ?? 0, options.fps, sampleRate);
    const srcSamples = Math.floor(track.pcm.length / channels) - trimSamples;
    if (srcSamples <= 0) {
      continue;
    }
    const fadeIn = toFrames(track.fadeInFrames ?? 0, options.fps, sampleRate);
    const fadeOut = toFrames(track.fadeOutFrames ?? 0, options.fps, sampleRate);
    const requested = track.durationFrames !== undefined
      ? toFrames(track.durationFrames, options.fps, sampleRate)
      : srcSamples;
    const take = Math.min(requested, totalSamples - startSample);
    if (take <= 0 || startSample >= totalSamples) {
      continue;
    }
    const start = Math.max(0, startSample);
    const skip = start - startSample;
    for (let i = skip; i < take; i += 1) {
      let pos = trimSamples + i * rate;
      if (track.loop === true) {
        pos = trimSamples + (((i * rate) % srcSamples) + srcSamples) % srcSamples;
      } else if (pos >= trimSamples + srcSamples) {
        break;
      }
      const i0 = Math.floor(pos);
      const frac = pos - i0;
      let fade = 1;
      if (fadeIn > 0 && i < fadeIn) {
        fade *= i / fadeIn;
      }
      if (fadeOut > 0 && i >= take - fadeOut) {
        fade *= Math.max(0, (take - i) / fadeOut);
      }
      const gain = volume * fade;
      const lastFrame = Math.floor(track.pcm.length / channels) - 1;
      for (let ch = 0; ch < channels; ch += 1) {
        const a = track.pcm[Math.min(i0, lastFrame) * channels + ch] as number;
        const b = track.pcm[Math.min(i0 + 1, lastFrame) * channels + ch] as number;
        out[(start + i) * channels + ch] += (a + (b - a) * frac) * gain;
      }
    }
  }

  // Soft-clip guard: normalize only if clipping.
  let peak = 0;
  for (let i = 0; i < out.length; i += 1) {
    const v = Math.abs(out[i] as number);
    if (v > peak) {
      peak = v;
    }
  }
  if (peak > 1) {
    for (let i = 0; i < out.length; i += 1) {
      out[i] = (out[i] as number) / peak;
    }
  }
  return out;
};

/** 16-bit PCM stereo WAV (for mux/debug). */
export const writeWav = (
  interleaved: Float32Array,
  sampleRate: number,
  channels: number,
): Buffer => {
  const dataBytes = interleaved.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  const body = Buffer.alloc(dataBytes);
  for (let i = 0; i < interleaved.length; i += 1) {
    const v = Math.max(-1, Math.min(1, interleaved[i] as number));
    body.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  return Buffer.concat([header, body]);
};
