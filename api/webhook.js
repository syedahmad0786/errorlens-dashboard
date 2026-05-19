// ErrorLens — Universal webhook receiver for n8n / Make.com / custom HTTP error ingestion
// POST /api/webhook → inserts into el_errors + el_executions + fans out to Slack on error/critical.
// Validates API key via x-api-key header or ?key= query param.

const SB_URL = 'https://erpzzrdgbrhapzlcielt.supabase.co/rest/v1';
const SB_KEY = 'sb_publishable_r5FDMEL2kufqPFtAjj9HKA_0tPJXC_4';
const WEBHOOK_SECRET = process.env.ERRORLENS_WEBHOOK_SECRET || 'el_webhook_2025';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

function normalizeN8nPayload(raw) {
  const wf = raw.workflow || {};
  const exec = raw.execution || {};
  const err = raw.error || {};
  return {
    workflow_id:   raw.workflow_id || raw.workflowId || wf.id || null,
    workflow_name: raw.workflow_name || wf.name || null,
    execution_id:  raw.execution_id || raw.executionId || exec.id || null,
    platform_type: 'n8n',
    error_message: err.message || raw.error_message || raw.message || 'Unknown n8n error',
    error_type:    err.name || raw.error_type || raw.type || 'N8N_ERROR',
    error_node:    err.node?.name || raw.error_node || raw.node || raw.nodeName || null,
    severity:      raw.severity || (err.name?.toLowerCase().includes('credential') ? 'critical' : 'error'),
    occurred_at:   exec.startedAt || raw.occurred_at || raw.timestamp || new Date().toISOString(),
    started_at:    exec.startedAt || raw.started_at || null,
    finished_at:   exec.stoppedAt || raw.finished_at || null,
    duration_ms:   raw.duration_ms || (exec.stoppedAt && exec.startedAt ? new Date(exec.stoppedAt) - new Date(exec.startedAt) : null),
    metadata: { raw_payload: raw, stack: err.stack || null, platform_url: wf.id ? `${raw.n8n_base_url || 'https://n8n.aimanagingservices.com'}/workflow/${wf.id}/executions/${exec.id || ''}` : null },
  };
}

function normalizeMakePayload(raw) {
  const scn = raw.scenario || {};
  const exec = raw.execution || {};
  const err = raw.error || {};
  return {
    workflow_id:   raw.workflow_id || raw.scenarioId || scn.id || null,
    workflow_name: raw.workflow_name || scn.name || null,
    execution_id:  raw.execution_id || exec.id || null,
    platform_type: 'make',
    error_message: err.message || raw.error_message || raw.message || 'Unknown Make.com error',
    error_type:    err.type || raw.error_type || raw.type || 'MAKE_ERROR',
    error_node:    err.module?.name || raw.error_node || raw.moduleName || raw.module || null,
    severity:      raw.severity || 'error',
    occurred_at:   exec.startedAt || raw.occurred_at || raw.timestamp || new Date().toISOString(),
    started_at:    exec.startedAt || raw.started_at || null,
    finished_at:   exec.endedAt || raw.finished_at || null,
    duration_ms:   raw.duration_ms || (exec.endedAt && exec.startedAt ? new Date(exec.endedAt) - new Date(exec.startedAt) : null),
    metadata: { raw_payload: raw, dlq: raw.dlq || null, platform_url: scn.id ? `https://make.com/organization/-/scenario/${scn.id}` : null },
  };
}

function normalizeGenericPayload(raw) {
  return {
    workflow_id:   raw.workflow_id || raw.workflowId || null,
    workflow_name: raw.workflow_name || raw.workflowName || null,
    execution_id:  raw.execution_id || raw.executionId || null,
    platform_type: raw.platform_type || raw.platform || 'unknown',
    error_message: raw.error_message || raw.message || raw.error || 'Unknown error',
    error_type:    raw.error_type || raw.type || raw.code || 'UNKNOWN',
    error_node:    raw.error_node || raw.node || raw.nodeName || null,
    severity:      raw.severity || 'error',
    occurred_at:   raw.occurred_at || raw.timestamp || new Date().toISOString(),
    started_at:    raw.started_at || null,
    finished_at:   raw.finished_at || null,
    duration_ms:   raw.duration_ms || raw.duration || null,
    metadata:      raw.metadata || { raw_payload: raw },
  };
}

