// ErrorLens — Live Supabase data layer
// Replaces mock-data.js with real data from Supabase
// Maintains the same window.EL_DATA shape so pages.jsx stays compatible

window.EL_SUPABASE = (() => {
  const SB = 'https://wlnkybvwhsaimeqdcfie.supabase.co/rest/v1';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsbmt5YnZ3aHNhaW1lcWRjZmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Nzc3NzMsImV4cCI6MjA5MzA1Mzc3M30.w9XOgm8wzIr-d5ojACPr_k88TiDJeEMGWV9XiOp7M1c';
  const HDRS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

  async function get(table, params) {
    const r = await fetch(`${SB}/${table}?${params}`, { headers: HDRS });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${table}`);
    return r.json();
  }

  return { get };
})();

// Build EL_DATA from Supabase — called once at startup, then available globally
window.EL_DATA_LOADING = (async () => {
  const sb = window.EL_SUPABASE;

  // Parallel fetch all tables
  const [workflows, errors, dailyStats, snapshots, platforms, executions] = await Promise.all([
    sb.get('el_workflows', 'select=*&order=total_errors.desc.nullslast,total_executions.desc.nullslast&limit=500'),
    sb.get('el_errors', 'select=*&order=occurred_at.desc.nullslast&limit=300'),
    sb.get('el_daily_stats', 'select=*&order=stat_date.desc&limit=1500'),
    sb.get('el_platform_snapshots', 'select=*&order=snapshot_date.desc&limit=10'),
    sb.get('el_platforms', 'select=*'),
    sb.get('el_executions', 'select=id,workflow_id,platform_type,status,started_at,finished_at,duration_ms,error_message,error_node,error_type&order=started_at.desc.nullslast&limit=500'),
  ]);

  // Store raw data for pages that need it
  window.EL_RAW = { workflows, errors, dailyStats, snapshots, platforms, executions };

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

  // Build 24h timeline from daily stats (aggregate by hour from executions if available)
  // For now, build from daily error counts distributed across synthetic hours
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = dailyStats.filter(d => d.stat_date === today);
  const todayErrors = todayStats.reduce((s, d) => s + (d.error_count || 0), 0);
  const todayRuns = todayStats.reduce((s, d) => s + (d.total_runs || 0), 0);

  // Create 24h timeline (synthetic distribution based on total daily errors)
  const timeline = Array.from({ length: 24 }, (_, h) => {
    const weight = Math.max(0.2, Math.sin((h - 6) * Math.PI / 18) * 0.8 + 0.5);
    const base = Math.round((todayErrors / 24) * weight * 3);
    return {
      hour: h,
      critical: Math.max(0, Math.round(base * 0.1)),
      error: Math.max(0, Math.round(base * 0.4)),
      warn: Math.max(0, Math.round(base * 0.35)),
      info: Math.max(0, Math.round(base * 0.15)),
    };
  });

  const severityCounts = {
    critical: events.filter(e => e.severity === 'critical').length,
    error: events.filter(e => e.severity === 'error').length,
    warn: events.filter(e => e.severity === 'warn').length,
    info: events.filter(e => e.severity === 'info').length,
  };

  // Top error execution stack trace (first error with detail)
  const topErr = errors.find(e => e.error_message && e.error_message.length > 30);
  const stackTrace = topErr ? topErr.error_message : 'No stack trace available';
  const rawPayload = { error: topErr || {}, workflow: workflows[0] || {} };

  // Alert rules (keep some defaults since we don't have an alerts table yet)
  const alertRules = [
    { id: 'ar_1', name: 'Critical errors → Slack #incidents', conditions: 'When severity is CRITICAL on any platform', channels: ['slack', 'email'], cooldown: '15 min', on: true, lastFired: '—' },
    { id: 'ar_2', name: 'n8n volume spike', conditions: 'When n8n errors exceed 10 in 1 hour', channels: ['slack'], cooldown: '60 min', on: true, lastFired: '—' },
    { id: 'ar_3', name: 'Make.com DLQ alert', conditions: 'When Make.com DLQ items > 0', channels: ['email'], cooldown: '30 min', on: false, lastFired: 'never' },
  ];

  // Platform registrations
  const platformsRegistered = platforms.map(p => ({
    id: p.type || p.id,
    name: p.name,
    status: p.is_connected ? 'active' : 'error',
    events: errors.filter(e => e.platform_type === p.type).length,
    webhook: `${p.base_url || '—'}`,
    lastSynced: p.last_synced_at,
  }));

  // Team users (keep defaults)
  const teamUsers = [
    { name: 'Ahmad Bukhari', email: 'ahmadbukhari4245@gmail.com', role: 'admin', joined: 'Jun 2025', initials: 'AB', color: '#a78bfa' },
  ];

  window.EL_DATA = {
    events,
    timeline,
    severityCounts,
    stackTrace,
    rawPayload,
    alertRules,
    platformsRegistered,
    teamUsers,
    // NEW: extra live data for enhanced pages
    workflows,
    dailyStats,
    snapshots,
    platforms,
    todayErrors,
    todayRuns,
  };

  // Dispatch event so React knows data is ready
  window.dispatchEvent(new Event('el:data-ready'));
  return window.EL_DATA;
})();
