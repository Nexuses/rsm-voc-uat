/* public/widget.js — embeddable RSM CSAT widget.
   Usage on any site:
     <div id="rsm-csat"></div>
     <script src="https://YOUR_APP/widget.js" data-api="https://YOUR_APP/api/public/csat"></script>
   Shows aggregate score, response count, distribution, and AI theme summaries.
   NEVER renders client identity or raw verbatims (the API doesn't return them).
*/
(function () {
  var script = document.currentScript;
  var api = script.getAttribute("data-api") || "/api/public/csat";
  var mount = document.getElementById("rsm-csat");
  if (!mount) {
    mount = document.createElement("div");
    document.body.appendChild(mount);
  }

  var css =
    "#rsm-csat-card{font-family:system-ui,-apple-system,sans-serif;max-width:420px;border:1px solid #e5e7eb;border-radius:14px;padding:20px;background:#fff;color:#111}" +
    "#rsm-csat-card h3{margin:0 0 4px;font-size:14px;color:#6b7280;font-weight:600;letter-spacing:.02em}" +
    "#rsm-csat-score{font-size:48px;font-weight:700;line-height:1}" +
    "#rsm-csat-score small{font-size:18px;color:#9ca3af;font-weight:500}" +
    "#rsm-csat-meta{font-size:13px;color:#6b7280;margin-top:6px}" +
    ".rsm-bar{height:8px;background:#f3f4f6;border-radius:6px;overflow:hidden;margin:4px 0}" +
    ".rsm-bar>div{height:100%;background:#4f46e5}" +
    ".rsm-theme{font-size:13px;margin-top:8px;padding-left:10px;border-left:3px solid #e5e7eb}" +
    ".rsm-theme.positive{border-color:#10b981}.rsm-theme.negative{border-color:#ef4444}";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  fetch(api)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var dist = d.distribution || {};
      var maxRating = 5;
      var bars = "";
      for (var i = maxRating; i >= 1; i--) {
        var n = dist[String(i)] || 0;
        var pct = d.totalResponses ? Math.round((n / d.totalResponses) * 100) : 0;
        bars +=
          '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#6b7280">' +
          "<span>" + i + "★</span>" +
          '<div class="rsm-bar" style="flex:1"><div style="width:' + pct + '%"></div></div>' +
          "<span>" + n + "</span></div>";
      }
      var themes = (d.themes || [])
        .map(function (t) {
          return '<div class="rsm-theme ' + (t.sentiment || "") + '">' + escapeHtml(t.summary) + "</div>";
        })
        .join("");

      mount.innerHTML =
        '<div id="rsm-csat-card">' +
        "<h3>CLIENT SATISFACTION · RSM IN KUWAIT</h3>" +
        '<div id="rsm-csat-score">' + (d.overallAvg ?? "–") + '<small>/5</small></div>' +
        '<div id="rsm-csat-meta">Based on ' + (d.totalResponses || 0) + " client responses</div>" +
        '<div style="margin:14px 0">' + bars + "</div>" +
        (themes ? '<div style="margin-top:10px">' + themes + "</div>" : "") +
        "</div>";
    })
    .catch(function () {
      mount.innerHTML = '<div id="rsm-csat-card">Unable to load satisfaction data.</div>';
    });

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
})();
