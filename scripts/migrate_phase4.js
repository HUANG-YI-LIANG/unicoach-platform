import { getDb } from '../lib/db.js';

async function migrate() {
  const db = await getDb();
  console.log('Running migration...');
  
  try {
    await db.exec(`
      ALTER TABLE bookings ADD COLUMN series_id TEXT;
      ALTER TABLE bookings ADD COLUMN recurrence_pattern TEXT;
      ALTER TABLE bookings ADD COLUMN session_number INTEGER;
    `);
    console.log('Migration successful: Added series_id, recurrence_pattern, session_number to bookings.');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('Columns already exist.');
    } else {
      console.error('Migration failed:', error);
    }
  }
}

migrate();
