/**
 * @x80/font-fetch — Google Fonts Developer API client.
 *
 * Network lives ONLY in the fetch-fonts CLI path. The render path must never
 * import this module: boot/compile read fonts/manifest.json + fonts/cache/.
 */

export interface WebfontEntry {
  family: string;
  variants: string[];
  files: Record<string, string>;
  version?: string;
  lastModified?: string;
}

/** Google variant key for a (weight, style) combo: "regular" | "italic" | "700" | "700italic" … */
export const variantKeyFor = (weight: number, style: string): string => {
  if (!Number.isInteger(weight) || weight < 1 || weight > 1000) {
    throw new Error(`font-fetch: weight must be an integer 1..1000 (got ${String(weight)})`);
  }
  if (style !== 'normal' && style !== 'italic') {
    throw new Error(`font-fetch: style must be "normal" or "italic" (got ${JSON.stringify(style)})`);
  }
  if (style === 'italic') {
    return weight === 400 ? 'italic' : `${weight}italic`;
  }
  return weight === 400 ? 'regular' : `${weight}`;
};

/** Disk slug for a family name ("Rozha One" → "rozha-one"). Alias itself is never slugified. */
export const slugFor = (family: string): string => {
  const slug = family
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (slug.length === 0) {
    throw new Error(`font-fetch: family has no usable slug (${JSON.stringify(family)})`);
  }
  return slug;
};

/** Exact-match family lookup via the official Developer API (static TTF URLs by default). */
export const lookupFamily = async (family: string, apiKey: string): Promise<WebfontEntry> => {
  if (apiKey.length === 0) {
    throw new Error('font-fetch: missing Google Fonts API key (set GOOGLE_FONTS_API_KEY or pass --key)');
  }
  const url =
    `https://www.googleapis.com/webfonts/v1/webfonts?key=${encodeURIComponent(apiKey)}` +
    `&family=${encodeURIComponent(family)}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`font-fetch: network error looking up "${family}": ${String((e as Error)?.message ?? e)}`);
  }
  if (!res.ok) {
    throw new Error(`font-fetch: Google Fonts API ${res.status} for family "${family}"`);
  }
  const json = (await res.json()) as { items?: WebfontEntry[] };
  const entry = (json.items ?? []).find((e) => e.family === family);
  if (entry === undefined) {
    throw new Error(`font-fetch: Google Fonts has no family "${family}"`);
  }
  return entry;
};

/**
 * Resolve the download URL for a (weight, style) combo.
 * Throws when the family's own variants list lacks the key — never substitutes nearest.
 */
export const fileUrlFor = (entry: WebfontEntry, weight: number, style: string): string => {
  const key = variantKeyFor(weight, style);
  if (!entry.variants.includes(key)) {
    throw new Error(
      `font-fetch: "${entry.family}" has no variant "${key}" ` +
        `(weight ${weight}, style ${style}); available: ${entry.variants.join(', ')}`,
    );
  }
  const fileUrl = entry.files[key];
  if (typeof fileUrl !== 'string' || fileUrl.length === 0) {
    throw new Error(`font-fetch: "${entry.family}" variant "${key}" has no file URL`);
  }
  return fileUrl;
};
