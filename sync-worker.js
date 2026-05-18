#!/usr/bin/env node
/**
 * ErrorLens Sync Worker v2.0
 * Pulls workflow & execution data from n8n and Make.com into Supabase
 * Now includes: full node details, connections graph, Make.com blueprints
 * Zero dependencies — uses only Node.js built-in https module
 */

const https = require('https');

// ── Config ──────────────────────────────────────────────────────────
const SB_URL = 'https://erpzzrdgbrhapzlcielt.supabase.co';
const SB_KEY = 'sb_secret_8wSGuMq-azxRHB6NgTycIA_rcehHFxc';

const N8N_URL = 'https://n8n.aimanagingservices.com/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDk2NzU4My00MzM1LTRiYjMtOTFiZi02MTNhMTNmNzk2ZWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczNzkwMDk0fQ.XKLaNQ5A8F6Q0K3tF1s2RH8ZBXov0dTdu92_KjiHi4E';

const MAKE_URL = 'https://us2.make.com/api/v2';
const MAKE_KEY = '2d352d97-bbef-4a27-8cad-bccc8d037bf3';
const MAKE_ORG = 2518043;

// ── HTTP helper ─────────────────────────────────────────────────────
function req(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const r = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      timeout: 30000,
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch { resolve(body); }
        } else {
          reject(new Error(`HTTP ${res.statusCode} ${u.pathname}: ${body.slice(0, 200)}`));
        }
      });
    });
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(); reject(new Error('Timeout: ' + url)); });
    if (opts.body) r.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    r.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Supabase upsert ─────────────────────────────────────────────────
const SB_HDRS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=minimal',
};

async function upsert(table, rows, onConflict) {
  if (!rows || !rows.length) return;
  const hdrs = { ...SB_HDRS };
  if (onConflict) {
    hdrs.Prefer = `resolution=merge-duplicates,return=minimal`;
  }
  const suffix = onConflict ? `?on_conflict=${onConflict}` : '';
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    await req(`${SB_URL}/rest/v1/${table}${suffix}`, {
      method: 'POST', headers: hdrs, body: JSON.stringify(chunk),
    });
  }
  console.log(`  ✓ ${table}: ${rows.length} rows`);
}

async function logSync(platformType, syncType, status, count = 0, error = null, started = null) {
  await req(`${SB_URL}/rest/v1/el_sync_log`, {
    method: 'POST',
    headers: { ...SB_HDRS, Prefer: 'return=minimal' },
    body: JSON.stringify({
      platform_type: platformType,
      sync_type: syncType,
      status,
      records_synced: count,
      error_message: error,
      started_at: started || new Date().toISOString(),
      finished_at: new Date().toISOString(),
    }),
  });
}

// ── n8n helpers ─────────────────────────────────────────────────────
async function n8nFetchAll(path) {
  let all = [], cursor = null;
  while (true) {
    let url = `${N8N_URL}${path}${path.includes('?') ? '&' : '?'}limit=250`;
    if (cursor) url += `&cursor=${cursor}`;
    const res = await req(url, { headers: { 'X-N8N-API-KEY': N8N_KEY } });
    all = all.concat(res.data || []);
    if (res.nextCursor) cursor = res.nextCursor; else break;
  }
  return all;
}

function n8nError(e) {
  if (e.data?.resultData?.error) {
    const err = e.data.resultData.error;
    return err.message || err.description || JSON.stringify(err).slice(0, 500);
  }
  return 'Execution failed';
}

function n8nErrorNode(e) {
  if (e.data?.resultData?.error) return e.data.resultData.error.node || null;
  return null;
}

