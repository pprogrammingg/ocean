import { fetchJSON, marineLifePath } from "./api.js";

const slugFolder = new Map();

async function fetchSpeciesRecord(slug) {
  const known = slugFolder.get(slug);
  if (known === null) return null;
  if (known) return fetchJSON(marineLifePath(known, slug));

  for (const type of ["animals", "plants"]) {
    try {
      const record = await fetchJSON(marineLifePath(type, slug));
      slugFolder.set(slug, type);
      return record;
    } catch {
      /* try plants next */
    }
  }
  slugFolder.set(slug, null);
  return null;
}

export async function fetchSpeciesRecords(slugs = []) {
  return Promise.all(slugs.map(fetchSpeciesRecord));
}
