-- ============================================================
--  RecruitIQ — Complete PostgreSQL Database Schema
--  HR Information + All Platform Tables
--  Compatible with: PostgreSQL 14+, Supabase, Neon, Railway
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Password hashing
CREATE EXTENSION IF NOT EXISTS "citext";         -- Case-insensitive text (emails)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Fuzzy text search

-- ── ENUMS ─────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'admin',        -- Platform administrator
  'hr_manager',   -- Can manage all jobs + team members
  'recruiter',    -- Standard recruiter: create jobs, analyze resumes
  'hiring_manager',-- View-only + interview scheduling
  'viewer'        -- Read-only access
);

CREATE TYPE subscription_plan AS ENUM (
  'free',
  'pro',
  'enterprise'
);

CREATE TYPE job_status AS ENUM (
  'draft',
  'open',
  'reviewing',
  'paused',
  'closed',
  'archived'
);

CREATE TYPE employment_type AS ENUM (
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance'
);

CREATE TYPE location_type AS ENUM (
  'remote',
  'hybrid',
  'on_site'
);

CREATE TYPE analysis_status AS ENUM (
  'queued',
  'processing',
  'completed',
  'failed'
);

CREATE TYPE candidate_status AS ENUM (
  'new',
  'shortlisted',
  'interviewed',
  'offered',
  'hired',
  'rejected'
);

CREATE TYPE otp_purpose AS ENUM (
  'email_verification',
  'password_reset',
  'two_factor'
);

