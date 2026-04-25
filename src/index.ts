import { mockNews } from '../lib/mock/news';
import { sectors } from '../lib/config/sectors';

const DEFAULT_SECTOR_ID = 'banking-financial-services';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildDashboardHtml(): string {
  const options = sectors
    .map(
      (sector) =>
        `<option value="${escapeHtml(sector.id)}"${sector.id === DEFAULT_SECTOR_ID ? ' selected' : ''}>${escapeHtml(sector.label)}</option>`,
    )
    .join('');

  const sectorsPayload = JSON.stringify(sectors);
  const newsPayload = JSON.stringify(mockNews);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>India Sectoral News Dashboard</title>
  <style>
    body { margin:0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:#f8fafc; color:#0f172a; }
    .wrap { max-width:1100px; margin:0 auto; padding:24px 16px; }
    .panel { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 1px 3px rgba(15,23,42,.06); }
    .row { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; }
    h1 { margin:0; font-size:30px; line-height:1.2; }
    .sub { margin-top:6px; color:#475569; }
    .controls { display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; }
    select, button { height:42px; border-radius:10px; border:1px solid #cbd5e1; background:#fff; padding:0 12px; font-size:14px; }
    button[disabled] { background:#f1f5f9; color:#94a3b8; }
    .meta { font-size:12px; color:#64748b; padding-bottom:8px; }
    .main { margin-top:16px; }
    .title { margin:0 0 4px; font-size:22px; }
    .desc { margin:0 0 16px; color:#475569; font-size:14px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:14px; }
    .card { border:1px solid #e2e8f0; border-radius:12px; padding:16px; transition:all .2s ease; background:#fff; }
    .card:hover { transform:translateY(-1px); box-shadow:0 6px 14px rgba(15,23,42,.08); }
    .muted { color:#64748b; font-size:12px; display:flex; justify-content:space-between; gap:8px; }
    .badge { display:inline-block; border-radius:999px; border:1px solid #cbd5e1; background:#f8fafc; padding:2px 10px; font-size:12px; margin:10px 0; }
    .headline { margin:0; font-size:16px; }
    .summary { color:#475569; font-size:14px; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:42px; }
    .link { font-size:14px; color:#334155; text-decoration:none; }
    .empty { text-align:center; border:1px dashed #cbd5e1; border-radius:14px; padding:28px; color:#64748b; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="panel">
      <div class="row">
        <div>
          <h1>India Sectoral News Dashboard</h1>
          <p class="sub">Indian sector-wise news monitor</p>
        </div>
        <div class="controls">
          <label>
            <div style="font-size:12px;color:#334155;margin-bottom:6px;">Sector</div>
            <select id="sector">${options}</select>
          </label>
          <button disabled>Refresh</button>
          <div class="meta">Last updated: --</div>
        </div>
      </div>
    </section>

    <section class="panel main">
      <h2 class="title" id="sector-title"></h2>
      <p class="desc" id="sector-desc"></p>
      <div id="news-root"></div>
    </section>
  </main>

  <script>
    const sectors = ${sectorsPayload};
    const news = ${newsPayload};
    const badgeColor = {
      Positive: '#dcfce7',
      Negative: '#fee2e2',
      Neutral: '#e2e8f0',
      Policy: '#e0e7ff',
      'Global Spillover': '#fef3c7'
    };

    const select = document.getElementById('sector');
    const title = document.getElementById('sector-title');
    const desc = document.getElementById('sector-desc');
    const root = document.getElementById('news-root');

    function escapeHtml(value) {
      return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function render(sectorId) {
      const sector = sectors.find((s) => s.id === sectorId);
      const items = news.filter((n) => n.sectorId === sectorId).slice(0, 6);
      title.textContent = sector ? sector.label : 'Unknown Sector';
      desc.textContent = sector ? sector.description : '';

      if (!items.length) {
        root.innerHTML = '<div class="empty"><div style="font-weight:600;color:#334155;margin-bottom:6px;">No headlines available</div><div>Select another sector from the dropdown to view sector-specific mock updates.</div></div>';
        return;
      }

      root.innerHTML = `<div class="grid">${items
        .map(
          (item) => `<article class="card">
            <div class="muted"><span>${escapeHtml(item.source)}</span><span>${new Date(item.publishedAt).toLocaleString('en-IN')}</span></div>
            <span class="badge" style="background:${badgeColor[item.impact] || '#f1f5f9'}">${escapeHtml(item.impact)}</span>
            <h3 class="headline">${escapeHtml(item.headline)}</h3>
            <p class="summary">${escapeHtml(item.summary)}</p>
            <a class="link" href="#" target="_blank" rel="noreferrer">Open source ↗</a>
          </article>`,
        )
        .join('')}</div>`;
    }

    select.addEventListener('change', (event) => render(event.target.value));
    render(select.value);
  </script>
</body>
</html>`;
}

export default {
  fetch(): Response {
    return new Response(buildDashboardHtml(), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
} satisfies ExportedHandler;
