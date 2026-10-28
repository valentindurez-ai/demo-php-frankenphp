const http = require('http');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Clever Cloud hexagon mark, from CleverCloud/documentation static/images/logo.svg
const FAVICON = fs.readFileSync(path.join(__dirname, 'favicon.svg'));

// Clever Cloud injects POSTGRESQL_ADDON_URI when the PG add-on is linked.
const pool = process.env.POSTGRESQL_ADDON_URI
  ? new Pool({ connectionString: process.env.POSTGRESQL_ADDON_URI, max: 2 })
  : null;

async function status() {
  const body = { message: 'hello clever cloud' };
  try {
    if (pool) {
      const started = Date.now();
      const { rows } = await pool.query('SELECT version() AS version, now() AS now');
      body.database = {
        connected: true,
        version: rows[0].version,
        now: rows[0].now,
        latency_ms: Date.now() - started,
      };
    } else {
      body.database = { connected: false, reason: 'POSTGRESQL_ADDON_URI not set' };
    }
  } catch (err) {
    body.database = { connected: false, error: err.message };
  }
  return body;
}

const PAGE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hello Clever Cloud</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
  :root { --navy:#13172e; --navy2:#1f2547; --coral:#f9566a; --ok:#2bb673; --ko:#e5484d;
          --bg:#f4f5fa; --card:#fff; --text:#1b1e33; --muted:#6b7090; --line:#e4e6f0; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0d1022; --card:#171b35; --text:#eef0fa; --muted:#9aa0c0; --line:#2a2f52; }
  }
  * { box-sizing:border-box; margin:0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:var(--bg);
         color:var(--text); min-height:100vh; }
  header { background:linear-gradient(120deg,var(--navy),var(--navy2)); color:#fff; padding:20px 24px;
           display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid var(--coral); }
  .brand { font-weight:800; letter-spacing:.3px; display:flex; align-items:center; gap:10px; }
  .logo { display:block; width:28px; height:28px; }
  .tag { font-size:12px; opacity:.75; }
  main { max-width:760px; margin:0 auto; padding:48px 16px; }
  h1 { font-size:clamp(34px,7vw,60px); line-height:1.05; letter-spacing:-1px; }
  h1 span { color:var(--coral); }
  .sub { color:var(--muted); margin:14px 0 36px; font-size:17px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; }
  .label { font-size:12px; text-transform:uppercase; letter-spacing:1px; color:var(--muted); margin-bottom:8px; }
  .value { font-size:20px; font-weight:700; }
  .pill { display:inline-flex; align-items:center; gap:8px; }
  .pill i { width:10px; height:10px; border-radius:50%; background:var(--muted); }
  .ok i { background:var(--ok); box-shadow:0 0 0 0 #2bb67388; animation:pulse 2s infinite; }
  .ko i { background:var(--ko); }
  @keyframes pulse { 70% { box-shadow:0 0 0 10px #2bb67300; } 100% { box-shadow:0 0 0 0 #2bb67300; } }
  .wide { grid-column:1/-1; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size:13px; color:var(--muted);
          word-break:break-word; }
  footer { text-align:center; color:var(--muted); font-size:13px; padding:24px 16px 40px; }
  a { color:var(--coral); }
</style>
</head>
<body>
<header>
  <div class="brand"><img class="logo" src="/favicon.svg" alt="" width="28" height="28">Clever Cloud</div>
  <div class="tag">Node.js · PostgreSQL · Paris</div>
</header>
<main>
  <h1>Hello <span>Clever Cloud</span> 👋</h1>
  <p class="sub">Une app Node.js déployée depuis GitHub, connectée à sa base PostgreSQL managée.</p>
  <div class="grid">
    <div class="card"><div class="label">Base de données</div>
      <div class="value pill" id="db"><i></i><span>…</span></div></div>
    <div class="card"><div class="label">Latence requête</div><div class="value" id="lat">…</div></div>
    <div class="card"><div class="label">Heure du serveur PG</div><div class="value" id="now">…</div></div>
    <div class="card wide"><div class="label">Version</div><div class="mono" id="ver">…</div></div>
  </div>
</main>
<footer>Actualisé toutes les 5 s · JSON brut sur <a href="/api">/api</a></footer>
<script>
  async function refresh() {
    try {
      const r = await fetch('/api', { cache: 'no-store' });
      const d = (await r.json()).database || {};
      const db = document.getElementById('db');
      db.className = 'value pill ' + (d.connected ? 'ok' : 'ko');
      db.querySelector('span').textContent = d.connected ? 'Connectée' : 'Déconnectée';
      document.getElementById('lat').textContent = d.latency_ms != null ? d.latency_ms + ' ms' : '—';
      document.getElementById('now').textContent = d.now
        ? new Date(d.now).toLocaleTimeString('fr-BE', { timeZone: 'Europe/Brussels' }) : '—';
      document.getElementById('ver').textContent = d.version || d.error || d.reason || '—';
    } catch (e) {
      document.getElementById('ver').textContent = 'Erreur : ' + e.message;
    }
  }
  refresh(); setInterval(refresh, 5000);
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const route = (req.url || '/').split('?')[0];
  if (route === '/favicon.svg' || route === '/favicon.ico') {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
    res.end(FAVICON);
    return;
  }
  if (route === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(await status(), null, 2));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(PAGE);
});

server.listen(process.env.PORT || 8080, '0.0.0.0', () => {
  console.log(`listening on ${process.env.PORT || 8080}`);
});
