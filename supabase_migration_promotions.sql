-- Add commission_rate to coaches table (nullable, overrides global setting if set)
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS commission_rate INTEGER DEFAULT NULL;

-- Create user_notifications table for discounts and inbox messages
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- If NULL, applies to all users
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  discount_code TEXT,
  discount_percent INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE user_notifications
ADD COLUMN IF NOT EXISTS discount_percent INTEGER;

-- Drop policies if they exist to avoid errors
DROP POLICY IF EXISTS "Users can view their own notifications or global notifications" ON user_notifications;
DROP POLICY IF EXISTS "Admin can manage all notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;

-- RLS for user_notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications or global notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admin can manage all notifications"
  ON user_notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Update user_notifications so that users can mark as read
CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);