// ── SYNC n8n ────────────────────────────────────────────────────────
async function syncN8n() {
  const started = new Date().toISOString();
  console.log('\n═══ Syncing n8n ═══');

  // 1) Workflows
  console.log('  Fetching workflows...');
  const wfs = await n8nFetchAll('/workflows');
  console.log(`  → ${wfs.length} workflows`);

  const wfRows = wfs.map(w => {
    const nodesDetail = extractN8nNodes(w);
    const connectionsUsed = extractN8nConnections(w);
    const connectionGraph = buildN8nConnectionGraph(w);
    return {
      id: `n8n-${w.id}`,
      platform_id: 'n8n-prod',
      platform_type: 'n8n',
      external_id: w.id,
      name: w.name,
      is_active: !!w.active,
      is_archived: !!w.isArchived,
      trigger_type: detectN8nTrigger(w),
      node_count: (w.nodes || []).length,
      tags: (w.tags || []).map(t => t.name || t),
      apps_used: extractN8nApps(w),
      metadata: {
        nodes_detail: nodesDetail,
        connections_graph: connectionGraph,
        connections_used: connectionsUsed,
        description: buildN8nDescription(w),
        url: `https://n8n.aimanagingservices.com/workflow/${w.id}`,
      },
      created_at: w.createdAt,
      updated_at: w.updatedAt,
    };
  });
  console.log(`  → Extracted node details for ${wfRows.filter(w => w.metadata.nodes_detail.length > 0).length} workflows`);
  await upsert('el_workflows', wfRows);

  // 2) Executions
  console.log('  Fetching executions (error, success, waiting)...');
  const [errExecs, okExecs, waitExecs] = await Promise.all([
    n8nFetchAll('/executions?status=error'),
    n8nFetchAll('/executions?status=success'),
    n8nFetchAll('/executions?status=waiting'),
  ]);
  const allExecs = [...errExecs, ...okExecs, ...waitExecs];
  console.log(`  → ${allExecs.length} executions (${errExecs.length} errors, ${okExecs.length} success, ${waitExecs.length} waiting)`);

  const execRows = allExecs.map(e => ({
    id: `n8n-exec-${e.id}`,
    workflow_id: `n8n-${e.workflowId}`,
    platform_type: 'n8n',
    external_id: `n8n-exec-${e.id}`,
    status: e.status === 'success' ? 'success' : e.status === 'error' ? 'error' : 'running',
    mode: e.mode || null,
    started_at: e.startedAt,
    finished_at: e.stoppedAt || null,
    duration_ms: (e.startedAt && e.stoppedAt) ? (new Date(e.stoppedAt) - new Date(e.startedAt)) : null,
    error_message: e.status === 'error' ? n8nError(e) : null,
    error_node: e.status === 'error' ? n8nErrorNode(e) : null,
    error_type: e.status === 'error' ? 'execution_error' : null,
    metadata: { retryOf: e.retryOf || null },
  }));
  await upsert('el_executions', execRows);

  // 3) Errors
  const errRows = errExecs.map(e => ({
    id: `n8n-err-${e.id}`,
    workflow_id: `n8n-${e.workflowId}`,
    execution_id: `n8n-exec-${e.id}`,
    platform_type: 'n8n',
    error_message: n8nError(e),
    error_node: n8nErrorNode(e),
    error_type: 'execution_error',
    severity: 'error',
    is_resolved: false,
    occurred_at: e.stoppedAt || e.startedAt,
    metadata: { mode: e.mode },
  }));
  await upsert('el_errors', errRows);

  // 4) Daily stats
  const dmap = {};
  allExecs.forEach(e => {
    if (!e.startedAt) return;
    const day = e.startedAt.slice(0, 10);
    const k = `n8n-${e.workflowId}|${day}`;
    if (!dmap[k]) dmap[k] = { wfId: `n8n-${e.workflowId}`, day, runs: 0, ok: 0, err: 0, durs: [] };
    dmap[k].runs++;
    if (e.status === 'success') dmap[k].ok++;
    if (e.status === 'error') dmap[k].err++;
    if (e.startedAt && e.stoppedAt) dmap[k].durs.push(new Date(e.stoppedAt) - new Date(e.startedAt));
  });
  const dailyRows = Object.values(dmap).map(d => ({
    workflow_id: d.wfId,
    platform_type: 'n8n',
    stat_date: d.day,
    total_runs: d.runs,
    success_count: d.ok,
    error_count: d.err,
    avg_duration_ms: d.durs.length ? Math.round(d.durs.reduce((a, b) => a + b, 0) / d.durs.length) : null,
    error_rate: d.runs ? +(d.err / d.runs * 100).toFixed(2) : 0,
  }));
  await upsert('el_daily_stats', dailyRows, 'workflow_id,stat_date');

  // 5) Workflow-level stats update
  const wfStats = {};
  allExecs.forEach(e => {
    const wid = `n8n-${e.workflowId}`;
    if (!wfStats[wid]) wfStats[wid] = { total: 0, errs: 0, oks: 0, lastAt: null };
    wfStats[wid].total++;
    if (e.status === 'error') wfStats[wid].errs++;
    if (e.status === 'success') wfStats[wid].oks++;
    const t = e.startedAt || e.stoppedAt;
    if (t && (!wfStats[wid].lastAt || t > wfStats[wid].lastAt)) wfStats[wid].lastAt = t;
  });
  const wfUpdates = Object.entries(wfStats).map(([id, s]) => ({
    id,
    platform_type: 'n8n',
    external_id: id.replace('n8n-', ''),
    name: (wfs.find(w => `n8n-${w.id}` === id) || {}).name || 'Unknown',
    total_executions: s.total,
    total_errors: s.errs,
    total_success: s.oks,
    error_rate: s.total ? +(s.errs / s.total * 100).toFixed(2) : 0,
    last_execution_at: s.lastAt,
  }));
  await upsert('el_workflows', wfUpdates);

  // 6) Platform snapshot
  const activeCount = wfs.filter(w => w.active).length;
  await upsert('el_platform_snapshots', [{
    platform_id: 'n8n-prod',
    snapshot_date: new Date().toISOString().slice(0, 10),
    total_workflows: wfs.length,
    active_workflows: activeCount,
    total_executions: allExecs.length,
    total_errors: errExecs.length,
    total_success: okExecs.length,
    success_rate: allExecs.length ? +((okExecs.length / allExecs.length) * 100).toFixed(2) : 0,
    metadata: { waitingExecs: waitExecs.length },
  }], 'platform_id,snapshot_date');

  await logSync('n8n', 'full', 'success', wfRows.length + execRows.length, null, started);
  console.log('  ✓ n8n sync complete\n');
}

