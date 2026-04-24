/**
 * CLI database utilities.
 * Usage: tsx scripts/db.ts <command>
 *
 * Commands:
 *   reset-baseline   Delete the athlete baseline (forces re-onboarding)
 *   reset            Delete the entire database file
 *   stats            Show row counts for every table
 */
import { config as loadEnv } from 'dotenv';
loadEnv();

import Database from 'better-sqlite3';
import { existsSync, unlinkSync } from 'fs';

const DB_PATH = process.env.SQLITE_PATH ?? './data/strava-coach.db';
const command = process.argv[2];

const COMMANDS: Record<string, () => void> = {
  'reset-baseline': () => {
    const db = new Database(DB_PATH);
    const { changes } = db.prepare('DELETE FROM athlete_baseline').run();
    db.close();
    console.log(`✓ Baseline deleted (${changes} row${changes !== 1 ? 's' : ''})`);
  },

  'reset': () => {
    if (!existsSync(DB_PATH)) {
      console.log('Database file not found — nothing to delete.');
      return;
    }
    unlinkSync(DB_PATH);
    console.log(`✓ Database deleted: ${DB_PATH}`);
  },

  'stats': () => {
    const db = new Database(DB_PATH);
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all() as { name: string }[];

    console.log('\nTable stats:');
    for (const { name } of tables) {
      const { count } = db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get() as { count: number };
      console.log(`  ${name.padEnd(30)} ${count} rows`);
    }
    db.close();
  },
};

if (!command || !COMMANDS[command]) {
  console.error(`Usage: tsx scripts/db.ts <command>\nAvailable: ${Object.keys(COMMANDS).join(' | ')}`);
  process.exit(1);
}

COMMANDS[command]();
