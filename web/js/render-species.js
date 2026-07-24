import { escapeHtml } from "./html.js";
import { speciesHubUrl } from "./species.js";
import { webRoot } from "./nav.js";

/** Resolve media path relative to web/ from any page depth. */
function mediaSrc(src) {
  if (!src) return "";
  if (/^(https?:|data:|\/\/)/i.test(src) || src.startsWith("/")) return src;
  return `${webRoot()}${src.replace(/^\.\//, "")}`;
}

function translationLine(translations = {}) {
  const parts = [];
  if (translations.es) parts.push(`Spanish: ${translations.es}`);
  if (translations.pap) parts.push(`Papiamento: ${translations.pap}`);
  for (const [code, value] of Object.entries(translations)) {
    if (code === "es" || code === "pap" || !value) continue;
    parts.push(`${code}: ${value}`);
  }
  return parts.join(" · ");
}

function habitsBlock(habits) {
  if (!habits) return "";
  if (typeof habits === "string") {
    return `<p class="species-card__body">${escapeHtml(habits)}</p>`;
  }

  const rows = [
    ["Dwelling", habits.dwelling],
    ["Food", habits.food],
    ["Feeding", habits.feeding],
    ["Mating", habits.mating],
    ["Socializing", habits.socializing],
  ].filter(([, v]) => v);

  return `
    <dl class="species-habits">
      ${rows
        .map(
          ([label, text]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(text)}</dd>
        </div>`
        )
        .join("")}
    </dl>`;
}

function factsList(facts = []) {
  if (!facts.length) return "";
  return `
    <ul class="species-facts">
      ${facts.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
    </ul>`;
}

function imageHero(record) {
  const hero = (record.images || []).find((img) => img && (img.role === "hero" || img.src));
  if (!hero?.src) {
    return `<div class="species-hero species-hero--empty" aria-hidden="true"><span>Photo coming soon</span></div>`;
  }
  const src = mediaSrc(hero.src);
  return `<div class="species-hero"><img src="${escapeHtml(src)}" alt="${escapeHtml(hero.alt || record.popular_name)}" loading="lazy" decoding="async"></div>`;
}

/** Compact postcard body for overlay */
export function renderSpeciesPostcard(record, { shardId } = {}) {
  if (!record) {
    return `<p class="empty-state empty-state--inline">Species not found.</p>`;
  }

  const name = record.popular_name || record.name || "Unknown";
  const trans = translationLine(record.translations);
  const resolvedShard = record.shard || shardId;
  const hub = speciesHubUrl(record.id, resolvedShard);
  const shardNote = resolvedShard;

  return `
    <article class="species-postcard" data-slug="${escapeHtml(record.id)}">
      ${imageHero(record)}
      <div class="species-postcard__body">
        <p class="species-postcard__shard">Shard <strong>${escapeHtml(String(shardNote || "").toUpperCase())}</strong></p>
        <h2 class="species-postcard__title">${escapeHtml(name)}</h2>
        <p class="species-postcard__sci"><em>${escapeHtml(record.scientific_name || "")}</em></p>
        ${trans ? `<p class="species-postcard__trans">${escapeHtml(trans)}</p>` : ""}
        ${
          record.dwelling_habits
            ? `<h3 class="species-postcard__heading">Dwelling &amp; habits</h3>${habitsBlock(record.dwelling_habits)}`
            : record.summary
              ? `<p class="species-card__body">${escapeHtml(record.summary)}</p>`
              : ""
        }
        ${
          record.fun_facts?.length
            ? `<h3 class="species-postcard__heading">Fun facts</h3>${factsList(record.fun_facts)}`
            : ""
        }
        <p class="species-postcard__actions">
          <a class="species-postcard__hub" href="${escapeHtml(hub)}">Open in species guide →</a>
        </p>
      </div>
    </article>`;
}

/** Full section for dedicated species page */
export function renderSpeciesSection(record) {
  if (!record) return "";
  const name = record.popular_name || record.name || "Unknown";
  const trans = translationLine(record.translations);

  return `
    <article class="species-section" id="species-${escapeHtml(record.id)}" data-slug="${escapeHtml(record.id)}">
      ${imageHero(record)}
      <h2 class="species-section__title">${escapeHtml(name)}</h2>
      <p class="species-section__sci"><em>${escapeHtml(record.scientific_name || "")}</em></p>
      ${trans ? `<p class="species-section__trans">${escapeHtml(trans)}</p>` : ""}
      ${
        record.tags?.length
          ? `<p class="species-section__tags">${record.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</p>`
          : ""
      }
      <h3 class="country-section-heading">Dwelling &amp; habits</h3>
      ${habitsBlock(record.dwelling_habits)}
      ${
        record.fun_facts?.length
          ? `<h3 class="country-section-heading">Fun facts</h3>${factsList(record.fun_facts)}`
          : ""
      }
    </article>`;
}
