import { fetchJSON, marineLifePath } from "./api.js";
import { buildRatingRows } from "./ratings.js";

function beachMeta(beach) {
  const zone = beach.city_zone.replace(/-/g, " ");
  const coast = (beach.coast || "").trim();
  if (!coast) return zone;

  const zoneNorm = zone.toLowerCase();
  const coastNorm = coast.toLowerCase();
  if (zoneNorm === `${coastNorm} coast` || zoneNorm.startsWith(coastNorm)) return zone;
  return `${zone} · ${coast}`;
}

function renderTags(beach) {
  const tags = [...(beach.tags || []), ...(beach.search_tags || [])]
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, 8);

  return tags.map((tag) => `<span class="tag">${tag}</span>`).join("");
}

function renderTextBlock(label, value) {
  if (!value) return "";
  return `
    <div class="text-block">
      <h3>${label}</h3>
      <p>${value}</p>
    </div>`;
}

function formatTideTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function renderTideBlock(tide) {
  if (!tide || typeof tide !== "object") return "";
  const { next_high, next_low, source } = tide;
  if (!next_high && !next_low) return "";

  const sourceNote =
    source === "sample"
      ? '<p class="spectrum-note">Source: live data coming soon</p>'
      : "";

  return `
    <div class="text-block tide-block">
      <h3>Tide</h3>
      <dl class="tide-times">
        <div><dt>Next high</dt><dd>${formatTideTime(next_high)}</dd></div>
        <div><dt>Next low</dt><dd>${formatTideTime(next_low)}</dd></div>
      </dl>
      ${sourceNote}
    </div>`;
}

function renderRockinessBlock(rockiness) {
  if (!rockiness) return "";

  if (typeof rockiness === "string") {
    return renderTextBlock("Rockiness", rockiness);
  }

  const { beach, ocean_floor } = rockiness;
  if (!beach && !ocean_floor) return "";

  return `
    <div class="text-block rockiness-block">
      <h3>Rockiness</h3>
      <dl class="detail-list rockiness-list">
        ${beach ? `<div><dt>Beach</dt><dd>${beach}</dd></div>` : ""}
        ${ocean_floor ? `<div><dt>Ocean floor</dt><dd>${ocean_floor}</dd></div>` : ""}
      </dl>
    </div>`;
}

export function renderBeachDetail(beach) {
  const rating = beach.live_rating || {};

  return `
    <article class="beach-detail">
      <h2>${beach.name}</h2>
      <p class="meta">${beachMeta(beach)}</p>
      <div class="tag-row">${renderTags(beach)}</div>
      <div class="ratings">${buildRatingRows(rating)}</div>
      ${renderTideBlock(rating.tide)}
      ${renderRockinessBlock(rating.rockiness)}
      ${renderTextBlock("Wind", rating.wind)}
      ${beach.description ? renderTextBlock("About", beach.description) : ""}
      <a class="map-link" href="${beach.map_link}" target="_blank" rel="noopener">View on map →</a>
      <div id="ecosystem" class="text-block ecosystem-block">
        <h3>Marine life</h3>
        <p class="loading">Loading…</p>
      </div>
    </article>`;
}

async function loadSpeciesCard(type, slug) {
  try {
    const species = await fetchJSON(marineLifePath(type, slug));
    return `<div class="species-card"><strong>${species.name}</strong><span>${species.summary.slice(0, 100)}…</span></div>`;
  } catch {
    return `<div class="species-card"><strong>${slug}</strong></div>`;
  }
}

export async function hydrateEcosystem(container, beach) {
  if (!container) return;

  const animals = beach.ecosystem?.animals || [];
  const plants = beach.ecosystem?.plants || [];
  const cards = [];

  for (const slug of animals) {
    cards.push(await loadSpeciesCard("animals", slug));
  }
  for (const slug of plants) {
    cards.push(await loadSpeciesCard("plants", slug));
  }

  container.innerHTML =
    cards.length > 0
      ? `<h3>Marine life</h3><div class="ecosystem-cards">${cards.join("")}</div>`
      : `<h3>Marine life</h3><p class="empty-state empty-state--inline">No species linked yet.</p>`;
}
