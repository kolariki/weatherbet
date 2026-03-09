-- Add wallet_address column to profiles for BETALL token integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON profiles (wallet_address);
