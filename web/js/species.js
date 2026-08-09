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

const LANG_NAMES = { pap: "Papiamento", es: "Spanish", nl: "Dutch", fr: "French", pt: "Portuguese" };

function mapLegacyStatus(raw) {
  const text = String(raw || "");
  if (/extinct/i.test(text)) return "Extinct";
  if (/critically|endangered/i.test(text)) return "Critical";
  if (/vulnerable|near.?threatened|threatened|cites|depleted/i.test(text)) return "Bad";
  return "Good";
}

function languagesFromLegacy(record) {
  if (record.languages && typeof record.languages === "object") return record.languages;
  const tr = record.translations || {};
  const other = [];
  for (const [code, name] of Object.entries(tr)) {
    if (code === "pap" || code === "en" || !name) continue;
    other.push({ lang: LANG_NAMES[code] || code, name });
    if (other.length >= 3) break;
  }
  return {
    indigenous: { lang: "Papiamento", name: tr.pap || "" },
    english: record.popular_name || record.name || "",
    other,
  };
}

function conservationFromLegacy(record) {
  if (record.conservation?.status) {
    const life = record.conservation.life_info || {};
    return {
      status: record.conservation.status,
      help_by: record.conservation.help_by || "",
      caution_against: record.conservation.caution_against || "",
      life_info: {
        eating: life.eating || "",
        mating: life.mating || "",
        habitat: life.habitat || "",
      },
    };
  }
  const h = record.dwelling_habits;
  const habits = typeof h === "object" && h ? h : {};
  const eating = [habits.food, habits.feeding].filter(Boolean).join(" ");
  const habitat = [habits.dwelling, habits.socializing].filter(Boolean).join(" ");
  return {
    status: mapLegacyStatus(record.conservation_status),
    help_by: "Give wildlife space; pick reef-safe sunscreen and careful finning.",
    caution_against: "Don’t feed fish, chase animals, or pocket living souvenirs.",
    life_info: {
      eating: eating || (typeof h === "string" ? h : ""),
      mating: habits.mating || "",
      habitat: habitat || "",
    },
  };
}

/** Normalize shard + legacy shapes for one renderer. */
export function normalizeRecord(record) {
  if (!record) return null;
  const popular = record.popular_name || record.name || "";
  const tags = record.tags || [];
  const kind = record.type === "plant" ? "Plant" : "Animal";
  const taxonomy =
    record.taxonomy ||
    [kind, ...tags.slice(0, 2).map((t) => String(t).replace(/-/g, " "))].join(" · ");

  return {
    ...record,
    popular_name: popular,
    name: popular,
    taxonomy,
    scientific_name: record.scientific_name || "",
    languages: languagesFromLegacy(record),
    conservation: conservationFromLegacy(record),
    fun_facts: (record.fun_facts || []).slice(0, 5),
    images: record.images || (record.image ? [record.image] : []),
    tags,
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
