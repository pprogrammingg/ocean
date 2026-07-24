import { fetchJSON, explorePath } from "./api.js";

/** Tune count-up: start this fraction of the final value (0.5 = 50% less). */
const COUNT_START_FRACTION = 0.5;
/** Total animation length in ms. */
const COUNT_DURATION_MS = 1100;

async function loadStats() {
  const [countries, search, animals, plants] = await Promise.all([
    fetchJSON(explorePath("countries.json")),
    fetchJSON("education/species/search-index.json").catch(() => ({ entries: [] })),
    fetchJSON("education/marine-life/animals/index.json").catch(() => ({ items: [] })),
    fetchJSON("education/marine-life/plants/index.json").catch(() => ({ items: [] })),
  ]);

  const beaches = (countries.countries || []).reduce(
    (sum, c) => sum + (c.city_zones || []).reduce((s, z) => s + (z.beach_count || 0), 0),
    0
  );

  const speciesIds = new Set([
    ...(search.entries || []).map((e) => e.id),
    ...(animals.items || []).map((i) => i.id),
    ...(plants.items || []).map((i) => i.id),
  ]);

  return {
    beaches,
    species: speciesIds.size,
    ecovillages: 0,
  };
}

/** Fast early rise, strong slowdown into the final value. */
function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function animateCount(el, target, durationMs = COUNT_DURATION_MS) {
  const start = Math.max(0, Math.round(target * COUNT_START_FRACTION));
  const diff = target - start;
  if (diff <= 0) {
    el.textContent = String(target);
    return;
  }

  const t0 = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - t0) / durationMs);
    const value = Math.round(start + diff * easeOutExpo(t));
    el.textContent = String(value);
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = String(target);
  }
  requestAnimationFrame(frame);
}

export async function startHomePage() {
  try {
    const stats = await loadStats();
    for (const [key, target] of Object.entries(stats)) {
      const el = document.querySelector(`[data-stat="${key}"]`);
      if (!el) continue;
      el.dataset.target = String(target);
      animateCount(el, target);
    }
  } catch (err) {
    console.error(err);
  }
}
