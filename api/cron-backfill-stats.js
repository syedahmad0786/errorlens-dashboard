// ErrorLens — Daily stats backfill endpoint
// Rebuilds el_daily_stats for the past N days from el_errors + el_executions.
// Idempotent: existing rows are replaced via upsert (workflow_id, stat_date, platform_type).
//
// Triggered by GitHub Actions cron nightly. Also callable on demand:
//   curl -X POST https://errorlens-deploy.vercel.app/api/cron-backfill-stats \
//        -H "x-cron-secret: <CRON_SECRET>"

const SB_URL = 'https://erpzzrdgbrhapzlcielt.supabase.co/rest/v1';
const SB_KEY = 'sb_publishable_r5FDMEL2kufqPFtAjj9HKA_0tPJXC_4';
const CRON_SECRET = process.env.CRON_SECRET || 'el_cron_2025';

async function fetchAll(table, params) {
  const r = await fetch(`${SB_URL}/${table}?${params}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${table} — ${await r.text()}`);
  return r.json();
}

async function upsertRows(table, rows) {
  if (rows.length === 0) return { inserted: 0 };
  const r = await fetch(`${SB_URL}/${table}`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`Upsert ${table} ${r.status}: ${await r.text()}`);
  return { inserted: rows.length };
}

function dayISO(d) {
  return new Date(d).toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // Allow GET (for GitHub Actions schedule) and POST (manual)
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  // Auth: header OR query param
  const provided = req.headers['x-cron-secret'] || req.query?.secret;
  if (provided !== CRON_SECRET) return res.status(401).json({ error: 'Invalid cron secret' });

  const days = parseInt(req.query?.days) || 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const startedAt = Date.now();

  try {
    // Pull raw error + execution data
    const [errors, executions] = await Promise.all([
      fetchAll('el_errors', `select=workflow_id,platform_type,occurred_at,is_resolved&occurred_at=gte.${since}&limit=20000`),
      fetchAll('el_executions', `select=workflow_id,platform_type,status,started_at,duration_ms&started_at=gte.${since}&limit=20000`),
    ]);

    // Group by (workflow_id, stat_date, platform_type)
    const buckets = new Map();
    const k = (wf, d, p) => `${wf}|${d}|${p}`;

    for (const e of errors) {
      if (!e.workflow_id || !e.occurred_at) continue;
      const key = k(e.workflow_id, dayISO(e.occurred_at), e.platform_type || 'unknown');
      const b = buckets.get(key) || { workflow_id: e.workflow_id, stat_date: dayISO(e.occurred_at), platform_type: e.platform_type || 'unknown', error_count: 0, total_runs: 0, success_count: 0, total_duration_ms: 0 };
      b.error_count += 1;
      buckets.set(key, b);
    }
    for (const x of executions) {
      if (!x.workflow_id || !x.started_at) continue;
      const key = k(x.workflow_id, dayISO(x.started_at), x.platform_type || 'unknown');
      const b = buckets.get(key) || { workflow_id: x.workflow_id, stat_date: dayISO(x.started_at), platform_type: x.platform_type || 'unknown', error_count: 0, total_runs: 0, success_count: 0, total_duration_ms: 0 };
      b.total_runs += 1;
      if (x.status === 'success') b.success_count += 1;
      if (typeof x.duration_ms === 'number') b.total_duration_ms += x.duration_ms;
      buckets.set(key, b);
    }

    // Compute avg_duration_ms and shape rows
    const rows = Array.from(buckets.values()).map(b => ({
      workflow_id: b.workflow_id,
      stat_date: b.stat_date,
      platform_type: b.platform_type,
      error_count: b.error_count,
      total_runs: b.total_runs,
      success_count: b.success_count,
      avg_duration_ms: b.total_runs > 0 ? Math.round(b.total_duration_ms / b.total_runs) : null,
      updated_at: new Date().toISOString(),
    }));

    // Upsert in batches of 500
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const slice = rows.slice(i, i + 500);
      await upsertRows('el_daily_stats', slice);
      inserted += slice.length;
    }

    // Also write a sync-run marker
    await fetch(`${SB_URL}/el_platform_snapshots`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        platform_type: 'errorlens',
        snapshot_date: dayISO(Date.now()),
        total_workflows: new Set(rows.map(r => r.workflow_id)).size,
        active_workflows: new Set(rows.filter(r => r.total_runs > 0).map(r => r.workflow_id)).size,
        error_count: rows.reduce((s, r) => s + r.error_count, 0),
      }),
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      days_backfilled: days,
      errors_scanned: errors.length,
      executions_scanned: executions.length,
      rows_upserted: inserted,
      duration_ms: Date.now() - startedAt,
      ran_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[ErrorLens backfill-stats]', e);
    return res.status(500).json({ error: 'Backfill failed', message: e.message });
  }
};
