import { escapeHtml } from "./html.js";
import { webRoot } from "./nav.js";

function dl(rows) {
  if (!rows?.length) return "";
  return `<dl class="species-habits">${rows
    .map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${v}</dd></div>`)
    .join("")}</dl>`;
}

function tagsHtml(tags = [], place) {
  if (!tags.length) return "";
  const near = place?.nearby_beaches || [];
  const href =
    near.length > 0
      ? `${webRoot()}curiosity/beaches.html?${new URLSearchParams({
          country: near[0].country_id,
          near: near.map((b) => b.path).join(","),
          label: place.name || "place",
        })}`
      : "";
  return `<p class="tag-row">${tags
    .map((t) => {
      if (t === "swim-near-ocean" && href) {
        return `<a class="tag tag--link" href="${escapeHtml(href)}" target="_blank" rel="noopener">swim-near-ocean</a>`;
      }
      return `<span class="tag">${escapeHtml(t)}</span>`;
    })
    .join("")}</p>`;
}

export function renderHabitatPlace(place) {
  if (!place) return `<p class="empty-state">Place not found.</p>`;
  const s = place.scores || {};
  const p = place.land_price_usd || {};
  return `
    <article class="habitat-detail" data-slug="${escapeHtml(place.id)}">
      <p class="pillar-label">Habitat place</p>
      <h2 class="species-section__title">${escapeHtml(place.name)}</h2>
      <p class="species-note">${escapeHtml(place.region || "")} · ${escapeHtml(place.country || "")}</p>
      ${tagsHtml(place.tags, place)}
      <h3 class="country-section-heading">Scores</h3>
      ${dl([
        ["Affordability", `${s.price ?? "—"}/5`],
        ["Views", `${s.views ?? "—"}/5`],
        ["Eco culture", `${s.eco ?? "—"}/5`],
        ["Calm swim", `${s.swim ?? "—"}/5`],
        ["Total", `<strong>${escapeHtml(String(s.total ?? "—"))}</strong> / 20`],
      ])}
      <h3 class="country-section-heading">Land band</h3>
      <p>${escapeHtml(p.label || "—")}${p.mid > 0 ? ` · mid ~$${Number(p.mid).toLocaleString()}` : ""}</p>
      ${place.note ? `<p>${escapeHtml(place.note)}</p>` : ""}
      <p class="empty-state empty-state--compact">${escapeHtml(place.disclaimer || "Planning sketch — not a listing.")}</p>
    </article>`;
}

export function renderHabitatGuide(guide) {
  if (!guide) return `<p class="empty-state">Guide not found.</p>`;
  return `
    <article class="habitat-detail" data-slug="${escapeHtml(guide.id)}">
      <p class="pillar-label">Region guide</p>
      <h2 class="species-section__title">${escapeHtml(guide.name)}</h2>
      <p class="species-note">${escapeHtml(guide.country || "")}</p>
      <p>${escapeHtml(guide.tagline || "")}</p>
      ${tagsHtml(guide.tags)}
      <p>${escapeHtml(guide.summary || "")}</p>
      ${
        guide.highlights?.length
          ? `<h3 class="country-section-heading">Where to look</h3>${dl(
              guide.highlights.map((h) => [h.title, escapeHtml(h.text)])
            )}`
          : ""
      }
      ${
        guide.cost_bands?.length
          ? `<h3 class="country-section-heading">Costs</h3>${dl(
              guide.cost_bands.map((c) => [c.item, `<strong>${escapeHtml(c.usd)}</strong> — ${escapeHtml(c.note || "")}`])
            )}`
          : ""
      }
      <p class="empty-state empty-state--compact">${escapeHtml(guide.disclaimer || "")}</p>
    </article>`;
}

export function renderHabitatTerm(term) {
  if (!term) return `<p class="empty-state">Term not found.</p>`;
  return `
    <article class="habitat-detail">
      <p class="pillar-label">Glossary</p>
      <h2 class="species-section__title">${escapeHtml(term.title)}</h2>
      <p>${escapeHtml(term.text)}</p>
    </article>`;
}
