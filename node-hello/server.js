const http = require('http');
const { Pool } = require('pg');

// Clever Cloud injects POSTGRESQL_ADDON_URI when the PG add-on is linked.
const pool = process.env.POSTGRESQL_ADDON_URI
  ? new Pool({ connectionString: process.env.POSTGRESQL_ADDON_URI, max: 2 })
  : null;

const server = http.createServer(async (req, res) => {
  const body = { message: 'hello clever cloud' };
  try {
    if (pool) {
      const { rows } = await pool.query('SELECT version() AS version, now() AS now');
      body.database = { connected: true, version: rows[0].version, now: rows[0].now };
    } else {
      body.database = { connected: false, reason: 'POSTGRESQL_ADDON_URI not set' };
    }
  } catch (err) {
    body.database = { connected: false, error: err.message };
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
});

server.listen(process.env.PORT || 8080, '0.0.0.0', () => {
  console.log(`listening on ${process.env.PORT || 8080}`);
});
