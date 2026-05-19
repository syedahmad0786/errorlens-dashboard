// ErrorLens â Live Supabase data layer
// Replaces mock-data.js with real data from Supabase
// Maintains the same window.EL_DATA shape so pages.jsx stays compatible
// Supports auto-refresh every 30s + manual refresh via window.EL_REFRESH()

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

  return { get, post, patch, del, upsert, SB, KEY, HDRS };
})();

// Core data fetch + build function â reusable for initial load AND refresh
async function _elFetchAndBuild() {
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
    { id: 'ar_1', name: 'Critical errors â Slack #incidents', conditions: 'When severity is CRITICAL on any platform', channels: ['slack', 'email'], cooldown: '15 min', on: true, lastFired: 'â' },
    { id: 'ar_2', name: 'n8n volume spike', conditions: 'When n8n errors exceed 10 in 1 hour', channels: ['slack'], cooldown: '60 min', on: true, lastFired: 'â' },
    { id: 'ar_3', name: 'Make.com DLQ alert', conditions: 'When Make.com DLQ items > 0', channels: ['email'], cooldown: '30 min', on: false, lastFired: 'never' },
  ];

  // Platform registrations
  const platformsRegistered = platforms.map(p => ({
    id: p.type || p.id,
    name: p.name,
    status: p.is_connected ? 'active' : 'error',
    events: errors.filter(e => e.platform_type === p.type).length,
    webhook: `${p.base_url || 'â'}`,
    lastSynced: p.last_synced_at,
  }));

  // Team users (keep defaults)
  const teamUsers = [
    { name: 'Ahmad Bukhari', email: 'ahmadbukhari4245@gmail.com', role: 'admin', joined: 'Jun 2025', initials: 'AB', color: '#a78bfa' },
  ];

  // Build ownership map: workflow_id -> owner info
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
    // NEW: extra live data for enhanced pages
    workflows,
    dailyStats,
    snapshots,
    platforms,
    todayErrors,
    todayRuns,
    // Ownership data
    teamMembers,
    workflowOwners,
    ownerMap,
  };

  // Dispatch event so React knows data is ready
  window.dispatchEvent(new Event('el:data-ready'));
  return window.EL_DATA;
}

// --- Auto-refresh system ---
window.EL_REFRESH_INTERVAL = 30000; // 30 seconds
window._elRefreshTimer = null;
window._elRefreshing = false;
window._elLastRefresh = null;

// Manual refresh â callable from anywhere
window.EL_REFRESH = async () => {
  if (window._elRefreshing) return window.EL_DATA;
  window._elRefreshing = true;
  try {
    const data = await _elFetchAndBuild();
    window._elLastRefresh = Date.now();
    console.log('[ErrorLens] Data refreshed at', new Date().toLocaleTimeString());
    return data;
  } catch (err) {
    console.error('[ErrorLens] Refresh failed:', err);
    return window.EL_DATA;
  } finally {
    window._elRefreshing = false;
  }
};

// Start auto-refresh loop
window.EL_START_AUTOREFRESH = (intervalMs) => {
  if (window._elRefreshTimer) clearInterval(window._elRefreshTimer);
  const ms = intervalMs || window.EL_REFRESH_INTERVAL;
  window._elRefreshTimer = setInterval(() => window.EL_REFRESH(), ms);
  console.log(`[ErrorLens] Auto-refresh started (every ${ms/1000}s)`);
};

window.EL_STOP_AUTOREFRESH = () => {
  if (window._elRefreshTimer) {
    clearInterval(window._elRefreshTimer);
    window._elRefreshTimer = null;
    console.log('[ErrorLens] Auto-refresh stopped');
  }
};

// --- Webhook push receiver (for n8n/Make direct pushes) ---
// n8n/Make can call: POST /rest/v1/el_errors with error data
// This function handles incoming webhook errors and merges into live data
window.EL_PUSH_ERROR = async (errorData) => {
  try {
    // Insert into Supabase
    await window.EL_SUPABASE.post('el_errors', errorData);
    // Trigger a refresh to pick up the new error
    await window.EL_REFRESH();
    return { success: true };
  } catch (err) {
    console.error('[ErrorLens] Push error failed:', err);
    return { success: false, error: err.message };
  }
};

// Initial load
window.EL_DATA_LOADING = (async () => {
  const data = await _elFetchAndBuild();
  window._elLastRefresh = Date.now();
  // Start auto-refresh after initial load
  window.EL_START_AUTOREFRESH();
  return data;
})();
