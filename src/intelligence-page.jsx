// ErrorLens — Intelligence tab (6 AI-powered features powered by /api/ai + Claude)

const IntelligencePage = () => {
  const [subTab, setSubTab] = React.useState('overview');
  const [, forceUpdate] = React.useState(0);
  React.useEffect(() => {
    const h = () => forceUpdate(n => n + 1);
    window.addEventListener('el:data-ready', h);
    return () => window.removeEventListener('el:data-ready', h);
  }, []);

  const anomalies = React.useMemo(() => window.EL_DETECT_ANOMALIES ? window.EL_DETECT_ANOMALIES() : [], [window.EL_RAW]);
  const atRisk = React.useMemo(() => window.EL_DETECT_AT_RISK ? window.EL_DETECT_AT_RISK() : [], [window.EL_RAW]);

  const tabs = [
    { id: 'overview',   label: 'Overview',           icon: 'sparkles' },
    { id: 'grouping',   label: 'Error Grouping',    icon: 'brain' },
    { id: 'anomalies',  label: 'Anomalies',         icon: 'trendingUp' },
    { id: 'predictive', label: 'At-Risk Workflows', icon: 'trendingDown' },
    { id: 'nlsearch',   label: 'NL Search',         icon: 'search' },
  ];

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Intelligence</h1>
          <div className="page-sub">AI-powered insights · grouping, RCA, anomaly detection, predictive warnings, NL search</div>
        </div>
        <div className="system-status">
          <span className="pulse" style={{ background: '#a78bfa' }}/>
          Claude {window.EL_AI ? 'connected' : 'unavailable'}
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} className={subTab === t.id ? 'on' : ''} onClick={() => setSubTab(t.id)}>
            <Icon name={t.icon} size={12}/> {t.label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && <IntelOverview anomalies={anomalies} atRisk={atRisk}/>}
      {subTab === 'grouping' && <IntelGrouping/>}
      {subTab === 'anomalies' && <IntelAnomalies anomalies={anomalies}/>}
      {subTab === 'predictive' && <IntelPredictive atRisk={atRisk}/>}
      {subTab === 'nlsearch' && <IntelNLSearch/>}
    </div>
  );
};

