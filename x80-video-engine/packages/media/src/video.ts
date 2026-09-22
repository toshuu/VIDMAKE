/**
 * M5 — Video probing/decoding via system ffmpeg/ffprobe (PATH by default).
 * Strategy: decode-once per asset (single CLI call), cache RGBA frames,
 * reuse across frames. No per-frame subprocesses. Purity: same file →
 * same bytes, always.
 */
import { execFile } from 'node:child_process';

export interface VideoMetadata {
  src: string;
  width: number;
  height: number;
  durationSec: number;
  fps: number;
  codec: string;
}

export interface VideoTools {
  ffmpeg: string;
  ffprobe: string;
}

export const defaultTools = (): VideoTools => ({
  ffmpeg: process.env.X80_FFMPEG ?? 'ffmpeg',
  ffprobe: process.env.X80_FFPROBE ?? 'ffprobe',
});

const run = (
  bin: string,
  args: string[],
  opts?: { maxBufferBytes?: number; input?: Buffer },
): Promise<{ stdout: Buffer; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = execFile(
      bin,
      args,
      { encoding: 'buffer', maxBuffer: opts?.maxBufferBytes ?? 512 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${bin} failed: ${String(stderr).slice(0, 400)}`));
          return;
        }
        resolve({ stdout: stdout as Buffer, stderr: String(stderr) });
      },
    );
    if (opts?.input !== undefined && child.stdin) {
      child.stdin.end(opts.input);
    }
  });

interface ProbeStream {
  codec_type: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  sample_rate?: string;
  channels?: number;
}

const parseFps = (raw: string | undefined): number => {
  if (!raw) {
    return 0;
  }
  const [num, den] = raw.split('/').map(Number);
  if (!den) {
    return 0;
  }
  return (num as number) / (den as number);
};

/** Probe container metadata (ffprobe JSON). Throws on missing streams. */
export const probeVideo = async (
  src: string,
  tools: VideoTools = defaultTools(),
): Promise<VideoMetadata> => {
  const { stdout } = await run(tools.ffprobe, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,width,height,duration,r_frame_rate,avg_frame_rate',
    '-show_entries', 'format=duration',
    '-of', 'json',
    src,
  ]);
  const parsed = JSON.parse(stdout.toString()) as {
    streams?: ProbeStream[];
    format?: { duration?: string };
  };
  const stream = (parsed.streams ?? []).find((s) => s.codec_type === 'video' || s.width !== undefined);
  if (!stream || stream.width === undefined || stream.height === undefined) {
    throw new Error(`No video stream in ${src}`);
  }
  const durationSec = Number(stream.duration ?? parsed.format?.duration ?? NaN);
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error(`Cannot determine duration of ${src}`);
  }
  const fps = parseFps(stream.r_frame_rate) || parseFps(stream.avg_frame_rate);
  if (!(fps > 0)) {
    throw new Error(`Cannot determine fps of ${src}`);
  }
  return {
    src,
    width: stream.width,
    height: stream.height,
    durationSec,
    fps,
    codec: stream.codec_name ?? 'unknown',
  };
};

export interface DecodedVideo {
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  frameCount: number;
  /** RGBA bytes per frame, row-major, width*height*4 each. */
  frames: Buffer[];
}

/**
 * Decode all frames to RGBA (one ffmpeg call). Optional scale for proxies.
 * Memory: width*height*4*frameCount bytes — fine for short-form clips.
 */
export const decodeVideoFrames = async (
  src: string,
  tools: VideoTools = defaultTools(),
  opts?: { scale?: { width: number; height: number } },
): Promise<DecodedVideo> => {
  const meta = await probeVideo(src, tools);
  const w = opts?.scale?.width ?? meta.width;
  const h = opts?.scale?.height ?? meta.height;
  const args = ['-v', 'error', '-i', src];
  if (opts?.scale) {
    args.push('-vf', `scale=${w}:${h}`);
  }
  args.push('-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1');
  const { stdout } = await run(tools.ffmpeg, args);
  const stride = w * h * 4;
  if (stdout.length % stride !== 0 || stdout.length === 0) {
    throw new Error(`Short/corrupt rawvideo for ${src} (${stdout.length} bytes)`);
  }
  const frames: Buffer[] = [];
  for (let offset = 0; offset < stdout.length; offset += stride) {
    frames.push(stdout.subarray(offset, offset + stride));
  }
  return {
    width: w,
    height: h,
    fps: meta.fps,
    durationSec: meta.durationSec,
    frameCount: frames.length,
    frames,
  };
};
