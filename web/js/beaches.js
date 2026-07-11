import { fetchJSON, explorePath } from "./api.js";
import { escapeHtml } from "./html.js";
import { renderBeachDetail } from "./render-beach.js";
import { renderCountryOverview, hydrateCountrySpecies } from "./render-country.js";
import { CountryTrie } from "./trie.js";

let els = {};

function bindElements() {
  els = {
    country: document.getElementById("country-select"),
    countryStatus: document.getElementById("country-load-status"),
    countryControls: document.getElementById("country-controls"),
    pickHint: document.getElementById("pick-country-hint"),
    zone: document.getElementById("zone-select"),
    beachList: document.getElementById("beach-list"),
    detail: document.getElementById("beach-detail"),
    countryBlurb: document.getElementById("country-blurb"),
    search: document.getElementById("beach-search"),
    searchResults: document.getElementById("search-results"),
  };
}

const state = {
  countries: null,
  trie: new CountryTrie(),
  loadGen: { country: 0, zone: 0, beach: 0 },
};

function isStale(kind, gen) {
  return gen !== state.loadGen[kind];
}

function setDetail(html) {
  if (!els.detail) return;
  els.detail.innerHTML = html;
}

function setCountryStatus(message, isError = false) {
  if (!els.countryStatus) return;
  els.countryStatus.textContent = message || "";
  els.countryStatus.classList.toggle("country-load-status--error", Boolean(isError && message));
}

function resetDetail() {
  setDetail('<p class="empty-state">Select a beach to see details.</p>');
}

function showError(message) {
  setDetail(
    `<p class="empty-state">Error: ${escapeHtml(message)}. Open via a static server (see web/README.md) — file:// won't work.</p>`
  );
}

function showSidebarError(message) {
  if (!els.pickHint) return;
  els.pickHint.hidden = false;
  els.pickHint.textContent = message;
  els.pickHint.classList.add("pick-country-hint--error");
}

function setCountryControlsVisible(visible) {
  els.countryControls.hidden = !visible;
  els.pickHint.hidden = visible;
}

function setSearchEnabled(enabled, placeholder = "Name or tag…") {
  els.search.disabled = !enabled;
  els.search.placeholder = placeholder;
  if (!enabled) {
    els.search.value = "";
    hideSearchResults();
  }
}

function populateCountries(countries) {
  els.country.innerHTML = '<option value="">Select country…</option>';
  for (const country of countries) {
    const option = document.createElement("option");
    option.value = country.id;
    option.textContent = country.name;
    els.country.appendChild(option);
  }
}

function populateZones(country) {
  els.zone.innerHTML = '<option value="">Select zone…</option>';
  for (const zone of country.city_zones) {
    const option = document.createElement("option");
    option.value = zone.id;
    option.textContent = `${zone.name}${zone.beach_count === 0 ? " (coming soon)" : ""}`;
    option.disabled = zone.beach_count === 0;
    els.zone.appendChild(option);
  }
}

function renderBeachList(beaches) {
  els.beachList.innerHTML = "";
  for (const beach of beaches) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.path = beach.path;
    const tags = (beach.tags || []).map(escapeHtml).join(" · ");
    button.innerHTML = `<span class="name">${escapeHtml(beach.name)}</span><span class="tags">${tags}</span>`;
    button.addEventListener("click", () => selectBeach(button, beach.path));
    item.appendChild(button);
    els.beachList.appendChild(item);
  }
}

function hideSearchResults() {
  els.searchResults.hidden = true;
  els.searchResults.innerHTML = "";
}

function searchMatchLabel(hit) {
  if (hit.matchKind === "name") return "name";
  if (hit.matchKind === "alias") return "alias";
  return `tag: ${hit.match}`;
}

async function selectBeach(button, path) {
  const gen = ++state.loadGen.beach;

  if (button) {
    els.beachList.querySelectorAll("button").forEach((btn) => {
      btn.setAttribute("aria-selected", "false");
    });
    button.setAttribute("aria-selected", "true");
  }

  setDetail('<p class="loading">Loading beach…</p>');

  try {
    const beach = await fetchJSON(explorePath(path));
    if (isStale("beach", gen)) return;

    setDetail(renderBeachDetail(beach));
  } catch (error) {
    if (isStale("beach", gen)) return;
    showError(error.message);
  }
}

async function onZoneChange() {
  const countryId = els.country.value;
  const zoneId = els.zone.value;
  const gen = ++state.loadGen.zone;

  resetDetail();
  els.beachList.innerHTML = "";

  if (!countryId || !zoneId) return;

  try {
    const data = await fetchJSON(explorePath(countryId, zoneId, "city-beaches.json"));
    if (isStale("zone", gen)) return;

    if (!data.beaches.length) {
      els.beachList.innerHTML = '<li class="empty-state">No beaches in this zone yet.</li>';
      return;
    }

    renderBeachList(data.beaches);
    els.beachList.querySelector("button")?.click();
  } catch (error) {
    if (isStale("zone", gen)) return;
    els.beachList.innerHTML = `<li class="empty-state">${escapeHtml(error.message)}</li>`;
  }
}

