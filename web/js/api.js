const DATA_ROOT = "../data";

export async function fetchJSON(path) {
  const res = await fetch(`${DATA_ROOT}/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

export function explorePath(...segments) {
  return `explore/${segments.join("/")}`;
}

export function marineLifePath(type, slug) {
  return `education/marine-life/${type}/${slug}.json`;
}
