CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  item TEXT NOT NULL,
  item_name TEXT NOT NULL,
  place TEXT NOT NULL,
  start INTEGER NOT NULL,
  end INTEGER NOT NULL,
  price INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL,            -- hold | confirmed | cancelled | expired
  hold_until INTEGER,
  stripe_session TEXT,
  payment_intent TEXT,
  cancel_token TEXT NOT NULL UNIQUE,
  emailed INTEGER NOT NULL DEFAULT 0,
  reminded INTEGER NOT NULL DEFAULT 0,  -- rappel de la veille envoyé
  review_asked INTEGER NOT NULL DEFAULT 0, -- demande d'avis Google envoyée
  cal_seen INTEGER NOT NULL DEFAULT 0,     -- déjà vu dans l'agenda Google (condition pour annuler s'il disparaît)
  pay_mode TEXT NOT NULL DEFAULT 'carte', -- 'carte' (Stripe) ou 'sur_place'
  refunded INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  cancelled_at INTEGER
);
CREATE INDEX IF NOT EXISTS bookings_time ON bookings (start, end);
CREATE INDEX IF NOT EXISTS bookings_status ON bookings (status);
