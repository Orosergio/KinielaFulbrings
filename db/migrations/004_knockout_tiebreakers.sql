ALTER TABLE matches
ADD COLUMN IF NOT EXISTS home_penalty_score integer,
ADD COLUMN IF NOT EXISTS away_penalty_score integer,
ADD COLUMN IF NOT EXISTS winner_side varchar(8);

ALTER TABLE matches
DROP CONSTRAINT IF EXISTS matches_home_penalty_score_valid;

ALTER TABLE matches
ADD CONSTRAINT matches_home_penalty_score_valid
CHECK (home_penalty_score IS NULL OR home_penalty_score BETWEEN 0 AND 30);

ALTER TABLE matches
DROP CONSTRAINT IF EXISTS matches_away_penalty_score_valid;

ALTER TABLE matches
ADD CONSTRAINT matches_away_penalty_score_valid
CHECK (away_penalty_score IS NULL OR away_penalty_score BETWEEN 0 AND 30);

ALTER TABLE matches
DROP CONSTRAINT IF EXISTS matches_penalty_scores_pair_valid;

ALTER TABLE matches
ADD CONSTRAINT matches_penalty_scores_pair_valid
CHECK (
  (
    home_penalty_score IS NULL
    AND away_penalty_score IS NULL
  )
  OR
  (
    status = 'FINISHED'
    AND home_score IS NOT NULL
    AND away_score IS NOT NULL
    AND home_score = away_score
    AND home_penalty_score IS NOT NULL
    AND away_penalty_score IS NOT NULL
    AND home_penalty_score <> away_penalty_score
  )
);

ALTER TABLE matches
DROP CONSTRAINT IF EXISTS matches_winner_side_valid;

ALTER TABLE matches
ADD CONSTRAINT matches_winner_side_valid
CHECK (
  winner_side IS NULL
  OR
  (
    status = 'FINISHED'
    AND winner_side IN ('home', 'away')
    AND home_score IS NOT NULL
    AND away_score IS NOT NULL
    AND (
      (
        home_score > away_score
        AND winner_side = 'home'
      )
      OR
      (
        away_score > home_score
        AND winner_side = 'away'
      )
      OR
      (
        home_score = away_score
        AND (
          (
            home_penalty_score IS NULL
            AND away_penalty_score IS NULL
          )
          OR
          (
            home_penalty_score > away_penalty_score
            AND winner_side = 'home'
          )
          OR
          (
            away_penalty_score > home_penalty_score
            AND winner_side = 'away'
          )
        )
      )
    )
  )
);
