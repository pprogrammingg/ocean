import { fetchJSON, explorePath } from "./api.js";
import { renderBeachDetail, hydrateEcosystem } from "./render-beach.js";
import { CountryTrie } from "./trie.js";

const els = {
  country: document.getElementById("country-select"),
  countryControls: document.getElementById("country-controls"),
  pickHint: document.getElementById("pick-country-hint"),
  zone: document.getElementById("zone-select"),
  beachList: document.getElementById("beach-list"),
  detail: document.getElementById("beach-detail"),
  countryBlurb: document.getElementById("country-blurb"),
  search: document.getElementById("beach-search"),
  searchResults: document.getElementById("search-results"),
};

const state = {
  countries: null,
  trie: new CountryTrie(),
};

function setDetail(html) {
  els.detail.innerHTML = html;
}

function resetDetail() {
  setDetail('<p class="empty-state">Select a beach to see details.</p>');
}

function showError(message) {
  setDetail(
    `<p class="empty-state">Error: ${message}. Run <code>npm start</code> from the repo root (file:// won't work).</p>`
  );
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
    button.innerHTML = `<span class="name">${beach.name}</span><span class="tags">${(beach.tags || []).join(" · ")}</span>`;
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
  if (button) {
    els.beachList.querySelectorAll("button").forEach((btn) => {
      btn.setAttribute("aria-selected", "false");
    });
    button.setAttribute("aria-selected", "true");
  }

  setDetail('<p class="loading">Loading beach…</p>');
  const beach = await fetchJSON(explorePath(path));
  setDetail(renderBeachDetail(beach));
  await hydrateEcosystem(document.getElementById("ecosystem"), beach);
}

async function onZoneChange() {
  const countryId = els.country.value;
  const zoneId = els.zone.value;
  resetDetail();
  els.beachList.innerHTML = "";

  if (!countryId || !zoneId) return;

  const data = await fetchJSON(explorePath(countryId, zoneId, "city-beaches.json"));
  if (!data.beaches.length) {
    els.beachList.innerHTML = '<li class="empty-state">No beaches in this zone yet.</li>';
    return;
  }

  renderBeachList(data.beaches);
  els.beachList.querySelector("button")?.click();
}

async function onCountryChange() {
  const countryId = els.country.value;
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

  const country = state.countries.find((entry) => entry.id === countryId);
  const [meta, searchIndex] = await Promise.all([
    fetchJSON(explorePath(countryId, "country.json")),
    fetchJSON(explorePath(countryId, "search-index.json")),
  ]);

  state.trie.load(searchIndex);
  const hasBeaches = searchIndex.beach_count > 0;

  setSearchEnabled(hasBeaches, hasBeaches ? "Name or tag…" : "No beaches indexed yet");
  els.zone.disabled = !hasBeaches;
  els.countryBlurb.innerHTML = `<p>${meta.ocean_info.slice(0, 220)}…</p>`;
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
        <button type="button" data-path="${hit.path}" data-zone="${hit.zone}">
          <span class="result-name">${hit.name}</span>
          <span class="result-meta">${hit.zone.replace(/-/g, " ")} · matched ${searchMatchLabel(hit)}</span>
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

  const button = els.beachList.querySelector(`button[data-path="${path}"]`);
  if (button) {
    selectBeach(button, path);
    button.scrollIntoView({ block: "nearest" });
  } else {
    await selectBeach(null, path);
  }
}

async function init() {
  try {
    const index = await fetchJSON(explorePath("countries.json"));
    state.countries = index.countries;
    populateCountries(state.countries);
    setCountryControlsVisible(false);

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
    showError(error.message);
  }
}

init();
