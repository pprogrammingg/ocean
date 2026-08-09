import { fetchJSON, explorePath, habitatPath } from "./api.js";
import { webRoot } from "./nav.js";

/** Total animation length in ms. */
const COUNT_DURATION_MS = 2200;
/**
 * Value checkpoints as fractions of the target (e.g. 50 → 25, 33, 40, 45, 50).
 * First leg is full pace; each later leg is 25% slower than the previous.
 */
const COUNT_BREAKS = [0.5, 2 / 3, 0.8, 0.9, 1];
const COUNT_SPEED_DECAY = 0.75;

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
  const [countries, search, animals, plants, habitat] = await Promise.all([
    fetchJSON(explorePath("countries.json")),
    fetchJSON("education/species/search-index.json").catch(() => ({ entries: [] })),
    fetchJSON("education/marine-life/animals/index.json").catch(() => ({ items: [] })),
    fetchJSON("education/marine-life/plants/index.json").catch(() => ({ items: [] })),
    fetchJSON(habitatPath("index.json")).catch(() => ({ place_count: 0 })),
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
    ecovillages: habitat.place_count || 0,
  };
}

/**
 * Progress 0→1 through staged paces: full speed to 50%, then each leg 25% slower.
 * Returns fraction of target reached.
 */
function countProgress(t) {
  const ends = COUNT_BREAKS;
  const starts = [0, ...ends.slice(0, -1)];
  const n = ends.length;
  const weights = [];
  let totalW = 0;
  for (let i = 0; i < n; i++) {
    const speed = Math.pow(COUNT_SPEED_DECAY, i);
    const w = (ends[i] - starts[i]) / speed;
    weights.push(w);
    totalW += w;
  }

  let t0 = 0;
  for (let i = 0; i < n; i++) {
    const t1 = t0 + weights[i] / totalW;
    if (t <= t1 || i === n - 1) {
      const u = t1 === t0 ? 1 : Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      return starts[i] + (ends[i] - starts[i]) * u;
    }
    t0 = t1;
  }
  return 1;
}

function animateCount(el, target, durationMs = COUNT_DURATION_MS) {
  if (target <= 0) {
    el.textContent = "0";
    return;
  }

  const t0 = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - t0) / durationMs);
    el.textContent = String(Math.round(target * countProgress(t)));
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