function detectPlatform(req, raw) {
  const hint = (req.headers['x-platform'] || raw.platform_type || raw.platform || '').toLowerCase();
  if (hint.includes('n8n')) return 'n8n';
  if (hint.includes('make')) return 'make';
  if (raw.workflow && raw.execution && (raw.error?.node || raw.error?.stack)) return 'n8n';
  if (raw.scenario && raw.execution) return 'make';
  if (raw.executionId && (raw.nodeName || raw.workflowId)) return 'n8n';
  return 'generic';
}

async function postToSlack(record, platform) {
  if (!SLACK_WEBHOOK_URL) return { skipped: 'no SLACK_WEBHOOK_URL' };
  const sevEmoji = record.severity === 'critical' ? ':rotating_light:' : record.severity === 'error' ? ':warning:' : ':information_source:';
  const color = record.severity === 'critical' ? '#dc2626' : record.severity === 'error' ? '#f59e0b' : '#3b82f6';
  const body = {
    text: `${sevEmoji} ErrorLens: ${record.severity.toUpperCase()} on ${platform}`,
    attachments: [{
      color,
      title: record.error_type + ' — ' + (record.workflow_name || record.workflow_id || 'Unknown workflow'),
      title_link: record.metadata?.platform_url || 'https://errorlens-deploy.vercel.app/',
      text: record.error_message,
      fields: [
        { title: 'Platform', value: platform, short: true },
        { title: 'Node', value: record.error_node || '—', short: true },
        { title: 'Execution', value: record.execution_id || '—', short: true },
        { title: 'Severity', value: record.severity, short: true },
      ],
      footer: 'ErrorLens · ' + new Date(record.occurred_at).toLocaleString(),
    }],
  };
  try {
    const r = await fetch(SLACK_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, status: r.status };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function insertError(record) {
  const dbRecord = {
    workflow_id: record.workflow_id,
    execution_id: record.execution_id,
    platform_type: record.platform_type,
    error_message: record.error_message,
    error_type: record.error_type,
    error_node: record.error_node,
    severity: record.severity,
    occurred_at: record.occurred_at,
    is_resolved: false,
    metadata: record.metadata,
  };
  const res = await fetch(`${SB_URL}/el_errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'return=representation' },
    body: JSON.stringify(dbRecord),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  const data = await res.json();
  return { ok: true, id: data[0]?.id };
}

async function upsertExecution(record) {
  if (!record.execution_id || !record.workflow_id) return { skipped: true };
  const exec = {
    id: record.execution_id,
    workflow_id: record.workflow_id,
    platform_type: record.platform_type,
    status: 'error',
    started_at: record.started_at || record.occurred_at,
    finished_at: record.finished_at || record.occurred_at,
    duration_ms: record.duration_ms,
    error_message: record.error_message,
    error_node: record.error_node,
    error_type: record.error_type,
  };
  try {
    await fetch(`${SB_URL}/el_executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(exec),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-platform');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = req.headers['x-api-key'] || req.query?.key;
  if (apiKey !== WEBHOOK_SECRET) return res.status(401).json({ error: 'Invalid API key' });
  try {
    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Empty body' });
    const errors = Array.isArray(body) ? body : [body];
    const results = [];
    for (const raw of errors) {
      const platform = detectPlatform(req, raw);
      const record = platform === 'n8n' ? normalizeN8nPayload(raw)
                  : platform === 'make' ? normalizeMakePayload(raw)
                  : normalizeGenericPayload(raw);
      const ins = await insertError(record);
      if (!ins.ok) { results.push({ success: false, platform, error: ins.error, input: raw }); continue; }
      await upsertExecution(record);
      let slackResult = null;
      if (['error', 'critical'].includes(record.severity)) slackResult = await postToSlack(record, platform);
      results.push({ success: true, id: ins.id, platform, slack: slackResult });
    }
    const successCount = results.filter(r => r.success).length;
    return res.status(successCount > 0 ? 201 : 400).json({
      received: errors.length, inserted: successCount, failed: errors.length - successCount, results,
    });
  } catch (e) {
    console.error('[ErrorLens webhook]', e);
    return res.status(500).json({ error: 'Internal server error', message: e.message });
  }
};
