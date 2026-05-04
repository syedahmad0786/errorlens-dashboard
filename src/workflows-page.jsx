// ErrorLens — Workflows Explorer page
// Shows all n8n + Make.com workflows with node details, connections, and flow visualization

const WorkflowsPage = () => {
  const [platform, setPlatform] = React.useState('all');
  const [status, setStatus] = React.useState('all'); // all | active | archived | inactive
  const [search, setSearch] = React.useState('');
  const [expandedId, setExpandedId] = React.useState(null);
  const [view, setView] = React.useState('grid'); // grid | list
  const [sortBy, setSortBy] = React.useState('name'); // name | errors | executions | nodes

  const raw = window.EL_RAW || {};
  const workflows = raw.workflows || [];

  // Filters
  const filtered = React.useMemo(() => {
    let wfs = [...workflows];
    if (platform !== 'all') wfs = wfs.filter(w => w.platform_type === platform);
    if (status === 'active') wfs = wfs.filter(w => w.is_active && !w.is_archived);
    if (status === 'archived') wfs = wfs.filter(w => w.is_archived);
    if (status === 'inactive') wfs = wfs.filter(w => !w.is_active && !w.is_archived);
    if (search) {
      const q = search.toLowerCase();
      wfs = wfs.filter(w =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.apps_used || []).some(a => a.toLowerCase().includes(q)) ||
        (w.metadata?.connections_used || []).some(c => c.name?.toLowerCase().includes(q))
      );
    }
    // Sort
    if (sortBy === 'errors') wfs.sort((a, b) => (b.total_errors || 0) - (a.total_errors || 0));
    else if (sortBy === 'executions') wfs.sort((a, b) => (b.total_executions || 0) - (a.total_executions || 0));
    else if (sortBy === 'nodes') wfs.sort((a, b) => (b.node_count || 0) - (a.node_count || 0));
    else wfs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return wfs;
  }, [workflows, platform, status, search, sortBy]);

  // Stats
  const n8nCount = workflows.filter(w => w.platform_type === 'n8n').length;
  const makeCount = workflows.filter(w => w.platform_type === 'make').length;
  const activeCount = workflows.filter(w => w.is_active && !w.is_archived).length;
  const archivedCount = workflows.filter(w => w.is_archived).length;
  const totalConns = React.useMemo(() => {
    const all = {};
    workflows.forEach(w => {
      (w.metadata?.connections_used || []).forEach(c => {
        if (!all[c.name]) all[c.name] = { ...c, workflows: [] };
        all[c.name].workflows.push(w.name);
      });
    });
    return Object.values(all);
  }, [workflows]);

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Workflows</h1>
          <div className="page-sub">
            {workflows.length} total · {activeCount} active · {archivedCount} archived · {totalConns.length} connections
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="seg">
            {[{v:'grid',l:'Grid'},{v:'list',l:'List'}].map(m => (
              <button key={m.v} className={view === m.v ? 'on' : ''} onClick={() => setView(m.v)}>{m.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div className="topbar-search" style={{ flex: '1 1 220px', maxWidth: 360 }}>
          <Icon name="search" className="ico"/>
          <input placeholder="Search workflows, apps, connections…" value={search}
                 onChange={e => setSearch(e.target.value)} style={{ width: '100%' }}/>
        </div>

        <div className="seg">
          {[{v:'all',l:`All (${workflows.length})`},{v:'n8n',l:`n8n (${n8nCount})`},{v:'make',l:`Make (${makeCount})`}].map(m => (
            <button key={m.v} className={platform === (m.v === 'n8n' || m.v === 'make' ? m.v : 'all') ? 'on' : ''}
                    onClick={() => setPlatform(m.v === 'n8n' || m.v === 'make' ? m.v : 'all')}>{m.l}</button>
          ))}
        </div>

        <div className="seg">
          {[{v:'all',l:'All'},{v:'active',l:'Active'},{v:'inactive',l:'Inactive'},{v:'archived',l:'Archived'}].map(m => (
            <button key={m.v} className={status === m.v ? 'on' : ''} onClick={() => setStatus(m.v)}>{m.l}</button>
          ))}
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-primary)', fontSize: 12 }}>
          <option value="name">Sort: Name</option>
          <option value="errors">Sort: Errors</option>
          <option value="executions">Sort: Executions</option>
          <option value="nodes">Sort: Nodes</option>
        </select>
      </div>

      {/* Connection summary cards */}
      <ConnectionsSummary connections={totalConns}/>

      {/* Workflow cards */}
      <div className="page-sub" style={{ margin: '16px 0 8px', fontWeight: 600 }}>
        Showing {filtered.length} of {workflows.length} workflows
      </div>

      <div className={view === 'grid' ? 'wf-grid' : 'wf-list'}>
        {filtered.map(wf => (
          <WorkflowCard
            key={wf.id}
            wf={wf}
            expanded={expandedId === wf.id}
            onToggle={() => setExpandedId(expandedId === wf.id ? null : wf.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 13 }}>
          No workflows match your filters
        </div>
      )}

      <style>{`
        .wf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 12px; }
        .wf-list { display: flex; flex-direction: column; gap: 8px; }
        .wf-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
        .wf-card:hover { border-color: var(--accent, var(--brand)); box-shadow: 0 2px 12px rgba(0,0,0,.08); }
        .wf-card.expanded { border-color: var(--accent, var(--brand)); }
        .wf-card-head { display: flex; align-items: flex-start; gap: 10px; }
        .wf-card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .wf-card-icon.n8n { background: #ff622214; color: #ff6222; }
        .wf-card-icon.make { background: #6d28d914; color: #6d28d9; }
        .wf-card-title { font-weight: 600; font-size: 13px; color: var(--text-primary); line-height: 1.3; }
        .wf-card-meta { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
        .wf-stats { display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
        .wf-stat { font-size: 11px; color: var(--text-secondary); }
        .wf-stat b { color: var(--text-primary); font-weight: 600; }
        .wf-apps { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
        .wf-app-tag { font-size: 10px; padding: 2px 7px; border-radius: 20px; background: var(--surface-2); color: var(--text-secondary); border: 1px solid var(--border); }
        .wf-status-badge { font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
        .wf-status-badge.active { background: #05966914; color: #059669; }
        .wf-status-badge.inactive { background: #f5952514; color: #f59525; }
        .wf-status-badge.archived { background: #6b728014; color: #6b7280; }
        .wf-detail { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 14px; }
        .wf-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-secondary); margin: 12px 0 8px; }
        .wf-node-list { display: flex; flex-direction: column; gap: 6px; }
        .wf-node { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--surface-2); border-radius: 6px; font-size: 12px; }
        .wf-node-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .wf-node-name { font-weight: 600; color: var(--text-primary); }
        .wf-node-type { color: var(--text-secondary); font-size: 11px; }
        .wf-flow-arrow { color: var(--text-secondary); font-size: 16px; text-align: center; line-height: 1; }
        .wf-conn-card { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--surface-2); border-radius: 6px; font-size: 12px; border-left: 3px solid var(--accent, var(--brand)); }
        .conn-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .conn-chip { font-size: 11px; padding: 4px 10px; border-radius: 20px; background: var(--surface-1); border: 1px solid var(--border); color: var(--text-secondary); cursor: default; display: flex; align-items: center; gap: 4px; }
        .conn-chip b { color: var(--text-primary); font-weight: 600; }
      `}</style>
    </div>
  );
};

// ============ Connection Summary ============
const ConnectionsSummary = ({ connections }) => {
  if (!connections.length) return null;
  // Group by type
  const byType = {};
  connections.forEach(c => {
    const t = c.type || 'unknown';
    if (!byType[t]) byType[t] = { type: t, count: 0, names: [] };
    byType[t].count++;
    byType[t].names.push(c.name);
  });
  const types = Object.values(byType).sort((a, b) => b.count - a.count);

  return (
    <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        {connections.length} Connections Used Across All Workflows
      </div>
      <div className="conn-summary">
        {types.slice(0, 30).map(t => (
          <div key={t.type} className="conn-chip" title={t.names.join(', ')}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: stringToColor(t.type) }}/>
            <b>{t.type}</b>
            <span>×{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ Workflow Card ============
const WorkflowCard = ({ wf, expanded, onToggle }) => {
  const pt = wf.platform_type;
  const meta = wf.metadata || {};
  const nodes = meta.nodes_detail || [];
  const conns = meta.connections_used || [];
  const graph = meta.connections_graph || [];
  const url = meta.url || '#';
  const statusLabel = wf.is_archived ? 'archived' : wf.is_active ? 'active' : 'inactive';

  return (
    <div className={`wf-card ${expanded ? 'expanded' : ''}`} onClick={onToggle}>
      <div className="wf-card-head">
        <div className={`wf-card-icon ${pt}`}>
          {pt === 'n8n' ? 'n8n' : 'M'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wf-card-title">{wf.name || 'Untitled'}</div>
          <div className="wf-card-meta">
            {pt} · {wf.trigger_type || 'manual'} · {wf.node_count || nodes.length} nodes
          </div>
        </div>
        <span className={`wf-status-badge ${statusLabel}`}>{statusLabel}</span>
      </div>

      <div className="wf-stats">
        <div className="wf-stat"><b>{wf.total_executions || 0}</b> runs</div>
        <div className="wf-stat" style={{ color: (wf.total_errors || 0) > 0 ? 'var(--sev-error)' : undefined }}>
          <b>{wf.total_errors || 0}</b> errors
        </div>
        <div className="wf-stat"><b>{wf.total_success || 0}</b> success</div>
        {conns.length > 0 && <div className="wf-stat"><b>{conns.length}</b> connections</div>}
        {wf.error_rate > 0 && <div className="wf-stat"><b>{wf.error_rate}%</b> error rate</div>}
      </div>

      {(wf.apps_used || []).length > 0 && (
        <div className="wf-apps">
          {(wf.apps_used || []).map(app => (
            <span key={app} className="wf-app-tag">{app}</span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="wf-detail" onClick={e => e.stopPropagation()}>
          {/* Description */}
          {meta.description && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
              {meta.description}
            </div>
          )}

          {/* Open link */}
          <a href={url} target="_blank" rel="noopener noreferrer"
             style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent, var(--brand))', textDecoration: 'none', marginBottom: 12, fontWeight: 600 }}>
            Open in {pt === 'n8n' ? 'n8n' : 'Make.com'} ↗
          </a>

          {/* Connections Used */}
          {conns.length > 0 && (
            <>
              <div className="wf-section-title">Connections ({conns.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {conns.map((c, i) => (
                  <div key={i} className="wf-conn-card">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: stringToColor(c.type || '') }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Type: {c.type} · Used in: {(c.usedIn || []).join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Node Flow */}
          {nodes.length > 0 && (
            <>
              <div className="wf-section-title">Workflow Flow ({nodes.length} nodes)</div>
              <WorkflowFlowDiagram nodes={nodes} graph={graph}/>
            </>
          )}

          {/* Tags */}
          {(wf.tags || []).length > 0 && (
            <>
              <div className="wf-section-title">Tags</div>
              <div className="wf-apps">
                {wf.tags.map(t => <span key={t} className="wf-app-tag">{t}</span>)}
              </div>
            </>
          )}

          {/* Timestamps */}
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {wf.created_at && <span>Created: {new Date(wf.created_at).toLocaleDateString()}</span>}
            {wf.updated_at && <span>Updated: {new Date(wf.updated_at).toLocaleDateString()}</span>}
            {wf.last_execution_at && <span>Last run: {relTimeStr(wf.last_execution_at)}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ Workflow Flow Diagram ============
const WorkflowFlowDiagram = ({ nodes, graph }) => {
  // Build ordered list using graph connections
  const ordered = React.useMemo(() => {
    if (!graph || !graph.length) return nodes;
    // Build adjacency
    const fromMap = {};
    graph.forEach(g => { fromMap[g.from] = g.to; });
    // Find start (trigger or first node not in any "to")
    const tos = new Set(graph.map(g => g.to));
    let start = nodes.find(n => n.isTrigger);
    if (!start) start = nodes.find(n => !tos.has(n.name));
    if (!start) return nodes;

    const visited = new Set();
    const result = [];
    let current = start.name;
    while (current && !visited.has(current)) {
      visited.add(current);
      const node = nodes.find(n => n.name === current);
      if (node) result.push(node);
      current = fromMap[current];
    }
    // Add remaining unvisited nodes
    nodes.forEach(n => { if (!visited.has(n.name)) result.push(n); });
    return result;
  }, [nodes, graph]);

  return (
    <div className="wf-node-list">
      {ordered.map((n, i) => (
        <React.Fragment key={n.id || i}>
          <div className="wf-node">
            <div className="wf-node-dot" style={{ background: n.isTrigger ? 'var(--sev-info)' : stringToColor(n.app || 'default') }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="wf-node-name">{n.name}</span>
              <span className="wf-node-type"> · {n.app || 'unknown'}{n.operation ? ` → ${n.operation}` : ''}</span>
            </div>
            {n.credentials && n.credentials.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--surface-1)', padding: '1px 6px', borderRadius: 10 }}>
                🔑 {n.credentials.length}
              </span>
            )}
          </div>
          {i < ordered.length - 1 && <div className="wf-flow-arrow">↓</div>}
        </React.Fragment>
      ))}
    </div>
  );
};

// ============ Helpers ============
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = hash % 360;
  return `hsl(${h < 0 ? h + 360 : h}, 65%, 55%)`;
}

function relTimeStr(dateStr) {
  if (!dateStr) return 'unknown';
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

Object.assign(window, { WorkflowsPage });
