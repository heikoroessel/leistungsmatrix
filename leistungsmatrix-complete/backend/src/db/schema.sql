-- Leistungsmatrix DB Schema

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tn_key TEXT UNIQUE NOT NULL,
  an_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  participant_label TEXT, -- wird später gesetzt: A, B, C...
  phase TEXT DEFAULT 'collecting', -- collecting | reviewing | done
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  verb TEXT,
  object TEXT,
  dimension TEXT DEFAULT 'werkstatt', -- werkstatt | shop | meta | parked
  status TEXT DEFAULT 'pending', -- pending | clean | needs_review
  ai_note TEXT, -- KI-Hinweis bei unklaren Fällen
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matrix_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  verb TEXT NOT NULL,
  object TEXT NOT NULL,
  source TEXT DEFAULT 'explicit', -- explicit | possible
  UNIQUE(project_id, verb, object)
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4A90E2',
  description TEXT,
  cells JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_project ON cards(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_session ON cards(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
