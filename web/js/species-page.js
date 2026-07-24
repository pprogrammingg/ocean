import { escapeHtml } from "./html.js";
import { fetchSpeciesIndex, fetchShard, shardIdFromSlug } from "./species.js";
import { renderSpeciesSection } from "./render-species.js";

const els = {
  nav: () => document.getElementById("shard-nav"),
  header: () => document.getElementById("shard-header"),
  list: () => document.getElementById("species-list"),
  status: () => document.getElementById("species-status"),
};

let pageAbort = null;

function params() {
  const q = new URLSearchParams(window.location.search);
  return { shard: q.get("shard"), slug: q.get("slug") };
}

function setParams({ shard, slug }, replace = false) {
  const url = new URL(window.location.href);
  if (shard) url.searchParams.set("shard", shard);
  else url.searchParams.delete("shard");
  if (slug) {
    url.searchParams.set("slug", slug);
    url.hash = `species-${slug}`;
  } else {
    url.searchParams.delete("slug");
    url.hash = "";
  }
  history[replace ? "replaceState" : "pushState"]({}, "", url);
}

function renderNav(shards, activeId) {
  const nav = els.nav();
  if (!nav) return;
  nav.innerHTML = shards
    .map((s) => {
      const label = escapeHtml(s.label || s.id.toUpperCase());
      const current = s.id === activeId ? ' aria-current="true"' : "";
      return `<a class="shard-nav__link" href="?shard=${encodeURIComponent(s.id)}" data-shard="${escapeHtml(s.id)}"${current}>${label}</a>`;
    })
    .join("");
}

/** Instant focus — smooth scroll loses the jump during soft-nav View Transitions. */
function focusSpeciesSection(slug) {
  if (!slug) return;
  const tryFocus = () => {
    const target = document.getElementById(`species-${slug}`);
    if (!target) return false;
    document.querySelectorAll(".species-section--focus").forEach((el) => {
      el.classList.remove("species-section--focus");
    });
    target.classList.add("species-section--focus");
    target.scrollIntoView({ block: "start", behavior: "auto" });
    return true;
  };

  if (!tryFocus()) return;
  requestAnimationFrame(() => {
    tryFocus();
    setTimeout(tryFocus, 100);
    setTimeout(tryFocus, 350);
  });
}

function slugFromLocation() {
  const { slug } = params();
  if (slug) return slug;
  const hash = location.hash.replace(/^#/, "");
  return hash.startsWith("species-") ? hash.slice("species-".length) : null;
}

async function showShard(shardId, { slug = null, push = true } = {}) {
  if (!shardId) return;
  const header = els.header();
  const list = els.list();
  const status = els.status();
  if (!header || !list) return;

  if (push) setParams({ shard: shardId, slug });

  document.querySelectorAll(".shard-nav__link").forEach((a) => {
    a.setAttribute("aria-current", a.dataset.shard === shardId ? "true" : "false");
  });

  header.textContent = shardId.toUpperCase();
  list.innerHTML = `<p class="loading">Loading shard ${escapeHtml(shardId)}…</p>`;
  if (status) status.textContent = "";

  try {
    const data = await fetchShard(shardId);
    const species = data?.species || [];
    if (!species.length) {
      list.innerHTML = `<p class="empty-state">No species in this shard yet.</p>`;
      return;
    }
    list.innerHTML = species.map((sp) => renderSpeciesSection(sp)).join("");
    if (status) status.textContent = `${species.length} species in ${shardId.toUpperCase()}`;
    focusSpeciesSection(slug);
  } catch (err) {
    list.innerHTML = `<p class="empty-state">Failed to load shard: ${escapeHtml(err.message)}</p>`;
  }
}

export async function startSpeciesPage() {
  pageAbort?.abort();
  pageAbort = new AbortController();
  const { signal } = pageAbort;

  const status = els.status();
  try {
    const index = await fetchSpeciesIndex();
    if (signal.aborted) return;

    const shards = index.shards || [];
    const { shard: qShard } = params();
    const slug = slugFromLocation();
    const initial = qShard || (slug ? shardIdFromSlug(slug) : shards[0]?.id);

    renderNav(shards, initial);

    els.nav()?.addEventListener(
      "click",
      (event) => {
        const link = event.target.closest("[data-shard]");
        if (!link) return;
        event.preventDefault();
        showShard(link.dataset.shard, { push: true });
      },
      { signal }
    );

    window.addEventListener(
      "popstate",
      () => {
        const { shard } = params();
        const s = slugFromLocation();
        if (shard) showShard(shard, { slug: s, push: false });
      },
      { signal }
    );

    if (initial) {
      await showShard(initial, { slug, push: false });
      if (!qShard) setParams({ shard: initial, slug }, true);
    } else if (status) {
      status.textContent = "No species shards yet.";
    }
  } catch (err) {
    if (signal.aborted) return;
    if (status) {
      status.textContent = err.message;
      status.classList.add("country-load-status--error");
    }
  }
}