// Extract detailed node info from n8n workflow
function extractN8nNodes(w) {
  return (w.nodes || []).filter(n => !n.type?.includes('stickyNote')).map(n => {
    const typeParts = (n.type || '').split('.');
    const app = typeParts.length >= 2 ? typeParts[1] : typeParts[0] || 'unknown';
    const credKeys = Object.keys(n.credentials || {});
    return {
      id: n.id,
      name: n.name,
      type: n.type,
      app,
      typeVersion: n.typeVersion || 1,
      credentials: credKeys,
      operation: n.parameters?.operation || n.parameters?.resource || null,
      isTrigger: !!(n.type && (n.type.includes('Trigger') || n.type.includes('webhook'))),
    };
  });
}

// Extract unique connections/credentials used in an n8n workflow
function extractN8nConnections(w) {
  const conns = {};
  (w.nodes || []).forEach(n => {
    if (!n.credentials) return;
    Object.entries(n.credentials).forEach(([type, cred]) => {
      const key = type;
      if (!conns[key]) conns[key] = { type, name: cred.name || type, usedIn: [] };
      conns[key].usedIn.push(n.name);
    });
  });
  return Object.values(conns);
}

// Build the flow graph (which node connects to which)
function buildN8nConnectionGraph(w) {
  const graph = [];
  const connections = w.connections || {};
  Object.entries(connections).forEach(([fromNode, outputs]) => {
    if (outputs.main) {
      outputs.main.forEach((targets, outputIndex) => {
        (targets || []).forEach(t => {
          graph.push({ from: fromNode, to: t.node, outputIndex, inputIndex: t.index || 0 });
        });
      });
    }
  });
  return graph;
}

// Auto-generate a description of what the workflow does
function buildN8nDescription(w) {
  const nodes = (w.nodes || []).filter(n => !n.type?.includes('stickyNote'));
  if (!nodes.length) return 'Empty workflow';
  const trigger = nodes.find(n => n.type && (n.type.includes('Trigger') || n.type.includes('webhook')));
  const apps = extractN8nApps(w);
  const parts = [];
  if (trigger) {
    const tName = trigger.name || trigger.type?.split('.').pop() || 'trigger';
    parts.push(`Triggered by ${tName}`);
  }
  if (apps.length > 0) {
    parts.push(`Uses: ${apps.join(', ')}`);
  }
  parts.push(`${nodes.length} nodes in flow`);
  return parts.join('. ');
}

function detectN8nTrigger(w) {
  const nodes = w.nodes || [];
  const trigger = nodes.find(n => n.type && (n.type.includes('Trigger') || n.type.includes('webhook')));
  if (!trigger) return 'manual';
  if (trigger.type.includes('webhook')) return 'webhook';
  if (trigger.type.includes('Cron') || trigger.type.includes('Schedule')) return 'schedule';
  return trigger.type.split('.').pop() || 'trigger';
}

function extractN8nApps(w) {
  const apps = new Set();
  (w.nodes || []).forEach(n => {
    const parts = (n.type || '').split('.');
    if (parts.length >= 2) apps.add(parts[1]);
  });
  return [...apps].slice(0, 20);
}

