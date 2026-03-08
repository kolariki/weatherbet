-- WeatherBet Schema for Supabase

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  balance_credits INTEGER DEFAULT 1000 NOT NULL,
  total_bets INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_profit INTEGER DEFAULT 0,
  last_daily_claim TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.markets (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  country_code TEXT DEFAULT 'MX',
  metric TEXT NOT NULL,
  operator TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  category TEXT DEFAULT 'temperature',
  status TEXT DEFAULT 'open',
  result BOOLEAN,
  resolved_value NUMERIC,
  yes_pool INTEGER DEFAULT 0,
  no_pool INTEGER DEFAULT 0,
  total_positions INTEGER DEFAULT 0,
  opens_at TIMESTAMPTZ DEFAULT NOW(),
  closes_at TIMESTAMPTZ NOT NULL,
  resolves_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.positions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  market_id INTEGER REFERENCES public.markets(id) NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  odds_at_entry NUMERIC DEFAULT 1.9,
  won BOOLEAN,
  payout INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  market_id INTEGER REFERENCES public.markets(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.weather_snapshots (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  country_code TEXT,
  metric TEXT,
  value NUMERIC,
  raw_data JSONB,
  api_source TEXT DEFAULT 'openweathermap',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Markets are viewable by everyone" ON public.markets FOR SELECT USING (true);
CREATE POLICY "Admins can create markets" ON public.markets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Markets updatable by service role" ON public.markets FOR UPDATE USING (true);

CREATE POLICY "Public profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role can update profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Service role can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own positions" ON public.positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Positions readable by service" ON public.positions FOR SELECT USING (true);
CREATE POLICY "Users can create positions" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service can insert positions" ON public.positions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update positions" ON public.positions FOR UPDATE USING (true);

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can insert snapshots" ON public.weather_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Snapshots readable" ON public.weather_snapshots FOR SELECT USING (true);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, balance_credits)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), 1000);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
