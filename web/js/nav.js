/**
 * Shared site navigation.
 * Species lives under Curiosity subnav only (not the main row).
 * Habitat is its own hub (heavier regenerative crown).
 * @param {"home"|"curiosity"|"habitat"|"conservation"|"shop"} active
 */

/** Root-relative prefix to web/ (./ from hub pages, ../ from curiosity/). */
export function webRoot() {
  const path = location.pathname.replace(/\\/g, "/");
  return path.includes("/curiosity/") ? "../" : "./";
}

/** Map body[data-page] → main-nav active id. */
export function navIdForPage(page) {
  switch (page) {
    case "beaches":
    case "species":
      return "curiosity";
    case "habitat":
      return "habitat";
    case "conservation":
      return "conservation";
    case "shop":
      return "shop";
    case "connection":
    case "home":
    default:
      return "home";
  }
}

export function renderSiteNav(active) {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const root = webRoot();
  const items = [
    { id: "home", href: `${root}index.html`, label: "Home" },
    { id: "curiosity", href: `${root}curiosity/beaches.html`, label: "Curiosity" },
    { id: "habitat", href: `${root}habitat.html`, label: "Habitat" },
    { id: "conservation", href: `${root}conservation.html`, label: "Conservation" },
    { id: "shop", href: `${root}shop.html`, label: "Ocean Lifestyle" },
  ];

  nav.innerHTML = items
    .map(({ id, href, label }) => {
      const current = id === active ? ' aria-current="page"' : "";
      return `<a href="${href}"${current}>${label}</a>`;
    })
    .join("");
}
