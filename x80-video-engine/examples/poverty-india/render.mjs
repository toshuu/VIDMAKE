/**
 * Poverty in India — 24-second vertical documentary reel.
 * Rendered by the X80 Video Engine: frame-pure scene graph + Skia + H.264 MP4.
 * Visuals are original vector illustrations, not documentary photographs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderFrame } from '../../packages/core/dist/index.js';
import { SkiaRenderer, createSkiaMeasurer } from '../../packages/renderer-skia/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';

const W = 540, H = 960, FPS = 30, DURATION = 24 * FPS;
const OUT = new URL('../../output/poverty-in-india/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const anim = (a, b, x, y) => ({ binding: 'interpolate', inputRange: [a, b], outputRange: [x, y], options: clamp });
const fade = (a, b, out = false) => anim(a, b, out ? 1 : 0, out ? 0 : 1);
const rect = (id, x, y, width, height, fill, extra = {}) => ({ id, type: 'rect', x, y, width, height, fill, ...extra });
const text = (id, value, x, y, size, fill = '#fff7ed', extra = {}) => ({
  id, type: 'text', text: value, x, y, fontFamily: 'sans-serif', fontSize: size,
  fontWeight: 700, fill, ...extra,
});
const circle = (id, x, y, radius, fill, extra = {}) => ({ id, type: 'circle', x, y, radius, fill, ...extra });

const scenes = [];
const add = (...nodes) => scenes.push(...nodes);
const sceneOpacity = (start, end) => ({ binding: 'interpolate', inputRange: [start, start + 12, end - 12, end], outputRange: [0, 1, 1, 0], options: clamp });
const bg = '#101419', cream = '#f4ead8', saffron = '#f2a65a', teal = '#76c7b7', muted = '#aeb8b5';

// Persistent background and editorial framing.
add(rect('background', 0, 0, W, H, bg));
add(rect('top-rule', 32, 52, 54, 4, saffron));
add(text('series', 'INDIA • THE HUMAN STORY', 32, 72, 15, '#c6c9c4', { letterSpacing: 2 }));
add(text('page', '01 / 05', 430, 72, 14, '#c6c9c4'));

// Scene 1: The contradiction — a growing nation, unequal access.
add({
  id: 's1', type: 'container', opacity: sceneOpacity(0, 95),
  children: [
    text('s1-kicker', 'THE CONTRADICTION', 32, 190, 17, saffron, { opacity: fade(5, 18) }),
    text('s1-title-a', 'INDIA IS', 32, 265, 76, cream, { opacity: fade(8, 24), y: anim(8, 24, 300, 265) }),
    text('s1-title-b', 'RISING.', 32, 350, 92, saffron, { opacity: fade(15, 31), y: anim(15, 31, 390, 350) }),
    text('s1-copy', 'But millions are still waiting\nfor a fair chance.', 36, 500, 27, cream, { fontWeight: 400, opacity: fade(28, 42), lineHeight: 1.4 }),
    rect('s1-line', 36, 625, 0, 3, teal, { width: anim(40, 65, 0, 180) }),
    text('s1-foot', 'POVERTY IS NOT JUST A NUMBER.', 36, 660, 15, muted, { opacity: fade(45, 60), letterSpacing: 1 }),
  ],
});

// Scene 2: Unequal starting points — simple original vector homes.
add({
  id: 's2', type: 'container', opacity: sceneOpacity(90, 205),
  children: [
    text('s2-kicker', '01 — WHERE YOU START MATTERS', 32, 185, 16, saffron),
    text('s2-title', 'Two different\nstarting lines.', 32, 250, 58, cream, { lineHeight: 1.12, opacity: fade(95, 112) }),
    // Small home: fragile roof and walls.
    rect('hut-wall', 70, 570, 155, 115, '#806b55'),
    rect('hut-roof-left', 88, 525, 80, 18, '#bd8050', { rotation: -40 }),\n    rect('hut-roof-right', 145, 525, 80, 18, '#bd8050', { rotation: 40 }),
    rect('hut-door', 130, 615, 38, 70, '#342b25'),
    rect('hut-ground', 35, 685, 230, 5, '#b38a61'),
    // Larger home / city block.
    rect('city-base', 325, 515, 150, 170, '#315c59'),
    rect('city-top', 350, 460, 100, 55, '#487d73'),
    ...[0,1,2].flatMap(i => [0,1].map(j => rect('window-'+i+'-'+j, 345+i*42, 535+j*58, 18, 24, '#f1c77e'))),
    rect('city-ground', 300, 685, 205, 5, '#76c7b7'),
    text('hut-label', 'RURAL', 87, 725, 16, muted),
    text('city-label', 'URBAN', 367, 725, 16, muted),
    text('s2-copy', 'Opportunity should not depend\non the pin code you are born in.', 32, 790, 22, cream, { fontWeight: 400, lineHeight: 1.35 }),
  ],
});

// Scene 3: Poverty is multidimensional.
add({
  id: 's3', type: 'container', opacity: sceneOpacity(200, 315),
  children: [
    text('s3-kicker', '02 — MORE THAN INCOME', 32, 185, 16, saffron),
    text('s3-title', 'Poverty has\nmany faces.', 32, 250, 62, cream, { lineHeight: 1.1 }),
    ...[
      ['FOOD', 'A full plate, every day'],
      ['HEALTH', 'Care within reach'],
      ['EDUCATION', 'A real chance to learn'],
      ['HOUSING', 'A safe place to sleep'],
    ].flatMap(([label, caption], i) => {
      const y = 475 + i*100;
      return [
        circle('dot-'+i, 48, y+15, 9, [saffron,teal,'#d9b6e8','#e7d38c'][i]),
        text('label-'+i, label, 78, y, 20, cream),
        text('caption-'+i, caption, 78, y+34, 16, muted, { fontWeight: 400 }),
        rect('rule-'+i, 78, y+66, 0, 1, '#38454a', { width: anim(210+i*5, 235+i*5, 0, 390) }),
      ];
    }),
  ],
});

// Scene 4: What changes lives — services and opportunity.
add({
  id: 's4', type: 'container', opacity: sceneOpacity(310, 515),
  children: [
    text('s4-kicker', '03 — WHAT MOVES THE NEEDLE', 32, 185, 16, saffron),
    text('s4-title', 'Progress must\nreach everyone.', 32, 250, 58, cream, { lineHeight: 1.12 }),
    ...[
      ['01', 'QUALITY SCHOOLS', 'Learning that opens doors'],
      ['02', 'HEALTHCARE', 'Treatment before crisis'],
      ['03', 'DECENT WORK', 'Stable income and dignity'],
      ['04', 'BASIC SERVICES', 'Water, sanitation, housing'],
    ].flatMap(([n, title, sub], i) => {
      const y = 470 + i*103;
      return [
        text('num-'+i, n, 34, y, 18, teal),
        text('title-'+i, title, 92, y, 19, cream),
        text('sub-'+i, sub, 92, y+32, 15, muted, { fontWeight: 400 }),
        rect('divider-'+i, 92, y+65, 0, 1, '#38454a', { width: anim(325+i*5, 350+i*5, 0, 390) }),
      ];
    }),
  ],
});

// Scene 5: Call to understand and act, without a political claim.
add({
  id: 's5', type: 'container', opacity: sceneOpacity(510, 720),
  children: [
    text('s5-kicker', 'THE WAY FORWARD', 32, 190, 16, saffron),
    text('s5-title-a', 'A fairer India', 32, 300, 61, cream, { opacity: fade(520, 540), y: anim(520, 540, 330, 300) }),
    text('s5-title-b', 'is possible.', 32, 375, 67, teal, { opacity: fade(530, 550), y: anim(530, 550, 405, 375) }),
    text('s5-copy', 'Measure what matters.\nInvest in people.\nLeave no one behind.', 36, 520, 27, cream, { fontWeight: 400, lineHeight: 1.55, opacity: fade(550, 570) }),
    rect('end-rule', 36, 700, 0, 4, saffron, { width: anim(575, 600, 0, 250) }),
    text('s5-end', 'POVERTY IS NOT INEVITABLE.', 36, 745, 19, cream, { opacity: fade(600, 620), letterSpacing: 1 }),
    text('s5-sub', 'See the people behind the statistics.', 36, 790, 16, muted, { fontWeight: 400, opacity: fade(620, 640) }),
  ],
});

const plan = {
  composition: {
    id: 'poverty-in-india', width: W, height: H, fps: FPS, durationInFrames: DURATION,
    root: { id: 'root', type: 'container', children: scenes },
  },
};

const renderer = new SkiaRenderer();
const measureText = createSkiaMeasurer();
const surface = renderer.createSurface(W, H);
for (const frame of [45, 145, 255, 405, 640]) {
  renderer.clear(surface, bg);
  renderFrame(renderer, surface, plan, frame, { measureText });
  writeFileSync(new URL('preview-'+frame+'.png', OUT), await renderer.encodePng(surface));
}
const mp4 = await renderToMp4({
  width: W, height: H, fps: FPS, frameCount: DURATION,
  renderFrame: (frame) => {
    renderer.clear(surface, bg);
    renderFrame(renderer, surface, plan, frame, { measureText });
    return Buffer.from(renderer.readPixels(surface).data);
  },
  onProgress: (frame, total) => { if (frame % 120 === 0) console.log('Encoded', frame, '/', total); },
});
writeFileSync(new URL('poverty-in-india.mp4', OUT), mp4);
renderer.destroySurface(surface);
console.log('VIDMAKE_RENDER_COMPLETE', mp4.length, 'bytes');
