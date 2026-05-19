// ErrorLens â pages
const { useState, useEffect, useMemo, useRef } = React;
// Use getter so we always get the latest data (mock or live Supabase)
const _getD = () => window.EL_DATA;
const D = new Proxy({}, { get: (_, prop) => _getD()[prop] });

// ============ Shell: Sidebar + Topbar ============
const NAV = [
  { id: 'overview', label: 'Overview',     icon: 'home',  group: 'Monitoring' },
  { id: 'workflows',label: 'Workflows',    icon: 'workflow', group: 'Monitoring' },
  { id: 'events',   label: 'Error feed',   icon: 'feed',  group: 'Monitoring' },
  { id: 'analytics',label: 'Analytics',    icon: 'chart', group: 'Monitoring' },
  { id: 'intelligence', label: 'Intelligence', icon: 'sparkles', group: 'Monitoring' },
  { id: 'sla',      label: 'SLA Monitor',  icon: 'shield',group: 'Monitoring' },
  { id: 'alerts',   label: 'Alert rules',  icon: 'bell',  group: 'Monitoring' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', group: 'Monitoring' },
  { id: 'runbooks', label: 'Runbooks',     icon: 'book',  group: 'Configuration' },
  { id: 'integrations', label: 'Integrations', icon: 'plug', group: 'Configuration' },
  { id: 'users',    label: 'Users',        icon: 'users', group: 'Configuration' },
  { id: 'audit',    label: 'Audit Log',    icon: 'log',   group: 'Configuration' },
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

const Topbar = ({ crumbs, onSearch }) => {
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => {
      if (window._elLastRefresh) setLastRefresh(window._elLastRefresh);
    }, 5000);
    return () => clearInterval(tick);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await window.EL_REFRESH();
    setLastRefresh(Date.now());
    setRefreshing(false);
  };

  const ago = lastRefresh ? (() => {
    const s = Math.floor((Date.now() - lastRefresh) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  })() : '';

  return (
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
        <input placeholder="Search errors, workflows, codesâ¦" onChange={(e) => onSearch && onSearch(e.target.value)}/>
        <span className="kbd"><span className="kbd-key">â</span><span className="kbd-key">K</span></span>
      </div>
      <button className="icon-btn" title="Refresh data" onClick={handleRefresh}
              style={{ opacity: refreshing ? 0.5 : 1, transition: 'opacity .2s' }}>
        <Icon name="refreshCw" size={16} style={refreshing ? { animation: 'spin .8s linear infinite' } : {}}/>
      </button>
      {ago && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Updated {ago}</span>}
      <button className="icon-btn" title="Notifications"><Icon name="bell" size={16}/><span className="dot"/></button>
      <button className="icon-btn" title="Help"><Icon name="sparkle" size={16}/></button>
      <div className="avatar">AB</div>
    </div>
  );
};

// ============ Overview ============
const OverviewPage = ({ tweaks, onOpenEvent, onNav }) => {
  // Re-render on data refresh
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('el:data-ready', handler);
    return () => window.removeEventListener('el:data-ready', handler);
  }, []);

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
          <div className="page-sub">Live data Â· across {(raw.platforms||[]).filter(p=>p.is_connected).length} platforms Â· {totalWorkflows} workflows</div>
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
            <div className="card-title">Error timeline Â· 24h</div>
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