// ── Make.com helpers ────────────────────────────────────────────────
function extractMakeBlueprint(bp) {
  if (!bp || !bp.flow) return { modules: [], connectionsUsed: [], appsUsed: [] };
  const modules = [];
  const connections = {};
  const apps = new Set();

  function walkFlow(flow) {
    (flow || []).forEach(mod => {
      const appName = (mod.module || '').split(':')[0] || 'unknown';
      apps.add(appName);
      const connLabel = mod.metadata?.restore?.parameters?.__IMTCONN__?.label || null;
      const connData = mod.metadata?.restore?.parameters?.__IMTCONN__?.data || {};
      modules.push({
        id: mod.id,
        name: mod.metadata?.restore?.parameters?.table?.label || mod.module || `Module ${mod.id}`,
        type: mod.module || 'unknown',
        app: appName,
        version: mod.version || 1,
        operation: mod.module?.split(':')[1] || null,
        credentials: connLabel ? [connLabel] : [],
        isTrigger: !!(mod.module && mod.module.includes('Trigger')),
      });
      if (connLabel) {
        if (!connections[connLabel]) connections[connLabel] = { type: appName, name: connLabel, usedIn: [] };
        connections[connLabel].usedIn.push(mod.module || `Module ${mod.id}`);
      }
      // Recurse into nested routes/flows
      if (mod.routes) mod.routes.forEach(route => walkFlow(route.flow));
      if (mod.flow) walkFlow(mod.flow);
    });
  }
  walkFlow(bp.flow);
  return { modules, connectionsUsed: Object.values(connections), appsUsed: [...apps].filter(a => a !== 'unknown') };
}

function buildMakeConnectionGraph(modules) {
  // Make.com flows are sequential; each module connects to the next
  const graph = [];
  for (let i = 0; i < modules.length - 1; i++) {
    graph.push({ from: modules[i].name, to: modules[i + 1].name, outputIndex: 0, inputIndex: 0 });
  }
  return graph;
}

function buildMakeDescription(scenario, modules, appsUsed) {
  const parts = [];
  if (scenario.scheduling) parts.push(`Scheduled: ${scenario.scheduling.type || 'interval'}`);
  else parts.push('Manually triggered');
  if (appsUsed.length > 0) parts.push(`Uses: ${appsUsed.join(', ')}`);
  parts.push(`${modules.length} modules in flow`);
  return parts.join('. ');
}

// ── SYNC Make.com ───────────────────────────────────────────────────
async function makeReq(path) {
  return req(`${MAKE_URL}${path}`, {
    headers: { Authorization: `Token ${MAKE_KEY}`, 'Content-Type': 'application/json' },
  });
}

