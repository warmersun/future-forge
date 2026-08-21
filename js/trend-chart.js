/**
 * Chart.js config + mount helpers for capability-trend Wait charts.
 * Expects window.Chart (UMD) when mounting; buildTrendChartConfig is DOM-free.
 */

import { sampleCurve } from "./capability-trend.js";

let _annotationRegistered = false;

/**
 * Best-effort register annotation plugin if present as UMD global.
 * chartjs-plugin-annotation.min.js auto-registers when Chart is already loaded.
 */
export function ensureChartPlugins() {
  if (typeof globalThis === "undefined") return;
  const Chart = globalThis.Chart;
  if (!Chart || _annotationRegistered) return;
  const plugin =
    globalThis.ChartAnnotation ||
    globalThis["chartjs-plugin-annotation"] ||
    null;
  if (plugin && typeof Chart.register === "function") {
    try {
      Chart.register(plugin);
    } catch {
      /* already registered */
    }
  }
  _annotationRegistered = true;
}

/**
 * @param {object} [css]
 */
function defaultCss(css = {}) {
  return {
    text: css.text || "#e2e8f0",
    textMute: css.textMute || "#94a3b8",
    accent: css.accent || "#38bdf8",
    accent2: css.accent2 || "#a78bfa",
    warn: css.warn || "#fbbf24",
    grid: css.grid || "rgba(148, 163, 184, 0.18)",
    reached: css.reached || "#34d399",
    predicted: css.predicted || "#fbbf24",
    nowLine: css.nowLine || "rgba(56, 189, 248, 0.85)",
    nextLine: css.nextLine || "rgba(251, 191, 36, 0.85)",
  };
}

/**
 * Format a capability value for tooltips / labels.
 * @param {number} v
 * @param {string} [unit]
 */
export function formatTrendValue(v, unit = "") {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  let s;
  if (Math.abs(n) >= 1e6 || (Math.abs(n) > 0 && Math.abs(n) < 0.01)) {
    s = n.toExponential(2);
  } else if (Math.abs(n) >= 100) {
    s = Math.round(n).toLocaleString("en-US");
  } else {
    s = Number(n.toPrecision(3)).toString();
  }
  return unit ? `${s} ${unit}` : s;
}

/**
 * Pure Chart.js config builder (no canvas required).
 * @param {object} trend — normalized capability trend
 * @param {{
 *   yearNow?: number,
 *   yearNext?: number,
 *   spotlight?: boolean,
 *   css?: object,
 *   curveSteps?: number,
 * }} [opts]
 */
export function buildTrendChartConfig(trend, opts = {}) {
  const css = defaultCss(opts.css);
  const yearNow = Number(opts.yearNow);
  const yearNext = Number(opts.yearNext);
  const unit = String(trend?.unit || "");
  const domainStart = Number(trend?.domain?.start);
  const domainEnd = Number(trend?.domain?.end);
  const curve = sampleCurve(trend, opts.curveSteps ?? 40).map((p) => ({
    x: p.x,
    y: p.y,
  }));

  const reached = (trend?.milestones || [])
    .filter((m) => m.status === "reached")
    .map((m) => ({
      x: m.year,
      y: m.value,
      label: m.label,
      status: m.status,
      date: m.date,
    }));
  const predicted = (trend?.milestones || [])
    .filter((m) => m.status === "predicted")
    .map((m) => ({
      x: m.year,
      y: m.value,
      label: m.label,
      status: m.status,
      date: m.date,
    }));

  /** @type {Record<string, object>} */
  const annotations = {};
  if (Number.isFinite(yearNow)) {
    annotations.nowLine = {
      type: "line",
      xMin: yearNow,
      xMax: yearNow,
      borderColor: css.nowLine,
      borderWidth: 2,
      borderDash: [4, 3],
      label: {
        display: true,
        content: "now",
        position: "start",
        backgroundColor: "rgba(2, 6, 14, 0.75)",
        color: css.text,
        font: { size: 10 },
      },
    };
  }
  if (Number.isFinite(yearNext) && yearNext !== yearNow) {
    annotations.nextLine = {
      type: "line",
      xMin: yearNext,
      xMax: yearNext,
      borderColor: css.nextLine,
      borderWidth: 2,
      borderDash: [2, 2],
      label: {
        display: true,
        content: "after Wait",
        position: "end",
        backgroundColor: "rgba(2, 6, 14, 0.75)",
        color: css.warn,
        font: { size: 10 },
      },
    };
  }

  const lineColor = opts.spotlight ? css.warn : css.accent;

  return {
    type: "scatter",
    data: {
      datasets: [
        {
          type: "line",
          label: "Trend",
          data: curve,
          borderColor: lineColor,
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0,
          order: 3,
        },
        {
          type: "scatter",
          label: "Reached",
          data: reached,
          backgroundColor: css.reached,
          borderColor: css.reached,
          pointRadius: 5,
          pointHoverRadius: 7,
          order: 1,
        },
        {
          type: "scatter",
          label: "Predicted",
          data: predicted,
          backgroundColor: "transparent",
          borderColor: css.predicted,
          borderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          order: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "nearest", intersect: true },
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          filter(item) {
            // Hide dense curve points; keep milestone scatters
            return item.datasetIndex !== 0;
          },
          callbacks: {
            title(items) {
              const raw = items[0]?.raw;
              if (raw?.label) return raw.label;
              return "";
            },
            label(item) {
              const raw = item.raw || {};
              const bits = [
                formatTrendValue(raw.y ?? item.parsed?.y, unit),
                raw.status ? String(raw.status) : "",
                raw.date ? String(raw.date) : "",
              ].filter(Boolean);
              return bits.join(" · ");
            },
          },
        },
        annotation: {
          annotations,
        },
      },
      scales: {
        x: {
          type: "linear",
          min: Number.isFinite(domainStart) ? domainStart : undefined,
          max: Number.isFinite(domainEnd) ? domainEnd : undefined,
          title: {
            display: true,
            text: "Year",
            color: css.textMute,
          },
          ticks: {
            color: css.textMute,
            callback(v) {
              return Number.isInteger(v) ? String(v) : "";
            },
          },
          grid: { color: css.grid },
        },
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: unit || "Capability",
            color: css.textMute,
          },
          ticks: {
            color: css.textMute,
            callback(v) {
              const n = Number(v);
              if (!Number.isFinite(n) || n <= 0) return "";
              // Show decade ticks roughly
              const log10 = Math.log10(n);
              if (Math.abs(log10 - Math.round(log10)) > 0.001) return "";
              return formatTrendValue(n);
            },
          },
          grid: { color: css.grid },
        },
      },
    },
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} trend
 * @param {object} [opts]
 * @returns {object|null} Chart instance or null if Chart.js missing
 */
export function mountTrendChart(canvas, trend, opts = {}) {
  ensureChartPlugins();
  const Chart = typeof globalThis !== "undefined" ? globalThis.Chart : null;
  if (!Chart || !canvas) return null;
  const config = buildTrendChartConfig(trend, opts);
  return new Chart(canvas, config);
}

/**
 * @param {object|null|undefined} chart
 */
export function destroyTrendChart(chart) {
  if (chart && typeof chart.destroy === "function") {
    try {
      chart.destroy();
    } catch {
      /* ignore */
    }
  }
}
