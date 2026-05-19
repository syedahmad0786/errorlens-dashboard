// ErrorLens â Live Supabase data layer
// Replaces mock-data.js with real data from Supabase
// Maintains the same window.EL_DATA shape so pages.jsx stays compatible

window.EL_SUPABASE = (() => {
  const SB = 'https://erpzzrdgbrhapzlcielt.supabase.co/rest/v1';
  const KEY = 'sb_publishable_r5FDMEL2kufqPFtAjj9HKA_0tPJXC_4';
  const HDRS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

  async function get(table, params) {
    const r = await fetch(`${SB}/${table}?${params}`, { headers: HDRS });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${table}`);
    return r.json();
  }

  async function post(table, body) {
    const r = await fetch(`${SB}/${table}`, {
      method: 'POST', headers: { ...HDRS, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Supabase POST ${r.status}: ${table}`);
    return r.json();
  }

  async function patch(table, params, body) {
    const r = await fetch(`${SB}/${table}?${params}`, {
      method: 'PATCH', headers: { ...HDRS, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Supabase PATCH ${r.status}: ${table}`);
    return r.json();
  }

  async function del(table, params) {
    const r = await fetch(`${SB}/${table}?${params}`, {
      method: 'DELETE', headers: { ...HDRS },
    });
    if (!r.ok) throw new Error(`Supabase DELETE ${r.status}: ${table}`);
    return true;
  }

  async function upsert(table, body) {
    const r = await fetch(`${SB}/${table}`, {
      method: 'POST', headers: { ...HDRS, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Supabase UPSERT ${r.status}: ${table}`);
    return r.json();
  }

  return { get, post, patch, del, upsert };
})();

// Build EL_DATA from Supabase â called once at startup, then available globally
window.EL_DATA_LOADING = (async () => {
  const sb = window.EL_SUPABASE;

  // Parallel fetch all tables
  const [workflows, errors, dailyStats, snapshots, platforms, executions, teamMembers, workflowOwners] = await Promise.all([
    sb.get('el_workflows', 'select=*&order=total_errors.desc.nullslast,total_executions.desc.nullslast&limit=500'),
    sb.get('el_errors', 'select=*&order=occurred_at.desc.nullslast&limit=300'),
    sb.get('el_daily_stats', 'select=*&order=stat_date.desc&limit=1500'),
    sb.get('el_platform_snapshots', 'select=*&order=snapshot_date.desc&limit=10'),
    sb.get('el_platforms', 'select=*'),
    sb.get('el_executions', 'select=id,workflow_id,platform_type,status,started_at,finished_at,duration_ms,error_message,error_node,error_type&order=started_at.desc.nullslast&limit=500'),
    sb.get('el_team_members', 'select=*&order=name.asc'),
    sb.get('el_workflow_owners', 'select=*'),
  ]);

  // Store raw data for pages that need it
  window.EL_RAW = { workflows, errors, dailyStats, snapshots, platforms, executions, teamMembers, workflowOwners };

  // --- Build compatible EL_DATA ---

  function relTime(dateStr) {
    if (!dateStr) return 'unknown';
    const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
    return `${Math.floor(mins/1440)}d ago`;
  }

  // Map Supabase errors to EL_DATA events format
  const severityMap = { error: 'error', warning: 'warn', critical: 'critical', info: 'info' };
  const events = errors.map((e, i) => {
    const wf = workflows.find(w => w.id === e.workflow_id);
    const minsAgo = e.occurred_at ? Math.floor((Date.now() - new Date(e.occurred_at)) / 60000) : 9999;
    return {
      id: e.id || `evt_${i}`,
      execId: e.execution_id || `exec_${i}`,
      platform: e.platform_type || 'n8n',
      workflow: wf ? wf.name : 'Unknown workflow',
      workflowId: e.workflow_id,
      message: e.error_message || 'Unknown error',
      code: e.error_type || 'UNKNOWN',
      severity: severityMap[e.severity] || 'error',
      status: e.is_resolved ? 'resolved' : 'open',
      minutesAgo: minsAgo,
      timestamp: relTime(e.occurred_at),
      fullTime: e.occurred_at || '',
      assignedTo: null,
      errorNode: e.error_node || null,
    };
  }).sort((a, b) => a.minutesAgo - b.minutesAgo);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const todayStats = dailyStats.filter(d => d.stat_date === today);
  const todayErrors = todayStats.reduce((s, d) => s + (d.error_count || 0), 0);
  const todayRuns = todayStats.reduce((s, d) => s + (d.total_runs || 0), 0);

  // ââ Real Error Timeline from el_executions ââ
  // Group failed executions by hour for the last 24h
  const timeline = (() => {
    const hrs = Array.from({ length: 24 }, (_, h) => ({ hour: h, critical: 0, error: 0, warn: 0, info: 0 }));
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // Use executions for real hourly distribution
    executions.forEach(ex => {
      if (!ex.started_at) return;
      const d = new Date(ex.started_at);
      if (d < cutoff24h) return;
      if (ex.status !== 'error' && ex.status !== 'failed') return;
      const h = d.getHours();
      // Classify by error_type or default to 'error'
      const et = (ex.error_type || '').toLowerCase();
      if (et.includes('critical') || et.includes('timeout')) hrs[h].critical++;
      else if (et.includes('warn')) hrs[h].warn++;
      else hrs[h].error++;
    });
    // Also layer in el_errors for richer severity data
    errors.forEach(e => {
      if (!e.occurred_at) return;
      const d = new Date(e.occurred_at);
      if (d < cutoff24h) return;
      const h = d.getHours();
      const sev = (e.severity || 'error').toLowerCase();
      if (sev === 'critical') hrs[h].critical++;
      else if (sev === 'warning' || sev === 'warn') hrs[h].warn++;
      else if (sev === 'info') hrs[h].info++;
      // skip 'error' here to avoid double-counting with executions
    });
    return hrs;
  })();

  // ââ Workflow Uptime Monitor ââ
  // Compute per-workflow success rates for today, this week, this month, lifetime
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const weekStr = weekAgo.toISOString().slice(0, 10);
  const monthStr = monthAgo.toISOString().slice(0, 10);

  function uptimeFromStats(wfId, fromDate) {
    const relevant = dailyStats.filter(d => d.workflow_id === wfId && d.stat_date >= fromDate);
    const runs = relevant.reduce((s, d) => s + (d.total_runs || 0), 0);
    const errs = relevant.reduce((s, d) => s + (d.error_count || 0), 0);
    if (runs === 0) return null;
    return Math.round((1 - errs / runs) * 1000) / 10; // one decimal
  }

  const workflowUptime = workflows
    .filter(w => (w.total_executions || 0) > 0)
    .map(w => {
      const lifetimeRate = w.total_executions > 0
        ? Math.round((1 - (w.total_errors || 0) / w.total_executions) * 1000) / 10
        : null;
      return {
        id: w.id,
        name: w.name,
        platform: w.platform_type,
        today: uptimeFromStats(w.id, today),
        week: uptimeFromStats(w.id, weekStr),
        month: uptimeFromStats(w.id, monthStr),
        lifetime: lifetimeRate,
        totalRuns: w.total_executions || 0,
      };
    })
    .sort((a, b) => (a.lifetime || 100) - (b.lifetime || 100)); // worst uptime first

  // Overall uptime across all workflows
  const overallUptime = (() => {
    const allRuns = workflows.reduce((s, w) => s + (w.total_executions || 0), 0);
    const allErrs = workflows.reduce((s, w) => s + (w.total_errors || 0), 0);
    const lifetimeVal = allRuns > 0 ? Math.round((1 - allErrs / allRuns) * 1000) / 10 : null;

    const todayR = todayStats.reduce((s, d) => s + (d.total_runs || 0), 0);
    const todayE = todayStats.reduce((s, d) => s + (d.error_count || 0), 0);
    const todayVal = todayR > 0 ? Math.round((1 - todayE / todayR) * 1000) / 10 : null;

    const weekStats = dailyStats.filter(d => d.stat_date >= weekStr);
    const weekR = weekStats.reduce((s, d) => s + (d.total_runs || 0), 0);
    const weekE = weekStats.reduce((s, d) => s + (d.error_count || 0), 0);
    const weekVal = weekR > 0 ? Math.round((1 - weekE / weekR) * 1000) / 10 : null;

    const monthStats = dailyStats.filter(d => d.stat_date >= monthStr);
    const monthR = monthStats.reduce((s, d) => s + (d.total_runs || 0), 0);
    const monthE = monthStats.reduce((s, d) => s + (d.error_count || 0), 0);
    const monthVal = monthR > 0 ? Math.round((1 - monthE / monthR) * 1000) / 10 : null;

    return { today: todayVal, week: weekVal, month: monthVal, lifetime: lifetimeVal };
  })();

  const severityCounts = {
    critical: events.filter(e => e.severity === 'critical').length,
    error: events.filter(e => e.severity === 'error').length,
    warn: events.filter(e => e.severity === 'warn').length,
    info: events.filter(e => e.severity === 'info').length,
  };

  const topErr = errors.find(e => e.error_message && e.error_message.length > 30);
  const stackTrace = topErr ? topErr.error_message : 'No stack trace available';
  const rawPayload = { error: topErr || {}, workflow: workflows[0] || {} };

  const alertRules = [
    { id: 'ar_1', name: 'Critical errors â Slack #incidents', conditions: 'When severity is CRITICAL on any platform', channels: ['slack', 'email'], cooldown: '15 min', on: true, lastFired: 'â' },
    { id: 'ar_2', name: 'n8n volume spike', conditions: 'When n8n errors exceed 10 in 1 hour', channels: ['slack'], cooldown: '60 min', on: true, lastFired: 'â' },
    { id: 'ar_3', name: 'Make.com DLQ alert', conditions: 'When Make.com DLQ items > 0', channels: ['email'], cooldown: '30 min', on: false, lastFired: 'never' },
  ];

  const platformsRegistered = platforms.map(p => ({
    id: p.type || p.id,
    name: p.name,
    status: p.is_connected ? 'active' : 'error',
    events: errors.filter(e => e.platform_type === p.type).length,
    webhook: `${p.base_url || 'â'}`,
    lastSynced: p.last_synced_at,
  }));

  const teamUsers = [
    { name: 'Ahmad Bukhari', email: 'ahmadbukhari4245@gmail.com', role: 'admin', joined: 'Jun 2025', initials: 'AB', color: '#a78bfa' },
  ];

  const ownerMap = {};
  workflowOwners.forEach(wo => {
    const member = teamMembers.find(m => m.id === wo.owner_id);
    if (member) ownerMap[wo.workflow_id] = { ...member, assigned_at: wo.assigned_at };
  });

  window.EL_DATA = {
    events,
    timeline,
    severityCounts,
    stackTrace,
    rawPayload,
    alertRules,
    platformsRegistered,
    teamUsers,
    workflows,
    dailyStats,
    snapshots,
    platforms,
    todayErrors,
    todayRuns,
    teamMembers,
    workflowOwners,
    ownerMap,
    // Uptime Monitor data
    overallUptime,
    workflowUptime,
  };

  window.dispatchEvent(new Event('el:data-ready'));
  return window.EL_DATA;
})();
