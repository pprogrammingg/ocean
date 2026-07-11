import { renderSiteNav } from "./nav.js";

/** Shared page bootstrap — nav + optional debug flags. */
export function initPage(navId) {
  renderSiteNav(navId);
}

export function isVerifyEnabled() {
  return new URLSearchParams(window.location.search).has("verify");
}