async function syncMake() {
  const started = new Date().toISOString();
  console.log('═══ Syncing Make.com ═══');

  // 1) Scenarios
  console.log('  Fetching scenarios...');
  let scenarios = [];
  let offset = 0;
  while (true) {
    const res = await makeReq(`/scenarios?organizationId=${MAKE_ORG}&pg[limit]=100&pg[offset]=${offset}`);
    const items = res.scenarios || [];
    scenarios = scenarios.concat(items);
    if (items.length < 100) break;
    offset += 100;
    await sleep(300);
  }
  console.log(`  → ${scenarios.length} scenarios`);

  // 1b) Fetch blueprints for all scenarios (modules + connections)
  console.log('  Fetching blueprints...');
  const blueprints = {};
  let bpCount = 0;
  for (const s of scenarios) {
    try {
      const bp = await makeReq(`/scenarios/${s.id}/blueprint`);
      blueprints[s.id] = bp.response?.blueprint || bp.blueprint || bp;
      bpCount++;
    } catch (err) {
      // Some scenarios may not have accessible blueprints
    }
    if (bpCount % 20 === 0) await sleep(500); // rate limit
    else await sleep(150);
  }
  console.log(`  → ${bpCount} blueprints fetched`);

  const wfRows = scenarios.map(s => {
    const bp = blueprints[s.id];
    const { modules, connectionsUsed, appsUsed } = extractMakeBlueprint(bp);
    return {
      id: `make-${s.id}`,
      platform_id: 'make-prod',
      platform_type: 'make',
      external_id: String(s.id),
      name: s.name,
      is_active: !!s.islinked && !s.isPaused,
      is_archived: !!s.isArchived,
      trigger_type: s.scheduling ? 'schedule' : 'manual',
      node_count: modules.length,
      tags: [],
      apps_used: appsUsed,
      scheduling: s.scheduling || null,
      total_executions: s.usedOperations || 0,
      metadata: {
        isPaused: s.isPaused,
        nextExec: s.nextExec,
        nodes_detail: modules,
        connections_used: connectionsUsed,
        connections_graph: buildMakeConnectionGraph(modules),
        description: buildMakeDescription(s, modules, appsUsed),
        url: `https://us2.make.com/organization/${MAKE_ORG}/scenarios/${s.id}`,
      },
      created_at: s.created || null,
      updated_at: s.updated || null,
    };
  });
  console.log(`  → Extracted module details for ${wfRows.filter(w => w.metadata.nodes_detail.length > 0).length} scenarios`);
  await upsert('el_workflows', wfRows);

  // 2) Execution logs from top active scenarios
  console.log('  Fetching execution logs...');
  const active = scenarios
    .filter(s => s.islinked || (s.usedOperations && s.usedOperations > 0))
    .sort((a, b) => (b.usedOperations || 0) - (a.usedOperations || 0))
    .slice(0, 30);

  let allLogs = [];
  for (const s of active) {
    try {
      const res = await makeReq(`/scenarios/${s.id}/logs?pg[limit]=50`);
      const logs = (res.scenarioLogs || []).map(l => ({ ...l, _scenarioId: s.id }));
      allLogs = allLogs.concat(logs);
    } catch (err) {
      console.log(`    ⚠ Logs ${s.id}: ${err.message.slice(0, 60)}`);
    }
    await sleep(250);
  }
  console.log(`  → ${allLogs.length} execution logs`);

  const execRows = allLogs.map(l => ({
    id: `make-log-${l.id || l.imtId}`,
    workflow_id: `make-${l._scenarioId}`,
    platform_type: 'make',
    external_id: `make-log-${l.id || l.imtId}`,
    status: l.status === 1 ? 'success' : 'error',
    started_at: l.timestamp || null,
    duration_ms: l.duration ? Math.round(l.duration * 1000) : null,
    operations_used: l.operations || 0,
    error_message: l.status !== 1 ? (l.detail || l.message || 'Execution failed') : null,
    error_type: l.status !== 1 ? 'execution_error' : null,
    metadata: { transfer: l.transfer },
  }));
  await upsert('el_executions', execRows);

  // 3) DLQ — requires scenarioId, check top active scenarios
  console.log('  Fetching DLQ...');
  let dlqs = [];
  for (const s of active.slice(0, 15)) {
    try {
      const res = await makeReq(`/dlqs?scenarioId=${s.id}&pg[limit]=50`);
      const items = (res.dlqs || []).map(d => ({ ...d, scenarioId: s.id, scenarioName: s.name }));
      dlqs = dlqs.concat(items);
    } catch { /* scenario may not have DLQ */ }
    await sleep(200);
  }
  console.log(`  → ${dlqs.length} DLQ items`);

  const dlqErrors = dlqs.map((d, i) => ({
    id: `make-dlq-${d.id || i}`,
    workflow_id: d.scenarioId ? `make-${d.scenarioId}` : null,
    platform_type: 'make',
    error_message: d.reason || d.detail || 'Dead letter queue item',
    error_type: 'dlq',
    severity: 'warning',
    is_resolved: !!d.resolved,
    occurred_at: d.created || d.timestamp || new Date().toISOString(),
    metadata: { dlqId: d.id, scenarioName: d.scenarioName },
  }));
  if (dlqErrors.length) await upsert('el_errors', dlqErrors);

  // 4) Error rows from failed logs
  const failedLogs = allLogs.filter(l => l.status !== 1);
  const logErrors = failedLogs.map(l => ({
    id: `make-err-${l.id || l.imtId}`,
    workflow_id: `make-${l._scenarioId}`,
    execution_id: `make-log-${l.id || l.imtId}`,
    platform_type: 'make',
    error_message: l.detail || l.message || 'Execution failed',
    error_type: 'execution_error',
    severity: 'error',
    is_resolved: false,
    occurred_at: l.timestamp || new Date().toISOString(),
    metadata: {},
  }));
  if (logErrors.length) await upsert('el_errors', logErrors);

  // 5) Daily stats
  const dmap = {};
  allLogs.forEach(l => {
    if (!l.timestamp) return;
    const day = l.timestamp.slice(0, 10);
    const k = `make-${l._scenarioId}|${day}`;
    if (!dmap[k]) dmap[k] = { wfId: `make-${l._scenarioId}`, day, runs: 0, ok: 0, err: 0, durs: [], ops: 0 };
    dmap[k].runs++;
    if (l.status === 1) dmap[k].ok++; else dmap[k].err++;
    if (l.duration) dmap[k].durs.push(l.duration * 1000);
    dmap[k].ops += (l.operations || 0);
  });
  const dailyRows = Object.values(dmap).map(d => ({
    workflow_id: d.wfId,
    platform_type: 'make',
    stat_date: d.day,
    total_runs: d.runs,
    success_count: d.ok,
    error_count: d.err,
    avg_duration_ms: d.durs.length ? Math.round(d.durs.reduce((a, b) => a + b, 0) / d.durs.length) : null,
    operations_used: d.ops,
    error_rate: d.runs ? +(d.err / d.runs * 100).toFixed(2) : 0,
  }));
  await upsert('el_daily_stats', dailyRows, 'workflow_id,stat_date');

  // 6) Workflow-level stats
  const wfStats = {};
  allLogs.forEach(l => {
    const wid = `make-${l._scenarioId}`;
    if (!wfStats[wid]) wfStats[wid] = { total: 0, errs: 0, oks: 0, ops: 0, lastAt: null };
    wfStats[wid].total++;
    if (l.status === 1) wfStats[wid].oks++; else wfStats[wid].errs++;
    wfStats[wid].ops += (l.operations || 0);
    if (l.timestamp && (!wfStats[wid].lastAt || l.timestamp > wfStats[wid].lastAt)) wfStats[wid].lastAt = l.timestamp;
  });
  const wfUpdates = Object.entries(wfStats).map(([id, s]) => ({
    id,
    platform_type: 'make',
    external_id: id.replace('make-', ''),
    name: (scenarios.find(sc => `make-${sc.id}` === id) || {}).name || 'Unknown',
    total_executions: s.total,
    total_errors: s.errs,
    total_success: s.oks,
    error_rate: s.total ? +(s.errs / s.total * 100).toFixed(2) : 0,
    last_execution_at: s.lastAt,
  }));
  await upsert('el_workflows', wfUpdates);

  // 7) Platform snapshot
  const activeWfs = scenarios.filter(s => s.islinked && !s.isPaused).length;
  const totalOps = scenarios.reduce((sum, s) => sum + (s.usedOperations || 0), 0);
  await upsert('el_platform_snapshots', [{
    platform_id: 'make-prod',
    snapshot_date: new Date().toISOString().slice(0, 10),
    total_workflows: scenarios.length,
    active_workflows: activeWfs,
    total_executions: allLogs.length,
    total_errors: failedLogs.length + dlqs.length,
    total_success: allLogs.filter(l => l.status === 1).length,
    success_rate: allLogs.length ? +((allLogs.filter(l => l.status === 1).length / allLogs.length) * 100).toFixed(2) : 0,
    total_operations: totalOps,
    metadata: { dlqCount: dlqs.length },
  }], 'platform_id,snapshot_date');

  await logSync('make', 'full', 'success', wfRows.length + execRows.length, null, started);
  console.log('  ✓ Make.com sync complete\n');
}

// ── Update platform connection status ───────────────────────────────
async function updatePlatformStatus() {
  const now = new Date().toISOString();
  await upsert('el_platforms', [
    { id: 'n8n-prod', name: 'n8n', type: 'n8n', is_connected: true, last_synced_at: now },
    { id: 'make-prod', name: 'Make.com', type: 'make', is_connected: true, last_synced_at: now },
    { id: 'zapier-prod', name: 'Zapier', type: 'zapier', is_connected: false, last_synced_at: null },
  ]);
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   ErrorLens Sync Worker v1.0          ║');
  console.log(`║   ${new Date().toISOString()}  ║`);
  console.log('╚══════════════════════════════════════╝');

  try { await syncN8n(); }
  catch (err) {
    console.error('❗ n8n sync failed:', err.message);
    await logSync('n8n', 'full', 'error', 0, err.message).catch(() => {});
  }

  try { await syncMake(); }
  catch (err) {
    console.error('❗ Make.com sync failed:', err.message);
    await logSync('make', 'full', 'error', 0, err.message).catch(() => {});
  }

  await updatePlatformStatus().catch(() => {});
  console.log('✓ Sync worker finished at', new Date().toISOString());
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
