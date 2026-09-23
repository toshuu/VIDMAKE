/**
 * X80 Studio server: paste-JSON → MP4. No agent in the loop.
 * Start: node studio/server.mjs [port]   (default 8099)
 * Open:  http://localhost:8099/
 */
import http from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileReel, validateSpec } from '../packages/reelspec/dist/index.js';
import { renderFrame, validateTimeline } from '../packages/core/dist/index.js';
import { renderToMp4 } from '../packages/encoding/dist/index.js';
import {
  decodeAudioToPCM, decodeVideoFrames, mixTracks, probeImage, probeVideo,
} from '../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile,
  skiaTransitionApplier, preloadImages, framesToCanvases, clipResolver,
} from '../packages/renderer-skia/dist/index.js';
import { parseSheet } from '../packages/media/dist/sprites.js';
import { runFetch, ensureFamily } from '../packages/font-fetch/dist/index.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, 'out');
mkdirSync(OUT, { recursive: true });
const LIB = JSON.parse(readFileSync(join(DIR, 'assets.json'), 'utf8'));

// ---- boot: fonts + measure (once) ----
for (const [f, fam] of LIB.fonts) {
  registerFontFile(join(LIB.fontDir, f), fam);
}
console.log(`[studio] fonts registered: ${LIB.fonts.length}`);
// ---- boot: Google Fonts manifest (offline, pinned, fail-loud) ----
// fonts/manifest.json + fonts/cache/ are the only render-time font source for
// API families. Fetching lives in packages/font-fetch (network); here we only
// verify sha256 and register. Any mismatch/miss throws — never fallback.
const ROOT = dirname(DIR);
const manifestPath = join(ROOT, 'fonts', 'manifest.json');
let FONT_MANIFEST = JSON.parse(readFileSync(manifestPath, 'utf8'));
const registerManifestFonts = () => {
  let n = 0;
  for (const [family, combos] of Object.entries(FONT_MANIFEST)) {
    for (const [combo, meta] of Object.entries(combos)) {
      const [slug] = [family.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')];
      const p = join(ROOT, 'fonts', 'cache', slug, `${combo}.ttf`);
      if (!existsSync(p)) {
        throw new Error(`font manifest: missing cached file for "${family}" ${combo} (expected ${p}) — run fetch-fonts`);
      }
      const digest = createHash('sha256').update(readFileSync(p)).digest('hex');
      if (digest !== meta.sha256) {
        throw new Error(`font manifest: hash mismatch for "${family}" ${combo} (pinned ${meta.sha256}, got ${digest})`);
      }
      registerFontFile(p, family);
      n += 1;
    }
  }
  return n;
};
console.log(`[studio] manifest fonts registered: ${registerManifestFonts()}`);
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const measureFn = (text, size, weight, ls = 0, family = 'Inter') =>
  measure.measure(text, { fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: ls }).width;
const grain = createGrainTile(660, 1080, { seed: 21, amount: 0.5 });
let whoosh = null;
try {
  whoosh = await decodeAudioToPCM(LIB.whoosh);
  console.log('[studio] whoosh ready');
} catch {
  console.log('[studio] no whoosh asset — silent stingers');
}

const jobs = new Map();
let seq = 0;

// ---- asset resolution: spec ids → files ----
const castByName = new Map(); // rowName -> cast id
const propByName = new Map(); // cellName -> prop id

const splitFrame = (src) => {
  const m = /^(.*)-(\d+)$/.exec(src);
  return m ? [m[1], Number(m[2])] : [src, null];
};

const collectIds = (spec) => {
  const clips = new Set();
  const frames = new Set();
  const singles = new Set();
  for (const a of spec.acts) {
    for (const s of a.subjects ?? []) {
      if (s.kind === 'footage') clips.add(s.clip);
      else if (s.kind === 'flipbook') {
        const pre = String(s.srcPrefix ?? 'spr').replace(/\/$/, '');
        for (const f of s.order ?? [0, 1, 2, 3, 4]) frames.add(`${pre}/${s.cast}-${f}`);
      } else if (s.kind === 'icons') {
        for (const icon of s.icons) singles.add(`${s.srcPrefix ?? 'ic'}-${icon}`);
      } else if (s.kind === 'props') {
        for (const p of s.items) singles.add(p.src);
      }
    }
  }
  return { clips: [...clips], frames: [...frames], singles: [...singles] };
};

const resolveFile = (id) => {
  if (LIB.clips[id] !== undefined) return { kind: 'clip', path: LIB.clips[id] };
  if (LIB.props[id] !== undefined) return { kind: 'image', path: LIB.props[id] };
  const [base, f] = splitFrame(id);
  const cast = LIB.casts[base];
  if (cast !== undefined && f !== null && f < cast.frames) {
    return { kind: 'image', path: join(cast.dir, `${cast.row}-${f}.png`) };
  }
  // Lenient row/cell matching: any sheet name or prefix, keyed on the
  // row/cell label itself. Check cast by row name first.
  if (f !== null) {
    const rowName = base.split('/').pop();
    const cid = castByName.get(rowName);
    if (cid) {
      const c = LIB.casts[cid];
      if (f < c.frames) return { kind: 'image', path: join(c.dir, `${c.row}-${f}.png`) };
    }
  }
  // Unprefixed prop cell (e.g. "AppleLogo", "AppleLogo-0").
  const cellName = id.split('/').pop().replace(/-\d+$/, '');
  const pid = propByName.get(cellName);
  if (pid !== undefined) return { kind: 'image', path: LIB.props[pid] };
  throw new Error(`unknown asset id "${id}" — see GET /api/assets for the library`);
};

const LEGACY_FONT_FAMILIES = new Set(LIB.fonts.map(([, fam]) => fam));

/** Weights ensured per newly-seen family (covers every weight layouts emit). */
const ENSURE_WEIGHTS = [400, 500, 600, 700, 800];

/**
 * Auto-install step: collect every Google Fonts family a spec needs
 * (concept.faces + per-text title/kicker faces), fetch whatever is missing
 * from the manifest via the API, then reload + register. Pinned entries are
 * never re-fetched or updated here — determinism holds for everything cached.
 * Throws when a family/variant doesn't exist upstream, or when a fetch is
 * needed but GOOGLE_FONTS_API_KEY is unset.
 */
const ensureSpecFonts = async (spec) => {
  const needed = new Set();
  for (const f of Object.values(spec.concept?.faces ?? {})) {
    if (typeof f === 'string' && f.length > 0) needed.add(f);
  }
  for (const a of spec.acts ?? []) {
    if (typeof a?.title?.face === 'string' && a.title.face.length > 0) needed.add(a.title.face);
    if (typeof a?.kicker?.face === 'string' && a.kicker.face.length > 0) needed.add(a.kicker.face);
    for (const ln of a?.title?.lines ?? []) {
      if (typeof ln?.face === 'string' && ln.face.length > 0) needed.add(ln.face);
    }
  }
  const missing = [...needed].filter((fam) => {
    if (LEGACY_FONT_FAMILIES.has(fam)) return false;
    const combos = FONT_MANIFEST[fam];
    return combos === undefined || Object.keys(combos).length === 0;
  });
  if (missing.length === 0) {
    return { fetched: [] };
  }
  for (const fam of missing) {
    const r = await ensureFamily(fam, ENSURE_WEIGHTS, ['normal'], { root: ROOT, apiKey: process.env.GOOGLE_FONTS_API_KEY ?? '', update: false });
    console.log(`[studio] ensure ${fam}: available [${r.available.join(', ')}]${r.fetched.length > 0 ? ` (fetched ${r.fetched.join(', ')})` : ' (already cached)'}`);
  }
  FONT_MANIFEST = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const n = registerManifestFonts();
  console.log(`[studio] auto-fetched fonts for this spec: ${missing.join(', ')} (manifest now registers ${n})`);
  return { fetched: missing };
};

/**
 * Spec-validate-time font check (Q4): every text node's family must be pinned
 * in fonts/manifest.json (or a legacy LIB.fonts family). An inexact
 * weight/style combo is a visible decisions warning — Skia nearest-matches
 * the weight with the same string for measure and draw, like browsers — never
 * silent. Unknown families throw before a single frame renders.
 */
const assertPlanFontsPinned = (plan, decisions = []) => {
  const seen = new Map(); // "family|weight|style" -> node id
  const walk = (n) => {
    if (n === null || typeof n !== 'object') {
      return;
    }
    if (typeof n.fontFamily === 'string' && (n.type === 'text' || n.text !== undefined)) {
      const weight = typeof n.fontWeight === 'number' ? n.fontWeight : 400;
      const style = n.fontStyle ?? 'normal';
      seen.set(`${n.fontFamily}|${weight}|${style}`, n.id ?? '?');
    }
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) {
        for (const item of v) walk(item);
      } else {
        walk(v);
      }
    }
  };
  walk(plan.composition.root);
  const bad = [];
  for (const [key, id] of seen) {
    const [family, weight, style] = key.split('|');
    const combos = FONT_MANIFEST[family];
    if (combos !== undefined) {
      if (combos[`${weight}-${style}`] === undefined) {
        decisions.push({
          path: `font.${family}`,
          choice: `nearest-weight render (${weight}-${style} → pinned ${Object.keys(combos).join(', ')})`,
          why: `node "${id}" asks for an unshipped combo; measure+draw use the same string so layout stays consistent`,
        });
      }
      continue;
    }
    if (!LEGACY_FONT_FAMILIES.has(family)) {
      bad.push(`node "${id}": unknown font family "${family}" (not in manifest, not legacy)`);
    }
  }
  if (bad.length > 0) {
    throw new Error(`unpinned fonts:\n- ${bad.join('\n- ')}`);
  }
};

