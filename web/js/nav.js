/**
 * Shared site navigation — Curiosity · Connection · Conservation
 * @param {"home"|"curiosity"|"connection"|"conservation"} active
 */
export function renderSiteNav(active) {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const items = [
    { id: "home", href: "index.html", label: "Home" },
    { id: "curiosity", href: "beaches.html", label: "Curiosity" },
    { id: "connection", href: "connection.html", label: "Connection" },
    { id: "conservation", href: "conservation.html", label: "Conservation" },
  ];

  nav.innerHTML = items
    .map(({ id, href, label }) => {
      const current = id === active ? ' aria-current="page"' : "";
      return `<a href="${href}"${current}>${label}</a>`;
    })
    .join("");
}
