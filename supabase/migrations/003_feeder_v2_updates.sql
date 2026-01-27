-- Feeder Permanent Storage Migration v2
-- Updates to support new agentic architecture
-- Run this after 002_feeder_permanent_storage.sql

-- ============================================
-- Add source column to permanent_guids
-- ============================================
ALTER TABLE permanent_guids ADD COLUMN IF NOT EXISTS source TEXT;

-- ============================================
-- Add title column to permanent_hashes
-- ============================================
ALTER TABLE permanent_hashes ADD COLUMN IF NOT EXISTS title TEXT;

-- ============================================
-- Add batch_size to feeder_settings
-- ============================================
ALTER TABLE feeder_settings ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 50;

-- ============================================
-- Create index on permanent_titles title for text search
-- ============================================
CREATE INDEX IF NOT EXISTS idx_permanent_titles_title ON permanent_titles USING gin(to_tsvector('english', title));

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE permanent_guids IS 'Permanent storage of RSS GUIDs to prevent re-fetching same articles';
COMMENT ON TABLE permanent_hashes IS 'SHA256(title + source) hashes for exact duplicate detection';
COMMENT ON TABLE permanent_titles IS 'Article titles for AI-powered duplicate verification by sub-agents';
COMMENT ON TABLE feeder_settings IS 'User preferences for the feeder agent system';

COMMENT ON COLUMN permanent_guids.source IS 'Source name of the article';
COMMENT ON COLUMN permanent_hashes.title IS 'Original title for debugging/display';
COMMENT ON COLUMN feeder_settings.batch_size IS 'Number of existing titles each sub-agent checks (default 50)';
