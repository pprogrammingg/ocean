import { buildCompactRatingRows } from "./ratings.js";
import { escapeHtml } from "./html.js";
import { fetchSpeciesRecords } from "./species.js";

function excerpt(text, max = 220) {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function ratingsScopeLabel(overview) {
  if (overview?.aggregate_scope === "leeward_coast") return "Leeward coast averages";
  return "Island averages";
}

function renderRatingsBlock(overview) {
  const ratings = overview?.aggregate_ratings;
  if (!ratings || typeof ratings !== "object") return "";

  const rows = buildCompactRatingRows({
    swim: ratings.swim,
    wave: ratings.wave,
    snorkeling: ratings.snorkeling,
    water_quality: ratings.water_quality,
    surfing: ratings.surfing,
  });

  const scuba =
    typeof ratings.scuba === "number"
      ? `
      <div class="country-overview__scuba">
        <span class="label">Scuba</span>
        <span class="score">${ratings.scuba}/10</span>
      </div>`
      : "";

  return `
    <div class="ratings ratings--compact">${rows}</div>
    ${scuba}
    ${overview?.aggregate_notes ? `<p class="country-overview__note">${escapeHtml(overview.aggregate_notes)}</p>` : ""}`;
}

function renderSpeciesChip(record, slug) {
  const label = record?.name || slug.replace(/-/g, " ");
  const title = record?.name ? ` title="${escapeHtml(record.name)}"` : "";
  return `<span class="species-chip"${title}>${escapeHtml(label)}</span>`;
}

export async function hydrateCountrySpecies(container, slugs = []) {
  if (!container || !slugs.length) return;

  const records = await fetchSpeciesRecords(slugs);
  container.innerHTML = `<div class="species-chips">${slugs
    .map((slug, i) => renderSpeciesChip(records[i], slug))
    .join("")}</div>`;
}

export function renderCountryOverview(meta, { beachCount = 0 } = {}) {
  const overview = meta.marine_overview;
  const character = overview?.ocean_character || excerpt(meta.ocean_info);
  const count = overview?.known_beach_count ?? beachCount ?? 0;
  const seasons = overview?.best_seasons ?? [];
  const ratingsHtml = renderRatingsBlock(overview);
  const hasSpecies = overview?.species?.length > 0;

  return `
    <div class="country-overview">
      <header class="country-overview__intro">
        <p class="country-overview__meta"><strong>${count}</strong> ${count === 1 ? "beach" : "beaches"} indexed</p>
        <p class="country-overview__character">${escapeHtml(character)}</p>
      </header>

      ${
        seasons.length
          ? `
      <section class="country-overview__section">
        <h3 class="country-section-heading">Best seasons</h3>
        <p class="country-overview__body">${escapeHtml(seasons.join(" · "))}</p>
      </section>`
          : ""
      }

      ${
        ratingsHtml
          ? `
      <section class="country-overview__section">
        <h3 class="country-section-heading">${escapeHtml(ratingsScopeLabel(overview))}</h3>
        ${ratingsHtml}
      </section>`
          : ""
      }

      ${
        hasSpecies
          ? `
      <section class="country-overview__section">
        <h3 class="country-section-heading">Marine life</h3>
        <div id="country-species"><p class="loading">Loading species…</p></div>
      </section>`
          : ""
      }
    </div>`;
}
