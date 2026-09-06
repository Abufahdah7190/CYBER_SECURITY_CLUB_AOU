'use strict';

/**
 * Minimal migration runner.
 *
 * Applies every .sql file in db/migrations/, in filename order, exactly
 * once. Already-applied migrations are tracked in a `schema_migrations`
 * table so re-running this script (e.g. on every deploy) is always safe.
 *
 * `run()` is also imported by server.js so migrations apply automatically
 * on every boot — Render's free plan has no Shell access, so this is the
 * only reliable way to get a new migration file live without a paid plan.
 * Direct CLI usage (`node src/db/migrate.js`) still works for local/manual
 * runs and is the only path that closes the pool afterward.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'db', 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function run() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`apply ${file} ...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`ok    ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }

    console.log('All migrations applied.');
  } finally {
    client.release();
  }
}

module.exports = { run };

// Only when invoked directly (`npm run migrate` / `node src/db/migrate.js`)
// do we close the pool afterward — server.js keeps it open for the app.
if (require.main === module) {
  run()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
