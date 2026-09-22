/**
 * iPhone intro reel — 10s, 540x960, 30fps, 300 frames.
 * Pure engine primitives only (no external assets, no new features).
 * Acts: hero (0-80) → features (80-180) → camera (180-260) → end card (260-300).
 */
const W = 540;
const H = 960;
const FPS = 30;
const DUR = 300;
const FONT = 'Reel Noto Sans';

const BG = '#070b14';
const CARD = '#101c33';
const INK = '#ffffff';
const DIM = '#9aa4b2';
const ACCENT = '#ffe14d';
const BLUE = '#4da3ff';

const leaf = (ref) => ({ kind: 'leaf', ref });
const seq = (from, durationInFrames, children) => ({ kind: 'sequence', from, durationInFrames, children });
const clamp = (inputRange, outputRange) => ({
  binding: 'interpolate', inputRange, outputRange,
  options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
});
const springIn = (from, to, delay = 0) => ({ binding: 'spring', from, to, delay });
const fadeIn = (a, b) => clamp([a, b], [0, 1]);

const words = (list) => list.map(([text, startMs, endMs], i) => ({
  text: i === 0 ? text : ` ${text}`,
  startMs, endMs, timestampMs: (startMs + endMs) / 2, confidence: 1,
}));

export function buildIphoneReel() {
  return {
    composition: {
      id: 'iphone-intro-10s', width: W, height: H, fps: FPS, durationInFrames: DUR,
      root: {
        id: 'root', type: 'container',
        children: [
          { id: 'bg', type: 'rect', width: W, height: H, fill: BG },
          // Persistent top kicker + progress bar + captions
          { id: 'kicker', type: 'text', text: 'APPLE  ·  10-SEC INTRO', fontFamily: FONT, fontSize: 22, fontWeight: 700, fill: DIM, x: 48, y: 56 },
          {
            id: 'progress-bg', type: 'rect', width: 444, height: 6, fill: '#1c2942', x: 48, y: 92,
          },
          {
            id: 'progress', type: 'rect', width: 444, height: 6, fill: ACCENT, x: 48, y: 92,
            scaleX: clamp([0, 299], [0.02, 1]), anchorX: 0, anchorY: 0,
          },
          {
            id: 'captions', type: 'caption', x: 48, y: 780,
            captions: words([
              ['Meet', 0, 400], ['the', 400, 700], ['new', 700, 1000], ['iPhone.', 1000, 1600],
              ['A18', 2000, 2600], ['chip.', 2600, 3100], ['48MP', 3400, 4200], ['Pro', 4200, 4700], ['camera.', 4700, 5400],
              ['Aerospace', 5800, 6600], ['titanium.', 6600, 7400], ['Yours', 8000, 8600], ['from', 8600, 8900], ['$999.', 8900, 9900],
            ]),
            combineMs: 2600, maxCharsPerLine: 20,
            highlight: 'word', reveal: 'word-reveal',
            fontFamily: FONT, fontSize: 40, fontWeight: 700,
            fill: DIM, highlightFill: INK,
            background: '#101c33', activeBackground: '#3a2f00',
            backgroundPadding: 8, backgroundRadius: 12,
            maxWidth: 444, enterFadeMs: 120,
          },

          // ACT 1 — hero phone
          {
            id: 'hero', type: 'container', children: [
              {
                id: 'phone-glow', type: 'rrect', width: 264, height: 480, radius: 56, fill: '#0d1a30',
                x: 138, y: 244, effects: [{ type: 'glow', params: { strength: 0.6, color: BLUE } }],
              },
              {
                id: 'phone-body', type: 'rrect', width: 250, height: 466, radius: 50, fill: '#1b2436',
                x: 145, y: 251,
                scaleX: springIn(0.6, 1), scaleY: springIn(0.6, 1), anchorX: 125, anchorY: 233,
              },
              {
                id: 'phone-screen', type: 'rrect', width: 226, height: 442, radius: 38, fill: '#020610',
                x: 157, y: 263,
                scaleX: springIn(0.6, 1), scaleY: springIn(0.6, 1), anchorX: 113, anchorY: 221,
              },
              { id: 'screen-sheen', type: 'rect', width: 226, height: 150, fill: '#12325e', x: 157, y: 284, opacity: 0.85 },
              { id: 'notch', type: 'rrect', width: 96, height: 26, radius: 13, fill: '#000000', x: 222, y: 276 },
              { id: 'cam-dot', type: 'circle', radius: 9, fill: '#2b3b55', x: 258, y: 344 },
              { id: 'cam-lens', type: 'circle', radius: 5, fill: '#4da3ff', x: 262, y: 348 },
              { id: 'hero-title', type: 'text', text: 'iPhone', fontFamily: FONT, fontSize: 96, fontWeight: 700, fill: INK, x: 140, y: 104, opacity: fadeIn(5, 20) },
              { id: 'hero-sub', type: 'text', text: 'Titanium. So strong.', fontFamily: FONT, fontSize: 32, fill: ACCENT, x: 132, y: 726, opacity: fadeIn(15, 30) },
            ],
          },

          // ACT 2 — features
          {
            id: 'features', type: 'container', children: [
              { id: 'feat-head', type: 'text', text: 'WHY YOU\u2019LL LOVE IT', fontFamily: FONT, fontSize: 26, fontWeight: 700, fill: ACCENT, x: 48, y: 150 },
              { id: 'feat-title', type: 'text', text: 'Power meets design', fontFamily: FONT, fontSize: 44, fontWeight: 700, fill: INK, x: 44, y: 190 },
              {
                id: 'f1', type: 'container', children: [
                  { id: 'f1-chip', type: 'rrect', width: 444, height: 140, radius: 24, fill: CARD, x: 48, y: 300 },
                  { id: 'f1-dot', type: 'circle', radius: 22, fill: BLUE, x: 76, y: 338 },
                  { id: 'f1-t', type: 'text', text: 'A18 Pro chip', fontFamily: FONT, fontSize: 36, fontWeight: 700, fill: INK, x: 130, y: 322 },
                  { id: 'f1-s', type: 'text', text: '3nm · fastest ever', fontFamily: FONT, fontSize: 26, fill: DIM, x: 130, y: 368 },
                ],
              },
              {
                id: 'f2', type: 'container', children: [
                  { id: 'f2-chip', type: 'rrect', width: 444, height: 140, radius: 24, fill: CARD, x: 48, y: 460 },
                  { id: 'f2-dot', type: 'circle', radius: 22, fill: ACCENT, x: 76, y: 498 },
                  { id: 'f2-t', type: 'text', text: '48MP Pro camera', fontFamily: FONT, fontSize: 36, fontWeight: 700, fill: INK, x: 130, y: 482 },
                  { id: 'f2-s', type: 'text', text: '5x zoom · night mode', fontFamily: FONT, fontSize: 26, fill: DIM, x: 130, y: 528 },
                ],
              },
              {
                id: 'f3', type: 'container', children: [
                  { id: 'f3-chip', type: 'rrect', width: 444, height: 140, radius: 24, fill: CARD, x: 48, y: 620 },
                  { id: 'f3-dot', type: 'circle', radius: 22, fill: '#7dff9b', x: 76, y: 658 },
                  { id: 'f3-t', type: 'text', text: 'Titanium body', fontFamily: FONT, fontSize: 36, fontWeight: 700, fill: INK, x: 130, y: 642 },
                  { id: 'f3-s', type: 'text', text: 'Light · 187g · USB-C', fontFamily: FONT, fontSize: 26, fill: DIM, x: 130, y: 688 },
                ],
              },
            ],
          },

          // ACT 3 — camera close-up
          {
            id: 'camera', type: 'container', children: [
              { id: 'cam-head', type: 'text', text: 'PRO CAMERA', fontFamily: FONT, fontSize: 26, fontWeight: 700, fill: ACCENT, x: 48, y: 150 },
              { id: 'cam-title', type: 'text', text: 'Shoot like a pro', fontFamily: FONT, fontSize: 52, fontWeight: 700, fill: INK, x: 44, y: 190 },
              {
                id: 'cam-plate', type: 'rrect', width: 444, height: 380, radius: 40, fill: '#13253f', x: 48, y: 300,
                scaleX: springIn(0.7, 1), scaleY: springIn(0.7, 1), anchorX: 222, anchorY: 190,
                effects: [{ type: 'glow', params: { strength: 0.45, color: '#4da3ff' } }],
              },
              { id: 'lens1', type: 'circle', radius: 62, fill: '#0a1220', x: 130, y: 380 },
              { id: 'lens1-g', type: 'circle', radius: 40, fill: '#1d4e89', x: 152, y: 402 },
              { id: 'lens1-c', type: 'circle', radius: 16, fill: BLUE, x: 176, y: 426 },
              { id: 'lens2', type: 'circle', radius: 62, fill: '#0a1220', x: 300, y: 380 },
              { id: 'lens2-g', type: 'circle', radius: 40, fill: '#1d4e89', x: 322, y: 402 },
              { id: 'lens2-c', type: 'circle', radius: 16, fill: '#7dff9b', x: 346, y: 426 },
              { id: 'flash', type: 'circle', radius: 20, fill: ACCENT, x: 240, y: 550, opacity: clamp([0, 15, 30, 45], [0.2, 1, 0.4, 1]) },
              { id: 'cam-cap', type: 'text', text: '48MP · 5x telephoto · 4K', fontFamily: FONT, fontSize: 30, fill: DIM, x: 48, y: 710 },
            ],
          },

          // ACT 4 — end card
          {
            id: 'endcard', type: 'container', children: [
              { id: 'end-bg', type: 'rect', width: W, height: H, fill: '#0a1526' },
              {
                id: 'mini-phone', type: 'rrect', width: 150, height: 300, radius: 32, fill: '#1b2436', x: 195, y: 180,
                scaleX: springIn(0.5, 1), scaleY: springIn(0.5, 1), anchorX: 75, anchorY: 150,
                effects: [{ type: 'glow', params: { strength: 0.5, color: BLUE } }],
              },
              { id: 'mini-screen', type: 'rrect', width: 132, height: 282, radius: 24, fill: '#020610', x: 204, y: 189 },
              { id: 'end-title', type: 'text', text: 'iPhone 17 Pro', fontFamily: FONT, fontSize: 64, fontWeight: 700, fill: INK, x: 80, y: 520 },
              { id: 'end-price', type: 'text', text: 'From $999', fontFamily: FONT, fontSize: 56, fontWeight: 700, fill: ACCENT, x: 130, y: 610 },
              { id: 'cta', type: 'rrect', width: 360, height: 96, radius: 48, fill: ACCENT, x: 90, y: 700 },
              { id: 'cta-t', type: 'text', text: 'SHOP NOW', fontFamily: FONT, fontSize: 44, fontWeight: 700, fill: '#0a1526', x: 150, y: 724 },
            ],
          },
        ],
      },
    },
    timeline: seq(0, DUR, [
      leaf('bg'),
      seq(0, 80, [leaf('hero'), leaf('phone-glow'), leaf('phone-body'), leaf('phone-screen'), leaf('screen-sheen'), leaf('notch'), leaf('cam-dot'), leaf('cam-lens'), leaf('hero-title'), leaf('hero-sub')]),
      seq(80, 100, [leaf('features'), leaf('feat-head'), leaf('feat-title'),
        seq(5, 95, [leaf('f1'), leaf('f1-chip'), leaf('f1-dot'), leaf('f1-t'), leaf('f1-s')]),
        seq(15, 85, [leaf('f2'), leaf('f2-chip'), leaf('f2-dot'), leaf('f2-t'), leaf('f2-s')]),
        seq(25, 75, [leaf('f3'), leaf('f3-chip'), leaf('f3-dot'), leaf('f3-t'), leaf('f3-s')]),
      ]),
      seq(180, 80, [leaf('camera'), leaf('cam-head'), leaf('cam-title'), leaf('cam-plate'), leaf('lens1'), leaf('lens1-g'), leaf('lens1-c'), leaf('lens2'), leaf('lens2-g'), leaf('lens2-c'), leaf('flash'), leaf('cam-cap')]),
      seq(260, 40, [leaf('endcard'), leaf('end-bg'), leaf('mini-phone'), leaf('mini-screen'), leaf('end-title'), leaf('end-price'), leaf('cta'), leaf('cta-t')]),
      leaf('kicker'), leaf('progress-bg'), leaf('progress'),
      seq(0, 258, [leaf('captions')]),
    ]),
  };
}
