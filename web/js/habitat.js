import { fetchJSON, habitatPath } from "./api.js";
import { escapeHtml } from "./html.js";
import { SearchTrie } from "./trie.js";
import { renderHabitatPlace, renderHabitatGuide, renderHabitatTerm } from "./render-habitat.js";

const state = {
  mode: "places",
  countries: [],
  entries: [],
  terms: null,
  guides: null,
  trie: new SearchTrie(),
  countryId: "",
  gen: 0,
};

const $ = (id) => document.getElementById(id);

function bindList(ul, items, mapBtn, onPick) {
  if (!ul) return;
  if (!items.length) {
    ul.innerHTML = `<li class="empty-state">Nothing here yet.</li>`;
    return;
  }
  ul.innerHTML = items.map(mapBtn).join("");
  ul.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      ul.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", "false"));
      btn.setAttribute("aria-selected", "true");
      onPick?.(btn);
    });
  });
}

function listBtn(name, meta, dataset) {
  const attrs = Object.entries(dataset)
    .map(([k, v]) => `data-${k}="${escapeHtml(v)}"`)
    .join(" ");
  return `<li><button type="button" ${attrs}><span class="name">${escapeHtml(name)}</span>${
    meta ? `<span class="tags">${escapeHtml(meta)}</span>` : ""
  }</button></li>`;
}

async function setMode(mode) {
  state.mode = mode;
  for (const [id, m] of [
    ["habitat-mode-places", "places"],
    ["habitat-mode-guides", "guides"],
    ["habitat-mode-terms", "terms"],
  ]) {
    const el = $(id);
    if (!el) continue;
    if (m === mode) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
  $("habitat-places-panel").hidden = mode !== "places";
  $("habitat-guides-panel").hidden = mode !== "guides";
  $("habitat-terms-panel").hidden = mode !== "terms";
  $("habitat-detail").innerHTML = `<p class="empty-state">Select an item.</p>`;
  hideSearch();
  if (mode === "guides") await ensureGuides();
  if (mode === "terms") await ensureTerms();
}

function hideSearch() {
  const box = $("habitat-search-results");
  if (!box) return;
  box.hidden = true;
  box.innerHTML = "";
}

function countryEntries() {
  return state.entries.filter((e) => e.country_id === state.countryId);
}

async function showPlace(btn) {
  const gen = ++state.gen;
  $("habitat-detail").innerHTML = `<p class="loading">Loading…</p>`;
  try {
    const data = await fetchJSON(habitatPath("catalog/shards", `${btn.dataset.shard}.json`));
    if (gen !== state.gen) return;
    const place = (data.places || []).find((p) => p.id === btn.dataset.id);
    $("habitat-detail").innerHTML = renderHabitatPlace(place);
  } catch (err) {
    if (gen !== state.gen) return;
    $("habitat-detail").innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
  }
}

function renderPlaces() {
  const entries = countryEntries().sort(
    (a, b) => (b.score_total || 0) - (a.score_total || 0) || a.name.localeCompare(b.name)
  );
  bindList(
    $("habitat-place-list"),
    entries,
    (e) =>
      listBtn(e.name, `${e.price_label || ""} · ${e.score_total || "—"}/20`, {
        id: e.id,
        shard: e.shard,
      }),
    showPlace
  );
}

function onCountryChange() {
  state.countryId = $("habitat-country").value;
  hideSearch();
  const controls = $("habitat-country-controls");
  const hint = $("habitat-pick-hint");
  if (!state.countryId) {
    controls.hidden = true;
    hint.hidden = false;
    $("habitat-place-list").innerHTML = "";
    $("habitat-detail").innerHTML = `<p class="empty-state">Select a place.</p>`;
    return;
  }
  controls.hidden = false;
  hint.hidden = true;
  state.trie.load(countryEntries());
  $("habitat-search").value = "";
  $("habitat-search").disabled = false;
  renderPlaces();
}

function onSearchInput() {
  const q = $("habitat-search").value.trim();
  const box = $("habitat-search-results");
  if (!q) {
    hideSearch();
    return;
  }
  const hits = state.trie.search(q, 5);
  box.innerHTML = hits.length
    ? hits
        .map(
          (h) => `<li><button type="button" data-id="${escapeHtml(h.id)}" data-shard="${escapeHtml(h.shard)}">
            <span class="result-name">${escapeHtml(h.name)}</span>
            <span class="result-meta">${escapeHtml(h.region || "")}</span>
          </button></li>`
        )
        .join("")
    : `<li class="empty-state empty-state--compact">No matches</li>`;
  box.hidden = false;
  box.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      hideSearch();
      const listBtnEl = $("habitat-place-list").querySelector(`button[data-id="${CSS.escape(btn.dataset.id)}"]`);
      listBtnEl?.click();
      listBtnEl?.scrollIntoView({ block: "nearest" });
    });
  });
}

async function ensureGuides() {
  if (state.guides) return;
  const data = await fetchJSON(habitatPath("guides/index.json"));
  state.guides = data.guides || [];
  bindList(
    $("habitat-guide-list"),
    state.guides,
    (g) => listBtn(g.name, g.tagline || g.country || "", { id: g.id }),
    async (btn) => {
      const gen = ++state.gen;
      $("habitat-detail").innerHTML = `<p class="loading">Loading…</p>`;
      try {
        const guide = await fetchJSON(habitatPath("guides", `${btn.dataset.id}.json`));
        if (gen !== state.gen) return;
        $("habitat-detail").innerHTML = renderHabitatGuide(guide);
      } catch (err) {
        if (gen !== state.gen) return;
        $("habitat-detail").innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
      }
    }
  );
}

async function ensureTerms() {
  if (state.terms) return;
  const data = await fetchJSON(habitatPath("glossary.json"));
  state.terms = data.terms || [];
  bindList(
    $("habitat-term-list"),
    state.terms,
    (t) => listBtn(t.title, "", { id: t.id }),
    (btn) => {
      const term = state.terms.find((t) => t.id === btn.dataset.id);
      $("habitat-detail").innerHTML = renderHabitatTerm(term);
    }
  );
}

export async function startHabitatPage() {
  if (!$("habitat-country")) return;

  for (const [id, mode] of [
    ["habitat-mode-places", "places"],
    ["habitat-mode-guides", "guides"],
    ["habitat-mode-terms", "terms"],
  ]) {
    $(id)?.addEventListener("click", (e) => {
      e.preventDefault();
      setMode(mode);
    });
  }

  $("habitat-country").addEventListener("change", onCountryChange);
  $("habitat-search")?.addEventListener("input", onSearchInput);
  $("habitat-search")?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideSearch();
  });

  try {
    const [countries, search] = await Promise.all([
      fetchJSON(habitatPath("countries.json")),
      fetchJSON(habitatPath("search-index.json")),
    ]);
    state.countries = countries.countries || [];
    state.entries = search.entries || [];
    $("habitat-country").innerHTML =
      `<option value="">Select country…</option>` +
      state.countries
        .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} (${c.place_count})</option>`)
        .join("");
    const status = $("habitat-load-status");
    if (status) status.textContent = `${search.place_count || state.entries.length} near-ocean places`;
    await setMode("places");
  } catch (err) {
    const status = $("habitat-load-status");
    if (status) {
      status.textContent = err.message;
      status.classList.add("country-load-status--error");
    }
  }
}