const cutsOf = (durations) => {  const cuts = [];
  let acc = 0;
  for (let i = 0; i < durations.length - 1; i += 1) {
    acc += durations[i];
    cuts.push(acc - 2);
  }
  return cuts;
};

const runJob = async (job) => {
  const t0 = Date.now();
  try {
    const errs = validateSpec(job.spec);
    if (errs.length > 0) throw new Error(`invalid spec:\n- ${errs.join('\n- ')}`);
    job.state = 'fonts';
    await ensureSpecFonts(job.spec);
    job.state = 'compile';
    const { plan, decisions } = compileReel(job.spec, { measure: measureFn });
    job.decisions = decisions;
    validateTimeline(plan.timeline, plan.composition.root);
    assertPlanFontsPinned(plan, decisions);

    job.state = 'assets';
    const ids = collectIds(job.spec);
    const images = {};
    const dims = new Map();
    const loadImage = async (id) => {
      const r = resolveFile(id);
      if (r.kind !== 'image') throw new Error(`asset "${id}" is not an image`);
      images[id] = readFileSync(r.path);
      srcPath.set(id, r.path);
    };
    const srcPath = new Map();
    for (const id of [...ids.frames, ...ids.singles]) await loadImage(id);
    const pre = await preloadImages(images);
    for (const id of [...ids.frames, ...ids.singles]) {
      const info = await probeImage(srcPath.get(id));
      dims.set(id, { width: info.width, height: info.height });
    }
    const clips = {};
    const meta = {};
    for (const id of ids.clips) {
      const r = resolveFile(id);
      if (r.kind !== 'clip') throw new Error(`asset "${id}" is not a clip`);
      const probe = await probeVideo(r.path);
      const dec = await decodeVideoFrames(r.path);
      meta[id] = { width: dec.width, height: dec.height, durationSec: probe.durationSec, fps: probe.fps };
      clips[id] = framesToCanvases(dec);
    }
    job.state = 'render';
    const total = plan.composition.durationInFrames;
    job.total = total;
    const options = () => ({
      measureText: measure,
      resolveAsset: (src) => (src === 'grain-tile' ? grain : pre.get(src)),
      assetInfo: (src) => {
        const m = meta[src];
        if (m) return { width: m.width, height: m.height, durationSec: m.durationSec, fps: m.fps };
        return dims.get(src);
      },
      resolveVideoFrame: clipResolver(clips),
      transitionApplier: skiaTransitionApplier(renderer),
    });
    let audio;
    if (whoosh !== null) {
      const tracks = cutsOf(job.spec.durations).map((fromFrame) => ({
        pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels,
        fromFrame, volume: 0.5,
      }));
      audio = { pcm: mixTracks(tracks, { fps: 30, durationFrames: total }), sampleRate: 44100, channels: 2 };
    }
    const surf = renderer.createSurface(540, 960);
    const mp4 = await renderToMp4({
      width: 540, height: 960, fps: 30, frameCount: total,
      renderFrame: (f) => {
        renderer.clear(surf, '#000000');
        renderFrame(renderer, surf, plan, f, options());
        job.frame = f;
        return Buffer.from(renderer.readPixels(surf).data);
      },
      ...(audio === undefined ? {} : { audio }),
      onProgress: (f) => { job.frame = f; },
    });
    renderer.destroySurface(surf);
    const name = `${job.spec.id || 'reel'}-${job.id}.mp4`;
    writeFileSync(join(OUT, name), mp4);
    job.state = 'done';
    job.mp4 = `/api/out/${name}`;
    job.ms = Date.now() - t0;
    console.log(`[studio] job ${job.id} done in ${(job.ms / 1000).toFixed(1)}s`);
} catch (e) {
    job.state = 'failed';
    job.error = String((e && e.message) || e);
    job.stack = e && e.stack ? String(e.stack) : '';
    console.log(`[studio] job ${job.id} failed: ${job.error}`);
  }
};

