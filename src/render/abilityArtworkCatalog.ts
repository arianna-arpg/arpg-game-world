/** Vite's abilityArtworkPlugin replaces this empty headless catalogue with
 * selected, packaged URLs from the website's provenance manifest. Keeping the
 * stub importable lets engine probes use the vector fallback without a DOM. */
export const ABILITY_ARTWORK_URLS: Readonly<Record<string, string>> = {};
