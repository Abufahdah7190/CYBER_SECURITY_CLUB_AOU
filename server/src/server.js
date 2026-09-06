'use strict';

const app = require('./app');
const env = require('./config/env');
const { run: runMigrations } = require('./db/migrate');

async function start() {
  try {
    console.log('Applying database migrations...');
    await runMigrations();
    console.log('Database migrations up to date.');
  } catch (error) {
    // Log loudly but don't take the whole site down over a migration
    // problem — the rest of the app can keep serving while this gets
    // fixed. Whatever depends on the missing schema change will keep
    // failing (visibly, in the logs) until the next successful deploy.
    console.error('Migration failed on startup:', error.message);
  }

  app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });
}

start();
