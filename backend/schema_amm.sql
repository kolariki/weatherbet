-- AMM Migration: Add liquidity columns to markets and price_history table
-- Run this in Supabase SQL Editor

-- Add AMM liquidity columns to markets
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS yes_liquidity NUMERIC DEFAULT 1000;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS no_liquidity NUMERIC DEFAULT 1000;

-- Add shares column to positions (instead of just amount)
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS shares NUMERIC DEFAULT 0;
-- Status: active or sold
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Price history table — tracks price after every trade
CREATE TABLE IF NOT EXISTS public.price_history (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES public.markets(id) NOT NULL,
  yes_price NUMERIC NOT NULL,
  no_price NUMERIC NOT NULL,
  yes_liquidity NUMERIC NOT NULL,
  no_liquidity NUMERIC NOT NULL,
  trade_type TEXT, -- buy_yes, buy_no, sell_yes, sell_no
  trade_amount NUMERIC,
  trader_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for price_history
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Price history is public" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Service can insert price history" ON public.price_history FOR INSERT WITH CHECK (true);

-- Update existing markets to have initial liquidity
UPDATE public.markets SET yes_liquidity = 1000, no_liquidity = 1000 WHERE yes_liquidity IS NULL;

-- Update existing positions to have shares = amount (backward compat)
UPDATE public.positions SET shares = amount WHERE shares = 0 OR shares IS NULL;

-- Index for fast price history queries
CREATE INDEX IF NOT EXISTS idx_price_history_market ON public.price_history(market_id, created_at);
