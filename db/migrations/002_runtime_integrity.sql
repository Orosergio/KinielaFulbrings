UPDATE sync_runs
SET
  status = 'FAILED',
  detail = COALESCE(detail, 'Recovered abandoned synchronization.'),
  finished_at = COALESCE(finished_at, now())
WHERE status = 'RUNNING'
  AND started_at < now() - interval '1 minute';

CREATE UNIQUE INDEX sync_runs_single_running_idx
ON sync_runs ((1))
WHERE status = 'RUNNING';

ALTER TABLE sync_runs
ADD CONSTRAINT sync_runs_status_valid
CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED'));

ALTER TABLE matches
ADD CONSTRAINT matches_minute_valid
CHECK (minute IS NULL OR minute BETWEEN 0 AND 180);

ALTER TABLE matches
ADD CONSTRAINT matches_score_status_valid
CHECK (
  (
    status IN ('SCHEDULED', 'POSTPONED', 'CANCELLED')
    AND home_score IS NULL
    AND away_score IS NULL
  )
  OR
  (
    status IN ('LIVE', 'PAUSED', 'FINISHED')
    AND home_score IS NOT NULL
    AND away_score IS NOT NULL
  )
);

ALTER TABLE predictions
ADD CONSTRAINT predictions_points_valid
CHECK (points IS NULL OR points IN (0, 1, 3, 4, 7));
