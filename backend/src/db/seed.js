import { pool } from './index.js';

// Fester Key statt Zufall: dokumentierbar in der README, überlebt jeden db-reset.
// Nur Buchstaben ohne 0/O/1/I — Ziffern werden beim Abtippen verwechselt (vgl. utils/keys.js)
const DEV_PROJECT = { name: 'Dev-Projekt', tn_key: 'TN-DEVKEY', an_key: 'AN-DEVKEY' };

export async function seedDev() {
  if (process.env.SEED_DEV !== 'true') return;
  await pool.query(
    `INSERT INTO projects (name, tn_key, an_key) VALUES ($1, $2, $3)
     ON CONFLICT (tn_key) DO NOTHING`,
    [DEV_PROJECT.name, DEV_PROJECT.tn_key, DEV_PROJECT.an_key]
  );
  console.log(`✓ Dev-Projekt bereit — Teilnehmer-Key: ${DEV_PROJECT.tn_key}`);
}
