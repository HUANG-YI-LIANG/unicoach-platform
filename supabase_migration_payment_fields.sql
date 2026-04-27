-- Migration: add payment fields to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT;
