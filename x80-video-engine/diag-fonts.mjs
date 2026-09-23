import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import path from 'node:path';
import fs from 'node:fs';

const DIR = path.resolve('examples/india-reel/fonts');
const regs = [
  ['Inter-700.ttf', 'Inter'],
  ['Poppins-700.ttf', 'Poppins'],
  ['RozhaOne-Regular.ttf', 'RozhaOne'],
];
const c = createCanvas(900, 460);
const ctx = c.getContext('2d');
ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 900, 460);

for (const [file, family] of regs) {
  ctx.fillStyle = '#000';
  ctx.font = `400 28px sans-serif`;
  ctx.fillText(`BEFORE ${family}: available=${GlobalFonts.has(family)}`, 20, 10 + (regs.indexOf([file, family]) * 8));
}
const y0 = 30;
ctx.fillStyle = '#000';
for (const [file, family] of regs) {
  const ok = GlobalFonts.registerFromPath(path.join(DIR, file), family);
  ctx.font = `400 28px sans-serif`;
  ctx.fillText(`${family}: register ok=${ok}`, 20, y0 + (regs.indexOf([file, family]) * 30));
}

ctx.fillStyle = '#000';
const rows = [
  ['700 96px "Inter"', 140],
  ['700 96px "Poppins"', 260],
  ['400 96px "RozhaOne"', 380],
];
for (const [font, y] of rows) {
  ctx.font = font;
  const m = ctx.measureText('AaBbGg 123');
  console.log(font, '| measured width:', m.width);
  ctx.fillText('AaBbGg 123', 20, y);
}
fs.writeFileSync('/tmp/opencode/font-diag.png', c.toBuffer('image/png'));
console.log('families after:', JSON.stringify(GlobalFonts.families));