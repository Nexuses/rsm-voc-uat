/*
  RSM in Kuwait public Voice of Client recent-reviews showcase widget.

  <div id="rsm-voc-reviews"></div>
  <script
    src="https://YOUR_APP/widget-reviews.js"
    data-api="https://YOUR_APP/api/public/reviews"
    data-target="rsm-voc-reviews"
  ></script>

  The public API supplies recent comments with optional respondent name and
  company attribution, plus scores. Email and phone are never included.
*/
(function () {
  "use strict";

  var LOGO_URL =
    "https://res.cloudinary.com/rsmglobal/image/fetch/t_default/f_auto/q_auto/https://www.rsm.global/kuwait/profiles/rsm_global_platform/themes/rsm_global_platform_2022/images/logo@2x.png";

  var script = resolveWidgetScript();
  var api = script
    ? script.getAttribute("data-api") || "/api/public/reviews"
    : "/api/public/reviews";
  var targetId = script
    ? script.getAttribute("data-target") || "rsm-voc-reviews"
    : "rsm-voc-reviews";
  var mount = document.getElementById(targetId);

  if (!mount) {
    mount = document.createElement("div");
    mount.id = targetId;
    document.body.appendChild(mount);
  }

  installStyles();
  mount.setAttribute("data-rsm-voc-reviews-widget", "true");
  mount.innerHTML =
    '<div class="rsm-voc-reviews-loading" role="status">Loading recent client feedback...</div>';

  fetch(api)
    .then(function (response) {
      if (!response.ok) throw new Error("Reviews request failed");
      return response.json();
    })
    .then(function (data) {
      var limit = Number(data.limit) || 12;
      var reviews = Array.isArray(data.reviews) ? data.reviews : [];
      var listHtml = reviews.length
        ? reviews.map(renderReviewCard).join("")
        : '<p class="rsm-voc-reviews-empty">No client feedback with comments is available yet.</p>';

      mount.innerHTML =
        '<section class="rsm-voc-reviews-shell" aria-label="RSM in Kuwait recent client feedback">' +
        '<header class="rsm-voc-reviews-head">' +
        '<div><img class="rsm-voc-reviews-logo" src="' +
        LOGO_URL +
        '" alt="RSM in Kuwait" width="120" height="40" />' +
        '<span><small>RSM in Kuwait</small><strong>Recent feedback</strong></span></div>' +
        "<em>Most recent" +
        (reviews.length
          ? " · " + escapeHtml(String(reviews.length)) + " of " + escapeHtml(String(limit))
          : "") +
        "</em>" +
        "</header>" +
        '<section class="rsm-voc-reviews-list" aria-label="Recent client reviews">' +
        listHtml +
        "</section>" +
        "<footer>Recent client feedback with name and company when available. Email and phone are never shown.</footer>" +
        "</section>";
    })
    .catch(function () {
      mount.innerHTML =
        '<div class="rsm-voc-reviews-error" role="alert">Recent feedback is temporarily unavailable.</div>';
    });

  function renderReviewCard(review) {
    var comment = review && review.comment ? String(review.comment) : "";
    var dateLabel = formatDate(review && review.date);
    var scores = renderScoreChips(review);
    var attribution = formatAttribution(review);

    return (
      '<article class="rsm-voc-review-card">' +
      '<p class="rsm-voc-review-comment">' +
      escapeHtml(comment) +
      "</p>" +
      (attribution
        ? '<p class="rsm-voc-review-attribution">' +
          escapeHtml(attribution) +
          "</p>"
        : "") +
      '<div class="rsm-voc-review-meta">' +
      scores +
      '<time datetime="' +
      escapeHtml(review && review.date ? String(review.date) : "") +
      '">' +
      escapeHtml(dateLabel) +
      "</time>" +
      "</div></article>"
    );
  }

  function formatAttribution(review) {
    var name =
      review && review.name && String(review.name).trim()
        ? String(review.name).trim()
        : "";
    var company =
      review && review.company && String(review.company).trim()
        ? String(review.company).trim()
        : "";
    if (name && company) return name + " · " + company;
    if (name) return name;
    if (company) return company;
    return "";
  }

  function renderScoreChips(review) {
    var chips = [];
    if (isScore(review && review.csat)) {
      chips.push(chip("CSAT", review.csat, "/5"));
    }
    if (isScore(review && review.ces)) {
      chips.push(chip("CES", review.ces, "/7"));
    }
    if (isScore(review && review.nps)) {
      chips.push(chip("NPS", review.nps, ""));
    }
    if (!chips.length) return "";
    return '<div class="rsm-voc-review-scores">' + chips.join("") + "</div>";
  }

  function chip(label, value, suffix) {
    var kind = String(label).toLowerCase();
    return (
      '<span class="rsm-voc-review-chip rsm-voc-review-chip-' +
      kind +
      '"><em>' +
      escapeHtml(label) +
      "</em> " +
      escapeHtml(formatScore(value)) +
      escapeHtml(suffix) +
      "</span>"
    );
  }

  function isScore(value) {
    var number = Number(value);
    return Number.isFinite(number);
  }

  function formatScore(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  function formatDate(value) {
    if (!value) return "";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    try {
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return date.toISOString().slice(0, 10);
    }
  }

  function installStyles() {
    if (document.getElementById("rsm-voc-reviews-widget-styles")) return;
    var style = document.createElement("style");
    style.id = "rsm-voc-reviews-widget-styles";
    style.textContent =
      '@font-face{font-family:Prelo;src:url("https://www.rsm.global/kuwait/profiles/rsm_global_platform/themes/rsm_global_platform_2022/fonts/Prelo-Book.woff2") format("woff2");font-weight:300;font-style:normal;font-display:swap}' +
      '@font-face{font-family:Prelo;src:url("https://www.rsm.global/kuwait/profiles/rsm_global_platform/themes/rsm_global_platform_2022/fonts/Prelo-Medium.woff2") format("woff2");font-weight:400;font-style:normal;font-display:swap}' +
      '@font-face{font-family:Prelo;src:url("https://www.rsm.global/kuwait/profiles/rsm_global_platform/themes/rsm_global_platform_2022/fonts/Prelo-Bold.woff2") format("woff2");font-weight:700;font-style:normal;font-display:swap}' +
      '[data-rsm-voc-reviews-widget]{--navy:#00153d;--blue:#009cde;--green:#3f9c35;--grey:#888b8d;--charcoal:#231f20;--body-text:#63666a;--border:#d1d3d4;font-family:Prelo,sans-serif;color:var(--charcoal)}' +
      ".rsm-voc-reviews-shell{max-width:1040px;padding:20px;background:#fff;border:1px solid var(--border);border-top:3px solid var(--blue);border-radius:4px;box-shadow:0 2px 8px rgba(0,21,61,.06)}" +
      ".rsm-voc-reviews-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.rsm-voc-reviews-head>div{display:flex;align-items:center;gap:12px}.rsm-voc-reviews-head>div>span{display:grid;gap:2px}.rsm-voc-reviews-head strong{font-size:14px;color:var(--charcoal)}.rsm-voc-reviews-head small,.rsm-voc-reviews-head em{color:var(--body-text);font-size:11px;font-style:normal;font-weight:600}.rsm-voc-reviews-logo{display:block;height:34px;width:auto;max-width:120px;object-fit:contain}" +
      ".rsm-voc-reviews-list{display:grid;gap:10px}" +
      ".rsm-voc-review-card{display:grid;gap:8px;padding:14px;background:#f8fafb;border:1px solid #e8edf0;border-radius:10px}" +
      ".rsm-voc-review-comment{margin:0;color:var(--charcoal);font-size:13px;line-height:1.5}" +
      ".rsm-voc-review-attribution{margin:0;color:var(--navy);font-size:12px;font-weight:700;line-height:1.35}" +
      ".rsm-voc-review-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}" +
      ".rsm-voc-review-scores{display:flex;flex-wrap:wrap;gap:6px}" +
      ".rsm-voc-review-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:#fff;border:1px solid #e3ebf1;border-radius:999px;color:var(--charcoal);font-size:11px;font-weight:700}.rsm-voc-review-chip em{font-style:normal;font-weight:800;letter-spacing:.04em}.rsm-voc-review-chip-csat em{color:#3f9c35}.rsm-voc-review-chip-ces em{color:#888b8d}.rsm-voc-review-chip-nps em{color:#009cde}" +
      ".rsm-voc-review-meta time{color:var(--body-text);font-size:11px;font-weight:600}" +
      ".rsm-voc-reviews-empty{margin:0;padding:18px;color:var(--body-text);background:#fff;border:1px dashed var(--border);border-radius:10px;font-size:13px;text-align:center}" +
      ".rsm-voc-reviews-shell footer{margin-top:13px;color:#788697;font-size:9px}.rsm-voc-reviews-loading,.rsm-voc-reviews-error{max-width:420px;padding:18px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;font:13px system-ui}" +
      "@media(max-width:760px){.rsm-voc-reviews-shell{padding:15px}.rsm-voc-reviews-head em{display:none}.rsm-voc-review-meta{align-items:flex-start;flex-direction:column}}";
    document.head.appendChild(style);
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
      if (
        candidate.src &&
        /\/widget-reviews\.js(?:\?|$)/.test(candidate.src)
      ) {
        return candidate;
      }
    }
    return null;
  }
})();
