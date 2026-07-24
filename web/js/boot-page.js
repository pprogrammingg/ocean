import { initPage } from "./page.js";
import { enableSoftNav, setPageMood } from "./soft-nav.js";

/**
 * Mount the current document based on body[data-page].
 * Soft-nav remounts with cache-busted page modules so init runs again.
 */
export async function bootCurrentPage() {
  enableSoftNav();

  const page = document.body?.dataset?.page || "home";
  setPageMood(page);
  const bust = `boot=${Date.now()}`;

  switch (page) {
    case "home": {
      initPage("home");
      const { startHomePage } = await import(`./home.js?${bust}`);
      await startHomePage();
      break;
    }
    case "beaches": {
      initPage("curiosity");
      const { startBeachesPage } = await import(`./beaches.js?${bust}`);
      startBeachesPage();
      break;
    }
    case "species": {
      initPage("curiosity");
      const { startSpeciesPage } = await import(`./species-page.js?${bust}`);
      await startSpeciesPage();
      break;
    }
    case "connection":
      initPage("home");
      break;
    case "conservation":
      initPage("conservation");
      break;
    case "shop":
      initPage("shop");
      break;
    default:
      initPage("home");
  }
}
