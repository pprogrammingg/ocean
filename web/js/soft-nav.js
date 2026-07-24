/**
 * Soft navigation — fetch HTML and swap body without a full browser reload.
 * Mood tint morphs on <html data-mood> before content crossfades.
 */
import { resetSpeciesOverlayDom } from "./species-overlay.js";
import { navIdForPage, renderSiteNav } from "./nav.js";

let enabled = false;
let lastPathname = "";
let navigating = false;

function sameOrigin(url) {
  return url.origin === location.origin;
}

function isHtmlPath(url) {
  const path = url.pathname;
  return path.endsWith(".html") || path.endsWith("/");
}

function shouldSoftNav(anchor, event) {
  if (!anchor || event.defaultPrevented) return false;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.dataset.softNav === "off") return false;

  let url;
  try {
    url = new URL(anchor.href, location.href);
  } catch {
    return false;
  }
  if (!sameOrigin(url) || !isHtmlPath(url)) return false;
  if (
    url.pathname === location.pathname &&
    url.search === location.search &&
    url.hash === location.hash
  ) {
    return false;
  }
  return true;
}

function syncHead(doc) {
  document.title = doc.title || document.title;

  const nextBase = doc.querySelector('meta[name="ocean-data-base"]');
  let meta = document.querySelector('meta[name="ocean-data-base"]');
  if (nextBase) {
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "ocean-data-base";
      document.head.appendChild(meta);
    }
    meta.content = nextBase.content;
  } else if (meta) {
    meta.remove();
  }
}

/** Copy body attrs (esp. data-page) — innerHTML alone leaves the old page mounted. */
function syncBody(doc) {
  const next = doc.body;
  const attrs = new Set([...next.attributes].map((a) => a.name));
  for (const attr of [...document.body.attributes]) {
    if (!attrs.has(attr.name)) document.body.removeAttribute(attr.name);
  }
  for (const attr of next.attributes) {
    document.body.setAttribute(attr.name, attr.value);
  }
  document.body.innerHTML = next.innerHTML;
}

export function setPageMood(page) {
  document.documentElement.dataset.mood = page || "home";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function navigateTo(href, { push = true } = {}) {
  if (navigating) return;
  navigating = true;

  try {
    const url = new URL(href, location.href);
    const res = await fetch(url.pathname, { headers: { Accept: "text/html" } });
    if (!res.ok) {
      location.href = url.href;
      return;
    }

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nextMood = doc.body?.dataset?.page || "home";

    // Start mood tint morph before content swap (background-color transitions on html).
    setPageMood(nextMood);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) await delay(90);

    const apply = () => {
      resetSpeciesOverlayDom();
      syncHead(doc);
      syncBody(doc);
      lastPathname = url.pathname;
      if (push) history.pushState({ softNav: true }, "", url.href);
      const page = document.body?.dataset?.page || nextMood;
      setPageMood(page);
      // Fill nav after URL update (webRoot) and before VT snapshots "new".
      // Empty nav was shrinking the header, then boot bounced it back.
      renderSiteNav(navIdForPage(page));
    };

    if (typeof document.startViewTransition === "function" && !reduceMotion) {
      await document.startViewTransition(apply).finished;
    } else {
      document.documentElement.classList.add("soft-nav-fallback-out");
      await delay(reduceMotion ? 0 : 180);
      apply();
      document.documentElement.classList.remove("soft-nav-fallback-out");
      document.documentElement.classList.add("soft-nav-fallback-in");
      await delay(reduceMotion ? 0 : 220);
      document.documentElement.classList.remove("soft-nav-fallback-in");
    }

    const { bootCurrentPage } = await import("./boot-page.js");
    await bootCurrentPage();
  } catch (err) {
    console.error(err);
    location.href = href;
  } finally {
    navigating = false;
  }
}

function onClick(event) {
  const anchor = event.target.closest("a[href]");
  if (!shouldSoftNav(anchor, event)) return;
  event.preventDefault();
  navigateTo(anchor.href, { push: true });
}

function onPopState() {
  if (location.pathname === lastPathname) return;
  navigateTo(location.href, { push: false });
}

export function enableSoftNav() {
  if (enabled) return;
  enabled = true;
  lastPathname = location.pathname;
  setPageMood(document.body?.dataset?.page || "home");
  document.addEventListener("click", onClick);
  window.addEventListener("popstate", onPopState);
}
