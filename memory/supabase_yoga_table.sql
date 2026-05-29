-- SQL to create the yoga_completions table in Supabase
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Create the yoga_completions table
CREATE TABLE IF NOT EXISTS yoga_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_id TEXT NOT NULL,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sequence_id, completed_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_yoga_completions_user_date 
  ON yoga_completions(user_id, completed_date);

-- Enable Row Level Security
ALTER TABLE yoga_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own completions
CREATE POLICY "Users can read own yoga completions" ON yoga_completions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert own yoga completions" ON yoga_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own completions
CREATE POLICY "Users can delete own yoga completions" ON yoga_completions
  FOR DELETE USING (auth.uid() = user_id);
