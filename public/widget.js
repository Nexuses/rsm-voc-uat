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
  var COLORS = {
    green: "#3f9c35",
    greenSatisfied: "#65b05d",
    blue: "#009cde",
    navy: "#00153d",
    grey: "#888b8d",
    track: "#e8edf0",
    veryPositive: "#3f9c35",
    positive: "#009cde",
    neutral: "#63666a",
    negative: "#888b8d",
    veryNegative: "#888b8d",
    detractor: "#888b8d",
    csat: "#3f9c35",
    ces: "#888b8d",
    nps: "#009cde",
  };
  var METHODOLOGY = {
    csat: {
      title: "CSAT",
      subtitle:
        "A 5-point scale — ratings of 4 (Satisfied) and 5 (Very Satisfied) are counted as positive.",
      scaleTitle: "RSM in Kuwait & Global CSAT Scale",
      cells: [
        { rating: "5", label: "Very satisfied", tone: "positive" },
        { rating: "4", label: "Satisfied", tone: "positive" },
        { rating: "3", label: "Somewhat satisfied", tone: "neutral" },
        { rating: "1–2", label: "Dissatisfied", tone: "negative" },
      ],
      bar: [
        { rating: "5", color: COLORS.green },
        { rating: "4", color: COLORS.greenSatisfied },
        { rating: "3", color: COLORS.blue },
        { rating: "2", color: "#9e9e9e" },
        { rating: "1", color: "#bdbdbd" },
      ],
      barVariant: "csat",
    },
    nps: {
      title: "NPS",
      subtitle: "NPS = % Promoters (rating 9–10) minus % Detractors (ratings 0–6).",
      scaleTitle: "Global NPS Scale (0–10)",
      cells: [
        { rating: "9–10", label: "Promoters", tone: "positive" },
        { rating: "7–8", label: "Neutral", tone: "neutral" },
        { rating: "0–6", label: "Detractors", tone: "negative" },
      ],
      bar: [
        { rating: "10", color: COLORS.green },
        { rating: "9", color: COLORS.green },
        { rating: "8", color: COLORS.blue },
        { rating: "7", color: COLORS.blue },
        { rating: "6", color: "#9e9e9e" },
        { rating: "5", color: "#9e9e9e" },
        { rating: "4", color: "#9e9e9e" },
        { rating: "3", color: "#9e9e9e" },
        { rating: "2", color: "#bdbdbd" },
        { rating: "1", color: "#bdbdbd" },
        { rating: "0", color: "#d5d5d5" },
      ],
      barVariant: "compact",
    },
    ces: {
      title: "CES",
      subtitle:
        "Average score — ratings on the 1–7 effort scale (Very Difficult to Very Easy).",
      scaleTitle: "Global CES Scale (1–7)",
      cells: [
        { rating: "6–7", label: "Very easy", tone: "positive" },
        { rating: "5", label: "Easy", tone: "positive" },
        { rating: "4", label: "Neutral", tone: "neutral" },
        { rating: "1–3", label: "Difficult", tone: "negative" },
      ],
      bar: [
        { rating: "7", color: COLORS.green },
        { rating: "6", color: COLORS.green },
        { rating: "5", color: COLORS.greenSatisfied },
        { rating: "4", color: COLORS.blue },
        { rating: "3", color: "#9e9e9e" },
        { rating: "2", color: "#9e9e9e" },
        { rating: "1", color: "#bdbdbd" },
      ],
      barVariant: "compact",
    },
  };

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
      var csat = data.csat || {};
      var ces = data.ces || {};
      var nps = data.nps || {};
      var summaryHtml = "";
      var methodologyHtml = "";

      if (metric === "all" || metric === "csat") {
        summaryHtml += renderSummaryCard("csat", csat);
        methodologyHtml += renderMethodologyColumn("csat");
      }
      if (metric === "all" || metric === "nps") {
        summaryHtml += renderSummaryCard("nps", nps);
        methodologyHtml += renderMethodologyColumn("nps");
      }
      if (metric === "all" || metric === "ces") {
        summaryHtml += renderSummaryCard("ces", ces);
        methodologyHtml += renderMethodologyColumn("ces");
      }

      var themes =
        metric === "all"
          ? renderThemes((data.themes || []).slice(0, 3))
          : "";

      mount.innerHTML =
        '<section class="rsm-voc-shell" aria-label="RSM in Kuwait client experience metrics">' +
        '<header class="rsm-voc-head">' +
        '<div><img class="rsm-voc-logo" src="' +
        LOGO_URL +
        '" alt="RSM in Kuwait" width="120" height="40" />' +
        '<span><small>RSM in Kuwait</small><strong>CX Intelligence</strong></span></div>' +
        '<em>' +
        escapeHtml(data.period === "all-time" ? "All-time results" : "Client experience") +
        "</em>" +
        "</header>" +
        '<section class="rsm-voc-metrics-overview" aria-label="CX metrics">' +
        '<header class="rsm-voc-metrics-heading">' +
        '<span class="rsm-voc-metrics-kicker">Key performance</span>' +
        "<h2>Performance indicators</h2>" +
        "</header>" +
        renderParticipationStrip(data) +
        '<div class="rsm-voc-summary" data-layout="' +
        escapeHtml(metric) +
        '">' +
        summaryHtml +
        "</div>" +
        '<section class="rsm-voc-breakdown" aria-label="Methodology and calculation">' +
        '<h3>Methodology &amp; calculation</h3>' +
        '<div class="rsm-voc-breakdown-grid" data-layout="' +
        escapeHtml(metric) +
        '">' +
        methodologyHtml +
        "</div></section></section>" +
        themes +
        '<footer>Aggregate feedback only. No personal response data is displayed.</footer>' +
        "</section>";
    })
    .catch(function () {
      mount.innerHTML =
        '<div class="rsm-voc-error" role="alert">Client experience metrics are temporarily unavailable.</div>';
    });

  function renderParticipationStrip(data) {
    var surveysSent = safeCount(data.surveysSent);
    var responsesReceived = safeCount(data.inviteResponsesReceived);
    var responseRate = safePercent(data.inviteResponseRate);

    return (
      '<section class="rsm-voc-participation" aria-label="Survey outreach">' +
      participationCard(
        "responses",
        "",
        "Surveys sent",
        displayCount(surveysSent),
        "Invitation emails sent"
      ) +
      participationCard(
        "voice",
        "rsm-voc-participation-voice",
        "Responses received",
        displayCount(responsesReceived),
        "Completed surveys from invites"
      ) +
      participationCard(
        "completion",
        "rsm-voc-participation-completion",
        "Response rate",
        responseRate + "%",
        "Share of sent invites completed"
      ) +
      "</section>"
    );
  }

  function participationCard(kind, toneClass, label, value, detail) {
    return (
      '<article class="rsm-voc-participation-card' +
      (toneClass ? " " + toneClass : "") +
      '">' +
      participationIconSvg(kind) +
      '<div class="rsm-voc-participation-copy">' +
      '<span class="rsm-voc-participation-label">' +
      escapeHtml(label) +
      "</span>" +
      '<strong class="rsm-voc-participation-value">' +
      escapeHtml(value) +
      "</strong>" +
      '<span class="rsm-voc-participation-detail">' +
      escapeHtml(detail) +
      "</span></div></article>"
    );
  }

  function participationIconSvg(kind) {
    var paths = "";
    if (kind === "responses") {
      paths =
        '<path d="M22 12h-6l-2 3h-4l-2-3H2"/>' +
        '<path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 18.4 4H5.6a2 2 0 0 0-1.8 1.1z"/>';
    } else if (kind === "csat") {
      return smileySvg("positive").replace(
        'class="rsm-voc-smiley"',
        'class="rsm-voc-participation-icon"'
      );
    } else if (kind === "voice") {
      paths =
        '<path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z"/>' +
        '<path d="M19 11a7 7 0 0 1-14 0"/>' +
        '<path d="M12 18v3"/><path d="M8 21h8"/>';
    } else {
      paths =
        '<path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>' +
        '<path d="m9 12 2 2 4-4"/>';
    }
    return (
      '<svg class="rsm-voc-participation-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      paths +
      "</svg>"
    );
  }

  function metricKindIcon(kind) {
    var paths = "";
    if (kind === "csat") {
      return smileySvg("positive").replace(
        'class="rsm-voc-smiley"',
        'class="rsm-voc-metric-icon"'
      );
    }
    if (kind === "nps") {
      paths =
        '<path d="M4 10v4a2 2 0 0 0 2 2h2.5l3.5 3v-13L8.5 8H6a2 2 0 0 0-2 2z"/>' +
        '<path d="M15.5 8.5a4.5 4.5 0 0 1 0 7"/>' +
        '<path d="M18 6a7.5 7.5 0 0 1 0 12"/>';
    } else {
      paths = '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>';
    }
    return (
      '<svg class="rsm-voc-metric-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      paths +
      "</svg>"
    );
  }

  function renderSummaryCard(kind, payload) {
    if (kind === "csat") {
      return (
        '<article class="rsm-voc-summary-card" data-kind="csat">' +
        cardHead("csat", "CSAT", "Avg " + displayNumber(payload.score, 1) + "/5 · " + displayCount(payload.responseCount) + " ratings") +
        shareDonut(safePercent(payload.favorablePercent), "CSAT", COLORS.csat) +
        "</article>"
      );
    }
    if (kind === "ces") {
      return (
        '<article class="rsm-voc-summary-card" data-kind="ces">' +
        cardHead(
          "ces",
          "CES",
          "Avg " +
            displayNumber(payload.score, 1) +
            "/7 · " +
            safePercent(payload.favorablePercent) +
            "% favorable · " +
            displayCount(payload.responseCount) +
            " ratings"
        ) +
        cesGauge(payload.score, 1, 7) +
        "</article>"
      );
    }
    return (
      '<article class="rsm-voc-summary-card" data-kind="nps">' +
      cardHead(
        "nps",
        "NPS",
        "Score " + displayNumber(payload.score, 0) + " · " + displayCount(payload.responseCount) + " ratings"
      ) +
      shareDonut(safePercent(payload.promoterPercent), "NPS", COLORS.nps) +
      "</article>"
    );
  }

  function cardHead(kind, title, meta) {
    return (
      '<header class="rsm-voc-card-head"><h4>' +
      metricKindIcon(kind) +
      '<span class="rsm-voc-metric-label">' +
      escapeHtml(title) +
      "</span></h4><span class=\"rsm-voc-card-meta\">" +
      escapeHtml(meta) +
      "</span></header>"
    );
  }

  function shareDonut(percent, label, color) {
    var radius = 38;
    var stroke = 12;
    var circumference = 2 * Math.PI * radius;
    var filled = (percent / 100) * circumference;
    return (
      '<div class="rsm-voc-donut-wrap" role="img" aria-label="' +
      escapeHtml(label + " " + percent + "%") +
      '">' +
      '<svg class="rsm-voc-donut" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="' +
      radius +
      '" fill="none" stroke="' +
      COLORS.track +
      '" stroke-width="' +
      stroke +
      '"/>' +
      '<circle cx="50" cy="50" r="' +
      radius +
      '" fill="none" stroke="' +
      color +
      '" stroke-width="' +
      stroke +
      '" stroke-linecap="round" stroke-dasharray="' +
      filled +
      " " +
      circumference +
      '" transform="rotate(-90 50 50)"/>' +
      "</svg>" +
      '<div class="rsm-voc-donut-center"><strong>' +
      percent +
      "%</strong><span>" +
      escapeHtml(label) +
      "</span></div></div>"
    );
  }

  function cesGauge(value, min, max) {
    var score = Number(value);
    var hasScore = Number.isFinite(score);
    var percent = hasScore
      ? Math.max(0, Math.min(100, ((score - min) / (max - min)) * 100))
      : 0;
    // Metric identity color (CES grey) — never score-based green/blue.
    var fill = "#888b8d";
    var displayValue = hasScore ? score.toFixed(1) + "/" + max : "—";
    var ariaLabel = hasScore
      ? "CES average " + score.toFixed(1) + " out of " + max
      : "CES no data";
    var radius = 38;
    var stroke = 12;
    var cx = 50;
    var cy = 50;
    var left = cx - radius;
    var right = cx + radius;
    var arcLength = Math.PI * radius;
    var filled = (percent / 100) * arcLength;
    var arcPath = "M " + left + " " + cy + " A " + radius + " " + radius + " 0 0 1 " + right + " " + cy;

    return (
      '<div class="rsm-voc-ces-gauge" role="img" aria-label="' +
      escapeHtml(ariaLabel) +
      '">' +
      '<div class="rsm-voc-ces-chart" aria-hidden="true">' +
      '<svg viewBox="0 0 100 58" focusable="false">' +
      '<path d="' +
      arcPath +
      '" fill="none" stroke="' +
      COLORS.track +
      '" stroke-width="' +
      stroke +
      '" stroke-linecap="round"/>' +
      (percent > 0
        ? '<path class="rsm-voc-ces-fill" d="' +
          arcPath +
          '" fill="none" stroke="' +
          fill +
          '" stroke-width="' +
          stroke +
          '" stroke-linecap="round" stroke-dasharray="' +
          filled +
          " " +
          arcLength +
          '"/>'
        : "") +
      "</svg>" +
      '<div class="rsm-voc-ces-score"><strong>' +
      displayValue +
      '</strong><span>Avg ease score</span></div>' +
      "</div>" +
      '<div class="rsm-voc-ces-footer" aria-hidden="true">' +
      '<div class="rsm-voc-ces-scale-min"><span>' +
      min +
      '</span><small>Difficult</small></div>' +
      '<div class="rsm-voc-ces-scale-max"><span>' +
      max +
      '</span><small>Easy</small></div>' +
      "</div></div>"
    );
  }

  function renderMethodologyColumn(kind) {
    var def = METHODOLOGY[kind];
    if (!def) return "";

    return (
      '<div class="rsm-voc-breakdown-col" data-kind="' +
      escapeHtml(kind) +
      '">' +
      '<div class="rsm-voc-method-copy">' +
      "<h4>" +
      escapeHtml(def.title) +
      "</h4>" +
      '<p class="rsm-voc-method-sub">' +
      escapeHtml(def.subtitle) +
      "</p>" +
      '<span class="rsm-voc-method-link">' +
      escapeHtml(def.scaleTitle) +
      "</span>" +
      "</div>" +
      '<div class="rsm-voc-method-scale">' +
      renderMethodologyScaleIcons(def.cells, kind === "nps") +
      renderMethodologyScaleBar(def.bar, def.barVariant) +
      "</div></div>"
    );
  }

  function renderMethodologyScaleIcons(cells, isNps) {
    var iconsClass = isNps
      ? "rsm-voc-scale-icons rsm-voc-scale-icons-nps"
      : "rsm-voc-scale-icons";
    var html = "";

    cells.forEach(function (cell) {
      var segmentAttr = isNps ? ' data-segment="' + cell.tone + '"' : "";
      html +=
        '<div class="rsm-voc-scale-cell" data-tone="' +
        cell.tone +
        '"' +
        segmentAttr +
        ">" +
        smileySvg(methodologySmileyTone(cell.tone)) +
        "<span>" +
        escapeHtml(cell.label) +
        "<br />(" +
        escapeHtml(cell.rating) +
        ")</span></div>";
    });

    return '<div class="' + iconsClass + '">' + html + "</div>";
  }

  function renderMethodologyScaleBar(segments, variant) {
    var barClass =
      variant === "compact"
        ? "rsm-voc-scale-bar rsm-voc-scale-bar-compact"
        : "rsm-voc-scale-bar";
    var html = "";

    segments.forEach(function (segment) {
      html +=
        '<span data-rating="' +
        escapeHtml(segment.rating) +
        '" style="background:' +
        segment.color +
        '">' +
        escapeHtml(segment.rating) +
        "</span>";
    });

    return '<div class="' + barClass + '" aria-hidden="true">' + html + "</div>";
  }

  function methodologySmileyTone(tone) {
    if (tone === "positive") return "positive";
    if (tone === "neutral") return "neutral";
    return "negative";
  }

  function smileySvg(tone) {
    var mouth = "";
    if (tone === "very-positive") {
      mouth =
        '<path d="M20 24c3-4 8-4 12 0M32 24c4-4 9-4 12 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M20 42c6 8 18 8 24 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
    } else if (tone === "positive") {
      mouth =
        '<circle cx="23" cy="27" r="3" fill="currentColor"/><circle cx="41" cy="27" r="3" fill="currentColor"/>' +
        '<path d="M22 40c5 6 15 6 20 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
    } else if (tone === "neutral") {
      mouth =
        '<circle cx="23" cy="27" r="3" fill="currentColor"/><circle cx="41" cy="27" r="3" fill="currentColor"/>' +
        '<path d="M22 41h20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
    } else {
      mouth =
        '<circle cx="23" cy="27" r="3" fill="currentColor"/><circle cx="41" cy="27" r="3" fill="currentColor"/>' +
        '<path d="M22 44c5-6 15-6 20 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
    }
    return (
      '<svg class="rsm-voc-smiley" viewBox="0 0 64 64" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" stroke-width="3"/>' +
      mouth +
      "</svg>"
    );
  }

  function renderThemes(themes) {
    if (!themes.length) return "";
    return (
      '<section class="rsm-voc-themes" aria-label="Client themes">' +
      "<h3>What clients are highlighting</h3>" +
      '<div class="rsm-voc-theme-grid">' +
      themes
        .map(function (theme) {
          var label = theme.label || "Theme";
          var summary = theme.summary || "";
          var mentions = safeCount(theme.mentions);
          return (
            '<article class="rsm-voc-theme-card" data-sentiment="' +
            escapeHtml(theme.sentiment || "neutral") +
            '">' +
            "<header><h4>" +
            escapeHtml(label) +
            "</h4><em>" +
            escapeHtml(theme.sentiment || "neutral") +
            "</em></header>" +
            "<p>" +
            escapeHtml(summary) +
            "</p>" +
            (mentions
              ? "<footer>" + displayCount(mentions) + " mentions</footer>"
              : "") +
            "</article>"
          );
        })
        .join("") +
      "</div></section>"
    );
  }

  function installStyles() {
    if (document.getElementById("rsm-voc-widget-styles")) return;
    var style = document.createElement("style");
    style.id = "rsm-voc-widget-styles";
    style.textContent =
      '@font-face{font-family:Prelo;src:url("https://www.rsm.global/kuwait/profiles/rsm_global_platform/themes/rsm_global_platform_2022/fonts/Prelo-Book.woff2") format("woff2");font-weight:300;font-style:normal;font-display:swap}' +
      '@font-face{font-family:Prelo;src:url("https://www.rsm.global/kuwait/profiles/rsm_global_platform/themes/rsm_global_platform_2022/fonts/Prelo-Medium.woff2") format("woff2");font-weight:400;font-style:normal;font-display:swap}' +
      '@font-face{font-family:Prelo;src:url("https://www.rsm.global/kuwait/profiles/rsm_global_platform/themes/rsm_global_platform_2022/fonts/Prelo-Bold.woff2") format("woff2");font-weight:700;font-style:normal;font-display:swap}' +
      '[data-rsm-voc-widget]{--navy:#00153d;--blue:#009cde;--green:#3f9c35;--grey:#888b8d;--charcoal:#231f20;--body-text:#63666a;--border:#d1d3d4;font-family:Prelo,sans-serif;color:var(--charcoal)}' +
      ".rsm-voc-shell{max-width:1040px;padding:20px;background:#fff;border:1px solid var(--border);border-top:3px solid var(--green);border-radius:4px;box-shadow:0 2px 8px rgba(0,21,61,.06)}" +
      ".rsm-voc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.rsm-voc-head>div{display:flex;align-items:center;gap:12px}.rsm-voc-head>div>span{display:grid;gap:2px}.rsm-voc-head strong{font-size:14px;color:var(--charcoal)}.rsm-voc-head small,.rsm-voc-head em{color:var(--body-text);font-size:11px;font-style:normal;font-weight:600}.rsm-voc-logo{display:block;height:34px;width:auto;max-width:120px;object-fit:contain}" +
      ".rsm-voc-metrics-overview{display:grid;gap:12px}" +
      ".rsm-voc-metrics-heading{display:grid;gap:4px}.rsm-voc-metrics-kicker{display:block;color:var(--green);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.rsm-voc-metrics-heading h2{margin:0;color:var(--charcoal);font-size:18px;font-weight:800;line-height:1.2}" +
      ".rsm-voc-participation{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.rsm-voc-participation-card{display:flex;align-items:center;gap:12px;min-width:0;padding:14px 16px;background:#f8fafb;border:1px solid var(--border);border-radius:10px}.rsm-voc-participation-voice{background:#ebf5ea;border-color:#d4e8d1}.rsm-voc-participation-voice .rsm-voc-participation-icon{color:var(--green)}.rsm-voc-participation-completion{background:#e5f5fc;border-color:#c8e8f7}.rsm-voc-participation-completion .rsm-voc-participation-icon{color:var(--blue)}.rsm-voc-participation-icon{width:24px;height:24px;flex-shrink:0;color:var(--charcoal)}.rsm-voc-participation-copy{display:grid;gap:2px;min-width:0}.rsm-voc-participation-label{color:var(--body-text);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.rsm-voc-participation-value{color:var(--charcoal);font-size:23px;font-weight:500;line-height:1;letter-spacing:-.03em}.rsm-voc-participation-detail{color:var(--body-text);font-size:10px;font-weight:600;line-height:1.35}" +
      ".rsm-voc-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.rsm-voc-summary:not([data-layout=all]){grid-template-columns:minmax(0,320px)}" +
      ".rsm-voc-summary-card{display:grid;gap:10px;min-width:0;padding:16px 14px;background:#fff;border:1px solid #e3ebf1;border-radius:12px;box-shadow:0 8px 22px rgba(0,21,61,.04)}" +
      ".rsm-voc-card-head{display:grid;gap:4px}.rsm-voc-card-head h4{display:flex;align-items:center;gap:10px;margin:0;color:var(--charcoal);font-size:21px;font-weight:800;line-height:1.15;letter-spacing:.03em;text-transform:uppercase}.rsm-voc-metric-icon{width:28px;height:28px;flex-shrink:0;color:var(--charcoal)}.rsm-voc-summary-card[data-kind=csat] .rsm-voc-metric-icon,.rsm-voc-summary-card[data-kind=csat] .rsm-voc-donut-center strong{color:var(--green)}.rsm-voc-summary-card[data-kind=ces] .rsm-voc-metric-icon,.rsm-voc-summary-card[data-kind=ces] .rsm-voc-ces-score strong{color:var(--grey)}.rsm-voc-summary-card[data-kind=nps] .rsm-voc-metric-icon,.rsm-voc-summary-card[data-kind=nps] .rsm-voc-donut-center strong{color:var(--blue)}.rsm-voc-metric-label{display:inline-block}.rsm-voc-card-meta{color:var(--body-text);font-size:11px;font-weight:700;line-height:1.35}" +
      ".rsm-voc-donut-wrap{position:relative;display:grid;place-items:center;min-height:132px;margin:0 auto;width:min(100%,200px);padding:4px 0 14px}" +
      ".rsm-voc-donut{display:block;width:100%;height:auto;overflow:visible}.rsm-voc-donut-center{position:absolute;inset:0;display:grid;place-content:center;gap:1px;text-align:center;pointer-events:none}.rsm-voc-donut-center strong{color:var(--green);font-size:23px;font-weight:800;line-height:1;letter-spacing:-.04em}.rsm-voc-donut-center span{color:var(--body-text);font-size:11px;font-weight:700}" +
      ".rsm-voc-ces-gauge{display:grid;gap:0;width:100%;max-width:280px;margin:0 auto;padding:4px 0 14px}.rsm-voc-ces-chart{position:relative;display:block;width:min(100%,220px);margin:0 auto}.rsm-voc-ces-chart svg{display:block;width:100%;height:auto;overflow:visible}.rsm-voc-ces-fill{stroke:#888b8d!important}.rsm-voc-ces-score{position:absolute;left:50%;top:62%;transform:translate(-50%,-50%);display:grid;gap:1px;text-align:center;pointer-events:none}.rsm-voc-ces-footer{display:grid;grid-template-columns:1fr 1fr;align-items:end;gap:8px;margin-top:2px;padding:0 8px}.rsm-voc-ces-scale-min,.rsm-voc-ces-scale-max{display:grid;gap:1px;color:var(--body-text);line-height:1.1}.rsm-voc-ces-scale-min{text-align:left}.rsm-voc-ces-scale-max{text-align:right}.rsm-voc-ces-scale-min span,.rsm-voc-ces-scale-max span{font-size:12px;font-weight:800}.rsm-voc-ces-scale-min small,.rsm-voc-ces-scale-max small{font-size:9px;font-weight:600;letter-spacing:.03em;text-transform:uppercase}.rsm-voc-ces-score strong{color:var(--grey);font-size:26px;font-weight:800;line-height:1;letter-spacing:-.04em}.rsm-voc-ces-score span{color:var(--body-text);font-size:11px;font-weight:700;line-height:1.1}" +
      ".rsm-voc-breakdown{display:grid;gap:10px;margin-top:14px;padding:14px;background:#f8fafb;border:1px solid var(--border);border-radius:12px}.rsm-voc-breakdown>h3{margin:0;color:var(--body-text);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}" +
      ".rsm-voc-breakdown-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;align-items:stretch}.rsm-voc-breakdown-grid:not([data-layout=all]){grid-template-columns:minmax(0,1fr)}" +
      ".rsm-voc-breakdown-col{display:flex;flex-direction:column;min-width:0;min-height:100%;padding:0 14px}.rsm-voc-breakdown-col:not(:last-child){border-right:1px solid var(--border)}.rsm-voc-method-copy{flex:0 0 auto}.rsm-voc-breakdown-col h4{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;text-align:left}.rsm-voc-breakdown-col[data-kind=csat] h4{color:var(--green)}.rsm-voc-breakdown-col[data-kind=ces] h4{color:var(--grey)}.rsm-voc-breakdown-col[data-kind=nps] h4{color:var(--blue)}" +
      ".rsm-voc-method-scale{margin-top:auto;display:grid;gap:8px;padding-top:12px;width:100%}" +
      ".rsm-voc-method-sub{margin:0 0 8px;color:var(--body-text);font-size:10px;font-weight:600;line-height:1.4}.rsm-voc-method-link{display:block;margin:0;color:var(--green);font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}" +
      ".rsm-voc-scale-icons{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;align-items:start;min-height:74px}.rsm-voc-scale-icons-nps{display:flex;gap:4px;align-items:start;min-height:74px}.rsm-voc-scale-icons-nps .rsm-voc-scale-cell[data-segment=positive]{flex:2}.rsm-voc-scale-icons-nps .rsm-voc-scale-cell[data-segment=neutral]{flex:2}.rsm-voc-scale-icons-nps .rsm-voc-scale-cell[data-segment=negative]{flex:7}.rsm-voc-scale-cell{display:grid;gap:4px;justify-items:center;align-content:start;text-align:center;min-width:0;grid-template-rows:auto 1fr}.rsm-voc-scale-cell[data-tone=positive]{--scale-tone:#3f9c35}.rsm-voc-scale-cell[data-tone=neutral]{--scale-tone:#009cde}.rsm-voc-scale-cell[data-tone=negative]{--scale-tone:#9e9e9e}.rsm-voc-scale-cell .rsm-voc-smiley{width:26px;height:26px;color:var(--scale-tone)}.rsm-voc-scale-cell>span{display:block;min-height:2.8em;color:var(--scale-tone);font-size:9px;font-weight:700;line-height:1.25}" +
      ".rsm-voc-scale-bar{display:flex;overflow:hidden;border-radius:3px;margin-top:0}.rsm-voc-scale-bar>span{flex:1;display:grid;place-items:center;min-height:20px;color:#fff;font-size:10px;font-weight:700}.rsm-voc-scale-bar-compact>span{font-size:8px}" +
      ".rsm-voc-themes{display:grid;gap:10px;margin-top:14px;padding:14px;background:#fff;border:1px solid #e3ebf1;border-radius:12px}.rsm-voc-themes>h3{margin:0;color:var(--body-text);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}" +
      ".rsm-voc-theme-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.rsm-voc-theme-card{display:grid;gap:6px;min-width:0;padding:12px;background:#f8fafb;border:1px solid #e8edf0;border-radius:10px}.rsm-voc-theme-card header{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.rsm-voc-theme-card h4{margin:0;color:var(--charcoal);font-size:12px;font-weight:800;line-height:1.25}.rsm-voc-theme-card em{flex:0 0 auto;color:var(--body-text);font-size:9px;font-weight:800;font-style:normal;letter-spacing:.05em;text-transform:uppercase}.rsm-voc-theme-card[data-sentiment=positive] em{color:#2f7d32}.rsm-voc-theme-card[data-sentiment=negative] em{color:#9d3040}.rsm-voc-theme-card p{margin:0;color:var(--charcoal);font-size:11px;line-height:1.45;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}.rsm-voc-theme-card footer{color:var(--green);font-size:10px;font-weight:700}" +
      ".rsm-voc-shell footer{margin-top:13px;color:#788697;font-size:9px}.rsm-voc-loading,.rsm-voc-error{max-width:420px;padding:18px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;font:13px system-ui}" +
      "@media(max-width:760px){.rsm-voc-participation,.rsm-voc-summary,.rsm-voc-breakdown-grid,.rsm-voc-theme-grid{grid-template-columns:1fr}.rsm-voc-breakdown-col{padding:0 0 14px}.rsm-voc-breakdown-col:not(:last-child){border-right:none;border-bottom:1px solid var(--border);margin-bottom:14px}.rsm-voc-shell{padding:15px}.rsm-voc-head em{display:none}}";
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
    return Number.isFinite(number) ? number.toFixed(precision) : "—";
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
