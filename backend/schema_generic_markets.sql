-- Generic markets support: add resolution_type and make weather fields optional
-- Run in Supabase SQL Editor

-- Add resolution_type column (auto = weather-resolved, manual = admin-resolved)
ALTER TABLE markets ADD COLUMN IF NOT EXISTS resolution_type TEXT DEFAULT 'auto';

-- Make weather-specific columns nullable (they already should be, but just in case)
ALTER TABLE markets ALTER COLUMN city DROP NOT NULL;
ALTER TABLE markets ALTER COLUMN country_code DROP NOT NULL;
ALTER TABLE markets ALTER COLUMN metric DROP NOT NULL;
ALTER TABLE markets ALTER COLUMN operator DROP NOT NULL;
ALTER TABLE markets ALTER COLUMN threshold DROP NOT NULL;

-- Add an image_url column for market thumbnails
ALTER TABLE markets ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update existing markets to 'auto' resolution type
UPDATE markets SET resolution_type = 'auto' WHERE resolution_type IS NULL;
