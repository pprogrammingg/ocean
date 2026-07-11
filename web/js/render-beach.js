import { buildRatingRows } from "./ratings.js";
import { escapeHtml } from "./html.js";

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

  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function renderSection(title, bodyHtml) {
  if (!bodyHtml) return "";
  return `
    <section class="beach-detail__section">
      <h3 class="country-section-heading">${escapeHtml(title)}</h3>
      ${bodyHtml}
    </section>`;
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

function renderTideSection(tide) {
  if (!tide || typeof tide !== "object") return "";
  const { next_high, next_low, source } = tide;
  if (!next_high && !next_low) return "";

  const sourceNote =
    source === "sample"
      ? '<p class="country-overview__note">Source: live data coming soon</p>'
      : "";

  return renderSection(
    "Tide",
    `
      <dl class="detail-list tide-list">
        <div><dt>Next high</dt><dd>${escapeHtml(formatTideTime(next_high))}</dd></div>
        <div><dt>Next low</dt><dd>${escapeHtml(formatTideTime(next_low))}</dd></div>
      </dl>
      ${sourceNote}`
  );
}

function renderRockinessSection(rockiness) {
  if (!rockiness) return "";

  if (typeof rockiness === "string") {
    return renderSection("Rockiness", `<p class="country-overview__body">${escapeHtml(rockiness)}</p>`);
  }

  const { beach, ocean_floor } = rockiness;
  if (!beach && !ocean_floor) return "";

  return renderSection(
    "Rockiness",
    `
      <dl class="detail-list rockiness-list">
        ${beach ? `<div><dt>Beach</dt><dd>${escapeHtml(beach)}</dd></div>` : ""}
        ${ocean_floor ? `<div><dt>Ocean floor</dt><dd>${escapeHtml(ocean_floor)}</dd></div>` : ""}
      </dl>`
  );
}

export function renderBeachDetail(beach) {
  const rating = beach.live_rating || {};

  return `
    <article class="beach-detail">
      <header class="beach-detail__header">
        <h2>${escapeHtml(beach.name)}</h2>
        <p class="meta">${escapeHtml(beachMeta(beach))}</p>
        <div class="tag-row">${renderTags(beach)}</div>
      </header>
      <div class="ratings">${buildRatingRows(rating)}</div>
      ${renderTideSection(rating.tide)}
      ${renderRockinessSection(rating.rockiness)}
      ${rating.wind ? renderSection("Wind", `<p class="country-overview__body">${escapeHtml(rating.wind)}</p>`) : ""}
      ${beach.description ? renderSection("About", `<p class="country-overview__body">${escapeHtml(beach.description)}</p>`) : ""}
      <p class="beach-detail__map">
        <a class="map-link" href="${escapeHtml(beach.map_link)}" target="_blank" rel="noopener">View on map →</a>
      </p>
    </article>`;
}