// ---- http ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp4': 'video/mp4' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const send = (code, body, type = 'application/json') => {
    const buf = typeof body === 'string' ? body : JSON.stringify(body);
    res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(buf) });
    res.end(buf);
  };
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    const html = readFileSync(join(DIR, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': Buffer.byteLength(html) });
    res.end(html);
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/assets') {
    send(200, {
      casts: Object.keys(LIB.casts), props: Object.keys(LIB.props),
      clips: Object.keys(LIB.clips),
      fonts: LIB.fonts.map(([, fam]) => fam),
    });
    return;
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/out/')) {
    const name = url.pathname.slice('/api/out/'.length).replace(/[^a-zA-Z0-9._-]/g, '');
    const p = join(OUT, name);
    if (!existsSync(p) || extname(p) !== '.mp4') { send(404, { error: 'not found' }); return; }
    const data = readFileSync(p);
    res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': data.length, 'Content-Disposition': `attachment; filename="${name}"` });
    res.end(data);
    return;
  }
  // ---- sprite sheet upload: conforming sheets only (template geometry).
  // Body: {name, rows:[{name,kind:'cycle'|'props'}], pngBase64,
  //        cell?, grid?, bg?}. Returns registered cast/prop ids.
  if (req.method === 'POST' && url.pathname === '/api/sheets') {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw);
        const name = String(body.name || '').replace(/[^a-zA-Z0-9_-]/g, '');
        let rows = body.rows;
        if (rows !== undefined && !Array.isArray(rows) && Array.isArray(rows.rows)) {
          rows = rows.rows; // tolerate pasting {"rows": [...]}
        }
        if (!name) throw new Error('name required (letters, digits, -, _)');
        if (!Array.isArray(rows) || rows.length === 0 || rows.length > 8) {
          throw new Error('rows: 1-8 entries of {name, kind} required');
        }
        const cell = body.cell ?? 256;
        const grid = body.grid ?? 6;
        const bg = body.bg ?? [255, 0, 255];
        const buf = Buffer.from(String(body.pngBase64 || ''), 'base64');
        if (buf.length < 100) throw new Error('pngBase64 missing or too small');
        let img = await loadImage(buf);
        const step = cell + grid;
        const needW = grid + 5 * step;
        const needH = grid + rows.length * step;
        if (img.width !== needW || img.height !== needH) {
          const scaled = createCanvas(needW, needH);
          const sctx = scaled.getContext('2d');
          sctx.imageSmoothingEnabled = false;
          sctx.drawImage(img, 0, 0, needW, needH);
          img = scaled;
        }
        const cv = createCanvas(img.width, img.height);
        const c2 = cv.getContext('2d');
        c2.drawImage(img, 0, 0);
        const rawPx = c2.getImageData(0, 0, img.width, img.height).data;
        const rgba = new Uint8ClampedArray(rawPx.buffer.slice(0));
        const found = parseSheet(rgba, img.width, img.height, {
          rows: rows.length, cols: 5, cell, grid, bg, tol: 24, inset: 1,
        });
        const dir = join(DIR, 'uploads', name);
        mkdirSync(dir, { recursive: true });
        const casts = [];
        const props = [];
        const saveFrame = async (f, file) => {
          const tmp = createCanvas(f.boxW, f.boxH);
          const tctx = tmp.getContext('2d');
          const idata = tctx.createImageData(f.boxW, f.boxH);
          for (let p = 0; p < f.boxW * f.boxH; p += 1) {
            idata.data[p * 4] = f.data[p * 4];
            idata.data[p * 4 + 1] = f.data[p * 4 + 1];
            idata.data[p * 4 + 2] = f.data[p * 4 + 2];
            idata.data[p * 4 + 3] = Math.round(f.alpha[p] * 255);
          }
          tctx.putImageData(idata, 0, 0);
          writeFileSync(file, await tmp.encode('png'));
        };
        for (let r = 0; r < rows.length; r += 1) {
          const rd = rows[r];
          const rname = String(rd.name || '').replace(/[^a-zA-Z0-9_-]/g, '');
          if (!rname) throw new Error(`rows[${r}].name required`);
          if (rd.kind === 'props') {
            const cells = Array.isArray(rd.cells) && rd.cells.length > 0
              ? rd.cells.map((c) => String(c).replace(/[^a-zA-Z0-9_-]/g, ''))
              : found[r].map((_, c) => `${rname}-${c}`);
            for (let c = 0; c < found[r].length; c += 1) {
              const file = join(dir, `${rname}-${c}.png`);
              await saveFrame(found[r][c], file);
              const pid = `${name}/${cells[c] ?? `${rname}-${c}`}`;
              LIB.props[pid] = file;
              props.push(pid);
              // Lenient aliases: bare cell name → first matching frame.
              if (!propByName.has(cells[c])) propByName.set(cells[c], pid);
              if (!propByName.has(`${cells[c]}-${c}`)) propByName.set(`${cells[c]}-${c}`, pid);
            }
            // Bare row name (e.g. "AppleLogo") → cell 0.
            const firstPid = `${name}/${cells[0] ?? `${rname}-0`}`;
            if (!propByName.has(rname)) propByName.set(rname, firstPid);
          } else {
            for (let c = 0; c < found[r].length; c += 1) {
              const file = join(dir, `${rname}-${c}.png`);
              await saveFrame(found[r][c], file);
            }
            const cid = `${name}/${rname}`;
            LIB.casts[cid] = { dir, row: rname, frames: found[r].length };
            castByName.set(rname, cid);
            casts.push(cid);
          }
        }
        send(200, { ok: true, casts, props });
      } catch (e) {
        send(400, { ok: false, errors: [String(e && e.message ? e.message : e)] });
      }
    });
    return;
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/jobs/')) {
    const id = url.pathname.slice('/api/jobs/'.length);
    const job = jobs.get(id);
    if (job === undefined) { send(404, { error: 'unknown job' }); return; }
    const { spec, ...pub } = job;
    send(200, pub);
    return;
  }
  if (req.method === 'POST' && (url.pathname === '/api/validate' || url.pathname === '/api/render')) {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      let spec;
      try {
        spec = JSON.parse(raw);
      } catch {
        send(400, { ok: false, errors: ['body is not valid JSON'] });
        return;
      }
      if (url.pathname === '/api/validate') {
        try {
          const errors = validateSpec(spec);
          if (errors.length > 0) { send(200, { ok: false, errors }); return; }
          const { decisions } = compileReel(spec, { measure: measureFn });
          send(200, { ok: true, decisions });
        } catch (e) {
          send(200, { ok: false, errors: [String(e && e.message ? e.message : e)] });
        }
        return;
      }
      seq += 1;
      const id = `j${seq}`;
      const job = { id, state: 'queued', frame: 0, total: 0, spec };
      jobs.set(id, job);
      void runJob(job);
      send(200, { job: id });
    });
    return;
  }
  send(404, { error: 'not found' });
});

const port = Number(process.argv[2] ?? 8099);
server.listen(port, () => console.log(`[studio] http://localhost:${port}/`));
