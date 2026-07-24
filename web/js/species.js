/** Resolve species by slug → digram shard (lazy). Legacy marine-life is fallback. */
import { fetchJSON, marineLifePath, speciesShardPath, speciesIndexPath } from "./api.js";
import { webRoot } from "./nav.js";

/** First 2 alphanumerics of slug — no index fetch required to open a card. */
export function shardIdFromSlug(slug) {
  const key = String(slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return key.slice(0, 2);
}

/** Hub deep-link: prefer record.shard when known; always include slug + hash. */
export function speciesHubUrl(slug, shard) {
  const shardId = shard || shardIdFromSlug(slug);
  const base = `${webRoot()}curiosity/species.html`;
  if (!slug || !shardId) return base;
  return `${base}?shard=${encodeURIComponent(shardId)}&slug=${encodeURIComponent(slug)}#species-${encodeURIComponent(slug)}`;
}

const shardCache = new Map();
const recordBySlug = new Map();

async function loadShard(shardId) {
  if (!shardId) return null;
  if (shardCache.has(shardId)) return shardCache.get(shardId);
  try {
    const data = await fetchJSON(speciesShardPath(shardId));
    shardCache.set(shardId, data);
    for (const sp of data.species || []) {
      recordBySlug.set(sp.id, { ...sp, shard: sp.shard || data.shard || shardId });
    }
    return data;
  } catch {
    shardCache.set(shardId, null);
    return null;
  }
}

async function fetchLegacyMarineLife(slug) {
  for (const type of ["animals", "plants"]) {
    try {
      const record = await fetchJSON(marineLifePath(type, slug));
      return normalizeRecord(record);
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Normalize shard + legacy shapes for one renderer. */
export function normalizeRecord(record) {
  if (!record) return null;
  return {
    ...record,
    popular_name: record.popular_name || record.name || "",
    name: record.popular_name || record.name || "",
    translations: record.translations || {},
    dwelling_habits: record.dwelling_habits || null,
    fun_facts: record.fun_facts || [],
    images: record.images || (record.image ? [record.image] : []),
    tags: record.tags || [],
    shard: record.shard || (record.id ? shardIdFromSlug(record.id) : undefined),
  };
}

export async function fetchSpeciesRecord(slug) {
  if (!slug) return null;
  if (recordBySlug.has(slug)) return normalizeRecord(recordBySlug.get(slug));

  const shardId = shardIdFromSlug(slug);
  const shard = await loadShard(shardId);
  if (shard) {
    const found = (shard.species || []).find((sp) => sp.id === slug);
    if (found) return normalizeRecord(found);
  }

  return fetchLegacyMarineLife(slug);
}

export async function fetchSpeciesRecords(slugs = []) {
  return Promise.all(slugs.map(fetchSpeciesRecord));
}

export async function fetchSpeciesIndex() {
  return fetchJSON(speciesIndexPath());
}

export async function fetchShard(shardId) {
  return loadShard(shardId);
}
