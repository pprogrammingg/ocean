import { fetchJSON, explorePath } from "./api.js";
import { webRoot } from "./nav.js";

/** Tune count-up: start this fraction of the final value (0.5 = 50% less). */
const COUNT_START_FRACTION = 0.5;
/** Total animation length in ms. */
const COUNT_DURATION_MS = 1100;

const BG_INTERVAL_MS = 10000;
const BG_SLIDES = ["bg-1.webp", "bg-2.webp", "bg-4.webp"];

let bgTimer = null;

function stopLandingBg() {
  if (bgTimer != null) {
    clearInterval(bgTimer);
    bgTimer = null;
  }
}

/** Crossfade landing backgrounds every 10s. Respects reduced-motion (static first). */
function startLandingBg() {
  stopLandingBg();
  const host = document.querySelector(".landing-bg");
  if (!host) return;

  const root = webRoot();
  const urls = BG_SLIDES.map((name) => `${root}media/landing/${name}`);
  host.replaceChildren();

  const slides = urls.map((url, i) => {
    const el = document.createElement("div");
    el.className = "landing-bg__slide" + (i === 0 ? " is-active" : "");
    el.style.backgroundImage = `url("${url}")`;
    host.appendChild(el);
    return el;
  });

  // Prefetch remaining images
  urls.slice(1).forEach((url) => {
    const img = new Image();
    img.src = url;
  });

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || slides.length < 2) return;

  let index = 0;
  bgTimer = setInterval(() => {
    slides[index].classList.remove("is-active");
    index = (index + 1) % slides.length;
    slides[index].classList.add("is-active");
  }, BG_INTERVAL_MS);
}

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
  startLandingBg();
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
