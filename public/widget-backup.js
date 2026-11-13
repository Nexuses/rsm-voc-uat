/*
  RSM in Kuwait public Voice of Client metrics widget.

  <div id="rsm-voc-metrics"></div>
  <script
    src="https://YOUR_APP/widget.js"
    data-api="https://YOUR_APP/api/public/metrics"
    data-metric="all"
    data-target="rsm-voc-metrics"
  ></script>

  data-metric accepts "csat", "ces", "nps", or "all".
  The public API supplies aggregate metrics and sanitized themes only.
*/
(function () {
  "use strict";

  var LOGO_URL =
    "https://res.cloudinary.com/rsmglobal/image/fetch/t_default/f_auto/q_auto/https://www.rsm.global/kuwait/profiles/rsm_global_platform/themes/rsm_global_platform_2022/images/logo@2x.png";
  var script = resolveWidgetScript();
  var requestedMetric = script
    ? String(script.getAttribute("data-metric") || "all").toLowerCase()
    : "all";
  var metric = ["csat", "ces", "nps", "all"].indexOf(requestedMetric) >= 0
    ? requestedMetric
    : "all";
  var api = script
    ? script.getAttribute("data-api") || "/api/public/metrics"
    : "/api/public/metrics";
  var targetId = script
    ? script.getAttribute("data-target") || "rsm-voc-metrics"
    : "rsm-voc-metrics";
  var mount =
    document.getElementById(targetId) ||
    document.getElementById("rsm-csat");

  if (!mount) {
    mount = document.createElement("div");
    mount.id = targetId;
    document.body.appendChild(mount);
  }

  installStyles();
  mount.setAttribute("data-rsm-voc-widget", metric);
  mount.innerHTML =
    '<div class="rsm-voc-loading" role="status">Loading client experience metrics...</div>';

  fetch(api)
    .then(function (response) {
      if (!response.ok) throw new Error("Metric request failed");
      return response.json();
    })
    .then(function (data) {
      var cards = metric === "all"
        ? [
            renderCsat(data.csat || {}),
            renderCes(data.ces || {}),
            renderNps(data.nps || {}),
          ].join("")
        : metric === "csat"
          ? renderCsat(data.csat || {})
          : metric === "ces"
            ? renderCes(data.ces || {})
            : renderNps(data.nps || {});

      var themes = metric === "all"
        ? renderThemes((data.themes || []).slice(0, 3))
        : "";

      mount.innerHTML =
        '<section class="rsm-voc-shell" aria-label="RSM in Kuwait client experience metrics">' +
        '<header class="rsm-voc-head">' +
        '<div><img class="rsm-voc-logo" src="' +
        LOGO_URL +
        '" alt="RSM in Kuwait" width="120" height="40" />' +
        '<span><strong>Voice of Client</strong><small>RSM in Kuwait</small></span></div>' +
        '<em>All-time results</em>' +
        "</header>" +
        '<div class="rsm-voc-grid" data-layout="' +
        escapeHtml(metric) +
        '">' +
        cards +
        "</div>" +
        themes +
        '<footer>Aggregate feedback only. No personal response data is displayed.</footer>' +
        "</section>";
    })
    .catch(function () {
      mount.innerHTML =
        '<div class="rsm-voc-error" role="alert">Client experience metrics are temporarily unavailable.</div>';
    });

  function renderCsat(csat) {
    return (
      '<article class="rsm-voc-card rsm-voc-csat">' +
      metricHeading("CSAT", "Overall service satisfaction") +
      score(csat.score, "/5", csat.responseCount) +
      favorable(csat.favorablePercent, "rated satisfied, 4-5") +
      distribution(csat.distribution || {}, 1, 5, "CSAT rating distribution") +
      "</article>"
    );
  }

  function renderCes(ces) {
    return (
      '<article class="rsm-voc-card rsm-voc-ces">' +
      metricHeading("CES", "Ease of service and support") +
      score(ces.score, "/7", ces.responseCount) +
      favorable(ces.favorablePercent, "rated easy, 5-7") +
      distribution(ces.distribution || {}, 1, 7, "CES rating distribution") +
      "</article>"
    );
  }

  function renderNps(nps) {
    var promoterPercent = safePercent(nps.promoterPercent);
    var passivePercent = safePercent(nps.passivePercent);
    var detractorPercent = safePercent(nps.detractorPercent);
    return (
      '<article class="rsm-voc-card rsm-voc-nps">' +
      metricHeading("NPS", "Likelihood to recommend") +
      '<div class="rsm-voc-nps-body">' +
      '<div class="rsm-voc-gauge" style="--promoters:' +
      promoterPercent +
      "%;--promoter-passive:" +
      (promoterPercent + passivePercent) +
      "%" +
      '"><span><strong>' +
      displayNumber(nps.score, 0) +
      "</strong><small>-100 to 100</small></span></div>" +
      '<div class="rsm-voc-segments">' +
      segment("Promoters", promoterPercent, "promoterPercent") +
      segment("Passives", passivePercent, "passivePercent") +
      segment("Detractors", detractorPercent, "detractorPercent") +
      "</div></div>" +
      '<p class="rsm-voc-count">Based on ' +
      displayCount(nps.responseCount) +
      " valid NPS responses</p>" +
      "</article>"
    );
  }

  function metricHeading(label, description) {
    return (
      '<div class="rsm-voc-title"><span>' +
      escapeHtml(label) +
      "</span><div><strong>" +
      escapeHtml(label) +
      "</strong><small>" +
      escapeHtml(description) +
      "</small></div></div>"
    );
  }

  function score(value, suffix, responseCount) {
    return (
      '<div class="rsm-voc-score"><strong>' +
      displayNumber(value, 1) +
      "</strong><span>" +
      escapeHtml(suffix) +
      "</span></div>" +
      '<p class="rsm-voc-count">Based on ' +
      displayCount(responseCount) +
      " valid responses</p>"
    );
  }

  function favorable(value, label) {
    var percentage = safePercent(value);
    return (
      '<div class="rsm-voc-favorable"><div><strong>' +
      percentage +
      "%</strong><span>" +
      escapeHtml(label) +
      '</span></div><i><b style="width:' +
      percentage +
      '%"></b></i></div>'
    );
  }

  function distribution(values, min, max, label) {
    var total = 0;
    var rating;
    for (rating = min; rating <= max; rating += 1) {
      total += safeCount(values[String(rating)]);
    }

    var bars = "";
    for (rating = min; rating <= max; rating += 1) {
      var count = safeCount(values[String(rating)]);
      var width = total ? Math.round((count / total) * 100) : 0;
      bars +=
        '<span title="' +
        rating +
        ": " +
        count +
        '" style="height:' +
        Math.max(width, count ? 8 : 2) +
        '%"></span>';
    }
    return (
      '<div class="rsm-voc-distribution" role="img" aria-label="' +
      escapeHtml(label) +
      '">' +
      bars +
      "</div>"
    );
  }

  function segment(label, value, fieldName) {
    return (
      '<div data-field="' +
      fieldName +
      '"><i></i><span>' +
      escapeHtml(label) +
      "</span><strong>" +
      value +
      "%</strong></div>"
    );
  }

  function renderThemes(themes) {
    if (!themes.length) return "";
    return (
      '<div class="rsm-voc-themes"><strong>What clients are highlighting</strong>' +
      themes
        .map(function (theme) {
          return (
            '<span data-sentiment="' +
            escapeHtml(theme.sentiment || "neutral") +
            '">' +
            escapeHtml(theme.summary || theme.label || "") +
            "</span>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function installStyles() {
    if (document.getElementById("rsm-voc-widget-styles")) return;
    var style = document.createElement("style");
    style.id = "rsm-voc-widget-styles";
    style.textContent =
      '[data-rsm-voc-widget]{--navy:#00153d;--blue:#009cde;--green:#3f9c35;--charcoal:#231f20;--body-text:#63666a;--border:#d1d3d4;font-family:"Calibri","Segoe UI",-apple-system,system-ui,Arial,sans-serif;color:var(--navy)}' +
      ".rsm-voc-shell{max-width:1040px;padding:20px;background:#fff;border:1px solid var(--border);border-top:3px solid var(--green);border-radius:4px;box-shadow:0 2px 8px rgba(0,21,61,.06)}" +
      ".rsm-voc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.rsm-voc-head>div{display:flex;align-items:center;gap:12px}.rsm-voc-head>div>span:last-child{display:grid}.rsm-voc-head strong{font-size:14px;color:var(--charcoal)}.rsm-voc-head small,.rsm-voc-head em{color:var(--body-text);font-size:11px;font-style:normal}.rsm-voc-logo{display:block;height:34px;width:auto;max-width:120px;object-fit:contain}" +
      ".rsm-voc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.rsm-voc-grid:not([data-layout=all]){grid-template-columns:minmax(0,420px)}" +
      ".rsm-voc-card{min-width:0;padding:19px;background:#fff;border:1px solid #e3ebf1;border-radius:16px;box-shadow:0 8px 22px rgba(0,21,61,.05)}.rsm-voc-title{display:flex;align-items:center;gap:10px}.rsm-voc-title>span{display:grid;width:42px;height:42px;place-items:center;color:#fff;background:var(--navy);border-radius:12px;font-size:11px;font-weight:800}.rsm-voc-ces .rsm-voc-title>span{background:var(--blue)}.rsm-voc-nps .rsm-voc-title>span{background:var(--green)}.rsm-voc-title>div{display:grid}.rsm-voc-title strong{font-size:14px}.rsm-voc-title small{color:#64748b;font-size:11px}" +
      ".rsm-voc-score{display:flex;align-items:baseline;margin-top:18px}.rsm-voc-score strong{font-size:46px;line-height:1;letter-spacing:-.05em}.rsm-voc-score span{margin-left:4px;color:#64748b;font-size:16px}.rsm-voc-count{margin:5px 0 0;color:#64748b;font-size:11px}" +
      ".rsm-voc-favorable{margin-top:17px}.rsm-voc-favorable>div{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.rsm-voc-favorable strong{font-size:14px}.rsm-voc-favorable span{color:#64748b;font-size:10px}.rsm-voc-favorable>i{display:block;height:6px;margin-top:7px;overflow:hidden;background:#edf2f6;border-radius:99px}.rsm-voc-favorable b{display:block;height:100%;background:linear-gradient(90deg,var(--green),var(--blue));border-radius:inherit}" +
      ".rsm-voc-distribution{display:flex;height:42px;align-items:flex-end;gap:5px;margin-top:16px}.rsm-voc-distribution span{flex:1;min-height:2px;background:linear-gradient(180deg,var(--blue),var(--cyan));border-radius:4px 4px 1px 1px}.rsm-voc-ces .rsm-voc-distribution span{background:linear-gradient(180deg,var(--cyan),var(--green))}" +
      ".rsm-voc-nps-body{display:grid;grid-template-columns:108px 1fr;align-items:center;gap:14px;margin-top:18px}.rsm-voc-gauge{display:grid;width:106px;aspect-ratio:1;place-items:center;background:conic-gradient(var(--green) 0 var(--promoters),var(--amber) var(--promoters) var(--promoter-passive),var(--red) var(--promoter-passive) 100%);border-radius:50%}.rsm-voc-gauge:before{grid-area:1/1;width:72%;aspect-ratio:1;content:'';background:#fff;border-radius:50%}.rsm-voc-gauge span{z-index:1;display:grid;grid-area:1/1;text-align:center}.rsm-voc-gauge strong{font-size:28px}.rsm-voc-gauge small{color:#64748b;font-size:9px}.rsm-voc-segments{display:grid;gap:8px}.rsm-voc-segments>div{display:grid;grid-template-columns:8px 1fr auto;align-items:center;gap:6px;font-size:10px}.rsm-voc-segments i{width:7px;height:7px;background:var(--green);border-radius:50%}.rsm-voc-segments div:nth-child(2) i{background:var(--amber)}.rsm-voc-segments div:nth-child(3) i{background:var(--red)}" +
      ".rsm-voc-themes{display:flex;align-items:center;gap:8px;margin-top:14px;padding:12px 14px;background:#fff;border:1px solid #e3ebf1;border-radius:14px;overflow:auto}.rsm-voc-themes>strong{flex:0 0 auto;font-size:11px}.rsm-voc-themes>span{flex:0 0 auto;padding:6px 9px;color:#334155;background:#f1f5f9;border-radius:99px;font-size:10px}.rsm-voc-shell footer{margin-top:13px;color:#788697;font-size:9px}.rsm-voc-loading,.rsm-voc-error{max-width:420px;padding:18px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;font:13px system-ui}" +
      "@media(max-width:760px){.rsm-voc-grid{grid-template-columns:1fr}.rsm-voc-shell{padding:15px}.rsm-voc-head em{display:none}}";
    document.head.appendChild(style);
  }

  function safePercent(value) {
    var number = Number(value);
    return Number.isFinite(number)
      ? Math.max(0, Math.min(100, Math.round(number)))
      : 0;
  }

  function safeCount(value) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
  }

  function displayCount(value) {
    return safeCount(value).toLocaleString();
  }

  function displayNumber(value, precision) {
    var number = Number(value);
    return Number.isFinite(number) ? number.toFixed(precision) : "-";
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[character];
    });
  }

  function resolveWidgetScript() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    for (var index = scripts.length - 1; index >= 0; index -= 1) {
      var candidate = scripts[index];
      if (candidate.src && /\/widget\.js(?:\?|$)/.test(candidate.src)) {
        return candidate;
      }
    }
    return null;
  }
})();
