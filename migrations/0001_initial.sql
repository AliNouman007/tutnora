-- Tutnora initial schema. See docs/ARCHITECTURE.md section 4 and ADR 0004.
-- Foreign keys include learner_id, so a record can only reference records of the same learner.

CREATE TABLE learners (
  id TEXT PRIMARY KEY,
  github_login TEXT NOT NULL,
  language TEXT,
  hint_limit INTEGER NOT NULL DEFAULT 3 CHECK (hint_limit BETWEEN 0 AND 10),
  session_minutes INTEGER NOT NULL DEFAULT 40 CHECK (session_minutes BETWEEN 5 AND 240),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('interview', 'project', 'revision', 'skill', 'other')),
  target_level TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('topic', 'project', 'mixed')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'done')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (learner_id, id),
  FOREIGN KEY (learner_id) REFERENCES learners (id) ON DELETE CASCADE
);

CREATE INDEX goals_learner ON goals (learner_id);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  key TEXT NOT NULL,
  parent_key TEXT,
  title TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('core', 'working', 'awareness')),
  position INTEGER NOT NULL DEFAULT 0,
  sources TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(sources)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (goal_id, key),
  UNIQUE (learner_id, goal_id, id),
  FOREIGN KEY (learner_id, goal_id) REFERENCES goals (learner_id, id) ON DELETE CASCADE
);

CREATE INDEX topics_learner_goal ON topics (learner_id, goal_id);

CREATE TABLE evidence (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (
    kind IN ('explain', 'predict_output', 'debug', 'build', 'interview_answer', 'recall')
  ),
  support TEXT NOT NULL CHECK (
    support IN ('independent', 'hinted', 'ai_assisted', 'solution_shown')
  ),
  result TEXT NOT NULL CHECK (result IN ('pass', 'partial', 'fail')),
  note TEXT CHECK (note IS NULL OR length(note) <= 500),
  request_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (learner_id, request_id),
  FOREIGN KEY (learner_id, goal_id, topic_id)
    REFERENCES topics (learner_id, goal_id, id) ON DELETE CASCADE
);

CREATE INDEX evidence_learner_topic ON evidence (learner_id, topic_id, created_at);

CREATE TABLE handoffs (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  summary TEXT NOT NULL CHECK (length(summary) <= 1000),
  next_step TEXT NOT NULL CHECK (length(next_step) <= 500),
  open_questions TEXT CHECK (open_questions IS NULL OR length(open_questions) <= 500),
  created_at TEXT NOT NULL,
  FOREIGN KEY (learner_id, goal_id) REFERENCES goals (learner_id, id) ON DELETE CASCADE
);

CREATE INDEX handoffs_learner_goal ON handoffs (learner_id, goal_id, created_at);
