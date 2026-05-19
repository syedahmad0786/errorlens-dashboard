// ErrorLens — Universal webhook receiver for n8n / Make.com / custom HTTP error ingestion
// POST /api/webhook → inserts error into el_errors + el_executions + fans out to Slack
// Validates API key via x-api-key header or ?key= query param.
// Supports platform-specific payload shapes (n8n Error Trigger node, Make.com Error Handler).

const SB_URL = 'https://erpzzrdgbrhapzlcielt.supabase.co/rest/v1';
const SB_KEY = 'sb_publishable_r5FDMEL2kufqPFtAjj9HKA_0tPJXC_4';
const WEBHOOK_SECRET = process.env.ERRORLENS_WEBHOOK_SECRET || 'el_webhook_2025';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || ''; // optional — silent no-op if unset

// ──────────────────────────────────────────────────────────────────────────
// Platform-specific payload normalizers
// ──────────────────────────────────────────────────────────────────────────
function normalizeN8nPayload(raw) {
  // n8n Error Trigger node sends: { execution, workflow, error, ... }
  // Also: when forwarded by our central Error Handler workflow, the payload may
  // already be flattened. Handle both shapes.
  const wf = raw.workflow || {};
  const exec = raw.execution || {};
  const err = raw.error || {};
  return {
    workflow_id: raw.workflow_id || raw.workflowId || wf.id || null,
    workflow_name: raw.workflow_name || wf.name || null,
    execution_id: raw.execution_id || raw.executionId || exec.id || null,
    platform_type: 'n8n',
    error_message: err.message || raw.error_message || raw.message || 'Unknown n8n error',
    error_type: err.name || raw.error_type || raw.type || 'N8N_ERROR',
    error_node: err.node?.name || raw.error_node || raw.node || raw.nodeName || null,
    severity: raw.severity || (err.name?.toLowerCase().includes('credential') ? 'critical' : 'error'),
    occurred_at: exec.startedAt || raw.occurred_at || raw.timestamp || new Date().toISOString(),
    started_at: exec.startedAt || raw.started_at || null,
    finished_at: exec.stoppedAt || raw.finished_at || null,
    duration_ms: raw.duration_ms || (exec.stoppedAt && exec.startedAt ? new Date(exec.stoppedAt) - new Date(exec.startedAt) : null),
    metadata: { raw_payload: raw, stack: err.stack || null, platform_url: wf.id ? `${raw.n8n_base_url || ''}/workflow/${wf.id}/executions/${exec.id || ''}`.replace(/\/+$/, '') : null },
  };
}

function normalizeMakePayload(raw) {
  // Make.com Error Handler / Webhook sends: { scenario, execution, error, ... }
  // Or our wrapper module may flatten before posting.
  const scn = raw.scenario || {};
  const exec = raw.execution || {};
  const err = raw.error || {};
  return {
    workflow_id: raw.workflow_id || raw.scenarioId || scn.id || null,
    workflow_name: raw.workflow_name || scn.name || null,
    execution_id: raw.execution_id || exec.id || null,
    platform_type: 'make',
    error_message: err.message || raw.error_message || raw.message || 'Unknown Make.com error',
    error_type: err.type || raw.error_type || raw.type || 'MAKE_ERROR',
    error_node: err.module?.name || raw.error_node || raw.moduleName || raw.module || null,
    severity: raw.severity || 'error',
    occurred_at: exec.startedAt || raw.occurred_at || raw.timestamp || new Date().toISOString(),
    started_at: exec.startedAt || raw.started_at || null,
    finished_at: exec.endedAt || raw.finished_at || null,
    duration_ms: raw.duration_ms || (exec.endedAt && exec.startedAt ? new Date(exec.endedAt) - new Date(exec.startedAt) : null),
    metadata: { raw_payload: raw, dlq: raw.dlq || null, platform_url: scn.id ? `https://make.com/organization/-/scenario/${scn.id}` : null },
  };
}

function normalizeGenericPayload(raw) {
  // Fallback for legacy / custom posters — preserve existing aliasing
  return {
    workflow_id: raw.workflow_i