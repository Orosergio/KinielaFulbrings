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

  IF now() >= match_kickoff
    OR match_status IN ('FINISHED', 'POSTPONED', 'CANCELLED')
  THEN
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

UPDATE matches
SET
  status = 'SCHEDULED',
  minute = NULL,
  home_score = NULL,
  away_score = NULL,
  home_penalty_score = NULL,
  away_penalty_score = NULL,
  winner_side = NULL,
  updated_at = now()
WHERE kickoff_at > now()
  AND status IN ('LIVE', 'PAUSED');
