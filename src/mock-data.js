// ErrorLens — realistic mock data
window.EL_DATA = (() => {
  const platforms = ['n8n', 'zapier', 'make', 'custom'];
  const severities = ['critical', 'error', 'warn', 'info'];
  const statuses = ['open', 'ack', 'resolved'];

  const errorTemplates = [
    { code: 'ECONNREFUSED', msg: 'connect ECONNREFUSED 10.0.4.21:5432', wf: 'Sync Stripe payments → Postgres', sev: 'critical', plat: 'n8n' },
    { code: 'EAI_AGAIN', msg: 'getaddrinfo EAI_AGAIN api.shopify.com', wf: 'Inventory webhook → Slack', sev: 'critical', plat: 'zapier' },
    { code: 'TIMEOUT_504', msg: 'Upstream gateway timeout after 30000ms', wf: 'Daily revenue digest', sev: 'error', plat: 'n8n' },
    { code: 'AUTH_401', msg: 'OAuth token expired — refresh failed (invalid_grant)', wf: 'Notion → Linear sync', sev: 'critical', plat: 'make' },
    { code: 'RATE_LIMIT_429', msg: 'Rate limit exceeded: 100 requests / 60s on /v1/charges', wf: 'Backfill historical orders', sev: 'warn', plat: 'zapier' },
    { code: 'SCHEMA_MISMATCH', msg: 'Expected field "customer_id" of type string, received null', wf: 'HubSpot → Salesforce contact mirror', sev: 'error', plat: 'make' },
    { code: 'PAYLOAD_2MB', msg: 'Request body exceeds 2MB limit (received 4.7MB)', wf: 'Image attachment forwarder', sev: 'warn', plat: 'n8n' },
    { code: 'JSON_PARSE', msg: "Unexpected token '<' in JSON at position 0 (received HTML error page)", wf: 'Weather → Twilio SMS digest', sev: 'error', plat: 'zapier' },
    { code: 'WEBHOOK_404', msg: 'POST /hooks/orders returned 404 Not Found', wf: 'New order → SMS team', sev: 'error', plat: 'custom' },
    { code: 'DEPRECATED_API', msg: 'API v1 sunset on 2026-01-15 — migrate to v2', wf: 'Mailchimp campaign tracker', sev: 'warn', plat: 'zapier' },
    { code: 'DUPLICATE_KEY', msg: 'duplicate key value violates unique constraint "orders_pkey"', wf: 'Sync Stripe payments → Postgres', sev: 'error', plat: 'n8n' },
    { code: 'OOM_137', msg: 'Container terminated (exit 137 — OOM, 512MB cap)', wf: 'Nightly CSV export', sev: 'critical', plat: 'custom' },
    { code: 'CERT_EXPIRED', msg: 'unable to verify the first certificate', wf: 'Salesforce lead enrichment', sev: 'critical', plat: 'make' },
    { code: 'PERMISSION_DENIED', msg: 'Drive: insufficientPermissions for files.update', wf: 'Form submissions → Drive folder', sev: 'error', plat: 'zapier' },
    { code: 'EMPTY_RESPONSE', msg: 'Upstream returned 204 No Content (expected JSON body)', wf: 'Daily NPS export', sev: 'info', plat: 'n8n' },
    { code: 'CIRCULAR_REF', msg: 'TypeError: Converting circular structure to JSON', wf: 'Order → Airtable mirror', sev: 'error', plat: 'make' },
    { code: 'RETRY_EXHAUSTED', msg: 'Maximum retry attempts (5) exceeded — circuit opened', wf: 'Sendgrid bulk send', sev: 'critical', plat: 'n8n' },
    { code: 'MEMORY_PRESSURE', msg: 'Heap utilization at 94% — performance degraded', wf: 'Realtime analytics ingest', sev: 'warn', plat: 'custom' },
    { code: 'ENOTFOUND', msg: 'getaddrinfo ENOTFOUND legacy-billing.internal', wf: 'Legacy billing reconciler', sev: 'error', plat: 'custom' },
    { code: 'INVALID_SIGNATURE', msg: 'HMAC signature mismatch — possible replay or misconfigured secret', wf: 'Stripe webhook receiver', sev: 'critical', plat: 'n8n' },
  ];

  const users = ['Sasha Chen', 'Marcus Webb', 'Aida Patel', 'Jordan Reyes', 'Kim Sato', 'Priya Roy'];

  function relTime(minutesAgo) {
    if (minutesAgo < 1) return 'now';
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    if (minutesAgo < 60*24) return `${Math.floor(minutesAgo/60)}h ago`;
    return `${Math.floor(minutesAgo/(60*24))}d ago`;
  }

  // generate ~74 events
  const events = [];
  let seed = 1;
  function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  for (let i = 0; i < 74; i++) {
    const t = errorTemplates[Math.floor(rand() * errorTemplates.length)];
    const status = rand() < 0.55 ? 'open' : rand() < 0.7 ? 'ack' : 'resolved';
    const minsAgo = Math.floor(rand() * 60 * 26);
    events.push({
      id: `evt_${(1000 + i).toString(36)}`,
      execId: `exec_${Math.random().toString(36).slice(2, 10)}`,
      platform: t.plat,
      workflow: t.wf,
      message: t.msg,
      code: t.code,
      severity: t.sev,
      status,
      minutesAgo: minsAgo,
      timestamp: relTime(minsAgo),
      fullTime: `2026-04-${27 - Math.floor(minsAgo/(60*24))} ${String(23 - Math.floor((minsAgo%(60*24))/60)).padStart(2,'0')}:${String(60 - (minsAgo%60)).padStart(2,'0')}:14 UTC`,
      assignedTo: rand() < 0.4 ? users[Math.floor(rand()*users.length)] : null,
    });
  }
  events.sort((a,b) => a.minutesAgo - b.minutesAgo);

  // 24h timeline counts (24 buckets, severity-stacked)
  const timeline = Array.from({length: 24}, (_, h) => {
    const base = 4 + Math.sin(h/3) * 3 + (h > 14 && h < 18 ? 8 : 0);
    return {
      hour: h,
      critical: Math.max(0, Math.round(base * 0.15 + Math.sin(h*0.7)*1.2)),
      error:    Math.max(0, Math.round(base * 0.45 + Math.cos(h*0.4)*2)),
      warn:     Math.max(0, Math.round(base * 0.6 + Math.sin(h*0.9)*2.5)),
      info:     Math.max(0, Math.round(base * 0.3 + Math.cos(h*0.2)*1)),
    };
  });

  const severityCounts = {
    critical: events.filter(e => e.severity === 'critical').length,
    error:    events.filter(e => e.severity === 'error').length,
    warn:     events.filter(e => e.severity === 'warn').length,
    info:     events.filter(e => e.severity === 'info').length,
  };

  const stackTrace = `at PostgresClient._connect (/app/node_modules/pg/lib/client.js:142:28)
    at Connection.connect (/app/node_modules/pg/lib/connection.js:72:14)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async Workflow.executeNode (/app/src/workflow/executor.ts:284:21)
    at async Workflow.run (/app/src/workflow/executor.ts:96:7)
    at async POST.handler (/app/src/api/trigger/[id]/route.ts:48:18)`;

  const rawPayload = {
    trigger: { type: 'webhook', source: 'stripe', event: 'invoice.payment_failed' },
    data: {
      customer_id: 'cus_OabDef123',
      amount_due: 4900,
      currency: 'usd',
      attempt_count: 4,
    },
    workflow: { id: 'wf_8fH2k', name: 'Sync Stripe payments → Postgres', version: 14 },
  };

  // alert rules
  const alertRules = [
    { id: 'ar_1', name: 'Critical errors → Slack #incidents', conditions: 'When severity is CRITICAL on any platform', channels: ['slack', 'email'], cooldown: '15 min', on: true, lastFired: '23m ago' },
    { id: 'ar_2', name: 'n8n volume spike', conditions: 'When n8n events exceed 25 in a 10 min window', channels: ['slack'], cooldown: '60 min', on: true, lastFired: '2h ago' },
    { id: 'ar_3', name: 'Payment workflow failures', conditions: 'When workflow contains "Stripe" and severity ≥ ERROR', channels: ['email', 'pagerduty'], cooldown: '5 min', on: false, lastFired: 'never' },
  ];

  const platformsRegistered = [
    { id: 'n8n',    name: 'n8n',    status: 'active',  events: 1247, webhook: 'https://errorlens.io/v1/hooks/n8n/wh_8fH2k9aB3' },
    { id: 'zapier', name: 'Zapier', status: 'active',  events: 894,  webhook: 'https://errorlens.io/v1/hooks/zap/wh_pQ7r2mNxL' },
    { id: 'make',   name: 'Make',   status: 'error',   events: 412,  webhook: 'https://errorlens.io/v1/hooks/make/wh_kJ4f9HsRq' },
    { id: 'custom', name: 'Custom HTTP', status: 'active', events: 156, webhook: 'https://errorlens.io/v1/hooks/custom/wh_xY3z8WvCm' },
  ];

  const teamUsers = [
    { name: 'Sasha Chen',   email: 'sasha@modern-amenities.com',   role: 'admin',    joined: 'Jan 2025', initials: 'SC', color: '#a78bfa' },
    { name: 'Marcus Webb',  email: 'marcus@modern-amenities.com',  role: 'manager',  joined: 'Mar 2025', initials: 'MW', color: '#60a5fa' },
    { name: 'Aida Patel',   email: 'aida@modern-amenities.com',    role: 'manager',  joined: 'May 2025', initials: 'AP', color: '#34d399' },
    { name: 'Jordan Reyes', email: 'jordan@modern-amenities.com',  role: 'operator', joined: 'Aug 2025', initials: 'JR', color: '#fb923c' },
    { name: 'Kim Sato',     email: 'kim@modern-amenities.com',     role: 'operator', joined: 'Oct 2025', initials: 'KS', color: '#f472b6' },
    { name: 'Priya Roy',    email: 'priya@modern-amenities.com',   role: 'viewer',   joined: 'Feb 2026', initials: 'PR', color: '#94a3b8' },
  ];

  return { events, timeline, severityCounts, stackTrace, rawPayload, alertRules, platformsRegistered, teamUsers };
})();
