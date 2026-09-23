#!/usr/bin/env node
/**
 * fetch-fonts CLI — the ONLY module allowed to touch the network for fonts.
 *
 * Reads requested families, resolves each (weight, style) to a Google Fonts
 * file URL, downloads, sha256-pins, and writes fonts/cache/ + fonts/manifest.json.
 *
 * Render/boot never calls this: they read the manifest + cache offline and
 * throw on any mismatch or miss. A changed upstream URL/hash requires an
 * explicit --update run; render never auto-adopts it.
 *
 * Usage:
 *   GOOGLE_FONTS_API_KEY=... node packages/font-fetch/dist/fetch-fonts.js \
 *     --family "Rozha One" --weights 400 --styles normal [--update] [--root .]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileUrlFor, lookupFamily, slugFor, variantKeyFor } from './google-fonts.js';

export interface ManifestEntry {
  sourceUrl: string;
  sha256: string;
  apiVersion: string;
  fetchedAt: string;
}

export type FontManifest = Record<string, Record<string, ManifestEntry>>;

const sha256Hex = (buf: Buffer): string => createHash('sha256').update(buf).digest('hex');

const readManifest = (path: string): FontManifest => {
  if (!existsSync(path)) {
    return {};
  }
  return JSON.parse(readFileSync(path, 'utf8')) as FontManifest;
};

const parseList = (raw: string | undefined, fallback: string[]): string[] => {
  if (raw === undefined || raw.trim().length === 0) {
    return fallback;
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

const parseWeights = (raw: string | undefined): number[] => {
  const parts = parseList(raw, ['400']);
  return parts.map((p) => {
    const w = Number(p);
    if (!Number.isInteger(w) || w < 1 || w > 1000) {
      throw new Error(`fetch-fonts: bad --weights entry ${JSON.stringify(p)} (need integers 1..1000)`);
    }
    return w;
  });
};

/**
 * Lenient ensure for the server auto-install path: fetch whichever of the
 * requested (weight, style) combos the family actually ships. Throws only when
 * the family is unknown or ships NONE of the requested combos. Draw/measure
 * stay consistent (identical strings), Skia nearest-matches the weight —
 * same as browsers. The exact-combo gap is reported as a decisions warning
 * by the caller, never silent.
 */
