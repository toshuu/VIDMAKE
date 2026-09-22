import webcodecs from '@napi-rs/webcodecs';
import * as mb from 'mediabunny';
import { writeFileSync } from 'node:fs';
const { VideoEncoder, VideoFrame, AudioEncoder, AudioData } = webcodecs;
const { Output, Mp4OutputFormat, BufferTarget, EncodedVideoPacketSource, EncodedAudioPacketSource, EncodedPacket } = mb;

const toPacket = (chunk) => {
  const data = new Uint8Array(chunk.byteLength);
  chunk.copyTo(data);
  return new EncodedPacket(data, chunk.type, chunk.timestamp / 1e6, (chunk.duration ?? 0) / 1e6);
};

const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
const video = new EncodedVideoPacketSource('avc');
output.addVideoTrack(video, { frameRate: 30 });
const audio = new EncodedAudioPacketSource('aac');
output.addAudioTrack(audio, { sampleRate: 44100, numberOfChannels: 2 });

const venc = new VideoEncoder({
  output: async (chunk, meta) => {
    await video.add(toPacket(chunk), meta?.decoderConfig ? { decoderConfig: { codec: meta.decoderConfig.codec, codedWidth: 320, codedHeight: 240, description: meta.decoderConfig.description } } : undefined);
  },
  error: (e) => console.error('VERR', e),
});
venc.configure({ codec: 'avc1.42001f', width: 320, height: 240, bitrate: 1_000_000, framerate: 30, latencyMode: 'realtime' });
await output.start();
const aenc = new AudioEncoder({
  output: async (chunk, meta) => {
    await audio.add(toPacket(chunk), meta?.decoderConfig ? { decoderConfig: { codec: meta.decoderConfig.codec, sampleRate: 44100, numberOfChannels: 2, description: meta.decoderConfig.description } } : undefined);
  },
  error: (e) => console.error('AERR', e),
});
aenc.configure({ codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 });

const px = Buffer.alloc(320*240*4);
for (let i = 0; i < 30; i++) {
  px.fill((i * 8) % 256);
  const vf = new VideoFrame(px, { timestamp: (i * 1e6) / 30, duration: 1e6 / 30, format: 'RGBA', codedWidth: 320, codedHeight: 240 });
  venc.encode(vf); vf.close();
}
const sr = 44100;
const pcm = new Float32Array(sr * 2);
for (let i = 0; i < sr; i++) { const v = Math.sin(2*Math.PI*440*i/sr)*0.4; pcm[i*2] = v; pcm[i*2+1] = v; }
const ad = new AudioData({ timestamp: 0, data: pcm, format: 'f32', sampleRate: sr, numberOfFrames: sr, numberOfChannels: 2 });
aenc.encode(ad); ad.close();
await venc.flush(); await aenc.flush();
await output.finalize();
writeFileSync('/tmp/enctrial/out.mp4', Buffer.from(output.target.buffer));
console.log('wrote', output.target.buffer.byteLength, 'bytes');