const IntelOverview = ({ anomalies, atRisk }) => (
  <div>
    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {[
        { label: 'Active Anomalies', value: anomalies.length, color: anomalies.length > 0 ? 'var(--sev-error)' : 'var(--status-resolved)' },
        { label: 'At-Risk Workflows', value: atRisk.length, color: atRisk.length > 0 ? 'var(--sev-warn)' : 'var(--status-resolved)' },
        { label: 'Total Errors (raw)', value: (window.EL_RAW?.errors || []).length, color: 'var(--sev-info)' },
      ].map((k, i) => (
        <div key={i} className="card kpi" style={{ ['--kpi-color']: k.color }}>
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-value">{k.value}</div>
        </div>
      ))}
    </div>

    <div className="card" style={{ padding: 20, marginTop: 16 }}>
      <div className="card-title" style={{ marginBottom: 12 }}>Intelligence features</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {[
          { name: 'AI Error Grouping', desc: 'Cluster similar errors by root cause using Claude.' },
          { name: 'Root Cause Analysis', desc: 'Per-error RCA with confidence + next steps. Open any error to see.' },
          { name: 'Anomaly Detection', desc: '3-sigma statistical detection + Claude narration.' },
          { name: 'Auto-Resolution Suggestions', desc: 'Suggested fix steps for known error patterns.' },
          { name: 'Predictive Failure Warnings', desc: 'Slope-based detection of degrading workflows.' },
          { name: 'Natural Language Search', desc: 'Plain English → Supabase REST filters.' },
        ].map((f, i) => (
          <div key={i} style={{ padding: 14, background: 'var(--card-hover)', borderRadius: 8, borderLeft: '3px solid #a78bfa' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{f.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const IntelGrouping = () => {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  const runGrouping = async () => {
    setLoading(true); setError(null);
    const errors = (window.EL_RAW?.errors || []).slice(0, 50);
    const r = await window.EL_AI.groupErrors(errors);
    if (r.error) setError(r.message || r.error); else setResult(r);
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cluster the 50 most recent errors by likely root cause.</div>
        <button className="btn btn-primary" onClick={runGrouping} disabled={loading}>
          {loading ? 'Analyzing…' : 'Run grouping'}
        </button>
      </div>
      {result?.stubbed && (
        <div className="card" style={{ padding: 14, marginBottom: 16, background: 'rgba(245, 158, 11, 0.08)', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>Demo mode — add <code>ANTHROPIC_API_KEY</code> env var to Vercel to enable real Claude analysis.</div>
        </div>
      )}
      {error && <div className="card" style={{ padding: 14, color: 'var(--sev-error)' }}>Error: {error}</div>}
      {result?.groups && result.groups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {result.groups.map((g, i) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{g.label}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sev-error)' }}>{g.count} errors</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{g.likely_cause}</div>
              <code style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>fingerprint: {g.fingerprint}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const IntelAnomalies = ({ anomalies }) => (
  <div>
    {anomalies.length === 0 ? (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
        No anomalies detected. All workflows operating within 3-sigma of their 7-day baseline.
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {anomalies.map(a => (
          <AnomalyCard key={a.workflow_id} anomaly={a}/>
        ))}
      </div>
    )}
  </div>
);

const AnomalyCard = ({ anomaly: a }) => {
  const [summary, setSummary] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const narrate = async () => {
    setLoading(true);
    const r = await window.EL_AI.anomalySummary({
      workflow: { name: a.workflow_name, platform_type: a.platform_type },
      baseline: a.baseline_daily_errors,
      current: a.current_hourly_errors,
      window_minutes: 60,
      recent: a.recent_errors,
    });
    setSummary(r);
    setLoading(false);
  };
  return (
    <div className="card" style={{ padding: 16, borderLeft: '3px solid var(--sev-error)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{a.workflow_name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{a.platform_type}</div>
        </div>
        <button className="btn btn-ghost" onClick={narrate} disabled={loading}>
          {loading ? '…' : summary ? 'Re-narrate' : 'Narrate with AI'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        Current: <strong>{a.current_hourly_errors}</strong> errors/hr · Baseline: {a.baseline_daily_errors} errors/day · Threshold: {a.threshold_daily}
      </div>
      {summary && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--card-hover)', borderRadius: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{summary.headline}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{summary.summary}</div>
        </div>
      )}
    </div>
  );
};

const IntelPredictive = ({ atRisk }) => (
  <div>
    {atRisk.length === 0 ? (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
        No at-risk workflows detected. Error rates and durations are stable across the last 7 days.
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {atRisk.map(wf => (
          <div key={wf.workflow_id} className="card" style={{ padding: 16, borderLeft: '3px solid var(--sev-warn)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{wf.workflow_name}</div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 }}>AT RISK</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Error rate trend:</span> <strong>+{wf.error_rate_trend_pp}pp</strong></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Duration trend:</span> <strong>{wf.duration_trend_ms > 0 ? '+' : ''}{wf.duration_trend_ms}ms</strong></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>7d errors:</span> <strong>{wf.last_7d_error_count}</strong></div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const IntelNLSearch = () => {
  const [query, setQuery] = React.useState('');
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const r = await window.EL_AI.nlSearch(query);
    setResult(r);
    setLoading(false);
  };

  const examples = [
    'critical errors in the last 24 hours',
    'unresolved n8n errors',
    'authentication errors this week',
    'errors in workflows owned by Ahmad',
  ];

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Search errors in plain English. Claude translates your query into Supabase filters.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="e.g. critical errors in the last 24 hours"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-hover)', color: 'var(--text-primary)', fontSize: 13 }}
          />
          <button className="btn btn-primary" onClick={run} disabled={loading || !query.trim()}>
            {loading ? '…' : 'Search'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => setQuery(ex)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card-hover)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {ex}
            </button>
          ))}
        </div>
      </div>
      {result && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Translation:</div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>{result.explanation}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Query params:</div>
          <code style={{ display: 'block', padding: 10, background: 'var(--card-hover)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{result.params}</code>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { IntelligencePage });
