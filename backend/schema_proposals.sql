-- Market proposals — users suggest markets, admins approve/reject
CREATE TABLE IF NOT EXISTS market_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other',
  closes_in_days INTEGER DEFAULT 30,
  proposed_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  market_id UUID REFERENCES markets(id), -- set when approved
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE market_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert proposals" ON market_proposals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = proposed_by);

CREATE POLICY "Users can view own proposals" ON market_proposals
  FOR SELECT TO authenticated
  USING (auth.uid() = proposed_by);

CREATE POLICY "Service role full access" ON market_proposals
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
