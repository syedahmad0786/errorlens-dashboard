// ErrorLens — Unified Ops cron endpoint
// Dispatches to health-checks, data-retention, and alert-threshold-checks based on ?job=
//
// Triggered by GitHub Actions:
//   ?job=health-check     — every 15 min, scans workflows for stale syncs
//   ?job=data-retention   — nightly, archives errors older than retention window
//   ?job=alert-thresholds — every 10 min, evaluates error-rate thresholds and posts Slack
//
// Manual:
//   curl -X POST "https://errorlens-deploy.vercel.app/api/cron-ops?job=health-check" -H "x-cron-secret: <CRON_SECRET>"

const SB_URL = 'https://erpzzrdgbrhapzlcielt.supabase.co/rest/v1';
const SB_KEY = 'sb_publishable_r5FDMEL2kufqPFtAjj9HKA_0tPJXC_4';
const CRON_SECRET = process.env.CRON_SECRET || 'el_cron_2025';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
const STALE_THRESHOLD_MIN = parseInt(process.env.STALE_THRESHOLD_MIN) || 60; // workflow flagged stale if no exec in N min
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS) || 90;

const HDRS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

async function sbGet(table, params) {
  const r = await fetch(`${SB_URL}/${table}?${params}`, { headers: HDRS });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${table}`);
  return r.json();
}
async function sbPost(table, body, prefer) {
  const r = await fetch(`${SB_URL}/${table}`, {
    method: 'POST', headers: { ...HDRS, Prefer: prefer || 'return=minimal' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase POST ${r.status}: ${await r.text()}`);
  return r;
}
async function sbDelete(table, params) {
  const r = await fetch(`${SB_URL}/${table}?${params}`, { method: 'DELETE', headers: HDRS });
  if (!r.ok) throw new Error(`Supabase DELETE ${r.status}: ${await r.text()}`);
  return r;
}

async function slackPost(text, attachments) {
  if (!SLACK_WEBHOOK_URL) return { skipped: true };
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, attachments }),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ──────────────────────────────────────────────────────────────────────────
// Job: health-check — flag workflows whose last execution is stale
// ──────────────────────────────────────────────────────────────────────────
async function jobHealthCheck() {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MIN * 60000).toISOString();
  const workflows = await sbGet('el_workflows', `select=id,name,platform_type,is_active,last_execution_at&is_active=eq.true&limit=1000`);
  const stale = workflows.filter(w => {
    if (!w.last_execution_at) return false;
    return new Date(w.last_execution_at).getTime() < new Date(cutoff).getTime();
  });

  if (stale.length > 0 && SLACK_WEBHOOK_URL) {
    await slackPost(`:warning: ErrorLens health check: ${stale.length} workflow(s) appear stale (no executions in ${STALE_THRESHOLD_MIN} min)`, [{
      color: '#f59e0b',
      fields: stale.slice(0, 10).map(w => ({ title: w.name, value: `${w.platform_type} · last: ${w.last_execution_at}`, short: false })),
    }]);
  }

  // Log to health-checks table (best-effort, table may not exist yet)
  await sbPost('el_health_checks', {
    ran_at: new Date().toISOString(),
    stale_workflow_count: stale.length,
    total_active: workflows.length,
    threshold_min: STALE_THRESHOLD_MIN,
    payload: { stale_ids: stale.map(s => s.id) },
  }, 'return=minimal').catch(() => {});

  return { job: 'health-check', stale_count: stale.length, total_active: workflows.length, stale: stale.map(s => ({ id: s.id, name: s.name, platform: s.platform_type, last: s.last_execution_at })) };
}

// ──────────────────────────────────────────────────────────────────────────
// Job: data-retention — archive errors older than RETENTION_DAYS
// ──────────────────────────────────────────────────────────────────────────
async function jobDataRetention() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
  const stale = await sbGet('el_errors', `select=*&occurred_at=lt.${cutoff}&limit=10000`);

  if (stale.length === 0) return { job: 'data-retention', archived: 0, cutoff };

  // Copy to el_errors_archive
  const archiveRows = stale.map(e => ({ ...e, archived_at: new Date().toISOString() }));
  await sbPost('el_errors_archive', archiveRows, 'resolution=merge-duplicates,return=minimal').catch((e) => {
    console.warn('archive write failed, proceeding without archive', e.message);
  });

  // Delete in batches to avoid URL length limits
  let deleted = 0;
  for (let i = 0; i < stale.length; i += 100) {
    const batch = stale.slice(i, i + 100);
    const ids = batch.map(e => e.id).join(',');
    await sbDelete('el_errors', `id=in.(${ids})`).catch((e) => { console.warn('delete batch failed', e.message); });
    deleted += batch.length;
  }

  return { job: 'data-retention', cutoff, archived: stale.length, deleted };
}

// ──────────────────────────────────────────────────────────────────────────
// Job: alert-thresholds — evaluate configured thresholds, post Slack on breach
// ──────────────────────────────────────────────────────────────────────────
async function jobAlertThresholds() {
  const thresholds = await sbGet('el_alert_thresholds', `select=*&is_active=eq.true&limit=200`).catch(() => []);
  if (thresholds.length === 0) return { job: 'alert-thresholds', evaluated: 0, breaches: 0 };

  const windowMs = 60 * 60 * 1000; // 1 hour evaluation window
  const since = new Date(Date.now() - windowMs).toISOString();
  const recentErrors = await sbGet('el_errors', `select=workflow_id,severity,platform_type,occurred_at&occurred_at=gte.${since}&limit=5000`);

  const breaches = [];
  for (const t of thresholds) {
    const matching = recentErrors.filter(e => {
      if (t.workflow_id && e.workflow_id !== t.workflow_id) return false;
      if (t.platform_type && e.platform_type !== t.platform_type) return false;
      if (t.severity && e.severity !== t.severity) return false;
      return true;
    });
    if (matching.length >= (t.error_count_threshold || 5)) {
      breaches.push({ threshold_id: t.id, name: t.name, count: matching.length, threshold: t.error_count_threshold });
      await slackPost(`:rotating_light: ErrorLens alert: "${t.name}" — ${matching.length} errors in last hour (threshold: ${t.error_count_threshold})`, []);
    }
  }
  return { job: 'alert-thresholds', evaluated: thresholds.length, breaches: breaches.length, breach_detail: breaches };
}

// ──────────────────────────────────────────────────────────────────────────
// Dispatcher
// ──────────────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  const provided = req.headers['x-cron-secret'] || req.query?.secret;
  if (provided !== CRON_SECRET) return res.status(401).json({ error: 'Invalid cron secret' });

  const job = req.query?.job || 'health-check';
  const started = Date.now();

  try {
    let result;
    if (job === 'health-check')         result = await jobHealthCheck();
    else if (job === 'data-retention')  result = await jobDataRetention();
    else if (job === 'alert-thresholds')result = await jobAlertThresholds();
    else return res.status(400).json({ error: `Unknown job: ${job}`, valid: ['health-check', 'data-retention', 'alert-thresholds'] });

    return res.status(200).json({ success: true, duration_ms: Date.now() - started, ...result });
  } catch (e) {
    console.error('[ErrorLens cron-ops]', job, e);
    return res.status(500).json({ error: 'Job failed', job, message: e.message });
  }
};