-- ============================================================
--  TABLE 1: companies
--  Stores each organisation that signs up to RecruitIQ
-- ============================================================
CREATE TABLE companies (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(200)  NOT NULL,
  slug             VARCHAR(200)  UNIQUE NOT NULL,            -- URL-safe identifier
  website          VARCHAR(500),
  logo_url         VARCHAR(1000),
  industry         VARCHAR(100),
  company_size     VARCHAR(50),                              -- e.g. "51-200"
  description      TEXT,
  country          VARCHAR(100),
  city             VARCHAR(100),
  timezone         VARCHAR(80)   DEFAULT 'UTC',
  plan             subscription_plan NOT NULL DEFAULT 'free',
  plan_started_at  TIMESTAMPTZ,
  plan_expires_at  TIMESTAMPTZ,
  resumes_used     INTEGER       NOT NULL DEFAULT 0,
  resumes_limit    INTEGER       NOT NULL DEFAULT 25,        -- 25 free, 500 pro, unlimited enterprise
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  is_verified      BOOLEAN       NOT NULL DEFAULT FALSE,
  stripe_customer_id  VARCHAR(200),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE companies IS 'Top-level tenant table — each organisation is one row';
COMMENT ON COLUMN companies.slug IS 'URL-safe company identifier, e.g. "acme-corp"';

-- ============================================================
--  TABLE 2: hr_users  (HR/Recruiter Information)
--  Stores every HR professional & recruiter using the platform
-- ============================================================
CREATE TABLE hr_users (
  -- ── Identity ──
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name       VARCHAR(100)  NOT NULL,
  last_name        VARCHAR(100)  NOT NULL,
  email            CITEXT        NOT NULL UNIQUE,            -- case-insensitive
  phone            VARCHAR(30),
  avatar_url       VARCHAR(1000),

  -- ── Auth ──
  password_hash    VARCHAR(300)  NOT NULL,                   -- bcrypt hash (14 rounds)
  role             user_role     NOT NULL DEFAULT 'recruiter',
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  is_email_verified BOOLEAN      NOT NULL DEFAULT FALSE,
  two_factor_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
  two_factor_secret  VARCHAR(100),                          -- TOTP secret (encrypted)

  -- ── HR Profile / Professional Info ──
  job_title        VARCHAR(150),                            -- e.g. "Senior Talent Acquisition Manager"
  department       VARCHAR(100),                            -- e.g. "Human Resources"
  linkedin_url     VARCHAR(500),
  bio              TEXT,
  specializations  TEXT[],                                  -- e.g. ['Engineering', 'Product', 'Design']
  years_experience SMALLINT,

  -- ── Preferences ──
  default_job_location location_type DEFAULT 'remote',
  preferred_industries TEXT[],
  notification_email   BOOLEAN   NOT NULL DEFAULT TRUE,
  notification_browser BOOLEAN   NOT NULL DEFAULT TRUE,
  ui_theme             VARCHAR(20) DEFAULT 'dark',          -- 'dark' | 'light'
  locale               VARCHAR(10) DEFAULT 'en-US',

  -- ── Usage Stats ──
  jobs_created     INTEGER       NOT NULL DEFAULT 0,
  analyses_run     INTEGER       NOT NULL DEFAULT 0,
  last_login_at    TIMESTAMPTZ,
  last_login_ip    VARCHAR(50),

  -- ── Tokens ──
  refresh_token_hash  VARCHAR(300),                        -- hashed refresh token
  refresh_token_exp   TIMESTAMPTZ,

  -- ── Audit ──
  invited_by       UUID          REFERENCES hr_users(id) ON DELETE SET NULL,
  invited_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ                             -- soft delete
);

-- Indexes
CREATE INDEX idx_hr_users_company   ON hr_users(company_id);
CREATE INDEX idx_hr_users_email     ON hr_users(email);
CREATE INDEX idx_hr_users_role      ON hr_users(role);
CREATE INDEX idx_hr_users_active    ON hr_users(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_users IS 'All HR managers, recruiters, and hiring managers on the platform';
COMMENT ON COLUMN hr_users.password_hash IS 'bcrypt hash — NEVER store plaintext passwords';
COMMENT ON COLUMN hr_users.two_factor_secret IS 'AES-256 encrypted TOTP secret key';

-- ============================================================
--  TABLE 3: otp_codes
--  Email OTP verification & password reset tokens
-- ============================================================
CREATE TABLE otp_codes (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID          NOT NULL REFERENCES hr_users(id) ON DELETE CASCADE,
  code        VARCHAR(10)   NOT NULL,                       -- 6-digit numeric OTP
  purpose     otp_purpose   NOT NULL DEFAULT 'email_verification',
  is_used     BOOLEAN       NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  used_at     TIMESTAMPTZ
);

CREATE INDEX idx_otp_user    ON otp_codes(user_id);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- ============================================================
--  TABLE 4: hr_activity_log
--  Full audit trail of every action taken by HR users
-- ============================================================
CREATE TABLE hr_activity_log (
  id          BIGSERIAL     PRIMARY KEY,
  user_id     UUID          NOT NULL REFERENCES hr_users(id) ON DELETE CASCADE,
  company_id  UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action      VARCHAR(100)  NOT NULL,                       -- e.g. 'JOB_CREATED', 'RESUME_ANALYZED'
  entity_type VARCHAR(50),                                  -- e.g. 'job', 'resume', 'candidate'
  entity_id   UUID,
  description TEXT,
  metadata    JSONB         DEFAULT '{}',
  ip_address  VARCHAR(50),
  user_agent  VARCHAR(500),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_user    ON hr_activity_log(user_id);
CREATE INDEX idx_activity_company ON hr_activity_log(company_id);
CREATE INDEX idx_activity_action  ON hr_activity_log(action);
CREATE INDEX idx_activity_date    ON hr_activity_log(created_at DESC);

-- ============================================================
--  TABLE 5: jobs
--  Job postings created by HR users
-- ============================================================
CREATE TABLE jobs (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by       UUID          NOT NULL REFERENCES hr_users(id) ON DELETE SET NULL,

  -- ── Job Info ──
  title            VARCHAR(200)  NOT NULL,
  department       VARCHAR(100),
  employment_type  employment_type NOT NULL DEFAULT 'full_time',
  location_type    location_type   NOT NULL DEFAULT 'remote',
  location_city    VARCHAR(100),
  location_country VARCHAR(100),
  description      TEXT,
  responsibilities TEXT,
  nice_to_have     TEXT,
  salary_min       INTEGER,                                 -- in USD
  salary_max       INTEGER,
  salary_currency  VARCHAR(5)    DEFAULT 'USD',
  min_experience   SMALLINT      DEFAULT 0,                 -- years
  max_experience   SMALLINT,

  -- ── Skills ──
  required_skills  TEXT[]        NOT NULL DEFAULT '{}',
  preferred_skills TEXT[]        DEFAULT '{}',
  skill_weights    JSONB         DEFAULT '{}',              -- { "React": 0.3, "TypeScript": 0.25 }

  -- ── Status ──
  status           job_status    NOT NULL DEFAULT 'open',
  published_at     TIMESTAMPTZ,
  closes_at        TIMESTAMPTZ,

  -- ── AI Scoring Weights ──
  weight_skills    DECIMAL(3,2)  DEFAULT 0.40,              -- 40% skills
  weight_experience DECIMAL(3,2) DEFAULT 0.30,              -- 30% experience
  weight_education DECIMAL(3,2)  DEFAULT 0.20,              -- 20% education
  weight_keywords  DECIMAL(3,2)  DEFAULT 0.10,              -- 10% keyword density

  -- ── Counters ──
  resume_count     INTEGER       NOT NULL DEFAULT 0,
  shortlist_count  INTEGER       NOT NULL DEFAULT 0,
  hired_count      INTEGER       NOT NULL DEFAULT 0,

  -- ── Audit ──
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_jobs_company    ON jobs(company_id);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
CREATE INDEX idx_jobs_status     ON jobs(status);
CREATE INDEX idx_jobs_active     ON jobs(company_id, status) WHERE deleted_at IS NULL;

COMMENT ON TABLE jobs IS 'Job postings. Each job can have multiple resume analyses';

-- ============================================================
--  TABLE 6: resume_uploads
--  Raw uploaded resume files
-- ============================================================
CREATE TABLE resume_uploads (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id           UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  uploaded_by      UUID          NOT NULL REFERENCES hr_users(id) ON DELETE SET NULL,

  file_name        VARCHAR(300)  NOT NULL,
  file_path        VARCHAR(1000) NOT NULL,                  -- S3 / cloud storage path
  file_size_bytes  INTEGER       NOT NULL,
  file_type        VARCHAR(20)   NOT NULL,                  -- 'pdf' or 'docx'
  file_hash        VARCHAR(64),                             -- SHA-256 for dedup

  -- ── Extracted Text ──
  raw_text         TEXT,                                    -- full extracted text
  page_count       SMALLINT,

  -- ── Parsed Candidate Info ──
  candidate_name   VARCHAR(200),
  candidate_email  CITEXT,
  candidate_phone  VARCHAR(40),
  candidate_location VARCHAR(200),
  candidate_linkedin VARCHAR(500),

  -- ── Status ──
  is_parsed        BOOLEAN       NOT NULL DEFAULT FALSE,
  parse_error      TEXT,

  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uploads_job     ON resume_uploads(job_id);
CREATE INDEX idx_uploads_company ON resume_uploads(company_id);
CREATE INDEX idx_uploads_hash    ON resume_uploads(file_hash);

-- ============================================================
--  TABLE 7: resume_analyses
--  AI analysis results for each resume vs job
-- ============================================================
CREATE TABLE resume_analyses (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_id        UUID          NOT NULL REFERENCES resume_uploads(id) ON DELETE CASCADE,
  job_id           UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  analyzed_by      UUID          REFERENCES hr_users(id) ON DELETE SET NULL,

  -- ── AI Scores ──
  overall_score    DECIMAL(5,2)  NOT NULL DEFAULT 0,        -- 0–100
  skill_score      DECIMAL(5,2)  DEFAULT 0,
  experience_score DECIMAL(5,2)  DEFAULT 0,
  education_score  DECIMAL(5,2)  DEFAULT 0,
  keyword_score    DECIMAL(5,2)  DEFAULT 0,
  ats_score        DECIMAL(5,2)  DEFAULT 0,                 -- ATS compatibility

  -- ── Ranking ──
  rank_position    INTEGER,                                 -- 1 = best match
  percentile       DECIMAL(5,2),                            -- top X%

  -- ── Skill Analysis ──
  matched_skills   TEXT[]        DEFAULT '{}',
  missing_skills   TEXT[]        DEFAULT '{}',
  extra_skills     TEXT[]        DEFAULT '{}',              -- skills not required but present
  skill_match_pct  DECIMAL(5,2)  DEFAULT 0,

  -- ── Experience ──
  total_years_exp  DECIMAL(4,1),
  meets_experience BOOLEAN       DEFAULT FALSE,

  -- ── Education ──
  highest_degree   VARCHAR(100),
  field_of_study   VARCHAR(200),
  meets_education  BOOLEAN       DEFAULT FALSE,

  -- ── AI-Generated Content ──
  summary          TEXT,                                    -- AI-written candidate summary
  strengths        TEXT[],
  weaknesses       TEXT[],
  interview_questions JSONB      DEFAULT '[]',              -- [{question, focus_area, difficulty}]

  -- ── Embedding ──
  resume_embedding FLOAT4[],                                -- BERT embedding vector (768-dim)

  -- ── Status ──
  status           analysis_status NOT NULL DEFAULT 'queued',
  error_message    TEXT,
  processing_ms    INTEGER,                                 -- how long AI took (milliseconds)

  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_analyses_unique ON resume_analyses(resume_id, job_id);
CREATE INDEX idx_analyses_job     ON resume_analyses(job_id);
CREATE INDEX idx_analyses_company ON resume_analyses(company_id);
CREATE INDEX idx_analyses_score   ON resume_analyses(job_id, overall_score DESC);
CREATE INDEX idx_analyses_rank    ON resume_analyses(job_id, rank_position);

COMMENT ON TABLE resume_analyses IS 'AI scoring results per resume-job pair. One row per resume per job.';
COMMENT ON COLUMN resume_analyses.resume_embedding IS '768-dim BERT embedding for semantic search';

-- ============================================================
--  TABLE 8: candidates
--  Shortlisted / tracked candidates with HR notes
-- ============================================================
CREATE TABLE candidates (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id           UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  analysis_id      UUID          UNIQUE REFERENCES resume_analyses(id) ON DELETE SET NULL,
  managed_by       UUID          REFERENCES hr_users(id) ON DELETE SET NULL,

  -- ── Candidate Info ──
  full_name        VARCHAR(200)  NOT NULL,
  email            CITEXT,
  phone            VARCHAR(40),
  linkedin_url     VARCHAR(500),
  location         VARCHAR(200),
  avatar_url       VARCHAR(1000),

  -- ── Status ──
  status           candidate_status NOT NULL DEFAULT 'new',
  is_shortlisted   BOOLEAN       NOT NULL DEFAULT FALSE,
  shortlisted_at   TIMESTAMPTZ,
  shortlisted_by   UUID          REFERENCES hr_users(id),

  -- ── Interview ──
  interview_scheduled_at TIMESTAMPTZ,
  interview_notes  TEXT,
  interview_score  DECIMAL(3,1),                           -- 1–10

  -- ── Offer ──
  offer_sent_at    TIMESTAMPTZ,
  offer_amount     INTEGER,
  offer_accepted   BOOLEAN,
  hired_at         TIMESTAMPTZ,

  -- ── HR Notes ──
  hr_notes         TEXT,
  tags             TEXT[]        DEFAULT '{}',

  -- ── Audit ──
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidates_job     ON candidates(job_id);
CREATE INDEX idx_candidates_company ON candidates(company_id);
CREATE INDEX idx_candidates_status  ON candidates(status);
CREATE INDEX idx_candidates_managed ON candidates(managed_by);

-- ============================================================
--  TABLE 9: candidate_notes
--  Threaded notes/comments from HR team on candidates
-- ============================================================
CREATE TABLE candidate_notes (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID         NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  author_id    UUID         NOT NULL REFERENCES hr_users(id) ON DELETE CASCADE,
  content      TEXT         NOT NULL,
  is_private   BOOLEAN      NOT NULL DEFAULT FALSE,         -- private = only visible to author
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_candidate ON candidate_notes(candidate_id);

-- ============================================================
--  TABLE 10: team_invitations
--  Invite team members to the company workspace
-- ============================================================
CREATE TABLE team_invitations (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by   UUID         NOT NULL REFERENCES hr_users(id) ON DELETE CASCADE,
  email        CITEXT       NOT NULL,
  role         user_role    NOT NULL DEFAULT 'recruiter',
  token        VARCHAR(100) UNIQUE NOT NULL,                -- secure invite token
  is_accepted  BOOLEAN      NOT NULL DEFAULT FALSE,
  expires_at   TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invites_company ON team_invitations(company_id);
CREATE INDEX idx_invites_email   ON team_invitations(email);
CREATE INDEX idx_invites_token   ON team_invitations(token);

-- ============================================================
--  TABLE 11: job_templates
--  Reusable job description templates per company
-- ============================================================
CREATE TABLE job_templates (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by       UUID         NOT NULL REFERENCES hr_users(id) ON DELETE SET NULL,
  name             VARCHAR(200) NOT NULL,
  department       VARCHAR(100),
  description      TEXT,
  required_skills  TEXT[]       DEFAULT '{}',
  preferred_skills TEXT[]       DEFAULT '{}',
  skill_weights    JSONB        DEFAULT '{}',
  employment_type  employment_type DEFAULT 'full_time',
  min_experience   SMALLINT     DEFAULT 0,
  is_shared        BOOLEAN      NOT NULL DEFAULT FALSE,     -- shared with whole company
  use_count        INTEGER      NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_company ON job_templates(company_id);

-- ============================================================
--  TABLE 12: analytics_snapshots
--  Pre-computed analytics for fast dashboard loading
-- ============================================================
CREATE TABLE analytics_snapshots (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date    DATE         NOT NULL,
  period           VARCHAR(10)  NOT NULL DEFAULT 'daily',   -- 'daily' | 'weekly' | 'monthly'

  -- ── Metrics ──
  resumes_analyzed INTEGER      NOT NULL DEFAULT 0,
  jobs_created     INTEGER      NOT NULL DEFAULT 0,
  candidates_shortlisted INTEGER NOT NULL DEFAULT 0,
  candidates_hired INTEGER      NOT NULL DEFAULT 0,
  avg_match_score  DECIMAL(5,2),
  avg_ats_score    DECIMAL(5,2),
  top_skills       JSONB        DEFAULT '[]',               -- [{skill, count}]
  score_distribution JSONB      DEFAULT '{}',               -- {0-20: n, 21-40: n, ...}

  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, snapshot_date, period)
);

CREATE INDEX idx_snapshots_company ON analytics_snapshots(company_id, snapshot_date DESC);

-- ============================================================
--  TABLE 13: billing_events
--  Track all subscription changes for finance/audit
-- ============================================================
CREATE TABLE billing_events (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type       VARCHAR(80)  NOT NULL,                   -- 'subscription_created', 'invoice_paid', etc.
  plan_from        subscription_plan,
  plan_to          subscription_plan,
  amount_cents     INTEGER,
  currency         VARCHAR(5)   DEFAULT 'USD',
  stripe_event_id  VARCHAR(200) UNIQUE,
  metadata         JSONB        DEFAULT '{}',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_company ON billing_events(company_id);

-- ============================================================
--  FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at     BEFORE UPDATE ON companies        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_hr_users_updated_at      BEFORE UPDATE ON hr_users         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_jobs_updated_at          BEFORE UPDATE ON jobs             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_analyses_updated_at      BEFORE UPDATE ON resume_analyses  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_candidates_updated_at    BEFORE UPDATE ON candidates       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notes_updated_at         BEFORE UPDATE ON candidate_notes  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_templates_updated_at     BEFORE UPDATE ON job_templates    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Increment job.resume_count when a new resume is uploaded
CREATE OR REPLACE FUNCTION increment_resume_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs SET resume_count = resume_count + 1 WHERE id = NEW.job_id;
  UPDATE companies SET resumes_used = resumes_used + 1 WHERE id = NEW.company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_resume_count
  AFTER INSERT ON resume_uploads
  FOR EACH ROW EXECUTE FUNCTION increment_resume_count();

-- Recalculate job rank positions after analysis completes
CREATE OR REPLACE FUNCTION recalculate_ranks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE resume_analyses ra
    SET rank_position = sub.rank
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY job_id ORDER BY overall_score DESC) AS rank
      FROM resume_analyses
      WHERE job_id = NEW.job_id AND status = 'completed'
    ) sub
    WHERE ra.id = sub.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_ranks
  AFTER UPDATE ON resume_analyses
  FOR EACH ROW EXECUTE FUNCTION recalculate_ranks();

-- Log shortlisting events to activity log
CREATE OR REPLACE FUNCTION log_shortlist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_shortlisted = TRUE AND (OLD.is_shortlisted IS NULL OR OLD.is_shortlisted = FALSE) THEN
    INSERT INTO hr_activity_log (user_id, company_id, action, entity_type, entity_id, description)
    VALUES (
      NEW.shortlisted_by,
      NEW.company_id,
      'CANDIDATE_SHORTLISTED',
      'candidate',
      NEW.id,
      'Candidate ' || NEW.full_name || ' was shortlisted'
    );
    UPDATE jobs SET shortlist_count = shortlist_count + 1 WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_shortlist
  AFTER UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION log_shortlist();

-- Increment hr_users.jobs_created counter
CREATE OR REPLACE FUNCTION increment_jobs_created()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hr_users SET jobs_created = jobs_created + 1 WHERE id = NEW.created_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_jobs_created
  AFTER INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION increment_jobs_created();

-- ============================================================
--  VIEWS
-- ============================================================

-- HR User full profile view (joins company info)
CREATE OR REPLACE VIEW v_hr_user_profiles AS
SELECT
  u.id,
  u.company_id,
  c.name            AS company_name,
  c.plan            AS company_plan,
  u.first_name,
  u.last_name,
  u.first_name || ' ' || u.last_name AS full_name,
  u.email,
  u.phone,
  u.avatar_url,
  u.role,
  u.job_title,
  u.department,
  u.specializations,
  u.years_experience,
  u.is_active,
  u.is_email_verified,
  u.two_factor_enabled,
  u.jobs_created,
  u.analyses_run,
  u.last_login_at,
  u.locale,
  u.ui_theme,
  u.notification_email,
  u.notification_browser,
  u.created_at
FROM hr_users u
JOIN companies c ON c.id = u.company_id
WHERE u.deleted_at IS NULL;

COMMENT ON VIEW v_hr_user_profiles IS 'HR user data joined with company — excludes sensitive fields (password, tokens)';

-- Job with stats view
CREATE OR REPLACE VIEW v_jobs_with_stats AS
SELECT
  j.*,
  u.first_name || ' ' || u.last_name AS created_by_name,
  u.email                              AS created_by_email,
  c.name                               AS company_name,
  COALESCE(
    (SELECT MAX(ra.overall_score) FROM resume_analyses ra WHERE ra.job_id = j.id AND ra.status = 'completed'),
    0
  ) AS top_score,
  COALESCE(
    (SELECT AVG(ra.overall_score) FROM resume_analyses ra WHERE ra.job_id = j.id AND ra.status = 'completed'),
    0
  ) AS avg_score
FROM jobs j
JOIN hr_users u ON u.id = j.created_by
JOIN companies c ON c.id = j.company_id
WHERE j.deleted_at IS NULL;

-- Top candidates view
CREATE OR REPLACE VIEW v_top_candidates AS
SELECT
  ra.id            AS analysis_id,
  ra.job_id,
  ra.overall_score,
  ra.ats_score,
  ra.rank_position,
  ra.matched_skills,
  ra.missing_skills,
  ra.skill_match_pct,
  ra.total_years_exp,
  ra.summary,
  ra.interview_questions,
  ru.candidate_name,
  ru.candidate_email,
  ru.candidate_phone,
  ru.candidate_location,
  ru.file_name,
  j.title          AS job_title,
  c.name           AS company_name,
  cand.status      AS candidate_status,
  cand.is_shortlisted
FROM resume_analyses ra
JOIN resume_uploads ru  ON ru.id = ra.resume_id
JOIN jobs j             ON j.id  = ra.job_id
JOIN companies c        ON c.id  = ra.company_id
LEFT JOIN candidates cand ON cand.analysis_id = ra.id
WHERE ra.status = 'completed'
ORDER BY ra.job_id, ra.rank_position;

-- ============================================================
--  ROW-LEVEL SECURITY (RLS) — Multi-tenant isolation
-- ============================================================

ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_uploads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analyses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_activity_log  ENABLE ROW LEVEL SECURITY;

-- Each user can only see their own company's data
CREATE POLICY company_isolation ON hr_users
  USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY company_isolation ON jobs
  USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY company_isolation ON resume_uploads
  USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY company_isolation ON resume_analyses
  USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY company_isolation ON candidates
  USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY company_isolation ON analytics_snapshots
  USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

-- ============================================================
--  SEED DATA — Demo / Initial Setup
-- ============================================================

-- Demo company
INSERT INTO companies (id, name, slug, industry, company_size, plan, resumes_limit, is_active, is_verified)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Acme Corp', 'acme-corp', 'Technology', '51-200',
  'pro', 500, TRUE, TRUE
);

-- Demo HR Admin (password: Admin@1234)
INSERT INTO hr_users (
  id, company_id, first_name, last_name, email,
  password_hash, role, job_title, department,
  is_active, is_email_verified
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Sarah', 'Chen',
  'sarah.chen@acmecorp.com',
  '$2b$14$K2CtDFGszMhGb49R0mG.ieAhK1u6tBLBfkSFVNlniOQvsFGNbmRKa', -- bcrypt of 'Admin@1234'
  'hr_manager',
  'Head of Talent Acquisition',
  'Human Resources',
  TRUE, TRUE
);

-- Demo Recruiter
INSERT INTO hr_users (
  id, company_id, first_name, last_name, email,
  password_hash, role, job_title, department,
  is_active, is_email_verified, invited_by
) VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'James', 'Park',
  'james.park@acmecorp.com',
  '$2b$14$K2CtDFGszMhGb49R0mG.ieAhK1u6tBLBfkSFVNlniOQvsFGNbmRKa',
  'recruiter',
  'Technical Recruiter',
  'Human Resources',
  TRUE, TRUE,
  'b0000000-0000-0000-0000-000000000001'
);

-- Demo Job
INSERT INTO jobs (
  id, company_id, created_by, title, department,
  employment_type, location_type, description,
  required_skills, preferred_skills,
  status, min_experience
) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Senior Frontend Engineer', 'Engineering',
  'full_time', 'remote',
  'We are looking for a Senior Frontend Engineer to lead our React/TypeScript frontend architecture.',
  ARRAY['React','TypeScript','Node.js','GraphQL','CSS','Git'],
  ARRAY['Jest','Kubernetes','AWS'],
  'open', 4
);

-- ============================================================
--  USEFUL QUERIES FOR HR OPERATIONS
-- ============================================================

-- 1. Get all HR users in a company with their stats:
--    SELECT * FROM v_hr_user_profiles WHERE company_id = '<company_id>';

-- 2. Get top 10 candidates for a job:
--    SELECT * FROM v_top_candidates WHERE job_id = '<job_id>' LIMIT 10;

-- 3. Get all open jobs with resume counts:
--    SELECT * FROM v_jobs_with_stats WHERE company_id = '<cid>' AND status = 'open';

-- 4. Get HR activity log for a user:
--    SELECT * FROM hr_activity_log WHERE user_id = '<uid>' ORDER BY created_at DESC LIMIT 50;

-- 5. Check skill demand across all jobs:
--    SELECT unnest(required_skills) AS skill, COUNT(*) AS demand
--    FROM jobs WHERE company_id = '<cid>' AND deleted_at IS NULL
--    GROUP BY skill ORDER BY demand DESC LIMIT 20;

-- 6. Monthly hiring funnel:
--    SELECT snapshot_date, resumes_analyzed, candidates_shortlisted, candidates_hired,
--           ROUND(candidates_shortlisted::numeric / NULLIF(resumes_analyzed,0) * 100, 1) AS shortlist_rate
--    FROM analytics_snapshots
--    WHERE company_id = '<cid>' AND period = 'monthly'
--    ORDER BY snapshot_date DESC LIMIT 12;

-- 7. Find duplicate resumes (same candidate applied to same job):
--    SELECT file_hash, COUNT(*) FROM resume_uploads
--    WHERE job_id = '<jid>' GROUP BY file_hash HAVING COUNT(*) > 1;

-- ============================================================
--  END OF SCHEMA
-- ============================================================
