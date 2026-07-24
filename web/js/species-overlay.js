/**
 * Species postcard overlay — URL: ?species={slug}
 * Close uses history.back() when we pushed; else strips the query.
 * "Open in species guide" soft-navigates to the Curiosity species hub.
 */
import { escapeHtml } from "./html.js";
import { fetchSpeciesRecord, shardIdFromSlug } from "./species.js";
import { renderSpeciesPostcard } from "./render-species.js";

let root = null;
let lastFocus = null;
let bound = false;
let openedWithPush = false;

/** Soft-nav wipes body — drop detached overlay node so the next open recreates it. */
export function resetSpeciesOverlayDom() {
  root = null;
  lastFocus = null;
  openedWithPush = false;
  document.body?.classList.remove("species-overlay-open");
}

function ensureRoot() {
  if (root) return root;
  root = document.createElement("div");
  root.id = "species-overlay";
  root.className = "species-overlay";
  root.hidden = true;
  root.innerHTML = `
    <div class="species-overlay__backdrop" data-species-close></div>
    <div class="species-overlay__dialog" role="dialog" aria-modal="true" aria-labelledby="species-overlay-title">
      <button type="button" class="species-overlay__close" data-species-close aria-label="Close">×</button>
      <div class="species-overlay__content" id="species-overlay-content"></div>
    </div>`;
  document.body.appendChild(root);

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-species-close]")) closeSpeciesOverlay();
  });

  return root;
}

function speciesParam() {
  return new URLSearchParams(window.location.search).get("species");
}

function setSpeciesParam(slug) {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("species", slug);
  else url.searchParams.delete("species");
  return url;
}

function hideOverlay() {
  if (!root) return;
  root.hidden = true;
  document.body.classList.remove("species-overlay-open");
  if (lastFocus?.focus) lastFocus.focus();
}

export async function openSpeciesOverlay(slug, { push = true } = {}) {
  if (!slug) return;
  const el = ensureRoot();
  const content = el.querySelector("#species-overlay-content");
  lastFocus = document.activeElement;
  content.innerHTML = `<p class="loading">Loading species…</p>`;
  el.hidden = false;
  document.body.classList.add("species-overlay-open");
  el.querySelector(".species-overlay__close")?.focus();

  if (push && speciesParam() !== slug) {
    history.pushState({ species: slug }, "", setSpeciesParam(slug));
    openedWithPush = true;
  } else if (!push) {
    openedWithPush = false;
  }

  try {
    const record = await fetchSpeciesRecord(slug);
    content.innerHTML = renderSpeciesPostcard(record, {
      shardId: record?.shard || shardIdFromSlug(slug),
    });
    const title = content.querySelector(".species-postcard__title");
    if (title) title.id = "species-overlay-title";
  } catch (err) {
    content.innerHTML = `<p class="empty-state">Could not load species: ${escapeHtml(err.message)}</p>`;
  }
}

export function closeSpeciesOverlay() {
  if (!root || root.hidden) return;

  if (speciesParam()) {
    if (openedWithPush) {
      openedWithPush = false;
      history.back();
      return;
    }
    history.replaceState({ species: null }, "", setSpeciesParam(null));
  }

  hideOverlay();
}

export function bindSpeciesOverlay() {
  if (!bound) {
    bound = true;
    document.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-species-slug]");
      if (!chip) return;
      event.preventDefault();
      openSpeciesOverlay(chip.dataset.speciesSlug);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root && !root.hidden) closeSpeciesOverlay();
    });

    window.addEventListener("popstate", () => {
      const slug = speciesParam();
      if (slug) openSpeciesOverlay(slug, { push: false });
      else hideOverlay();
    });
  }

  syncSpeciesOverlayFromUrl();
}

export function syncSpeciesOverlayFromUrl() {
  const slug = speciesParam();
  if (slug) openSpeciesOverlay(slug, { push: false });
  else if (root && !root.hidden) hideOverlay();
}
