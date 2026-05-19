-- ErrorLens — Migration 003: Ops + Intelligence schema
-- Run this in the Supabase SQL editor to enable:
--   • health-checks logging
--   • error retention/archive
--   • configurable alert thresholds
--   • multi-environment support
--   • runbook persistence

-- ──────────────────────────────────────────────────────────────────────────
-- Ops #1: Health checks log
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.el_health_checks (
  id BIGSERIAL PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stale_workflow_count INTEGER NOT NULL DEFAULT 0,
  total_active INTEGER NOT NULL DEFAULT 0,
  threshold_min INTEGER NOT NULL DEFAULT 60,
  payload JSONB
);
CREATE INDEX IF NOT EXISTS idx_el_health_checks_ran_at ON public.el_health_checks(ran_at DESC);
ALTER TABLE public.el_health_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_health_checks ON public.el_health_checks;
CREATE POLICY anon_all_health_checks ON public.el_health_checks FOR ALL TO anon USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────
-- Ops #2: Errors archive (cold storage for retention)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.el_errors_archive (
  LIKE public.el_errors INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_el_errors_archive_archived_at ON public.el_errors_archive(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_el_errors_archive_workflow_id ON public.el_errors_archive(workflow_id);
ALTER TABLE public.el_errors_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_errors_archive ON public.el_errors_archive;
CREATE POLICY anon_all_errors_archive ON public.el_errors_archive FOR ALL TO anon USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────
-- Ops #3: Alert thresholds (configurable, evaluated by cron-ops job)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.el_alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  workflow_id UUID REFERENCES public.el_workflows(id) ON DELETE CASCADE,
  platform_type TEXT,
  severity TEXT,
  error_count_threshold INTEGER NOT NULL DEFAULT 5,
  window_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  slack_channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_fired_at TIMESTAMPTZ
);
ALTER TABLE public.el_alert_thresholds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_thresholds ON public.el_alert_thresholds;
CREATE POLICY anon_all_thresholds ON public.el_alert_thresholds FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed two reasonable defaults
INSERT INTO public.el_alert_thresholds (name, description, severity, error_count_threshold, window_minutes)
VALUES
  ('Critical error spike', 'More than 3 critical errors in 1h', 'critical', 3, 60),
  ('High error volume', 'More than 20 errors of any severity in 1h', NULL, 20, 60)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────
-- Ops #4: Multi-environment support
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.el_workflows  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'production';
ALTER TABLE public.el_errors     ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'production';
ALTER TABLE public.el_executions ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX IF NOT EXISTS idx_el_workflows_environment ON public.el_workflows(environment);
CREATE INDEX IF NOT EXISTS idx_el_errors_environment    ON public.el_errors(environment);
CREATE INDEX IF NOT EXISTS idx_el_executions_environment ON public.el_executions(environment);

-- ──────────────────────────────────────────────────────────────────────────
-- Tabs upgrade: Runbook persistence (Task #9)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.el_runbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Incident',
  severity TEXT NOT NULL DEFAULT 'info',
  steps JSONB NOT NULL DEFAULT '[]',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.el_runbooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_runbooks ON public.el_runbooks;
CREATE POLICY anon_all_runbooks ON public.el_runbooks FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed the 5 default runbooks from the current hardcoded list
INSERT INTO public.el_runbooks (title, category, severity, steps) VALUES
  ('n8n Workflow Failure Recovery', 'Incident', 'critical', '[
    {"title":"Check n8n dashboard","desc":"Open n8n. Navigate to Executions and find the failed execution."},
    {"title":"Identify the failed node","desc":"Click the failed execution to see which node threw the error."},
    {"title":"Check credentials","desc":"If the error is auth-related, verify the affected integration credentials."},
    {"title":"Retry the execution","desc":"If transient, retry the execution from the failed node."},
    {"title":"Fix and re-deploy","desc":"If code/config change required, edit, test, then activate."},
    {"title":"Verify in ErrorLens","desc":"Check ErrorLens to confirm error is no longer recurring."}
  ]'::jsonb),
  ('Make.com Scenario Error Handling', 'Incident', 'error', '[
    {"title":"Open Make.com dashboard","desc":"Navigate to your Make.com organization."},
    {"title":"Check the DLQ","desc":"Open the scenario''s Incomplete Executions to see queued failures."},
    {"title":"Review error details","desc":"Click each failed execution for module, error code, input data."},
    {"title":"Fix the root cause","desc":"Refresh OAuth tokens, increase timeouts, fix field mappings."},
    {"title":"Replay failed executions","desc":"Select and use Replay to re-process."}
  ]'::jsonb),
  ('Database Connection Failure', 'Infrastructure', 'critical', '[
    {"title":"Check Supabase status","desc":"Visit status.supabase.com."},
    {"title":"Verify connection string","desc":"Ensure URL and credentials are correct."},
    {"title":"Check connection limits","desc":"Supabase free tier has limits."},
    {"title":"Restart affected workflows","desc":"Re-activate paused or errored workflows."}
  ]'::jsonb)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────
-- Helper view: workflow last execution
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.el_workflow_freshness AS
SELECT w.id, w.name, w.platform_type, w.environment, w.is_active,
       MAX(e.started_at) AS last_execution_at,
       EXTRACT(EPOCH FROM (NOW() - MAX(e.started_at))) / 60 AS minutes_since_last
FROM public.el_workflows w
LEFT JOIN public.el_executions e ON e.workflow_id = w.id
GROUP BY w.id;

-- Add last_execution_at to el_workflows if missing (denormalized for fast queries)
ALTER TABLE public.el_workflows ADD COLUMN IF NOT EXISTS last_execution_at TIMESTAMPTZ;
