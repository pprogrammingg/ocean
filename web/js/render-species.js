import { escapeHtml } from "./html.js";
import { speciesHubUrl } from "./species.js";
import { webRoot } from "./nav.js";
import { postcardParallaxEnabled, renderPostcardParallaxShell } from "./parallax-hero.js";

/** Resolve media path relative to web/ from any page depth. */
function mediaSrc(src) {
  if (!src) return "";
  if (/^(https?:|data:|\/\/)/i.test(src) || src.startsWith("/")) return src;
  return `${webRoot()}${src.replace(/^\.\//, "")}`;
}

function languagesBlock(languages = {}) {
  const rows = [];
  const ind = languages.indigenous;
  if (ind?.name) {
    rows.push(["Indigenous", `${ind.lang || "Local"}: ${ind.name}`]);
  }
  if (languages.english) {
    rows.push(["English", languages.english]);
  }
  const others = (languages.other || []).filter((o) => o?.name).slice(0, 3);
  if (others.length) {
    rows.push([
      "Also called",
      others.map((o) => `${o.lang}: ${o.name}`).join(" · "),
    ]);
  }
  if (!rows.length) return "";
  return `
    <dl class="species-meta">
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

function identityBlock(record) {
  return `
    <dl class="species-meta">
      ${
        record.taxonomy
          ? `<div><dt>Taxonomy</dt><dd>${escapeHtml(record.taxonomy)}</dd></div>`
          : ""
      }
      ${
        record.scientific_name
          ? `<div><dt>Scientific name</dt><dd><em>${escapeHtml(record.scientific_name)}</em></dd></div>`
          : ""
      }
    </dl>
    ${languagesBlock(record.languages)}`;
}

function statusClass(status) {
  const key = String(status || "").toLowerCase();
  if (key === "good") return "species-status--good";
  if (key === "bad") return "species-status--bad";
  if (key === "critical") return "species-status--critical";
  if (key === "extinct") return "species-status--extinct";
  return "";
}

function conservationBlock(conservation) {
  if (!conservation) return "";
  const life = conservation.life_info || {};
  const lifeRows = [
    ["Eating", life.eating],
    ["Mating", life.mating],
    ["Habitat", life.habitat],
  ].filter(([, v]) => v);

  return `
    <p class="species-status ${statusClass(conservation.status)}">
      <span class="species-status__label">Conservation status</span>
      <strong>${escapeHtml(conservation.status || "Good")}</strong>
    </p>
    ${
      conservation.help_by
        ? `<p class="species-note"><span class="species-note__label">Help it by</span> ${escapeHtml(conservation.help_by)}</p>`
        : ""
    }
    ${
      conservation.caution_against
        ? `<p class="species-note"><span class="species-note__label">Caution against</span> ${escapeHtml(conservation.caution_against)}</p>`
        : ""
    }
    ${
      lifeRows.length
        ? `<h4 class="species-subheading">Life info</h4>
    <dl class="species-habits">
      ${lifeRows
        .map(
          ([label, text]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(text)}</dd>
        </div>`
        )
        .join("")}
    </dl>`
        : ""
    }`;
}

function factsList(facts = []) {
  const list = (facts || []).slice(0, 5);
  if (!list.length) return "";
  return `
    <ul class="species-facts">
      ${list.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
    </ul>`;
}

function findHeroImage(record) {
  return (record.images || []).find((img) => img && (img.role === "hero" || img.src));
}

/** Plain hero — species guide page and default postcard. */
function imageHero(record) {
  const hero = findHeroImage(record);
  if (!hero?.src) {
    return `<div class="species-hero species-hero--empty" aria-hidden="true"><span>Photo coming soon</span></div>`;
  }
  const src = mediaSrc(hero.src);
  return `<div class="species-hero"><img src="${escapeHtml(src)}" alt="${escapeHtml(hero.alt || record.popular_name)}" loading="lazy" decoding="async"></div>`;
}

function speciesBody(record, { headingClass }) {
  const h = headingClass;
  return `
        <h3 class="${h}">Taxonomy &amp; names</h3>
        ${identityBlock(record)}
        <h3 class="${h}">Conservation notes</h3>
        ${conservationBlock(record.conservation)}
        ${
          record.fun_facts?.length
            ? `<h3 class="${h}">Interesting &amp; fun facts</h3>${factsList(record.fun_facts)}`
            : ""
        }`;
}

function postcardInner(record, { shardId } = {}) {
  const name = record.popular_name || record.name || "Unknown";
  const resolvedShard = record.shard || shardId;
  const hub = speciesHubUrl(record.id, resolvedShard);
  const shardNote = resolvedShard;

  return `
      ${imageHero(record)}
      <div class="species-postcard__body">
        <p class="species-postcard__shard">Shard <strong>${escapeHtml(String(shardNote || "").toUpperCase())}</strong></p>
        <h2 class="species-postcard__title">${escapeHtml(name)}</h2>
        ${speciesBody(record, { headingClass: "species-postcard__heading" })}
        <p class="species-postcard__actions">
          <a class="species-postcard__hub" href="${escapeHtml(hub)}">Open in species guide →</a>
        </p>
      </div>`;
}

/** Compact postcard body for overlay */
export function renderSpeciesPostcard(record, { shardId } = {}) {
  if (!record) {
    return `<p class="empty-state empty-state--inline">Species not found.</p>`;
  }

  const inner = postcardInner(record, { shardId });
  const article = `
    <article class="species-postcard" data-slug="${escapeHtml(record.id)}">
      ${inner}
    </article>`;

  if (!postcardParallaxEnabled(record)) return article;

  return renderPostcardParallaxShell(
    `<article class="species-postcard species-postcard--parallax" data-slug="${escapeHtml(record.id)}">
      <button type="button" class="species-postcard__close" data-species-close aria-label="Close">×</button>
      ${inner}
    </article>`
  );
}

/** Full section for dedicated species page */
export function renderSpeciesSection(record) {
  if (!record) return "";
  const name = record.popular_name || record.name || "Unknown";

  return `
    <article class="species-section" id="species-${escapeHtml(record.id)}" data-slug="${escapeHtml(record.id)}">
      ${imageHero(record)}
      <h2 class="species-section__title">${escapeHtml(name)}</h2>
      ${
        record.tags?.length
          ? `<p class="species-section__tags">${record.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</p>`
          : ""
      }
      ${speciesBody(record, { headingClass: "country-section-heading" })}
    </article>`;
}
