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
      points = prediction_points(
        home_score,
        away_score,
        NEW.home_score,
        NEW.away_score
      ),
      updated_at = now()
    WHERE match_id = NEW.id
      AND points IS DISTINCT FROM prediction_points(
        home_score,
        away_score,
        NEW.home_score,
        NEW.away_score
      );
  ELSIF OLD.status = 'FINISHED' AND NEW.status <> 'FINISHED' THEN
    UPDATE predictions
    SET points = NULL, updated_at = now()
    WHERE match_id = NEW.id
      AND points IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;
