/** Parallax trading-card shell for species postcards (overlay only). */

const LAYER_URLS = [
  "https://assets.codepen.io/1948355/parallaxDemo1.png",
  "https://assets.codepen.io/1948355/parallaxDemo2.png",
  "https://assets.codepen.io/1948355/parallaxDemo3.png",
  "https://assets.codepen.io/1948355/parallaxDemo4.png",
  "https://assets.codepen.io/1948355/parallaxDemo5.png",
  "https://assets.codepen.io/1948355/parallaxDemo6.png",
  "https://assets.codepen.io/1948355/parallaxDemo7.png",
  "https://assets.codepen.io/1948355/parallaxDemo8.png",
];

const POSTCARD_PARALLAX_SLUGS = new Set(["green-sea-turtle"]);

export function postcardParallaxEnabled(record) {
  return Boolean(record?.id && POSTCARD_PARALLAX_SLUGS.has(record.id));
}

function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** Pointer → --mouse-x / --mouse-y on stage (-1..1). Returns disposer. */
function bindParallaxPointer(stage) {
  if (!stage || prefersReducedMotion()) return () => {};

  const setFromEvent = (e) => {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    stage.style.setProperty("--mouse-x", String(((e.clientX - rect.left) / rect.width) * 2 - 1));
    stage.style.setProperty("--mouse-y", String(((e.clientY - rect.top) / rect.height) * 2 - 1));
  };

  const reset = () => {
    stage.style.setProperty("--mouse-x", "-0.1");
    stage.style.setProperty("--mouse-y", "0.1");
  };

  stage.addEventListener("pointermove", setFromEvent);
  stage.addEventListener("pointerleave", reset);
  reset();

  return () => {
    stage.removeEventListener("pointermove", setFromEvent);
    stage.removeEventListener("pointerleave", reset);
  };
}

/** Bind pointer on first `[data-parallax-hero]` under root. */
export function mountParallaxHero(root) {
  const stage = root?.querySelector?.("[data-parallax-hero]");
  if (!stage) return () => {};
  return bindParallaxPointer(stage);
}

/** Whole species postcard inside the parallax trading-card shell. */
export function renderPostcardParallaxShell(faceHtml, { tiltMax = "26deg" } = {}) {
  const layers = LAYER_URLS.map(
    (url, index) => `
      <div
        class="parallax-card__layer parallax-card__layer--behind parallax-card__layer--scroll"
        style="--i: ${index + 3}; background-image: url('${escapeAttr(url)}')"
      ></div>`
  ).join("");

  return `
    <div class="parallax-stage parallax-stage--postcard" data-parallax-hero style="--parallax-tilt-max: ${escapeAttr(tiltMax)}">
      <div class="parallax-card">
        <div class="parallax-card__face">
          <div class="parallax-card__layers">${layers}</div>
          <div class="parallax-card__plate">${faceHtml}</div>
          <div class="parallax-card__layer parallax-card__layer--gloss parallax-card__overlay" aria-hidden="true"></div>
          <div class="parallax-card__layer parallax-card__layer--rim parallax-card__overlay" aria-hidden="true"></div>
        </div>
      </div>
    </div>`;
}
