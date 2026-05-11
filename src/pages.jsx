// ErrorLens — pages
const { useState, useEffect, useMemo, useRef } = React;
// Use getter so we always get the latest data (mock or live Supabase)
const _getD = () => window.EL_DATA;
const D = new Proxy({}, { get: (_, prop) => _getD()[prop] });

// ============ Shell: Sidebar + Topbar ============
const NAV = [
  { id: 'overview', label: 'Overview',     icon: 'home',  group: 'Monitoring' },
  { id: 'workflows',label: 'Workflows',    icon: 'workflow', group: 'Monitoring' },
  { id: 'events',   label: 'Error feed',   icon: 'feed',  group: 'Monitoring' },
  { id: 'alerts',   label: 'Alert rules',  icon: 'bell',  group: 'Monitoring' },
  { id: 'integrations', label: 'Integrations', icon: 'plug', group: 'Configuration' },
  { id: 'users',    label: 'Users',        icon: 'users', group: 'Configuration' },
  { id: 'billing',  label: 'Billing',      icon: 'card',  group: 'Account' },
  { id: 'settings', label: 'Settings',     icon: 'cog',   group: 'Account' },
];

const Sidebar = ({ route, onNav, sidebar, onToggleSidebar }) => {
  const groups = ['Monitoring', 'Configuration', 'Account'];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <ErrorLensLogo size={28}/>
        <span className="wordmark">
          ErrorLens
          <span className="sub">A Modern Amenities product</span>
        </span>
      </div>
      {groups.map(g => (
        <div key={g} className="nav-group">
          <div className="nav-group-label">{g}</div>
          {NAV.filter(n => n.group === g).map(n => (
            <div key={n.id}
                 className={`nav-item ${route === n.id ? 'active' : ''}`}
                 onClick={() => onNav(n.id)}
                 title={sidebar === 'icon' ? n.label : undefined}>
              <Icon name={n.icon} size={16} className="ico"/>
              <span className="label">{n.label}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="sidebar-foot">
        <div className="avatar">AB</div>
        <div className="meta">
          <div className="org">Modern Amenities</div>
          <div className="plan">Pro plan</div>
        </div>
        <button className="icon-btn" onClick={onToggleSidebar}
                title={sidebar === 'icon' ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={sidebar === 'icon' ? 'chevronR' : 'chevronL'} size={14}/>
        </button>
      </div>
    </aside>
  );
};

const Topbar = ({ crumbs, onSearch }) => (
  <div className="topbar">
    <div className="crumbs">
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: 'contents' }}>
          <span className={i === crumbs.length - 1 ? 'current' : ''}>{c}</span>
          {i < crumbs.length - 1 && <Icon name="chevronR" size={12} className="sep"/>}
        </span>
      ))}
    </div>
    <div className="topbar-search">
      <Icon name="search" className="ico"/>
      <input placeholder="Search errors, workflows, codes…" onChange={(e) => onSearch && onSearch(e.target.value)}/>
      <span className="kbd"><span className="kbd-key">⌘</span><span className="kbd-key">K</span></span>
    </div>
    <button className="icon-btn" title="Notifications"><Icon name="bell" size={16}/><span className="dot"/></button>
    <button className="icon-btn" title="Help"><Icon name="sparkle" size={16}/></button>
    <div className="avatar">AB</div>
  </div>
);

// ============ Overview ============
const OverviewPage = ({ tweaks, onOpenEvent, onNav }) => {
  // Live KPIs from Supabase data
  const raw = window.EL_RAW || {};
  const wfs = raw.workflows || [];
  const totalErrors = D.todayErrors || D.events.length;
  const openCount = D.events.filter(e => e.status === 'open').length;
  const criticalCount = D.events.filter(e => e.severity === 'critical').length;
  const resolvedCount = D.events.filter(e => e.status === 'resolved').length;
  const totalWorkflows = wfs.length;
  const activeWorkflows = wfs.filter(w => w.is_active).length;
  const totalExecs = wfs.reduce((s, w) => s + (w.total_executions || 0), 0);
  const totalErrs = wfs.reduce((s, w) => s + (w.total_errors || 0), 0);
  const errorRate = totalExecs ? (totalErrs / totalExecs * 100).toFixed(1) : '0.0';

  // Build sparklines from daily stats (last 12 days of error counts)
  const ds = (raw.dailyStats || D.dailyStats || []);
  const days = [...new Set(ds.map(d => d.stat_date))].sort().slice(-12);
  const errByDay = {};
  days.forEach(d => errByDay[d] = 0);
  ds.forEach(d => { if (errByDay[d.stat_date] !== undefined) errByDay[d.stat_date] += (d.error_count || 0); });
  const errSpark = days.map(d => errByDay[d]);

  const runByDay = {};
  days.forEach(d => runByDay[d] = 0);
  ds.forEach(d => { if (runByDay[d.stat_date] !== undefined) runByDay[d.stat_date] += (d.total_runs || 0); });
  const runSpark = days.map(d => runByDay[d]);

  const kpis = [
    { label: `Total errors (${totalErrs} lifetime)`, value: totalErrors, change: `${errorRate}% rate`, up: totalErrors > 5, color: 'var(--sev-critical)',
      spark: errSpark.length ? errSpark : [0] },
    { label: 'Open incidents',     value: openCount,     change: `of ${D.events.length}`, up: openCount > 10, color: 'var(--sev-error)',
      spark: errSpark.length ? errSpark : [0] },
    { label: 'Workflows tracked',  value: totalWorkflows, change: `${activeWorkflows} active`, up: false, color: 'hsl(263, 80%, 60%)',
      spark: runSpark.length ? runSpark : [0] },
    { label: 'Total executions',   value: totalExecs.toLocaleString(), change: `across ${(raw.platforms||[]).filter(p=>p.is_connected).length} platforms`, up: false, color: 'var(--status-resolved)',
      spark: runSpark.length ? runSpark : [0] },
  ];

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Overview</h1>
          <div className="page-sub">Live data · across {(raw.platforms||[]).filter(p=>p.is_connected).length} platforms · {totalWorkflows} workflows</div>
        </div>
        <div className="row">
          <div className="system-status">
            <span className="pulse"/>All systems operational
          </div>
          <button className="btn btn-ghost"><Icon name="download" size={14}/> Export</button>
        </div>
      </div>

      {tweaks.theme === 'ma' && (
        <div className="ma-callout">
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ma-forest, #184010)', fontWeight: 700, marginBottom: 4 }}>
            Service health
          </div>
          <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ma-black, #000)' }}>
            {totalErrs} errors across {totalWorkflows} workflows. {activeWorkflows} active, {errorRate}% error rate.
          </div>
        </div>
      )}

      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="card kpi" style={{ ['--kpi-color']: k.color }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-row">
              <div className="kpi-value">{k.value}</div>
              <span className={`kpi-change ${k.up ? 'up' : 'down'}`}>
                <Icon name={k.up ? 'arrowUp' : 'arrowDown'} size={10} strokeWidth={2.5}/>
                {k.change}
              </span>
            </div>
            {tweaks.sparklines && (
              <div className="kpi-spark">
                <Sparkline data={k.spark} color={k.color}/>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <div className="card-head">
            <div className="card-title">Error timeline · 24h</div>
            <div className="seg">
              {['area','heatmap','ridge'].map(m => (
                <button key={m} className={tweaks.timeline === m ? 'on' : ''}
                        onClick={() => tweaks.set('timeline', m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <TimelineChart data={D.timeline} mode={tweaks.timeline}/>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
            {['critical','error','warn','info'].map(s => (
              <span key={s} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                <SeverityIcon sev={s} size={10}/>{s}
              </span>
            ))}
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-head">
            <div className="card-title">Severity breakdown</div>
            <div className="seg">
              {['bar','donut','multiples'].map(m => (
                <button key={m} className={tweaks.severity === m ? 'on' : ''}
                        onClick={() => tweaks.set('severity', m)}>
                  {m === 'multiples' ? 'Multi' : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <SeverityBreakdown counts={D.severityCounts} mode={tweaks.severity}/>
        </div>
      </div>

      <div className="chart-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <div className="card-head" style={{ marginBottom: 4 }}>
            <div className="card-title">Recent errors</div>
            <button className="btn btn-ghost" onClick={() => onNav('events')} style={{ height: 26, fontSize: 12 }}>
              View all <Icon name="chevronR" size={12}/>
            </button>
          </div>
          <div className="feed-list">
            {D.events.slice(0, 6).map(e => (
              <div key={e.id} className="feed-row" onClick={() => onOpenEvent(e)}>
                <SeverityIcon sev={e.severity} size={14}/>
                <PlatformIcon p={e.platform} size={22}/>
                <div className="msg" title={e.message}>{e.message}</div>
                <Badge kind={`status-${e.status}`}>{e.status}</Badge>
                <span className="ts">{e.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Top workflows by errors</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(wfs.filter(w => (w.total_errors || 0) > 0)
              .sort((a, b) => (b.total_errors || 0) - (a.total_errors || 0))
              .slice(0, 5)
              .map(w => ({
                wf: w.name,
                n: w.total_errors || 0,
                sev: (w.error_rate || 0) > 50 ? 'critical' : (w.error_rate || 0) > 10 ? 'error' : 'warn',
                platform: w.platform_type,
              }))
            ).map((r, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-primary)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <PlatformIcon p={r.platform} size={18}/>
                    <SeverityDot sev={r.sev} size={6}/>{r.wf}
                  </span>
                  <span className="mono" style={{ color: 'var(--text-tertiary)' }}>{r.n}</span>
                </div>
                <div style={{ height: 4, background: 'var(--card-hover)', borderRadius: 999 }}>
                  <div style={{ height: '100%', width: `${(r.n/38)*100}%`, background: `var(--sev-${r.sev})`, borderRadius: 999 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
// ============ Error Feed — Workflow Tabs + Grouped Errors ============
const FeedPage = ({ onOpenEvent }) => {
  const [search, setSearch] = useState('');
  const [sev, setSev] = useState({ critical: true, error: true, warn: true, info: true });
  const [status, setStatus] = useState({ open: true, ack: true, resolved: true });
  const [activeTab, setActiveTab] = useState('all');
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Build workflow tabs from live data
  const workflowTabs = useMemo(() => {
    const wfMap = {};
    D.events.forEach(e => {
      if (!wfMap[e.workflowId]) {
        wfMap[e.workflowId] = { id: e.workflowId, name: e.workflow, platform: e.platform, count: 0, openCount: 0 };
      }
      wfMap[e.workflowId].count++;
      if (e.status === 'open') wfMap[e.workflowId].openCount++;
    });
    return Object.values(wfMap).sort((a, b) => b.count - a.count);
  }, []);

  // Filter events by active tab + filters
  const filtered = useMemo(() => {
    let arr = D.events.filter(e =>
      sev[e.severity] &&
      status[e.status] &&
      (activeTab === 'all' || e.workflowId === activeTab) &&
      (!search || e.message.toLowerCase().includes(search.toLowerCase()) || e.workflow.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase()))
    );
    return arr;
  }, [search, sev, status, activeTab]);

  // Group identical errors (same message + same error code + same workflow)
  const grouped = useMemo(() => {
    const gMap = {};
    filtered.forEach(e => {
      const key = `${e.workflowId}::${e.message}::${e.code}`;
      if (!gMap[key]) {
        gMap[key] = {
          key,
          message: e.message,
          code: e.code,
          severity: e.severity,
          workflow: e.workflow,
          workflowId: e.workflowId,
          platform: e.platform,
          status: e.status,
          latestTime: e.fullTime,
          latestTimestamp: e.timestamp,
          minutesAgo: e.minutesAgo,
          errorNode: e.errorNode,
          instances: [],
        };
      }
      gMap[key].instances.push(e);
      // Keep the most recent info
      if (e.minutesAgo < gMap[key].minutesAgo) {
        gMap[key].minutesAgo = e.minutesAgo;
        gMap[key].latestTime = e.fullTime;
        gMap[key].latestTimestamp = e.timestamp;
        gMap[key].severity = e.severity;
      }
      // If any instance is open, mark group as open
      if (e.status === 'open') gMap[key].status = 'open';
    });
    return Object.values(gMap).sort((a, b) => a.minutesAgo - b.minutesAgo);
  }, [filtered]);

  const pageGroups = grouped.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(grouped.length / pageSize));

  const toggleSet = (set, setSet, k) => setSet({ ...set, [k]: !set[k] });

  // Reset page when tab changes
  const switchTab = (tab) => { setActiveTab(tab); setPage(1); setExpandedGroup(null); setExpandedEvent(null); };

  const totalFiltered = filtered.length;
  const totalGrouped = grouped.length;

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Error feed</h1>
          <div className="page-sub">{totalFiltered} errors in {totalGrouped} groups · {workflowTabs.length} workflows</div>
        </div>
        <div className="row">
          <button className="btn btn-ghost"><Icon name="download" size={14}/> CSV</button>
          <button className="btn btn-ghost"><Icon name="download" size={14}/> JSON</button>
        </div>
      </div>

      {/* Workflow Tabs */}
      <div className="wf-tabs">
        <button className={`wf-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => switchTab('all')}>
          <Icon name="layers" size={13}/>
          <span>All workflows</span>
          <span className="wf-tab-count">{D.events.length}</span>
        </button>
        {workflowTabs.map(wf => (
          <button key={wf.id} className={`wf-tab ${activeTab === wf.id ? 'active' : ''}`} onClick={() => switchTab(wf.id)}>
            <PlatformIcon p={wf.platform} size={13}/>
            <span className="wf-tab-name">{wf.name}</span>
            <span className="wf-tab-count">{wf.count}</span>
            {wf.openCount > 0 && <span className="wf-tab-open">{wf.openCount} open</span>}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" className="ico"/>
          <input placeholder="Search errors by message or code…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <div className="chip-group">
          {['critical','error','warn','info'].map(s => (
            <button key={s} className={`chip ${sev[s] ? 'on '+(s==='critical'?'crit':s==='error'?'err':s==='warn'?'warn':'info') : ''}`}
                    onClick={() => toggleSet(sev, setSev, s)}>
              <span className="dot" style={{ background: `var(--sev-${s})` }}/>{s}
            </button>
          ))}
        </div>
        <div className="chip-group">
          {['open','ack','resolved'].map(s => (
            <button key={s} className={`chip ${status[s] ? 'on' : ''}`} onClick={() => toggleSet(status, setStatus, s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Grouped Error List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflow: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}/>
                <th>Platform</th>
                <th>Workflow</th>
                <th>Error</th>
                <th style={{ width: 80 }}>Count</th>
                <th>Status</th>
                <th>Latest</th>
              </tr>
            </thead>
            <tbody>
              {pageGroups.map(g => {
                const isOpen = expandedGroup === g.key;
                const count = g.instances.length;
                return (
                  <React.Fragment key={g.key}>
                    <tr className={`group-row ${isOpen ? 'expanded' : ''}`} onClick={() => { setExpandedGroup(isOpen ? null : g.key); setExpandedEvent(null); }}>
                      <td><SeverityDot sev={g.severity}/></td>
                      <td><span className="platform-row"><PlatformIcon p={g.platform}/>{g.platform}</span></td>
                      <td className="col-wf">{g.workflow}</td>
                      <td className="col-msg">
                        <div className="err-msg-wrap">
                          <Icon name={isOpen ? 'chevronD' : 'chevronR'} size={12} className="expand-chevron"/>
                          <span>{g.message}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`count-badge ${count > 10 ? 'hot' : count > 3 ? 'warm' : ''}`}>{count}x</span>
                      </td>
                      <td><Badge kind={`status-${g.status}`}>{g.status}</Badge></td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }} title={g.latestTime}>{g.latestTimestamp}</td>
                    </tr>
                    {isOpen && (
                      <tr className="expanded-row">
                        <td colSpan="7" style={{ padding: 0 }}>
                          <div className="group-instances">
                            <div className="group-header">
                              <div className="group-summary">
                                <code className="group-code">{g.code}</code>
                                {g.errorNode && <span className="group-node"><Icon name="bolt" size={11}/> {g.errorNode}</span>}
                                <span className="group-range">
                                  {g.instances[g.instances.length - 1].timestamp} — {g.instances[0].timestamp}
                                </span>
                              </div>
                            </div>
                            <div className="instance-list">
                              {g.instances.map((e, idx) => {
                                const evOpen = expandedEvent === e.id;
                                return (
                                  <div key={e.id} className={`instance-row ${evOpen ? 'instance-open' : ''}`}>
                                    <div className="instance-main" onClick={(ev) => { ev.stopPropagation(); setExpandedEvent(evOpen ? null : e.id); }}>
                                      <span className="instance-num">#{idx + 1}</span>
                                      <SeverityDot sev={e.severity} size={6}/>
                                      <span className="instance-id mono">{e.execId}</span>
                                      <Badge kind={`status-${e.status}`} small>{e.status}</Badge>
                                      <span className="instance-time" title={e.fullTime}>{e.fullTime ? new Date(e.fullTime).toLocaleString() : e.timestamp}</span>
                                      <div className="spacer"/>
                                      <button className="btn btn-ghost btn-xs" onClick={(ev) => { ev.stopPropagation(); onOpenEvent(e); }}>
                                        Detail <Icon name="ext" size={10}/>
                                      </button>
                                    </div>
                                    {evOpen && (
                                      <div className="instance-detail">
                                        <div className="code-block" style={{ margin: '8px 0' }}>
                                          <div className="code-head"><span>Error detail</span></div>
                                          <div className="code-body">
                                            <div className="code-content" style={{ padding: '10px 14px' }}>{e.message}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {pageGroups.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
                    <Icon name="checkCircle" size={24} style={{ marginBottom: 8, opacity: 0.4 }}/>
                    <div>No errors match your filters</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>Showing {Math.min((page-1)*pageSize + 1, totalGrouped)}–{Math.min(page*pageSize, totalGrouped)} of {totalGrouped} error groups</span>
          <div className="pager-ctrl">
            <button className="btn btn-ghost btn-icon" disabled={page===1} onClick={() => setPage(p => Math.max(1, p-1))}><Icon name="chevronL" size={14}/></button>
            <span style={{ padding: '0 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
            <button className="btn btn-ghost btn-icon" disabled={page===totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}><Icon name="chevronR" size={14}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ Event Detail ============
const EventDetailPage = ({ event, onBack }) => {
  if (!event) return null;
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 8 }}>
            <Icon name="chevronL" size={14}/> Back to feed
          </button>
          <div className="row" style={{ gap: 12, marginBottom: 6 }}>
            <SeverityIcon sev={event.severity} size={14}/>
            <Badge kind={`sev-${event.severity}`}>{event.severity}</Badge>
            <Badge kind={`status-${event.status}`}>{event.status}</Badge>
            <code style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{event.id}</code>
          </div>
          <h1 className="page-title" style={{ fontFamily: 'var(--font-mono)', fontSize: 20, marginTop: 8, fontWeight: 500 }}>
            {event.message}
          </h1>
        </div>
        <div className="row">
          <button className="btn btn-ghost">Acknowledge</button>
          <button className="btn btn-primary">Resolve</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div>
          <div className="meta-grid">
            <div><div className="m-key">Platform</div><div className="m-val"><span className="platform-row" style={{ marginTop: 4 }}><PlatformIcon p={event.platform} size={14}/>{event.platform}</span></div></div>
            <div><div className="m-key">Workflow</div><div className="m-val" style={{ fontFamily: 'var(--font-sans)' }}>{event.workflow}</div></div>
            <div><div className="m-key">Execution ID</div><div className="m-val">{event.execId}</div></div>
            <div><div className="m-key">Triggered at</div><div className="m-val">{event.fullTime}</div></div>
            <div><div className="m-key">Error code</div><div className="m-val" style={{ color: 'var(--sev-critical)' }}>{event.code}</div></div>
            <div><div className="m-key">Assigned</div><div className="m-val" style={{ fontFamily: 'var(--font-sans)' }}>{event.assignedTo || 'Unassigned'}</div></div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ marginBottom: 10 }}>Stack trace</div>
            <div className="code-block">
              <div className="code-head">
                <span>node:internal/process</span>
                <button className="btn btn-ghost" style={{ height: 22, fontSize: 11, padding: '0 8px' }}>
                  <Icon name="copy" size={11}/> Copy
                </button>
              </div>
              <div className="code-body">
                <div className="code-lines">{D.stackTrace.split('\n').map((_, i) => <div key={i}>{i+1}</div>)}</div>
                <div className="code-content">{D.stackTrace}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="card-title" style={{ marginBottom: 10 }}>Raw payload</div>
            <div className="code-block">
              <div className="code-head"><span>application/json</span><button className="btn btn-ghost" style={{ height: 22, fontSize: 11, padding: '0 8px' }}><Icon name="copy" size={11}/> Copy</button></div>
              <div className="code-body">
                <div className="code-lines">{Array.from({length: 14}, (_, i) => <div key={i}>{i+1}</div>)}</div>
                <div className="code-content">
                  <span className="code-tok-com">{`// captured at ${event.fullTime}`}</span>{'\n'}
                  {`{`}{'\n'}
                  {`  "trigger": {`}{'\n'}
                  {`    "type": `}<span className="code-tok-str">"webhook"</span>{`,`}{'\n'}
                  {`    "source": `}<span className="code-tok-str">"stripe"</span>{`,`}{'\n'}
                  {`    "event": `}<span className="code-tok-str">"invoice.payment_failed"</span>{'\n'}
                  {`  },`}{'\n'}
                  {`  "data": {`}{'\n'}
                  {`    "customer_id": `}<span className="code-tok-str">"cus_OabDef123"</span>{`,`}{'\n'}
                  {`    "amount_due": `}<span className="code-tok-key">4900</span>{`,`}{'\n'}
                  {`    "currency": `}<span className="code-tok-str">"usd"</span>{`,`}{'\n'}
                  {`    "attempt_count": `}<span className="code-tok-key">4</span>{'\n'}
                  {`  }`}{'\n'}
                  {`}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Lifecycle</div>
            <div className="lifecycle">
              <div className="lifecycle-item">
                <div className="lifecycle-dot done"><Icon name="check" size={12} strokeWidth={2.5}/></div>
                <div>
                  <div className="lifecycle-title">Created</div>
                  <div className="lifecycle-meta">System · {event.timestamp}</div>
                </div>
              </div>
              <div className="lifecycle-item">
                <div className={`lifecycle-dot ${event.status !== 'open' ? 'done' : 'active'}`}>
                  {event.status !== 'open' ? <Icon name="check" size={12} strokeWidth={2.5}/> : '2'}
                </div>
                <div>
                  <div className="lifecycle-title">Acknowledged</div>
                  <div className="lifecycle-meta">{event.status === 'open' ? 'Pending' : (event.assignedTo || 'Marcus Webb') + ' · 8m later'}</div>
                </div>
              </div>
              <div className="lifecycle-item">
                <div className={`lifecycle-dot ${event.status === 'resolved' ? 'done' : ''}`}>
                  {event.status === 'resolved' ? <Icon name="check" size={12} strokeWidth={2.5}/> : '3'}
                </div>
                <div>
                  <div className="lifecycle-title">Resolved</div>
                  <div className="lifecycle-meta">{event.status === 'resolved' ? 'Sasha Chen · 2h later' : '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Triggered alert rules</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {D.alertRules.slice(0,2).map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>fired</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Similar errors · 7d<span style={{ color: 'var(--text-tertiary)', float: 'right' }}>14</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {D.events.filter(e => e.code === event.code && e.id !== event.id).slice(0, 4).map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12 }}>
                  <SeverityDot sev={e.severity} size={6}/>
                  <span className="mono" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>{e.workflow}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{e.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Sidebar, Topbar, OverviewPage, FeedPage, EventDetailPage });