export const ensureFamily = async (
  family: string,
  weights: number[],
  styles: string[],
  opts: { root: string; apiKey: string; update: boolean },
): Promise<{ fetched: string[]; available: string[]; entryVersion: string }> => {
  if (opts.apiKey.length === 0) {
    throw new Error('font-fetch: missing Google Fonts API key (set GOOGLE_FONTS_API_KEY)');
  }
  const entry = await lookupFamily(family, opts.apiKey);
  const wanted = new Map<string, { weight: number; style: string }>();
  for (const weight of weights) {
    for (const style of styles) {
      wanted.set(`${weight}-${style}`, { weight, style });
    }
  }
  const available = [...wanted.keys()].filter((combo) => {
    const { weight, style } = wanted.get(combo) as { weight: number; style: string };
    return entry.variants.includes(variantKeyFor(weight, style));
  });
  if (available.length === 0) {
    throw new Error(
      `font-fetch: "${family}" ships none of the requested combos (${[...wanted.keys()].join(', ')}); ` +
        `family offers: ${entry.variants.join(', ')}`,
    );
  }
  const manifestPath = join(opts.root, 'fonts', 'manifest.json');
  const manifest = readManifest(manifestPath);
  manifest[family] ??= {};
  const fetched: string[] = [];
  for (const combo of available) {
    const { weight, style } = wanted.get(combo) as { weight: number; style: string };
    const fileUrl = fileUrlFor(entry, weight, style);
    const cached = manifest[family]?.[combo];
    const destDir = join(opts.root, 'fonts', 'cache', slugFor(family));
    const dest = join(destDir, `${combo}.ttf`);
    if (cached !== undefined && cached.sourceUrl === fileUrl && existsSync(dest)) {
      const digest = sha256Hex(readFileSync(dest));
      if (digest !== cached.sha256) {
        throw new Error(`font-fetch: hash mismatch for cached ${family} ${combo}`);
      }
      continue;
    }
    if (cached !== undefined && cached.sourceUrl !== fileUrl && !opts.update) {
      throw new Error(
        `font-fetch: upstream URL changed for ${family} ${combo} — re-run with --update to adopt deliberately`,
      );
    }
    const res = await fetch(fileUrl);
    if (!res.ok) {
      throw new Error(`font-fetch: download ${res.status} for ${family} ${combo} (${fileUrl})`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) {
      throw new Error(`font-fetch: suspiciously small file (${buf.length}B) for ${family} ${combo}`);
    }
    mkdirSync(destDir, { recursive: true });
    writeFileSync(dest, buf);
    manifest[family][combo] = {
      sourceUrl: fileUrl,
      sha256: sha256Hex(buf),
      apiVersion: entry.version ?? 'unknown',
      fetchedAt: new Date().toISOString(),
    };
    fetched.push(combo);
  }
  if (fetched.length > 0) {
    mkdirSync(join(opts.root, 'fonts'), { recursive: true });
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  return { fetched, available, entryVersion: entry.version ?? 'unknown' };
};

export const runFetch = async (argv: string[], env: NodeJS.ProcessEnv): Promise<void> => {  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
  };
  const has = (flag: string): boolean => argv.includes(flag);
  if (has('--help') || has('-h')) {
    console.log(
      'fetch-fonts --family "Name" [--family "Other"] [--weights 400,700] [--styles normal,italic] [--root .] [--update] [--key KEY]',
    );
    return;
  }
  const families = parseList(get('--family'), []);
  if (families.length === 0) {
    throw new Error('fetch-fonts: pass at least one --family "Name"');
  }
  const weights = parseWeights(get('--weights'));
  const styles = parseList(get('--styles'), ['normal']);
  for (const s of styles) {
    if (s !== 'normal' && s !== 'italic') {
      throw new Error(`fetch-fonts: bad --styles entry ${JSON.stringify(s)} (need normal/italic)`);
    }
  }
  const root = resolve(get('--root') ?? '.');
  const update = has('--update');
  const apiKey = get('--key') ?? env['GOOGLE_FONTS_API_KEY'] ?? '';
  const manifestPath = join(root, 'fonts', 'manifest.json');
  const manifest = readManifest(manifestPath);
  let changed = false;

  for (const family of families) {
    const entry = await lookupFamily(family, apiKey);
    const slug = slugFor(family);
    manifest[family] ??= {};
    for (const weight of weights) {
      for (const style of styles) {
        const comboKey = `${weight}-${style}`;
        const fileUrl = fileUrlFor(entry, weight, style);
        const cached = manifest[family]?.[comboKey];
        const destDir = join(root, 'fonts', 'cache', slug);
        const dest = join(destDir, `${comboKey}.ttf`);
        if (cached !== undefined && cached.sourceUrl === fileUrl && existsSync(dest)) {
          const digest = sha256Hex(readFileSync(dest));
          if (digest === cached.sha256) {
            console.log(`ok (pinned): ${family} ${comboKey}`);
            continue;
          }
          throw new Error(
            `fetch-fonts: hash mismatch for cached ${family} ${comboKey} ` +
              `(expected ${cached.sha256}, got ${digest}) — delete the file or re-fetch deliberately`,
          );
        }
        if (cached !== undefined && cached.sourceUrl !== fileUrl && !update) {
          throw new Error(
            `fetch-fonts: upstream URL changed for ${family} ${comboKey}\n` +
              `  pinned:  ${cached.sourceUrl}\n` +
              `  current: ${fileUrl}\n` +
              `re-run with --update "${family}" to adopt it deliberately (manifest diff will show the change)`,
          );
        }
        const res = await fetch(fileUrl);
        if (!res.ok) {
          throw new Error(`fetch-fonts: download ${res.status} for ${family} ${comboKey} (${fileUrl})`);
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1024) {
          throw new Error(`fetch-fonts: suspiciously small file (${buf.length}B) for ${family} ${comboKey}`);
        }
        mkdirSync(destDir, { recursive: true });
        writeFileSync(dest, buf);
        manifest[family][comboKey] = {
          sourceUrl: fileUrl,
          sha256: sha256Hex(buf),
          apiVersion: entry.version ?? 'unknown',
          fetchedAt: new Date().toISOString(),
        };
        changed = true;
        console.log(`fetched: ${family} ${comboKey} → ${dest} (${buf.length}B, sha256 ${manifest[family][comboKey].sha256.slice(0, 12)}…)`);
      }
    }
  }
  if (changed) {
    mkdirSync(join(root, 'fonts'), { recursive: true });
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`wrote ${manifestPath}`);
  } else {
    console.log('manifest unchanged');
  }
};

const isMain = process.argv[1] !== undefined && process.argv[1].endsWith('fetch-fonts.js');
if (isMain) {
  runFetch(process.argv.slice(2), process.env).catch((e: unknown) => {
    console.error(`fetch-fonts failed: ${String((e as Error)?.message ?? e)}`);
    process.exit(1);
  });
}
