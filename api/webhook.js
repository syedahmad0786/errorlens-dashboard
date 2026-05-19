// ErrorLens — Webhook receiver for n8n / Make.com / custom HTTP error ingestion
// POST /api/webhook → inserts error into el_errors + updates el_workflows stats
// Validates API key via x-api-key header or ?key= query param

const SB_URL = 'https://erpzzrdgbrhapzlcielt.supabase.co/rest/v1';
const SB_KEY = 'sb_publishable_r5FDMEL2kufqPFtAjj9HKA_0tPJXC_4';
const WEBHOOK_SECRET = process.env.ERRORLENS_WEBHOOK_SECRET || 'el_webhook_2025';

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Validate API key
  const apiKey = req.headers['x-api-key'] || req.query?.key;
  if (apiKey !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  try {
    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Empty body' });

    // Support batch (array) or single error
    const errors = Array.isArray(body) ? body : [body];    const results = [];

    for (const err of errors) {
      // Map incoming fields to el_errors schema
      const record = {
        workflow_id: err.workflow_id || err.workflowId || null,
        execution_id: err.execution_id || err.executionId || null,
        platform_type: err.platform_type || err.platform || 'n8n',
        error_message: err.error_message || err.message || err.error || 'Unknown error',
        error_type: err.error_type || err.type || err.code || 'UNKNOWN',
        error_node: err.error_node || err.node || err.nodeName || null,
        severity: err.severity || 'error',
        occurred_at: err.occurred_at || err.timestamp || new Date().toISOString(),
        is_resolved: false,
        metadata: err.metadata || null,
      };

      // Insert into el_errors
      const insertRes = await fetch(`${SB_URL}/el_errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify(record),
      });
      if (!insertRes.ok) {
        const errBody = await insertRes.text();
        results.push({ success: false, error: errBody, input: err });
        continue;
      }

      const inserted = await insertRes.json();
      results.push({ success: true, id: inserted[0]?.id });

      // Also insert execution record if we have enough data
      if (record.execution_id && record.workflow_id) {
        const execRecord = {
          id: record.execution_id,
          workflow_id: record.workflow_id,
          platform_type: record.platform_type,
          status: 'error',
          started_at: err.started_at || record.occurred_at,
          finished_at: err.finished_at || record.occurred_at,
          duration_ms: err.duration_ms || err.duration || null,
          error_message: record.error_message,
          error_node: record.error_node,
          error_type: record.error_type,
        };
        await fetch(`${SB_URL}/el_executions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(execRecord),
        }).catch(() => {}); // Best-effort
      }
    }

    const successCount = results.filter(r => r.success).length;
    return res.status(successCount > 0 ? 201 : 400).json({
      received: errors.length,
      inserted: successCount,
      failed: errors.length - successCount,
      results,
    });
  } catch (e) {
    console.error('[ErrorLens webhook]', e);
    return res.status(500).json({ error: 'Internal server error', message: e.message });
  }
};
