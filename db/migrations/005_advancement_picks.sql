ALTER TABLE predictions
DROP CONSTRAINT IF EXISTS predictions_points_valid;

ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS advancing_side varchar(8),
ADD COLUMN IF NOT EXISTS score_points smallint,
ADD COLUMN IF NOT EXISTS advancement_points smallint;

ALTER TABLE predictions
DROP CONSTRAINT IF EXISTS predictions_advancing_side_valid;

ALTER TABLE predictions
ADD CONSTRAINT predictions_advancing_side_valid
CHECK (advancing_side IS NULL OR advancing_side IN ('home', 'away'));

ALTER TABLE predictions
DROP CONSTRAINT IF EXISTS predictions_score_points_valid;

ALTER TABLE predictions
ADD CONSTRAINT predictions_score_points_valid
CHECK (score_points IS NULL OR score_points IN (0, 1, 3, 4, 7));

ALTER TABLE predictions
DROP CONSTRAINT IF EXISTS predictions_advancement_points_valid;

ALTER TABLE predictions
ADD CONSTRAINT predictions_advancement_points_valid
CHECK (advancement_points IS NULL OR advancement_points IN (0, 2));

ALTER TABLE predictions
ADD CONSTRAINT predictions_points_valid
CHECK (points IS NULL OR points IN (0, 1, 2, 3, 4, 5, 6, 7, 9));

CREATE OR REPLACE FUNCTION prediction_advancement_points(
  predicted_advancing_side varchar,
  actual_winner_side varchar,
  match_stage varchar
) RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF match_stage = 'group'
    OR predicted_advancing_side IS NULL
    OR actual_winner_side IS NULL
  THEN
    RETURN 0;
  END IF;

  IF predicted_advancing_side = actual_winner_side THEN
    RETURN 2;
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION prediction_total_points(
  predicted_home integer,
  predicted_away integer,
  predicted_advancing_side varchar,
  actual_home integer,
  actual_away integer,
  actual_winner_side varchar,
  match_stage varchar
) RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT prediction_points(predicted_home, predicted_away, actual_home, actual_away)
    + prediction_advancement_points(
        predicted_advancing_side,
        actual_winner_side,
        match_stage
      );
$$;

DROP TRIGGER IF EXISTS predictions_deadline_guard ON predictions;

UPDATE predictions p
SET advancing_side = CASE
  WHEN p.home_score > p.away_score THEN 'home'
  WHEN p.away_score > p.home_score THEN 'away'
  ELSE p.advancing_side
END
FROM matches m
WHERE m.id = p.match_id
  AND m.stage <> 'group'
  AND p.advancing_side IS NULL
  AND p.home_score <> p.away_score;

UPDATE predictions p
SET advancing_side = NULL
FROM matches m
WHERE m.id = p.match_id
  AND m.stage = 'group'
  AND p.advancing_side IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_prediction_deadline()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_match integer;
  match_kickoff timestamptz;
  match_status varchar(20);
  match_stage varchar(20);
BEGIN
  target_match := CASE WHEN TG_OP = 'DELETE' THEN OLD.match_id ELSE NEW.match_id END;

  IF TG_OP = 'UPDATE'
    AND OLD.pool_id = NEW.pool_id
    AND OLD.user_id = NEW.user_id
    AND OLD.match_id = NEW.match_id
    AND OLD.home_score = NEW.home_score
    AND OLD.away_score = NEW.away_score
    AND OLD.advancing_side IS NOT DISTINCT FROM NEW.advancing_side
    AND (
      OLD.points IS DISTINCT FROM NEW.points
      OR OLD.score_points IS DISTINCT FROM NEW.score_points
      OR OLD.advancement_points IS DISTINCT FROM NEW.advancement_points
    )
  THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  SELECT kickoff_at, status, stage
  INTO match_kickoff, match_status, match_stage
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

  IF match_stage = 'group' THEN
    NEW.advancing_side := NULL;
  ELSIF NEW.home_score > NEW.away_score THEN
    NEW.advancing_side := 'home';
  ELSIF NEW.away_score > NEW.home_score THEN
    NEW.advancing_side := 'away';
  ELSIF NEW.advancing_side IS NULL THEN
    RAISE EXCEPTION 'ADVANCING_SIDE_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER predictions_deadline_guard
BEFORE INSERT OR UPDATE OR DELETE ON predictions
FOR EACH ROW EXECUTE FUNCTION enforce_prediction_deadline();

CREATE OR REPLACE FUNCTION score_match_predictions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'FINISHED'
    AND NEW.home_score IS NOT NULL
    AND NEW.away_score IS NOT NULL
  THEN
    UPDATE predictions
    SET
      score_points = prediction_points(
        home_score,
        away_score,
        NEW.home_score,
        NEW.away_score
      ),
      advancement_points = prediction_advancement_points(
        advancing_side,
        NEW.winner_side,
        NEW.stage
      ),
      points = prediction_total_points(
        home_score,
        away_score,
        advancing_side,
        NEW.home_score,
        NEW.away_score,
        NEW.winner_side,
        NEW.stage
      ),
      updated_at = now()
    WHERE match_id = NEW.id
      AND (
        score_points IS DISTINCT FROM prediction_points(
          home_score,
          away_score,
          NEW.home_score,
          NEW.away_score
        )
        OR advancement_points IS DISTINCT FROM prediction_advancement_points(
          advancing_side,
          NEW.winner_side,
          NEW.stage
        )
        OR points IS DISTINCT FROM prediction_total_points(
          home_score,
          away_score,
          advancing_side,
          NEW.home_score,
          NEW.away_score,
          NEW.winner_side,
          NEW.stage
        )
      );
  ELSIF OLD.status = 'FINISHED' AND NEW.status <> 'FINISHED' THEN
    UPDATE predictions
    SET
      points = NULL,
      score_points = NULL,
      advancement_points = NULL,
      updated_at = now()
    WHERE match_id = NEW.id
      AND (
        points IS NOT NULL
        OR score_points IS NOT NULL
        OR advancement_points IS NOT NULL
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_score_predictions ON matches;
CREATE TRIGGER matches_score_predictions
AFTER UPDATE OF status, home_score, away_score, winner_side ON matches
FOR EACH ROW EXECUTE FUNCTION score_match_predictions();

UPDATE predictions p
SET
  score_points = prediction_points(
    p.home_score,
    p.away_score,
    m.home_score,
    m.away_score
  ),
  advancement_points = prediction_advancement_points(
    p.advancing_side,
    m.winner_side,
    m.stage
  ),
  points = prediction_total_points(
    p.home_score,
    p.away_score,
    p.advancing_side,
    m.home_score,
    m.away_score,
    m.winner_side,
    m.stage
  ),
  updated_at = now()
FROM matches m
WHERE m.id = p.match_id
  AND m.status = 'FINISHED'
  AND m.home_score IS NOT NULL
  AND m.away_score IS NOT NULL;

UPDATE predictions p
SET
  points = NULL,
  score_points = NULL,
  advancement_points = NULL,
  updated_at = now()
FROM matches m
WHERE m.id = p.match_id
  AND m.status <> 'FINISHED'
  AND (
    p.points IS NOT NULL
    OR p.score_points IS NOT NULL
    OR p.advancement_points IS NOT NULL
  );