async function onCountryChange() {
  const countryId = els.country.value;
  const gen = ++state.loadGen.country;

  resetDetail();
  els.beachList.innerHTML = "";
  els.zone.innerHTML = '<option value="">Select zone…</option>';
  els.countryBlurb.innerHTML = "";
  state.trie = new CountryTrie();
  setSearchEnabled(false);
  els.zone.disabled = true;

  if (!countryId) {
    setCountryControlsVisible(false);
    return;
  }

  setCountryControlsVisible(true);

  try {
    const country = state.countries?.find((entry) => entry.id === countryId);
    if (!country) {
      throw new Error(`Unknown country: ${countryId}`);
    }

    const [meta, searchIndex] = await Promise.all([
      fetchJSON(explorePath(countryId, "country.json")),
      fetchJSON(explorePath(countryId, "search-index.json")),
    ]);

    if (isStale("country", gen)) return;

    state.trie.load(searchIndex);
    const hasBeaches = searchIndex.beach_count > 0;

    setSearchEnabled(hasBeaches, hasBeaches ? "Name or tag…" : "No beaches indexed yet");
    els.zone.disabled = !hasBeaches;
    els.countryBlurb.innerHTML = renderCountryOverview(meta, {
      beachCount: searchIndex.beach_count,
    });
    await hydrateCountrySpecies(
      document.getElementById("country-species"),
      meta.marine_overview?.species
    );

    if (isStale("country", gen)) return;

    populateZones(country);

    if (!hasBeaches) {
      els.beachList.innerHTML = '<li class="empty-state">Beaches coming soon for this country.</li>';
      return;
    }

    const firstZone = country.city_zones.find((zone) => zone.beach_count > 0);
    if (firstZone) {
      els.zone.value = firstZone.id;
      await onZoneChange();
    }
  } catch (error) {
    if (isStale("country", gen)) return;
    els.countryBlurb.innerHTML = `<p class="empty-state empty-state--inline">Could not load country: ${escapeHtml(error.message)}</p>`;
    showError(error.message);
  }
}

function onSearchInput() {
  const query = els.search.value.trim();
  if (!query || els.search.disabled) {
    hideSearchResults();
    return;
  }

  const hits = state.trie.search(query, 5);
  if (!hits.length) {
    els.searchResults.innerHTML = '<li class="empty-state empty-state--compact">No matches</li>';
    els.searchResults.hidden = false;
    return;
  }

  els.searchResults.innerHTML = hits
    .map(
      (hit) => `
      <li>
        <button type="button" data-path="${escapeHtml(hit.path)}" data-zone="${escapeHtml(hit.zone)}">
          <span class="result-name">${escapeHtml(hit.name)}</span>
          <span class="result-meta">${escapeHtml(hit.zone.replace(/-/g, " "))} · matched ${escapeHtml(searchMatchLabel(hit))}</span>
        </button>
      </li>`
    )
    .join("");

  els.searchResults.hidden = false;
  els.searchResults.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => openSearchResult(button.dataset));
  });
}

async function openSearchResult({ path, zone }) {
  hideSearchResults();
  if (els.zone.value !== zone) {
    els.zone.value = zone;
    await onZoneChange();
  }

  const button = els.beachList.querySelector(`button[data-path="${path.replace(/"/g, '\\"')}"]`);
  if (button) {
    selectBeach(button, path);
    button.scrollIntoView({ block: "nearest" });
  } else {
    await selectBeach(null, path);
  }
}

async function init() {
  bindElements();

  if (!els.country) {
    setCountryStatus("Country dropdown not found on page.", true);
    return;
  }

  setCountryStatus("Loading countries…");

  try {
    const index = await fetchJSON(explorePath("countries.json"));
    state.countries = index.countries;
    populateCountries(state.countries);
    setCountryControlsVisible(false);
    setCountryStatus("");

    els.country.addEventListener("change", onCountryChange);
    els.zone.addEventListener("change", onZoneChange);
    els.search.addEventListener("input", onSearchInput);
    els.search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hideSearchResults();
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".search-field")) hideSearchResults();
    });
  } catch (error) {
    setCountryStatus(error.message, true);
    showError(error.message);
    showSidebarError(
      `Could not load countries. From repo root run: python3 dev/serve.py then open http://127.0.0.1:8765/web/beaches.html`
    );
  }
}

let pageStarted = false;

function startBeachesPage() {
  if (pageStarted) return;
  pageStarted = true;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}

startBeachesPage();
