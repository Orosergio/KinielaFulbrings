CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  email citext NOT NULL,
  display_name varchar(80) NOT NULL,
  avatar_url text,
  locale varchar(5) NOT NULL DEFAULT 'es',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id integer PRIMARY KEY,
  fifa_code varchar(4) NOT NULL UNIQUE,
  iso2 varchar(8),
  group_name varchar(4),
  name_en varchar(100) NOT NULL,
  name_es varchar(100) NOT NULL,
  flag_url text,
  scouting jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stadiums (
  id integer PRIMARY KEY,
  name varchar(120) NOT NULL,
  fifa_name varchar(120),
  city varchar(100) NOT NULL,
  country_en varchar(80),
  country_es varchar(80),
  capacity integer,
  timezone varchar(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id integer PRIMARY KEY,
  provider_match_id bigint UNIQUE,
  stage varchar(20) NOT NULL,
  group_name varchar(12),
  matchday integer NOT NULL,
  kickoff_at timestamptz NOT NULL,
  home_team_id integer REFERENCES teams(id),
  away_team_id integer REFERENCES teams(id),
  home_label varchar(120),
  away_label varchar(120),
  stadium_id integer REFERENCES stadiums(id),
  status varchar(20) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'LIVE', 'PAUSED', 'FINISHED', 'POSTPONED', 'CANCELLED')),
  minute integer,
  home_score integer CHECK (home_score BETWEEN 0 AND 30),
  away_score integer CHECK (away_score BETWEEN 0 AND 30),
  source_updated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matches_kickoff_idx ON matches (kickoff_at);
CREATE INDEX IF NOT EXISTS matches_status_idx ON matches (status);

CREATE TABLE IF NOT EXISTS pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL,
  code varchar(10) NOT NULL UNIQUE,
  owner_user_id text NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pool_members (
  pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role varchar(12) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pool_id, user_id)
);

CREATE INDEX IF NOT EXISTS pool_members_user_idx ON pool_members (user_id);

CREATE TABLE IF NOT EXISTS predictions (
  pool_id uuid NOT NULL,
  user_id text NOT NULL,
  match_id integer NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_score smallint NOT NULL CHECK (home_score BETWEEN 0 AND 30),
  away_score smallint NOT NULL CHECK (away_score BETWEEN 0 AND 30),
  points smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pool_id, user_id, match_id),
  FOREIGN KEY (pool_id, user_id)
    REFERENCES pool_members(pool_id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS predictions_match_idx ON predictions (match_id);
CREATE INDEX IF NOT EXISTS predictions_pool_points_idx ON predictions (pool_id, points DESC);

CREATE TABLE IF NOT EXISTS sync_runs (
  id bigserial PRIMARY KEY,
  provider varchar(40) NOT NULL,
  status varchar(20) NOT NULL,
  matches_seen integer NOT NULL DEFAULT 0,
  matches_updated integer NOT NULL DEFAULT 0,
  detail text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE OR REPLACE FUNCTION prediction_points(
  predicted_home integer,
  predicted_away integer,
  actual_home integer,
  actual_away integer
) RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  predicted_result integer := sign(predicted_home - predicted_away);
  actual_result integer := sign(actual_home - actual_away);
  one_goal_exact boolean := predicted_home = actual_home OR predicted_away = actual_away;
BEGIN
  IF predicted_home = actual_home AND predicted_away = actual_away THEN
    RETURN 7;
  ELSIF predicted_result = actual_result AND one_goal_exact THEN
    RETURN 4;
  ELSIF predicted_result = actual_result THEN
    RETURN 3;
  ELSIF one_goal_exact THEN
    RETURN 1;
  END IF;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_prediction_deadline()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_match integer;
  match_kickoff timestamptz;
  match_status varchar(20);
BEGIN
  target_match := CASE WHEN TG_OP = 'DELETE' THEN OLD.match_id ELSE NEW.match_id END;

  IF TG_OP = 'UPDATE'
    AND OLD.pool_id = NEW.pool_id
    AND OLD.user_id = NEW.user_id
    AND OLD.match_id = NEW.match_id
    AND OLD.home_score = NEW.home_score
    AND OLD.away_score = NEW.away_score
    AND OLD.points IS DISTINCT FROM NEW.points
  THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  SELECT kickoff_at, status
  INTO match_kickoff, match_status
  FROM matches
  WHERE id = target_match
  FOR SHARE;

  IF match_kickoff IS NULL THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF now() >= match_kickoff OR match_status <> 'SCHEDULED' THEN
    RAISE EXCEPTION 'PREDICTION_LOCKED' USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE' AND (
    OLD.pool_id <> NEW.pool_id OR
    OLD.user_id <> NEW.user_id OR
    OLD.match_id <> NEW.match_id
  ) THEN
    RAISE EXCEPTION 'PREDICTION_IDENTITY_IMMUTABLE' USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS predictions_deadline_guard ON predictions;
CREATE TRIGGER predictions_deadline_guard
BEFORE INSERT OR UPDATE OR DELETE ON predictions
FOR EACH ROW EXECUTE FUNCTION enforce_prediction_deadline();

CREATE OR REPLACE FUNCTION score_match_predictions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'FINISHED' AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    UPDATE predictions
    SET
      points = prediction_points(home_score, away_score, NEW.home_score, NEW.away_score),
      updated_at = now()
    WHERE match_id = NEW.id;
  ELSIF (
    OLD.status = 'FINISHED' OR OLD.home_score IS NOT NULL OR OLD.away_score IS NOT NULL
  ) THEN
    UPDATE predictions
    SET points = NULL, updated_at = now()
    WHERE match_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_score_predictions ON matches;
CREATE TRIGGER matches_score_predictions
AFTER UPDATE OF status, home_score, away_score ON matches
FOR EACH ROW EXECUTE FUNCTION score_match_predictions();

CREATE OR REPLACE FUNCTION add_pool_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO pool_members (pool_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'owner')
  ON CONFLICT (pool_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pools_add_owner ON pools;
CREATE TRIGGER pools_add_owner
AFTER INSERT ON pools
FOR EACH ROW EXECUTE FUNCTION add_pool_owner();
