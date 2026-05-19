// ErrorLens — New tabs: Analytics, Audit Log, Runbooks, SLA Monitor, Notifications Center
const _getD3 = () => window.EL_DATA;
const D3 = new Proxy({}, { get: (_, prop) => _getD3()[prop] });

// ============ Analytics Tab ============
const AnalyticsPage = () => {
  const [range, setRange] = React.useState('7d');
  const [, forceUpdate] = React.useState(0);
  React.useEffect(() => {
    const h = () => forceUpdate(n => n + 1);
    window.addEventListener('el:data-ready', h);
    return () => window.removeEventListener('el:data-ready', h);
  }, []);

  const raw = window.EL_RAW || {};
  const ds = raw.dailyStats || [];
  const wfs = raw.workflows || [];
  const execs = raw.executions || [];

  // Date range filter
  const days = parseInt(range) || 7;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const filteredStats = ds.filter(d => d.stat_date >= cutoff);

  // Aggregate by date
  const dateMap = {};
  filteredStats.forEach(d => {
    if (!dateMap[d.stat_date]) dateMap[d.stat_date] = { date: d.stat_date, errors: 0, runs: 0, success: 0 };
    dateMap[d.stat_date].errors += d.error_count || 0;
    dateMap[d.stat_date].runs += d.total_runs || 0;
    dateMap[d.stat_date].success += d.success_count || 0;
  });
  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  // Platform breakdown
  const platStats = {};
  filteredStats.forEach(d => {
    const p = d.platform_type || 'unknown';
    if (!platStats[p]) platStats[p] = { errors: 0, runs: 0 };
    platStats[p].errors += d.error_count || 0;
    platStats[p].runs += d.total_runs || 0;
  });

  // Top error types
  const errorTypes = {};
  (raw.errors || []).forEach(e => {
    const t = e.error_type || 'UNKNOWN';
    errorTypes[t] = (errorTypes[t] || 0) + 1;
  });
  const topErrorTypes = Object.entries(errorTypes).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Error trend
  const totalErrors = chartData.reduce((s, d) => s + d.errors, 0);
  const totalRuns = chartData.reduce((s, d) => s + d.runs, 0);
  const avgDailyErrors = chartData.length ? (totalErrors / chartData.length).toFixed(1) : 0;
  const errorRate = totalRuns ? (totalErrors / totalRuns * 100).toFixed(2) : '0.00';

  // Max for chart scaling
  const maxErrors = Math.max(1, ...chartData.map(d => d.errors));
  const maxRuns = Math.max(1, ...chartData.map(d => d.runs));
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <div className="page-sub">Error trends, platform health, and workflow performance</div>
        </div>
        <div className="seg">
          {[{v:'7d',l:'7 Days'},{v:'14d',l:'14 Days'},{v:'30d',l:'30 Days'}].map(m => (
            <button key={m.v} className={range === m.v ? 'on' : ''} onClick={() => setRange(m.v)}>{m.l}</button>
          ))}
        </div>
      </div>

      {/* KPI cards with period-over-period deltas */}
      {(() => {
        const cmp = (window.EL_DATA && window.EL_DATA.statsComparison) || null;
        // Pick comparison set by range
        const cmpSet = !cmp ? null : (range === '7d' ? cmp.wow : range === '30d' ? cmp.mom : cmp.dod);
        const cmpLabel = range === '7d' ? 'vs prev 7d' : range === '30d' ? 'vs prev 30d' : 'vs yesterday';

        const renderDelta = (d) => {
          if (!d) return null;
          // For errors, "down" is good (green); for runs, "up" is good
          const isError = d.metric === 'errors' || d.metric === 'rate';
          const goodDir = isError ? 'down' : 'up';
          const isGood = d.direction === goodDir || d.direction === 'flat';
          const color = d.direction === 'flat' ? 'var(--text-tertiary)' : isGood ? '#059669' : '#ef4444';
          const arrow = d.direction === 'up' ? '↑' : d.direction === 'down' ? '↓' : '→';
          return (
            <span style={{ fontSize: 11, color, fontWeight: 600, marginLeft: 8 }}>
              {arrow} {Math.abs(d.pct)}% <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>{cmpLabel}</span>
            </span>
          );
        };

        const errorRateNum = totalRuns ? (totalErrors / totalRuns * 100) : 0;
        const cards = [
          { label: 'Total Errors',     value: totalErrors,                        color: 'var(--sev-error)',     delta: cmpSet?.errors    && { ...cmpSet.errors, metric: 'errors' } },
          { label: 'Total Executions', value: totalRuns.toLocaleString(),         color: 'var(--status-resolved)', delta: cmpSet?.runs      && { ...cmpSet.runs,   metric: 'runs'   } },
          { label: 'Avg Daily Errors', value: avgDailyErrors,                     color: 'var(--sev-warn)',      delta: null },
          { label: 'Error Rate',       value: `${errorRate}%`,                    color: errorRateNum > 5 ? 'var(--sev-critical)' : 'var(--sev-info)', delta: cmpSet?.errorRate && { ...cmpSet.errorRate, metric: 'rate' } },
        ];
        return (
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {cards.map((k, i) => (
              <div key={i} className="card kpi" style={{ ['--kpi-color']: k.color }}>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-delta" style={{ marginTop: 6, minHeight: 16 }}>{renderDelta(k.delta)}</div>
              </div>
            ))}
          </div>
        );
      })()}
      <div className="chart-grid">
        {/* Error trend chart */}
        <div className="card chart-card">
          <div className="card-head"><div className="card-title">Error trend ({range})</div></div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 180, padding: '12px 0' }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{d.errors}</span>
                <div style={{ width: '80%', height: `${(d.errors / maxErrors) * 140}px`, background: 'var(--sev-error)', borderRadius: '4px 4px 0 0', minHeight: 2, opacity: 0.8 }}/>
                <span style={{ fontSize: 8, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Execution volume chart */}
        <div className="card chart-card">
          <div className="card-head"><div className="card-title">Execution volume ({range})</div></div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 180, padding: '12px 0' }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{d.runs}</span>
                <div style={{ width: '80%', height: `${(d.runs / maxRuns) * 140}px`, background: 'var(--status-resolved)', borderRadius: '4px 4px 0 0', minHeight: 2, opacity: 0.8 }}/>
                <span style={{ fontSize: 8, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Platform breakdown */}
        <div className="card">
          <div className="card-head"><div className="card-title">Errors by platform</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {Object.entries(platStats).sort((a, b) => b[1].errors - a[1].errors).map(([p, s]) => (
              <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <PlatformIcon p={p} size={18}/>{p}
                  </span>
                  <span className="mono" style={{ color: 'var(--text-tertiary)' }}>{s.errors} errors / {s.runs} runs</span>
                </div>
                <div style={{ height: 6, background: 'var(--card-hover)', borderRadius: 999 }}>
                  <div style={{ height: '100%', width: `${(s.errors / Math.max(1, totalErrors)) * 100}%`, background: 'var(--sev-error)', borderRadius: 999, minWidth: 2 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top error types */}
        <div className="card">
          <div className="card-head"><div className="card-title">Top error types</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {topErrorTypes.map(([type, count], i) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-tertiary)', width: 20 }}>#{i + 1}</span>
                  <code style={{ fontSize: 11, padding: '2px 6px', background: 'var(--card-hover)', borderRadius: 4 }}>{type}</code>
                </span>
                <span className="mono" style={{ color: 'var(--sev-error)', fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Workflow health table */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><div className="card-title">Workflow health (top 15 by errors)</div></div>
        <table className="tbl" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Workflow</th><th>Platform</th><th>Executions</th><th>Errors</th><th>Success Rate</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {wfs.filter(w => (w.total_errors || 0) > 0).sort((a, b) => (b.total_errors || 0) - (a.total_errors || 0)).slice(0, 15).map(w => {
              const rate = (w.total_executions || 0) > 0 ? (((w.total_executions - (w.total_errors || 0)) / w.total_executions) * 100).toFixed(1) : 'N/A';
              const rateColor = rate === 'N/A' ? 'var(--text-tertiary)' : parseFloat(rate) >= 95 ? '#059669' : parseFloat(rate) >= 80 ? '#f59525' : '#ef4444';
              return (
                <tr key={w.id}>
                  <td style={{ fontWeight: 500 }}>{w.name}</td>
                  <td><span className="platform-row"><PlatformIcon p={w.platform_type} size={16}/>{w.platform_type}</span></td>
                  <td className="mono">{(w.total_executions || 0).toLocaleString()}</td>
                  <td className="mono" style={{ color: 'var(--sev-error)' }}>{w.total_errors || 0}</td>
                  <td style={{ color: rateColor, fontWeight: 600 }}>{rate === 'N/A' ? rate : rate + '%'}</td>
                  <td><Badge kind={w.is_active ? 'status-open' : 'status-resolved'}>{w.is_active ? 'active' : 'inactive'}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
// ============ Audit Log Tab ============
const AuditLogPage = () => {
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Build audit entries from error status changes, workflow owner changes, etc.
  const raw = window.EL_RAW || {};
  const auditEntries = React.useMemo(() => {
    const entries = [];

    // Error resolutions
    (raw.errors || []).filter(e => e.is_resolved).forEach(e => {
      entries.push({
        id: `resolve_${e.id}`,
        type: 'resolution',
        icon: 'check',
        action: 'Resolved error',
        detail: e.error_message?.substring(0, 80) || 'Unknown error',
        actor: 'Team',
        timestamp: e.resolved_at || e.occurred_at,
        category: 'errors',
      });
    });

    // Error occurrences (recent 50)
    (raw.errors || []).slice(0, 50).forEach(e => {
      entries.push({
        id: `error_${e.id}`,
        type: 'error',
        icon: 'bolt',
        action: `Error in ${e.error_node || 'workflow'}`,
        detail: e.error_message?.substring(0, 80) || 'Unknown error',
        actor: 'System',
        timestamp: e.occurred_at,
        category: 'errors',
        severity: e.severity,
      });
    });
    // Workflow owner assignments
    (raw.workflowOwners || []).forEach(wo => {
      const wf = (raw.workflows || []).find(w => w.id === wo.workflow_id);
      const member = (raw.teamMembers || []).find(m => m.id === wo.owner_id);
      entries.push({
        id: `assign_${wo.workflow_id}`,
        type: 'assignment',
        icon: 'users',
        action: `Assigned workflow`,
        detail: `${wf?.name || 'Unknown'} → ${member?.name || 'Unknown'}`,
        actor: 'Admin',
        timestamp: wo.assigned_at,
        category: 'workflows',
      });
    });

    // Team member additions
    (raw.teamMembers || []).forEach(m => {
      entries.push({
        id: `member_${m.id}`,
        type: 'member',
        icon: 'plus',
        action: 'Team member added',
        detail: `${m.name} (${m.role || 'developer'})`,
        actor: 'Admin',
        timestamp: m.created_at,
        category: 'team',
      });
    });

    return entries.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [raw]);
  const filtered = auditEntries.filter(e => {
    if (filter !== 'all' && e.category !== filter) return false;
    if (search && !e.detail.toLowerCase().includes(search.toLowerCase()) && !e.action.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Audit log</h1>
          <div className="page-sub">{filtered.length} entries · tracking changes across the system</div>
        </div>
        <button className="btn btn-ghost" onClick={() => {
          // Export current audit entries as CSV
          const csv = [
            ['Action', 'Detail', 'Actor', 'Timestamp', 'Category'].join(','),
            ...filtered.map(e => [
              `"${(e.action || '').replace(/"/g, '""')}"`,
              `"${(e.detail || '').replace(/"/g, '""')}"`,
              e.actor || '',
              e.timestamp || '',
              e.category || '',
            ].join(',')),
          ].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `errorlens-audit-${new Date().toISOString().slice(0,10)}.csv`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }}><Icon name="download" size={14}/> Export</button>
      </div>

      <div className="filter-bar">
        <div className="search-box" style={{ maxWidth: 360 }}>
          <Icon name="search" className="ico"/>
          <input placeholder="Search audit entries…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="seg">
          {[{v:'all',l:'All'},{v:'errors',l:'Errors'},{v:'workflows',l:'Workflows'},{v:'team',l:'Team'}].map(m => (
            <button key={m.v} className={filter === m.v ? 'on' : ''} onClick={() => { setFilter(m.v); setPage(1); }}>{m.l}</button>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr><th style={{width:36}}/><th>Action</th><th>Details</th><th>Actor</th><th>Time</th></tr>
          </thead>
          <tbody>
            {pageRows.map(e => (
              <tr key={e.id}>
                <td>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: e.type === 'error' ? 'rgba(239,68,68,0.12)' : e.type === 'resolution' ? 'rgba(5,150,105,0.12)' : 'rgba(99,102,241,0.12)' }}>
                    <Icon name={e.icon} size={13} style={{ color: e.type === 'error' ? '#ef4444' : e.type === 'resolution' ? '#059669' : '#6366f1' }}/>
                  </div>
                </td>
                <td style={{ fontWeight: 500 }}>{e.action}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }} title={e.detail}>{e.detail}</td>
                <td style={{ color: 'var(--text-tertiary)' }}>{e.actor}</td>
                <td style={{ color: 'var(--text-tertiary)', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(e.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pager">
          <span>Showing {(page-1)*pageSize + 1}–{Math.min(page*pageSize, filtered.length)} of {filtered.length}</span>
          <div className="pager-ctrl">
            <button className="btn btn-ghost btn-icon" disabled={page===1} onClick={() => setPage(p=>p-1)}><Icon name="chevronL" size={14}/></button>
            <span style={{ padding: '0 12px', fontSize: 12 }}>{page} / {totalPages}</span>
            <button className="btn btn-ghost btn-icon" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}><Icon name="chevronR" size={14}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};
// ============ Runbooks Tab ============
const RunbooksPage = () => {
  const [activeId, setActiveId] = React.useState(null);
  const [liveRunbooks, setLiveRunbooks] = React.useState(null);

  // Try to load from Supabase el_runbooks table (created by migration 003)
  React.useEffect(() => {
    if (!window.EL_SUPABASE) return;
    window.EL_SUPABASE.get('el_runbooks', 'select=*&order=created_at.asc&limit=100')
      .then(rows => { if (Array.isArray(rows) && rows.length > 0) setLiveRunbooks(rows.map(r => ({ id: r.id, title: r.title, category: r.category, severity: r.severity, steps: r.steps || [] }))); })
      .catch(() => {}); // table may not exist yet — fall back to defaults
  }, []);

  const defaultRunbooks = [
    {
      id: 'rb_1', title: 'n8n Workflow Failure Recovery', category: 'Incident', severity: 'critical',
      steps: [
        { title: 'Check n8n dashboard', desc: 'Open n8n at your instance URL. Navigate to Executions and find the failed execution.' },
        { title: 'Identify the failed node', desc: 'Click the failed execution to see which node threw the error. Note the error message and node name.' },
        { title: 'Check credentials', desc: 'If the error is auth-related (401, 403), go to Credentials and verify the affected integration credentials are valid.' },
        { title: 'Retry the execution', desc: 'If the issue was transient (timeout, rate limit), retry the execution from the failed node using the "Retry" button.' },
        { title: 'Fix and re-deploy', desc: 'If the error requires a code/config change, edit the workflow, test with sample data, then activate.' },
        { title: 'Verify in ErrorLens', desc: 'Check the ErrorLens dashboard to confirm the error is no longer recurring. Mark it as resolved.' },
      ],
    },
    {
      id: 'rb_2', title: 'Make.com Scenario Error Handling', category: 'Incident', severity: 'error',
      steps: [
        { title: 'Open Make.com dashboard', desc: 'Navigate to your Make.com organization and find the failing scenario.' },
        { title: 'Check the DLQ', desc: 'Open the scenario\'s Incomplete Executions (dead letter queue) to see queued failures.' },
        { title: 'Review error details', desc: 'Click each failed execution to see the specific module, error code, and input data.' },
        { title: 'Fix the root cause', desc: 'Common fixes: refresh OAuth tokens, increase timeout limits, fix field mapping issues.' },
        { title: 'Replay failed executions', desc: 'Select failed executions and use "Replay" to re-process them with the fix in place.' },
      ],
    },    {
      id: 'rb_3', title: 'Database Connection Failure', category: 'Infrastructure', severity: 'critical',
      steps: [
        { title: 'Check Supabase status', desc: 'Visit status.supabase.com to check for outages. Also check your project\'s database health in the Supabase dashboard.' },
        { title: 'Verify connection string', desc: 'Ensure the database URL and credentials in your n8n/Make credentials are correct and not expired.' },
        { title: 'Check connection limits', desc: 'Supabase free tier has connection limits. Check if you\'ve exceeded them by looking at active connections.' },
        { title: 'Restart affected workflows', desc: 'After resolving the connection issue, re-activate any workflows that were paused or errored due to the outage.' },
      ],
    },
    {
      id: 'rb_4', title: 'New Team Member Onboarding', category: 'Process', severity: 'info',
      steps: [
        { title: 'Add to ErrorLens', desc: 'Go to Workflows > Team Members tab. Add the new member with their name, email, and role.' },
        { title: 'Assign workflows', desc: 'Go to Workflows > Bulk Assign tab. Select the workflows they will own and assign them.' },
        { title: 'Set up notifications', desc: 'Configure their notification preferences in Settings > Notifications.' },
        { title: 'Share access credentials', desc: 'Provide login credentials for ErrorLens, n8n, Make.com, and any other platforms they need access to.' },
      ],
    },
    {
      id: 'rb_5', title: 'Weekly Error Review Process', category: 'Process', severity: 'info',
      steps: [
        { title: 'Review Analytics', desc: 'Open Analytics tab. Check the 7-day error trend. Note any spikes or new error patterns.' },
        { title: 'Triage open errors', desc: 'Open Error Feed. Filter to "open" errors. Prioritize by severity (critical first).' },
        { title: 'Assign unresolved errors', desc: 'For each open error, verify the workflow owner is aware. Tag or assign as needed.' },
        { title: 'Review resolved errors', desc: 'Check recently resolved errors to verify fixes are holding (no recurrence).' },
        { title: 'Update SLA report', desc: 'Document MTTR, error counts, and uptime for the week. Share with stakeholders.' },
      ],
    },
  ];
  const runbooks = liveRunbooks || defaultRunbooks;
  const active = runbooks.find(r => r.id === activeId);

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Runbooks</h1>
          <div className="page-sub">Standard operating procedures for common incidents and processes</div>
        </div>
        <button className="btn btn-primary"><Icon name="plus" size={14}/> New runbook</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: active ? '300px 1fr' : '1fr', gap: 20 }}>
        {/* Runbook list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {runbooks.map(rb => (
            <div key={rb.id} className="card" onClick={() => setActiveId(activeId === rb.id ? null : rb.id)}
                 style={{ padding: '14px 16px', cursor: 'pointer', borderColor: activeId === rb.id ? 'var(--accent, var(--brand))' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <SeverityIcon sev={rb.severity} size={14}/>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{rb.title}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                <Badge kind={`sev-${rb.severity}`}>{rb.severity}</Badge>
                <span style={{ color: 'var(--text-tertiary)' }}>{rb.category} · {rb.steps.length} steps</span>
              </div>
            </div>
          ))}
        </div>
        {/* Active runbook detail */}
        {active && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{active.title}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Badge kind={`sev-${active.severity}`}>{active.severity}</Badge>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{active.category} · {active.steps.length} steps</span>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setActiveId(null)}><Icon name="x" size={16}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {active.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: i < active.steps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{step.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
// ============ SLA Monitor Tab ============
const SLAMonitorPage = () => {
  const [, forceUpdate] = React.useState(0);
  React.useEffect(() => {
    const h = () => forceUpdate(n => n + 1);
    window.addEventListener('el:data-ready', h);
    return () => window.removeEventListener('el:data-ready', h);
  }, []);

  const raw = window.EL_RAW || {};
  const wfs = raw.workflows || [];
  const errors = raw.errors || [];
  const execs = raw.executions || [];

  // Calculate SLA metrics
  const totalExecs = wfs.reduce((s, w) => s + (w.total_executions || 0), 0);
  const totalErrors = wfs.reduce((s, w) => s + (w.total_errors || 0), 0);
  const uptimePercent = totalExecs > 0 ? (((totalExecs - totalErrors) / totalExecs) * 100).toFixed(2) : '100.00';

  // MTTR (mean time to resolution) from resolved errors
  const resolved = errors.filter(e => e.is_resolved && e.resolved_at && e.occurred_at);
  let mttrMins = 0;
  if (resolved.length > 0) {
    mttrMins = Math.round(resolved.reduce((s, e) => s + Math.max(0, (new Date(e.resolved_at) - new Date(e.occurred_at)) / 60000), 0) / resolved.length);
  }

  // Open errors by age
  const openErrors = errors.filter(e => !e.is_resolved);
  const criticalOpen = openErrors.filter(e => e.severity === 'critical').length;
  const errorOpen = openErrors.filter(e => e.severity === 'error').length;
  const warnOpen = openErrors.filter(e => e.severity === 'warning' || e.severity === 'warn').length;
  // SLA targets
  const slaTargets = [
    { metric: 'Uptime', target: '99.5%', actual: `${uptimePercent}%`, met: parseFloat(uptimePercent) >= 99.5 },
    { metric: 'MTTR (Critical)', target: '< 30 min', actual: mttrMins > 0 ? `${mttrMins} min` : 'No data', met: mttrMins > 0 && mttrMins < 30 },
    { metric: 'Open Critical Errors', target: '0', actual: `${criticalOpen}`, met: criticalOpen === 0 },
    { metric: 'Error Rate', target: '< 5%', actual: totalExecs > 0 ? `${(totalErrors / totalExecs * 100).toFixed(2)}%` : '0%', met: totalExecs === 0 || (totalErrors / totalExecs * 100) < 5 },
  ];

  // Platform uptime
  const platUptime = {};
  wfs.forEach(w => {
    const p = w.platform_type || 'unknown';
    if (!platUptime[p]) platUptime[p] = { execs: 0, errors: 0 };
    platUptime[p].execs += w.total_executions || 0;
    platUptime[p].errors += w.total_errors || 0;
  });

  const fmtDuration = (mins) => {
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins/60)}h ${mins % 60}m`;
    return `${Math.floor(mins/1440)}d`;
  };
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">SLA Monitor</h1>
          <div className="page-sub">Service level agreement tracking and compliance</div>
        </div>
        <div className="system-status">
          <span className="pulse" style={{ background: parseFloat(uptimePercent) >= 99.5 ? '#059669' : '#ef4444' }}/>
          {parseFloat(uptimePercent) >= 99.5 ? 'SLA targets met' : 'SLA breach detected'}
        </div>
      </div>

      {/* Big uptime display */}
      <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Overall System Uptime</div>
        <div style={{ fontSize: 56, fontWeight: 700, fontFamily: 'var(--font-display)', color: parseFloat(uptimePercent) >= 99.5 ? '#059669' : '#ef4444', letterSpacing: '-0.03em' }}>
          {uptimePercent}%
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
          {totalExecs.toLocaleString()} total executions · {totalErrors} errors · MTTR: {mttrMins > 0 ? fmtDuration(mttrMins) : 'N/A'}
        </div>
      </div>
      {/* SLA targets grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
        {slaTargets.map((t, i) => (
          <div key={i} className="card" style={{ padding: 16, borderLeft: `3px solid ${t.met ? '#059669' : '#ef4444'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{t.metric}</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: t.met ? 'rgba(5,150,105,0.12)' : 'rgba(239,68,68,0.12)', color: t.met ? '#059669' : '#ef4444', fontWeight: 600 }}>
                {t.met ? 'MET' : 'BREACH'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
              <span>Target: {t.target}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Actual: {t.actual}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Platform uptime */}
      <div className="card" style={{ padding: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Platform uptime</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {Object.entries(platUptime).map(([p, s]) => {
            const uptime = s.execs > 0 ? (((s.execs - s.errors) / s.execs) * 100).toFixed(2) : '100.00';
            return (
              <div key={p} style={{ padding: 16, background: 'var(--card-hover)', borderRadius: 10, textAlign: 'center' }}>
                <PlatformIcon p={p} size={28}/>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>{p}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: parseFloat(uptime) >= 99 ? '#059669' : '#ef4444', marginTop: 4 }}>{uptime}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{s.execs.toLocaleString()} execs · {s.errors} errors</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Open incidents */}
      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Open incidents impacting SLA</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ padding: '8px 16px', background: criticalOpen > 0 ? 'rgba(239,68,68,0.1)' : 'var(--card-hover)', borderRadius: 8, fontSize: 12 }}>
            <SeverityDot sev="critical" size={8}/> <strong>{criticalOpen}</strong> critical
          </div>
          <div style={{ padding: '8px 16px', background: errorOpen > 0 ? 'rgba(249,115,22,0.1)' : 'var(--card-hover)', borderRadius: 8, fontSize: 12 }}>
            <SeverityDot sev="error" size={8}/> <strong>{errorOpen}</strong> errors
          </div>
          <div style={{ padding: '8px 16px', background: 'var(--card-hover)', borderRadius: 8, fontSize: 12 }}>
            <SeverityDot sev="warn" size={8}/> <strong>{warnOpen}</strong> warnings
          </div>
        </div>
        {openErrors.filter(e => e.severity === 'critical' || e.severity === 'error').slice(0, 5).map(e => {
          const wf = wfs.find(w => w.id === e.workflow_id);
          const age = e.occurred_at ? Math.floor((Date.now() - new Date(e.occurred_at)) / 60000) : 0;
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <SeverityIcon sev={e.severity} size={14}/>
              <span style={{ flex: 1, fontWeight: 500 }}>{e.error_message?.substring(0, 60)}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{wf?.name || 'Unknown'}</span>
              <span style={{ color: age > 60 ? 'var(--sev-critical)' : 'var(--text-tertiary)', fontWeight: 600 }}>{fmtDuration(age)} open</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
// ============ Notifications Center Tab ============
const NotificationsPage = () => {
  const [tab, setTab] = React.useState('all');
  const [, forceUpdate] = React.useState(0);
  React.useEffect(() => {
    const h = () => forceUpdate(n => n + 1);
    window.addEventListener('el:data-ready', h);
    return () => window.removeEventListener('el:data-ready', h);
  }, []);

  const raw = window.EL_RAW || {};
  const errors = raw.errors || [];
  const wfs = raw.workflows || [];

  // Build notification items from recent errors
  const notifications = React.useMemo(() => {
    const items = [];

    // Critical errors = urgent notifications
    errors.filter(e => e.severity === 'critical' && !e.is_resolved).forEach(e => {
      const wf = wfs.find(w => w.id === e.workflow_id);
      items.push({
        id: `crit_${e.id}`, type: 'critical', read: false,
        title: `Critical error in ${wf?.name || 'Unknown workflow'}`,
        body: e.error_message?.substring(0, 100),
        time: e.occurred_at, icon: 'bolt', color: '#ef4444',
      });
    });
    // Recent errors = standard notifications
    errors.filter(e => e.severity !== 'critical').slice(0, 20).forEach(e => {
      const wf = wfs.find(w => w.id === e.workflow_id);
      items.push({
        id: `err_${e.id}`, type: 'error', read: e.is_resolved,
        title: `Error in ${wf?.name || 'Unknown workflow'}`,
        body: e.error_message?.substring(0, 100),
        time: e.occurred_at, icon: 'feed', color: '#f97316',
      });
    });

    // Resolved = info notifications
    errors.filter(e => e.is_resolved).slice(0, 10).forEach(e => {
      const wf = wfs.find(w => w.id === e.workflow_id);
      items.push({
        id: `res_${e.id}`, type: 'resolved', read: true,
        title: `Resolved: ${wf?.name || 'Unknown workflow'}`,
        body: e.error_message?.substring(0, 100),
        time: e.resolved_at || e.occurred_at, icon: 'check', color: '#059669',
      });
    });

    return items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  }, [errors, wfs]);

  const filtered = tab === 'all' ? notifications :
    tab === 'unread' ? notifications.filter(n => !n.read) :
    notifications.filter(n => n.type === tab);

  const unreadCount = notifications.filter(n => !n.read).l