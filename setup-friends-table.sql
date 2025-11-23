-- ===================================
-- Create Friends Table for Split Expenses
-- ===================================
-- Run this SQL in your Supabase SQL Editor

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_email TEXT NOT NULL,
    friend_name TEXT,
    friend_user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_email)
);

-- Enable Row Level Security
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friends table
CREATE POLICY "Users can view own friends"
    ON friends FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add own friends"
    ON friends FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friends"
    ON friends FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own friends"
    ON friends FOR DELETE
    USING (auth.uid() = user_id);

-- Success message
SELECT 'Friends table created successfully!' as message;