// ============ Error Feed ============
const FeedPage = ({ onOpenEvent }) => {
  const [search, setSearch] = useState('');
  const [sev, setSev] = useState({ critical: true, error: true, warn: true, info: true });
  const [plat, setPlat] = useState({ n8n: true, zapier: true, make: true, custom: true });
  const [status, setStatus] = useState({ open: true, ack: true, resolved: true });
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [sort, setSort] = useState({ key: 'minutesAgo', dir: 1 });

  // Re-render on data refresh
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('el:data-ready', handler);
    return () => window.removeEventListener('el:data-ready', handler);
  }, []);

  const filtered = useMemo(() => {
    let arr = D.events.filter(e =>
      sev[e.severity] && plat[e.platform] && status[e.status] &&
      (!search || e.message.toLowerCase().includes(search.toLowerCase()) || e.workflow.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase()))
    );
    arr = [...arr].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return 0;
    });
    return arr;
  }, [search, sev, plat, status, sort]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const toggleSet = (set, setSet, k) => setSet({ ...set, [k]: !set[k] });
  const toggleSort = (key) => setSort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: 1 });

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Error feed</h1>
          <div className="page-sub">{filtered.length} events match your filters Â· across {Object.values(plat).filter(Boolean).length} platforms</div>
        </div>
        <div className="row">
          <button className="btn btn-ghost"><Icon name="download" size={14}/> CSV</button>
          <button className="btn btn-ghost"><Icon name="download" size={14}/> JSON</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" className="ico"/>
          <input placeholder="Search errors by message, workflow, or codeâ¦" value={search} onChange={(e)=>setSearch(e.target.value)}/>
        </div>
        <div className="chip-group">
          {['critical','error','warn','info'].map(s => (
            <button key={s} className={`chip ${sev[s] ? 'on '+(s==='critical'?'crit':s==='error'?'err':s==='warn'?'warn':'info') : ''}`}
                    onClick={() => toggleSet(sev, setSev, s)}>
              <SeverityDot sev={s} size={6}/>{s}
            </button>
          ))}
        </div>
        <div className="chip-group">
          {['n8n','zapier','make','custom'].map(p => (
            <button key={p} className={`chip ${plat[p] ? 'on' : ''}`} onClick={() => toggleSet(plat, setPlat, p)}>
              <PlatformIcon p={p} size={16}/>{p}
            </button>
          ))}
        </div>
        <div className="chip-group">
          {['open','ack','resolved'].map(s => (
            <button key={s} className={`chip ${status[s] ? 'on' : ''}`} onClick={() => toggleSet(status, setStatus, s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflow: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}/>
                <th onClick={() => toggleSort('platform')}>Platform <Icon name="sort" size={10}/></th>
                <th onClick={() => toggleSort('workflow')}>Workflow <Icon name="sort" size={10}/></th>
                <th>Error</th>
                <th>Status</th>
                <th onClick={() => toggleSort('minutesAgo')}>Time {sort.key==='minutesAgo' && <Icon name={sort.dir>0?'chevronD':'chevronU'} size={10}/>}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(e => {
                const open = expanded === e.id;
                return (
                  <React.Fragment key={e.id}>
                    <tr className={open ? 'expanded' : ''} onClick={() => setExpanded(open ? null : e.id)}>
                      <td><SeverityIcon sev={e.severity} size={13}/></td>
                      <td><span className="platform-row"><PlatformIcon p={e.platform} size={20}/>{e.platform}</span></td>
                      <td className="col-wf">{e.workflow}</td>
                      <td className="col-msg">{e.message}</td>
                      <td><Badge kind={`status-${e.status}`}>{e.status}</Badge></td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }} title={e.fullTime}>{e.timestamp}</td>
                    </tr>
                    {open && (
                      <tr className="expanded-row">
                        <td colSpan="6">
                          <div className="expand-pad">
                            <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                              <code style={{ background: 'var(--card)', padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>{e.code}</code>
                              <code style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{e.execId}</code>
                              <div className="spacer"/>
                              <button className="btn btn-primary" onClick={(ev) => { ev.stopPropagation(); onOpenEvent(e); }}>
                                Open detail <Icon name="ext" size={12}/>
                              </button>
                            </div>
                            <div className="code-block">
                              <div className="code-head"><span>stack trace Â· first 3 frames</span></div>
                              <div className="code-body">
                                <div className="code-lines">{[1,2,3].map(n => <div key={n}>{n}</div>)}</div>
                                <div className="code-content">{D.stackTrace.split('\n').slice(0,3).join('\n')}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>Showing {(page-1)*pageSize + 1}â{Math.min(page*pageSize, filtered.length)} of {filtered.length} events</span>
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
  const [resolving, setResolving] = useState(false);
  const [detailTab, setDetailTab] = useState('error'); // 'error' | 'execution' | 'workflow'

  if (!event) return null;

  // Find the matching execution from raw data
  const raw = window.EL_RAW || {};
  const execution = (raw.executions || []).find(e => e.id === event.execId) || null;
  const workflow = (raw.workflows || []).find(w => w.id === event.workflowId) || null;
  const owner = workflow ? (window.EL_DATA.ownerMap || {})[workflow.id] : null;

  // Find similar errors (same error type or same workflow)
  const similarByType = D.events.filter(e => e.code === event.code && e.id !== event.id).slice(0, 6);
  const similarByWorkflow = D.events.filter(e => e.workflowId === event.workflowId && e.id !== event.id).slice(0, 6);

  // Execution timeline for this workflow (last 10)
  const wfExecs = (raw.executions || []).filter(e => e.workflow_id === event.workflowId).slice(0, 10);

  const handleResolve = async () => {
    setResolving(true);
    try {
      await window.EL_SUPABASE.upsert('el_error_status', { error_id: event.id, status: 'resolved', updated_at: new Date().toISOString() });
      await window.EL_SUPABASE.patch('el_errors', `id=eq.${event.id}`, { is_resolved: true, resolved_at: new Date().toISOString() });
      await window.EL_REFRESH();
    } catch (err) { console.error('Resolve failed:', err); }
    setResolving(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : 'â';
  const fmtDuration = (ms) => {
    if (!ms) return 'â';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms/1000).toFixed(1)}s`;
    return `${Math.floor(ms/60000)}m ${Math.round((ms%60000)/1000)}s`;
  };

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
          {event.status !== 'resolved' && (
            <button className="btn btn-primary" onClick={handleResolve} disabled={resolving}>
              {resolving ? 'Resolving...' : 'Resolve'}
            </button>
          )}
        </div>
      </div>

      {/* Detail tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--card-hover)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {[{id:'error',label:'Error Details'},{id:'execution',label:'Execution Drill-Down'},{id:'workflow',label:'Workflow History'}].map(t => (
          <button key={t.id} onClick={() => setDetailTab(t.id)}
                  style={{ padding: '6px 16px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
                           background: detailTab === t.id ? 'var(--bg-card)' : 'transparent',
                           color: detailTab === t.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                           boxShadow: detailTab === t.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div>
          {/* Error Details Tab */}
          {detailTab === 'error' && (
            <>
              <div className="meta-grid">
                <div><div className="m-key">Platform</div><div className="m-val"><span className="platform-row" style={{ marginTop: 4 }}><PlatformIcon p={event.platform} size={14}/>{event.platform}</span></div></div>
                <div><div className="m-key">Workflow</div><div className="m-val" style={{ fontFamily: 'var(--font-sans)' }}>{event.workflow}</div></div>
                <div><div className="m-key">Execution ID</div><div className="m-val">{event.execId}</div></div>
                <div><div className="m-key">Occurred at</div><div className="m-val">{fmtDate(event.fullTime)}</div></div>
                <div><div className="m-key">Error type</div><div className="m-val" style={{ color: 'var(--sev-critical)' }}>{event.code}</div></div>
                <div><div className="m-key">Error node</div><div className="m-val">{event.errorNode || 'â'}</div></div>
                <div><div className="m-key">Owner</div><div className="m-val" style={{ fontFamily: 'var(--font-sans)' }}>{owner ? owner.name : 'Unassigned'}</div></div>
                <div><div className="m-key">Status</div><div className="m-val"><Badge kind={`status-${event.status}`}>{event.status}</Badge></div></div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div className="card-title" style={{ marginBottom: 10 }}>Error message</div>
                <div className="code-block">
                  <div className="code-head">
                    <span>{event.errorNode || 'error output'}</span>
                    <button className="btn btn-ghost" style={{ height: 22, fontSize: 11, padding: '0 8px' }}
                            onClick={() => navigator.clipboard.writeText(event.message)}>
                      <Icon name="copy" size={11}/> Copy
                    </button>
                  </div>
                  <div className="code-body">
                    <div className="code-content" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{event.message}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Execution Drill-Down Tab */}
          {detailTab === 'execution' && (
            <>
              <div className="card" style={{ marginBottom: 20, padding: 20 }}>
                <div className="card-title" style={{ marginBottom: 16 }}>Execution details</div>
                {execution ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ padding: '12px 16px', background: 'var(--card-hover)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Execution ID</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{execution.id}</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--card-hover)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Status</div>
                      <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: execution.status === 'success' ? 'var(--status-resolved)' : 'var(--sev-error)' }}/>
                        <span style={{ color: 'var(--text-primary)' }}>{execution.status}</span>
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--card-hover)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Started</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{fmtDate(execution.started_at)}</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--card-hover)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Finished</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{fmtDate(execution.finished_at)}</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--card-hover)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Duration</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtDuration(execution.duration_ms)}</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--card-hover)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Platform</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PlatformIcon p={execution.platform_type} size={16}/>{execution.platform_type}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                    No execution data found for ID: {event.execId}
                  </div>
                )}
              </div>

              {execution && (execution.error_message || execution.error_node) && (
                <div className="card" style={{ marginBottom: 20, padding: 20 }}>
                  <div className="card-title" style={{ marginBottom: 12 }}>Error in execution</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {execution.error_node && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 80 }}>Failed node:</span>
                        <code style={{ fontSize: 12, padding: '3px 8px', background: 'var(--sev-critical-bg, rgba(239,68,68,0.1))', color: 'var(--sev-critical)', borderRadius: 4 }}>{execution.error_node}</code>
                      </div>
                    )}
                    {execution.error_type && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 80 }}>Error type:</span>
                        <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{execution.error_type}</code>
                      </div>
                    )}
                    {execution.error_message && (
                      <div className="code-block" style={{ marginTop: 8 }}>
                        <div className="code-head"><span>error output</span></div>
                        <div className="code-body">
                          <div className="code-content" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{execution.error_message}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Workflow History Tab */}
          {detailTab === 'workflow' && (
            <>
              {workflow && (
                <div className="card" style={{ marginBottom: 20, padding: 20 }}>
                  <div className="card-title" style={{ marginBottom: 16 }}>Workflow: {workflow.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Total runs', val: (workflow.total_executions || 0).toLocaleString(), color: 'var(--text-primary)' },
                      { label: 'Errors', val: workflow.total_errors || 0, color: 'var(--sev-error)' },
                      { label: 'Success', val: workflow.total_success || 0, color: 'var(--status-resolved)' },
                      { label: 'Error rate', val: `${(workflow.error_rate || 0).toFixed(1)}%`, color: (workflow.error_rate || 0) > 10 ? 'var(--sev-critical)' : 'var(--status-resolved)' },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--card-hover)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: 20 }}>
                <div className="card-title" style={{ marginBottom: 12 }}>Recent executions for this workflow</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <span>Execution ID</span><span>Status</span><span>Started</span><span>Duration</span><span>Error</span>
                  </div>
                  {wfExecs.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No executions found</div>
                  )}
                  {wfExecs.map(ex => (
                    <div key={ex.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 12, alignItems: 'center' }}>
                      <span className="mono" style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.id}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: ex.status === 'success' ? 'var(--status-resolved)' : 'var(--sev-error)' }}/>
                        {ex.status}
                      </span>
                      <span style={{ color: 'var(--text-tertiary)' }}>{fmtDate(ex.started_at)}</span>
                      <span className="mono">{fmtDuration(ex.duration_ms)}</span>
                      <span style={{ color: 'var(--sev-error)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ex.error_node || ''}>{ex.error_node || 'â'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Lifecycle</div>
            <div className="lifecycle">
              <div className="lifecycle-item">
                <div className="lifecycle-dot done"><Icon name="check" size={12} strokeWidth={2.5}/></div>
                <div>
                  <div className="lifecycle-title">Created</div>
                  <div className="lifecycle-meta">System Â· {fmtDate(event.fullTime)}</div>
                </div>
              </div>
              <div className="lifecycle-item">
                <div className={`lifecycle-dot ${event.status !== 'open' ? 'done' : 'active'}`}>
                  {event.status !== 'open' ? <Icon name="check" size={12} strokeWidth={2.5}/> : '2'}
                </div>
                <div>
                  <div className="lifecycle-title">Acknowledged</div>
                  <div className="lifecycle-meta">{event.status === 'open' ? 'Pending' : (owner ? owner.name : 'Team') + ' Â· acknowledged'}</div>
                </div>
              </div>
              <div className="lifecycle-item">
                <div className={`lifecycle-dot ${event.status === 'resolved' ? 'done' : ''}`}>
                  {event.status === 'resolved' ? <Icon name="check" size={12} strokeWidth={2.5}/> : '3'}
                </div>
                <div>
                  <div className="lifecycle-title">Resolved</div>
                  <div className="lifecycle-meta">{event.status === 'resolved' ? 'Resolved' : 'â'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Triggered alert rules</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {D.alertRules.filter(r => r.on).slice(0,3).map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>fired</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>
              Similar errors (same type)
              <span style={{ color: 'var(--text-tertiary)', float: 'right' }}>{similarByType.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {similarByType.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No similar errors found</div>}
              {similarByType.slice(0, 5).map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12 }}>
                  <SeverityDot sev={e.severity} size={6}/>
                  <span className="mono" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>{e.workflow}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{e.timestamp}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>
              Same workflow errors
              <span style={{ color: 'var(--text-tertiary)', float: 'right' }}>{similarByWorkflow.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {similarByWorkflow.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No other errors for this workflow</div>}
              {similarByWorkflow.slice(0, 5).map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12 }}>
                  <SeverityDot sev={e.severity} size={6}/>
                  <span className="mono" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>{e.message.substring(0, 50)}</span>
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
