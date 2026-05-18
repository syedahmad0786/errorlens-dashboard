/**
 * ErrorLens Real-Time Webhook Endpoint
 * Vercel Serverless Function — receives error events from n8n and Make.com
 *
 * POST /api/webhook
 * Headers: x-api-key: <WEBHOOK_SECRET>
 * Body: { platform, event, data }
 */

const https = require('https');

const SB_URL = 'https://erpzzrdgbrhapzlcielt.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_8wSGuMq-azxRHB6NgTycIA_rcehHFxc';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'el-wh-2026-secret';

function sbRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(`${SB_URL}${path}`);
    const data = JSON.stringify(body);
    const r = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      timeout: 15000,
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(b);
        else reject(new Error(`Supabase ${res.statusCode}: ${b.slice(0, 300)}`));
      });
    });
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(); reject(new Error('Supabase timeout')); });
    r.write(data);
    r.end();
  });
}

async function upsert(table, rows, onConflict) {
  const suffix = onConflict ? `?on_conflict=${onConflict}` : '';
  await sbRequest(`/rest/v1/${table}${suffix}`, 'POST', rows);
}

function processN8nError(data) {
  const execution = data.execution || data;
  const workflow = data.workflow || execution.workflow || {};
  const execId = execution.id || execution.executionId || `${Date.now()}`;
  const wfId = workflow.id || execution.workflowId || 'unknown';
  const wfName = workflow.name || execution.workflowName || 'Unknown Workflow';

  let errorMessage = 'Execution failed';
  let errorNode = null;
  if (execution.error) {
    errorMessage = execution.error.message || execution.error.description || JSON.stringify(execution.error).slice(0, 500);
    errorNode = execution.error.node || null;
  } else if (data.error) {
    errorMessage = data.error.message || data.error.description || String(data.error).slice(0, 500);
    errorNode = data.error.node || null;
  } else if (typeof data.message === 'string') {
    errorMessage = data.message;
  }

  const now = new Date().toISOString();
  const occurredAt = execution.stoppedAt || execution.startedAt || now;

  return {
    error: {
      id: `n8n-err-${execId}`, workflow_id: `n8n-${wfId}`, execution_id: `n8n-exec-${execId}`,
      platform_type: 'n8n', error_message: errorMessage, error_node: errorNode,
      error_type: 'execution_error', severity: 'error', is_resolved: false,
      occurred_at: occurredAt, metadata: { source: 'webhook', mode: execution.mode || null },
    },
    execution: {
      id: `n8n-exec-${execId}`, workflow_id: `n8n-${wfId}`, platform_type: 'n8n',
      external_id: `n8n-exec-${execId}`, status: 'error', mode: execution.mode || null,
      started_at: execution.startedAt || now, finished_at: execution.stoppedAt || now,
      duration_ms: (execution.startedAt && execution.stoppedAt)
        ? (new Date(execution.stoppedAt) - new Date(execution.startedAt)) : null,
      error_message: errorMessage, error_node: errorNode, error_type: 'execution_error',
      metadata: { source: 'webhook' },
    },
    workflowUpdate: {
      id: `n8n-${wfId}`, platform_type: 'n8n', external_id: String(wfId),
      name: wfName, last_execution_at: occurredAt,
    },
  };
}

function processMakeError(data) {
  const scenarioId = data.scenarioId || data.scenario?.id || 'unknown';
  const scenarioName = data.scenarioName || data.scenario?.name || 'Unknown Scenario';
  const logId = data.logId || data.id || `${Date.now()}`;
  let errorMessage = data.error || data.detail || data.message || 'Execution failed';
  if (typeof errorMessage === 'object') errorMessage = JSON.stringify(errorMessage).slice(0, 500);
  const now = new Date().toISOString();
  const occurredAt = data.timestamp || now;

  return {
    error: {
      id: `make-err-${logId}`, workflow_id: `make-${scenarioId}`, execution_id: `make-log-${logId}`,
      platform_type: 'make', error_message: errorMessage, error_node: null,
      error_type: 'execution_error', severity: 'error', is_resolved: false,
      occurred_at: occurredAt, metadata: { source: 'webhook', operations: data.operations || 0 },
    },
    execution: {
      id: `make-log-${logId}`, workflow_id: `make-${scenarioId}`, platform_type: 'make',
      external_id: `make-log-${logId}`, status: 'error', started_at: occurredAt,
      duration_ms: data.duration ? Math.round(data.duration * 1000) : null,
      operations_used: data.operations || 0, error_message: errorMessage,
      error_type: 'execution_error', metadata: { source: 'webhook' },
    },
    workflowUpdate: {
      id: `make-${scenarioId}`, platform_type: 'make', external_id: String(scenarioId),
      name: scenarioName, last_execution_at: occurredAt,
    },
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  try {
    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Empty body' });

    const platform = (body.platform || '').toLowerCase();
    const event = body.event || '';

    if (event === 'test' || event === 'ping') {
      return res.status(200).json({ ok: true, message: 'Webhook is live', timestamp: new Date().toISOString() });
    }

    let processed;
    if (platform === 'n8n' || event.startsWith('n8n.')) {
      processed = processN8nError(body.data || body);
    } else if (platform === 'make' || event.startsWith('make.')) {
      processed = processMakeError(body.data || body);
    } else if (body.execution || body.workflowId || body.data?.execution) {
      processed = processN8nError(body.data || body);
    } else if (body.scenarioId || body.data?.scenarioId) {
      processed = processMakeError(body.data || body);
    } else {
      return res.status(400).json({ error: 'Unknown platform. Set platform to "n8n" or "make".' });
    }

    const results = await Promise.allSettled([
      upsert('el_errors', [processed.error]),
      upsert('el_executions', [processed.execution]),
      upsert('el_workflows', [processed.workflowUpdate]),
    ]);

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('Partial failures:', failures.map(f => f.reason?.message));
      return res.status(207).json({
        ok: true, partial: true, errorId: processed.error.id,
        errors: failures.map(f => f.reason?.message),
      });
    }

    return res.status(200).json({
      ok: true, errorId: processed.error.id, executionId: processed.execution.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};
