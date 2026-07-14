export const CALM_DANGER_SCALE = ["Calm", "Moderate", "Dangerous"];
export const WATER_QUALITY_SCALE = ["Clean", "Moderate", "Polluted"];
export const SNORKEL_SCALE = ["Barely", "Some", "Moderate", "Great", "Abundant"];

export function scorePercent(score) {
  if (typeof score !== "number") return 0;
  return Math.min(100, Math.max(0, score * 10));
}

export function goodScorePercent(score) {
  return scorePercent(10 - score);
}

export function calmModerateDangerous(score, inverted = false) {
  if (typeof score !== "number") return "";
  const s = inverted ? 10 - score : score;
  if (s <= 3) return "Calm";
  if (s <= 6) return "Moderate";
  return "Dangerous";
}

/** High score = Clean; low = Polluted */
export function waterQualityLabel(score) {
  if (typeof score !== "number") return "";
  if (score >= 7) return "Clean";
  if (score >= 4) return "Moderate";
  return "Polluted";
}

export function snorkelingLabel(score) {
  if (typeof score !== "number") return "";
  if (score >= 9) return "Abundant";
  if (score >= 7) return "Great";
  if (score >= 4) return "Moderate";
  if (score >= 2) return "Some";
  return "Barely";
}

function noteAddsDetail(note, tierLabel) {
  if (!note || !String(note).trim()) return false;
  const n = String(note).toLowerCase().trim();
  const t = tierLabel.toLowerCase();
  const redundant = [
    "calm", "moderate", "dangerous", "excellent", "good", "poor", "none",
    "limited", "fair", "minimal", "flat", "barely", "some", "great",
    "abundant", "pristine", "clear", "cloudy", "clean", "polluted",
  ];
  return !redundant.includes(n) && n !== t;
}

function renderScaleLabels(labels, activeLabel) {
  return `
    <div class="spectrum-scale" aria-hidden="true" data-count="${labels.length}">
      ${labels
        .map(
          (l) =>
            `<span class="spectrum-scale__tick${l === activeLabel ? " is-active" : ""}">${l}</span>`
        )
        .join("")}
    </div>`;
}

export function renderSpectrumRow({
  label,
  score,
  percent,
  tierLabel,
  note = null,
  variant = "calm-danger",
  scaleLabels = CALM_DANGER_SCALE,
  compact = false,
}) {
  const noteHtml =
    noteAddsDetail(note, tierLabel) ? `<p class="spectrum-note">${note}</p>` : "";
  const metaHtml = noteHtml ? `<div class="spectrum-meta">${noteHtml}</div>` : "";
  const scaleHtml = compact ? "" : renderScaleLabels(scaleLabels, tierLabel);

  return `
    <div class="spectrum-group">
      <div class="rating-row spectrum-row">
        <span class="label">${label}</span>
        <div class="spectrum-bar-wrap">
          <div class="spectrum-bar" role="img" aria-label="${label} ${score} out of 10${compact ? "" : `, ${tierLabel}`}">
            <div class="spectrum-track spectrum-track--${variant}"></div>
            <div class="spectrum-marker" style="left:${percent}%"></div>
          </div>
          ${scaleHtml}
        </div>
        <span class="score">${score}/10</span>
      </div>
      ${metaHtml}
    </div>`;
}

export function buildCompactRatingRows(liveRating = {}) {
  return buildRatingRows(liveRating, { compact: true });
}

export function buildRatingRows(liveRating = {}, { compact = false } = {}) {
  const r = liveRating;
  const rowOpts = compact ? { compact: true } : {};
  return [
    renderSpectrumRow({
      label: "Wave",
      score: r.wave,
      percent: scorePercent(r.wave),
      tierLabel: calmModerateDangerous(r.wave),
      note: r.wave_note,
      variant: "calm-danger",
      scaleLabels: CALM_DANGER_SCALE,
      ...rowOpts,
    }),
    renderSpectrumRow({
      label: "Swim",
      score: r.swim,
      percent: goodScorePercent(r.swim),
      tierLabel: calmModerateDangerous(r.swim, true),
      variant: "calm-danger",
      scaleLabels: CALM_DANGER_SCALE,
      ...rowOpts,
    }),
    renderSpectrumRow({
      label: "Water quality",
      score: r.water_quality,
      percent: goodScorePercent(r.water_quality),
      tierLabel: waterQualityLabel(r.water_quality),
      note: r.water_quality_note,
      variant: "purity",
      scaleLabels: WATER_QUALITY_SCALE,
      ...rowOpts,
    }),
    renderSpectrumRow({
      label: "Surfing",
      score: r.surfing,
      percent: scorePercent(r.surfing),
      tierLabel: calmModerateDangerous(r.surfing),
      note: r.surfing_note,
      variant: "calm-danger",
      scaleLabels: CALM_DANGER_SCALE,
      ...rowOpts,
    }),
    renderSpectrumRow({
      label: "Snorkeling",
      score: r.snorkeling,
      percent: scorePercent(r.snorkeling),
      tierLabel: snorkelingLabel(r.snorkeling),
      note: r.snorkeling_note,
      variant: "snorkel",
      scaleLabels: SNORKEL_SCALE,
      ...rowOpts,
    }),
  ].join("");
}
