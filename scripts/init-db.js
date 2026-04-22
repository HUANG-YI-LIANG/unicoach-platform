const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

async function initDb() {
  const dbPath = path.join(__dirname, '../database.sqlite');
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('Opened database...');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      level INTEGER DEFAULT 1,
      is_frozen BOOLEAN DEFAULT 0,
      address TEXT,
      language TEXT DEFAULT '中文',
      learning_goals TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coaches (
      user_id INTEGER PRIMARY KEY,
      university TEXT,
      location TEXT,
      service_areas TEXT,
      languages TEXT,
      experience TEXT,
      philosophy TEXT,
      target_audience TEXT,
      available_times TEXT,
      base_price INTEGER NOT NULL DEFAULT 1000,
      photos TEXT,
      approval_status TEXT CHECK(approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      bio TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS coach_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      price INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      is_default BOOLEAN DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS coach_availability_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      slot_minutes INTEGER NOT NULL DEFAULT 30,
      is_active BOOLEAN DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS coach_availability_exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      exception_date TEXT NOT NULL,
      exception_type TEXT NOT NULL CHECK(exception_type IN ('available', 'unavailable')),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS video_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(video_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      coach_id INTEGER NOT NULL,
      expected_time DATETIME NOT NULL,
      base_price INTEGER NOT NULL,
      discount_amount INTEGER DEFAULT 0,
      final_price INTEGER NOT NULL,
      deposit_paid INTEGER DEFAULT 0,
      coach_payout INTEGER NOT NULL,
      payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
      payment_method TEXT,
      payment_reference TEXT,
      paid_at DATETIME,
      amount_total INTEGER,
      amount_deposit INTEGER,
      status TEXT CHECK(status IN ('pending_payment', 'scheduled', 'in_progress', 'pending_completion', 'completed', 'disputed', 'cancelled', 'refunded')) DEFAULT 'pending_payment',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      series_id TEXT,
      recurrence_pattern TEXT,
      session_number INTEGER,
      duration_minutes INTEGER DEFAULT 60,
      payment_expires_at DATETIME,
      plan_id TEXT,
      plan_title TEXT,
      plan_snapshot TEXT,
      settlement_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (coach_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      user_id INTEGER NOT NULL,
      coach_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (coach_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_system BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      reviewee_id INTEGER NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(booking_id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS learning_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL UNIQUE,
      coach_id INTEGER NOT NULL,
      completed_items TEXT NOT NULL,
      focus_score INTEGER CHECK(focus_score >= 1 AND focus_score <= 5),
      cooperation_score INTEGER CHECK(cooperation_score >= 1 AND cooperation_score <= 5),
      completion_score INTEGER CHECK(completion_score >= 1 AND completion_score <= 5),
      understanding_score INTEGER CHECK(understanding_score >= 1 AND understanding_score <= 5),
      observation TEXT,
      suggestions TEXT,
      ai_draft_observation TEXT,
      ai_draft_suggestions TEXT,
      ai_generated_at DATETIME,
      ai_model TEXT,
      ai_prompt_snapshot TEXT,
      ai_applied_at DATETIME,
      media_urls TEXT,
      progress_level TEXT CHECK(progress_level IN ('obvious', 'slight', 'none', 'needs_improvement')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (coach_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settlement_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      coach_id INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      booking_count INTEGER DEFAULT 0,
      status TEXT CHECK(status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT CHECK(type IN ('first_booking', 'referral', 'level')) NOT NULL,
      discount_percent INTEGER NOT NULL,
      max_amount INTEGER NOT NULL,
      valid_until DATETIME,
      used_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referee_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('pending', 'successful')) DEFAULT 'pending',
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS terms_consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      terms_version TEXT NOT NULL,
      consented_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  console.log('Created tables.');

  const hash = await bcrypt.hash('123456', 10);
  
  try {
    await db.run(`
      INSERT INTO users (email, password, name, phone, role) 
      VALUES ('admin@test.com', ?, 'System Admin', '0912345678', 'admin')
    `, [hash]);

    const coachRes = await db.run(`
      INSERT INTO users (email, password, name, phone, role) 
      VALUES ('coach@test.com', ?, 'Test Coach', '0987654321', 'coach')
    `, [hash]);

    await db.run(`
      INSERT INTO coaches (user_id, university, location, service_areas, languages, experience, philosophy, target_audience, available_times, base_price, commission_rate)
      VALUES (?, 'NTU', 'Taipei', 'Taipei, New Taipei', 'Mandarin, English', '3 years teaching', 'Fun and learn', 'Beginners', 'Weekends', 1000, 45)
    `, [coachRes.lastID]);

    await db.run(`
      INSERT INTO users (email, password, name, phone, role) 
      VALUES ('user@test.com', ?, 'Test User', '0911222333', 'user')
    `, [hash]);

    console.log('Inserted default demo accounts (admin@test.com, coach@test.com, user@test.com) pw: 123456');
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log('Demo accounts already exist.');
    } else {
      console.error(err);
    }
  }

  await db.close();
  console.log('Database initialized successfully.');
}

initDb().catch(console.error);
