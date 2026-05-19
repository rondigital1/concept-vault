ALTER TABLE run_steps
  DROP CONSTRAINT IF EXISTS run_steps_status_check;

ALTER TABLE run_steps
  ADD CONSTRAINT run_steps_status_check
  CHECK (status IN ('running','ok','error','partial','skipped'));
