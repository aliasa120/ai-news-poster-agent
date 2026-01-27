-- Feeder Permanent Storage Migration
-- Run this in Supabase SQL Editor to create the required tables

-- ============================================
-- Permanent GUIDs Table
-- Stores RSS GUIDs forever to prevent re-fetching same articles
-- ============================================
CREATE TABLE IF NOT EXISTS permanent_guids (
  guid TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_permanent_guids_created ON permanent_guids(created_at DESC);

-- ============================================
-- Permanent Hashes Table
-- Stores SHA256(title + source) for exact duplicate detection
-- ============================================
CREATE TABLE IF NOT EXISTS permanent_hashes (
  hash TEXT PRIMARY KEY,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_permanent_hashes_created ON permanent_hashes(created_at DESC);

-- ============================================
-- Permanent Titles Table
-- Stores article titles for AI-powered duplicate verification
-- ============================================
CREATE TABLE IF NOT EXISTS permanent_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for time-ordered queries (AI agents check latest 500)
CREATE INDEX IF NOT EXISTS idx_permanent_titles_published ON permanent_titles(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_permanent_titles_created ON permanent_titles(created_at DESC);

-- ============================================
-- Feeder Settings Table
-- Stores user preferences for the feeder system
-- ============================================
CREATE TABLE IF NOT EXISTS feeder_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Only one row allowed
  ai_provider TEXT DEFAULT 'groq',
  ai_model TEXT,
  enable_source_filter BOOLEAN DEFAULT true,
  include_official_sources BOOLEAN DEFAULT true,
  include_secondary_sources BOOLEAN DEFAULT true,
  max_check_titles INTEGER DEFAULT 500,
  enable_ai_verification BOOLEAN DEFAULT true,
  freshness_hours INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO feeder_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Row Level Security (RLS) Policies
-- Enable RLS for all tables
-- ============================================

-- GUIDs table - allow all operations (internal use only)
ALTER TABLE permanent_guids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on permanent_guids" ON permanent_guids FOR ALL USING (true);

-- Hashes table - allow all operations (internal use only)
ALTER TABLE permanent_hashes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on permanent_hashes" ON permanent_hashes FOR ALL USING (true);

-- Titles table - allow all operations (internal use only)
ALTER TABLE permanent_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on permanent_titles" ON permanent_titles FOR ALL USING (true);

-- Settings table - allow all operations (internal use only)
ALTER TABLE feeder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on feeder_settings" ON feeder_settings FOR ALL USING (true);

-- ============================================
-- Grant permissions to service role
-- ============================================
GRANT ALL ON permanent_guids TO service_role;
GRANT ALL ON permanent_hashes TO service_role;
GRANT ALL ON permanent_titles TO service_role;
GRANT ALL ON feeder_settings TO service_role;

-- Also grant to anon role for API access
GRANT ALL ON permanent_guids TO anon;
GRANT ALL ON permanent_hashes TO anon;
GRANT ALL ON permanent_titles TO anon;
GRANT ALL ON feeder_settings TO anon;
