/** Lazy-load JSON from data/ — path set by <meta name="ocean-data-base"> on beaches.html */
function dataRoot() {
  const base = document.querySelector('meta[name="ocean-data-base"]')?.content?.trim() || "../data/";
  return new URL(base, document.baseURI);
}

const cache = new Map();

export async function fetchJSON(path) {
  const url = new URL(path, dataRoot()).href;
  if (cache.has(url)) return cache.get(url);

  const res = await fetch(new URL(path, dataRoot()));
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

export function explorePath(...segments) {
  return `explore/${segments.join("/")}`;
}

export function marineLifePath(type, slug) {
  return `education/marine-life/${type}/${slug}.json`;
}

export function speciesIndexPath() {
  return "education/species/index.json";
}

export function speciesSearchIndexPath() {
  return "education/species/search-index.json";
}

export function speciesShardPath(shardId) {
  return `education/species/shards/${shardId}.json`;
}
