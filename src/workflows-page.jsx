// ErrorLens â Workflows Explorer page with Developer Ownership
// Shows all n8n + Make.com workflows with owner assignment, developer stats, and filtering

const WorkflowsPage = () => {
  const [platform, setPlatform] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [expandedId, setExpandedId] = React.useState(null);
  const [view, setView] = React.useState('grid');
  const [sortBy, setSortBy] = React.useState('name');
  const [ownerFilter, setOwnerFilter] = React.useState('all'); // 'all' | member id | 'unassigned'
  const [tab, setTab] = React.useState('workflows'); // 'workflows' | 'developers' | 'manage' | 'team'
  const [ownerMap, setOwnerMap] = React.useState({});
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const raw = window.EL_RAW || {};
  const workflows = raw.workflows || [];
  const errors = raw.errors || [];
  const executions = raw.executions || [];

  // Load ownership data
  React.useEffect(() => {
    setTeamMembers(window.EL_DATA?.teamMembers || []);
    setOwnerMap(window.EL_DATA?.ownerMap || {});
  }, [refreshKey]);

  // Refresh helper
  const refreshOwnership = async () => {
    try {
      const sb = window.EL_SUPABASE;
      const [members, owners] = await Promise.all([
        sb.get('el_team_members', 'select=*&order=name.asc'),
        sb.get('el_workflow_owners', 'select=*'),
      ]);
      setTeamMembers(members);
      const map = {};
      owners.forEach(wo => {
        const m = members.find(mm => mm.id === wo.owner_id);
        if (m) map[wo.workflow_id] = { ...m, assigned_at: wo.assigned_at };
      });
      setOwnerMap(map);
      // Update global
      window.EL_RAW.teamMembers = members;
      window.EL_RAW.workflowOwners = owners;
      window.EL_DATA.teamMembers = members;
      window.EL_DATA.ownerMap = map;
    } catch (e) { console.error('Refresh ownership error:', e); }
  };

  // Filters
  const filtered = React.useMemo(() => {
    let wfs = [...workflows];
    if (platform !== 'all') wfs = wfs.filter(w => w.platform_type === platform);
    if (status === 'active') wfs = wfs.filter(w => w.is_active && !w.is_archived);
    if (status === 'archived') wfs = wfs.filter(w => w.is_archived);
    if (status === 'inactive') wfs = wfs.filter(w => !w.is_active && !w.is_archived);
    if (ownerFilter === 'unassigned') wfs = wfs.filter(w => !ownerMap[w.id]);
    else if (ownerFilter !== 'all') wfs = wfs.filter(w => ownerMap[w.id]?.id === ownerFilter);
    if (search) {
      const q = search.toLowerCase();
      wfs = wfs.filter(w =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.apps_used || []).some(a => a.toLowerCase().includes(q)) ||
        (ownerMap[w.id]?.name || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'errors') wfs.sort((a, b) => (b.total_errors || 0) - (a.total_errors || 0));
    else if (sortBy === 'executions') wfs.sort((a, b) => (b.total_executions || 0) - (a.total_executions || 0));
    else if (sortBy === 'nodes') wfs.sort((a, b) => (b.node_count || 0) - (a.node_count || 0));
    else if (sortBy === 'owner') wfs.sort((a, b) => (ownerMap[a.id]?.name || 'zzz').localeCompare(ownerMap[b.id]?.name || 'zzz'));
    else wfs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return wfs;
  }, [workflows, platform, status, search, sortBy, ownerFilter, ownerMap]);

  // Stats
  const n8nCount = workflows.filter(w => w.platform_type === 'n8n').length;
  const makeCount = workflows.filter(w => w.platform_type === 'make').length;
  const zapierCount = workflows.filter(w => w.platform_type === 'zapier').length;
  const activeCount = workflows.filter(w => w.is_active && !w.is_archived).length;
  const assignedCount = workflows.filter(w => ownerMap[w.id]).length;

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Workflows</h1>
          <div className="page-sub">
            {workflows.length} total Â· {activeCount} active Â· {assignedCount} assigned Â· {workflows.length - assignedCount} unassigned
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="ownership-tabs">
        {[
          { id: 'workflows', label: 'Workflows', icon: 'workflow' },
          { id: 'developers', label: 'Developer Stats', icon: 'users' },
          { id: 'manage', label: 'Bulk Assign', icon: 'cog' },
          { id: 'team', label: 'Team Members', icon: 'plus' },
        ].map(t => (
          <button key={t.id} className={`ownership-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={14}/> {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Workflows */}
      {tab === 'workflows' && (
        <>
          {/* Filters bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            <div className="topbar-search" style={{ flex: '1 1 220px', maxWidth: 360 }}>
              <Icon name="search" className="ico"/>
              <input placeholder="Search workflows, apps, ownersâ¦" value={search}
                     onChange={e => setSearch(e.target.value)} style={{ width: '100%' }}/>
            </div>

            <div className="seg">
              {[{v:'all',l:`All (${workflows.length})`},{v:'n8n',l:`n8n (${n8nCount})`},{v:'make',l:`Make (${makeCount})`}].map(m => (
                <button key={m.v} className={platform === m.v ? 'on' : ''} onClick={() => setPlatform(m.v)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {m.v !== 'all' && <PlatformIcon p={m.v} size={15}/>}{m.l}
                </button>
              ))}
            </div>

            {/* Owner filter */}
            <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
                    className="ownership-select">
              <option value="all">All Owners</option>
              <option value="unassigned">Unassigned</option>
              {teamMembers.filter(m => m.is_active).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <div className="seg">
              {[{v:'all',l:'All'},{v:'active',l:'Active'},{v:'inactive',l:'Inactive'}].map(m => (
                <button key={m.v} className={status === m.v ? 'on' : ''} onClick={() => setStatus(m.v)}>{m.l}</button>
              ))}
            </div>

            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="ownership-select">
              <option value="name">Sort: Name</option>
              <option value="errors">Sort: Errors</option>
              <option value="executions">Sort: Executions</option>
              <option value="owner">Sort: Owner</option>
            </select>

            <div className="seg">
              {[{v:'grid',l:'Grid'},{v:'list',l:'List'}].map(m => (
                <button key={m.v} className={view === m.v ? 'on' : ''} onClick={() => setView(m.v)}>{m.l}</button>
              ))}
            </div>
          </div>

          <div className="page-sub" style={{ margin: '0 0 8px', fontWeight: 600 }}>
            Showing {filtered.length} of {workflows.length} workflows
          </div>

          <div className={view === 'grid' ? 'wf-grid' : 'wf-list'}>
            {filtered.map(wf => (
              <WorkflowCard key={wf.id} wf={wf} expanded={expandedId === wf.id}
                onToggle={() => setExpandedId(expandedId === wf.id ? null : wf.id)}
                owner={ownerMap[wf.id]} teamMembers={teamMembers} onOwnerChange={refreshOwnership}/>
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 13 }}>No workflows match your filters</div>
          )}
        </>
      )}

      {/* TAB: Developer Stats */}
      {tab === 'developers' && (
        <DeveloperStatsPanel workflows={workflows} errors={errors} executions={executions}
                             ownerMap={ownerMap} teamMembers={teamMembers}/>
      )}

      {/* TAB: Bulk Assign */}
      {tab === 'manage' && (
        <BulkAssignPanel workflows={workflows} ownerMap={ownerMap} teamMembers={teamMembers}
                         onRefresh={refreshOwnership}/>
      )}

      {/* TAB: Team Members */}
      {tab === 'team' && (
        <TeamMembersPanel teamMembers={teamMembers} onRefresh={refreshOwnership}/>
      )}

      <style>{`
        .ownership-tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 0; }
        .ownership-tab { background: none; border: none; padding: 8px 16px; font-size: 13px; color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; }
        .ownership-tab:hover { color: var(--text-primary); }
        .ownership-tab.active { color: var(--accent, var(--brand)); border-bottom-color: var(--accent, var(--brand)); font-weight: 600; }
        .ownership-select { background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; color: var(--text-primary); font-size: 12px; }
        .owner-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; }
        .owner-avatar { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; color: white; flex-shrink: 0; }
        .wf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 12px; }
        .wf-list { display: flex; flex-direction: column; gap: 8px; }
        .wf-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
        .wf-card:hover { border-color: var(--accent, var(--brand)); box-shadow: 0 2px 12px rgba(0,0,0,.08); }
        .wf-card.expanded { border-color: var(--accent, var(--brand)); }
        .wf-card-head { display: flex; align-items: flex-start; gap: 10px; }
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

        /* Developer Stats */
        .dev-stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
        .dev-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
        .dev-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .dev-avatar-lg { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white; }
        .dev-name { font-weight: 700; font-size: 15px; color: var(--text-primary); }
        .dev-role { font-size: 11px; color: var(--text-secondary); }
        .dev-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .dev-metric { background: var(--surface-2); border-radius: 8px; padding: 10px 12px; }
        .dev-metric-label { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .05em; }
        .dev-metric-value { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-top: 2px; }
        .dev-metric-sub { font-size: 11px; color: var(--text-secondary); }
        .dev-bar { height: 6px; border-radius: 3px; background: var(--surface-2); overflow: hidden; margin-top: 6px; }
        .dev-bar-fill { height: 100%; border-radius: 3px; transition: width .3s; }

        /* Bulk assign */
        .bulk-table { width: 100%; border-collapse: collapse; }
        .bulk-table th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text-secondary); border-bottom: 1px solid var(--border); }
        .bulk-table td { padding: 8px 12px; font-size: 12px; color: var(--text-primary); border-bottom: 1px solid var(--border); }
        .bulk-table tr:hover td { background: var(--surface-2); }

        /* Team members */
        .team-form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; align-items: flex-end; }
        .team-input { background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; color: var(--text-primary); font-size: 12px; }
        .team-input::placeholder { color: var(--text-tertiary); }
        .team-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; }
      `}</style>
    </div>
  );
};

// ============ Developer Stats Panel ============
const DeveloperStatsPanel = ({ workflows, errors, executions, ownerMap, teamMembers }) => {
  const devStats = React.useMemo(() => {
    return teamMembers.filter(m => m.is_active).map(member => {
      const memberWfs = workflows.filter(w => ownerMap[w.id]?.id === member.id);
      const wfIds = new Set(memberWfs.map(w => w.id));
      const memberErrors = errors.filter(e => wfIds.has(e.workflow_id));
      const memberExecs = executions.filter(e => wfIds.has(e.workflow_id));
      const totalRuns = memberWfs.reduce((s, w) => s + (w.total_executions || 0), 0);
      const totalErrors = memberWfs.reduce((s, w) => s + (w.total_errors || 0), 0);
      const totalSuccess = memberWfs.reduce((s, w) => s + (w.total_success || 0), 0);
      const successRate = totalRuns > 0 ? ((totalSuccess / totalRuns) * 100).toFixed(1) : 0;
      const activeWfs = memberWfs.filter(w => w.is_active && !w.is_archived).length;
      const inactiveWfs = memberWfs.filter(w => !w.is_active || w.is_archived).length;
      // Avg resolution time (from resolved errors)
      const resolvedErrors = memberErrors.filter(e => e.is_resolved && e.resolved_at && e.occurred_at);
      let avgResolutionMins = 0;
      if (resolvedErrors.length > 0) {
        const totalMins = resolvedErrors.reduce((s, e) => {
          return s + Math.max(0, (new Date(e.resolved_at) - new Date(e.occurred_at)) / 60000);
        }, 0);
        avgResolutionMins = Math.round(totalMins / resolvedErrors.length);
      }
      return {
        member, wfCount: memberWfs.length, totalRuns, totalErrors, totalSuccess,
        successRate, activeWfs, inactiveWfs, avgResolutionMins,
        recentErrors: memberErrors.slice(0, 5),
      };
    }).sort((a, b) => b.wfCount - a.wfCount);
  }, [workflows, errors, executions, ownerMap, teamMembers]);

  // Unassigned stats
  const unassignedWfs = workflows.filter(w => !ownerMap[w.id]);
  const unassignedErrors = unassignedWfs.reduce((s, w) => s + (w.total_errors || 0), 0);

  if (teamMembers.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
        <Icon name="users" size={32} style={{ opacity: 0.4, marginBottom: 12 }}/>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No team members yet</div>
        <div style={{ fontSize: 13 }}>Add team members in the "Team Members" tab to start tracking developer performance.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary bar */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Team Size</span><div style={{ fontSize: 20, fontWeight: 700 }}>{teamMembers.filter(m => m.is_active).length}</div></div>
        <div><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Assigned Workflows</span><div style={{ fontSize: 20, fontWeight: 700 }}>{workflows.length - unassignedWfs.length}</div></div>
        <div><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Unassigned</span><div style={{ fontSize: 20, fontWeight: 700, color: unassignedWfs.length > 0 ? 'var(--sev-warn)' : undefined }}>{unassignedWfs.length}</div></div>
        <div><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Unassigned Errors</span><div style={{ fontSize: 20, fontWeight: 700, color: unassignedErrors > 0 ? 'var(--sev-error)' : undefined }}>{unassignedErrors}</div></div>
      </div>

      <div className="dev-stats-grid">
        {devStats.map(ds => (
          <div key={ds.member.id} className="dev-card">
            <div className="dev-card-head">
              <div className="dev-avatar-lg" style={{ background: ds.member.avatar_color || '#a78bfa' }}>
                {getInitials(ds.member.name)}
              </div>
              <div>
                <div className="dev-name">{ds.member.name}</div>
                <div className="dev-role">{ds.member.role || 'Developer'} Â· {ds.member.email || ''}</div>
              </div>
            </div>

            <div className="dev-metrics">
              <div className="dev-metric">
                <div className="dev-metric-label">Workflows</div>
                <div className="dev-metric-value">{ds.wfCount}</div>
                <div className="dev-metric-sub">{ds.activeWfs} active Â· {ds.inactiveWfs} inactive</div>
              </div>
              <div className="dev-metric">
                <div className="dev-metric-label">Success Rate</div>
                <div className="dev-metric-value" style={{ color: ds.successRate >= 90 ? '#059669' : ds.successRate >= 70 ? '#f59525' : '#ef4444' }}>
                  {ds.successRate}%
                </div>
                <div className="dev-bar"><div className="dev-bar-fill" style={{ width: `${ds.successRate}%`, background: ds.successRate >= 90 ? '#059669' : ds.successRate >= 70 ? '#f59525' : '#ef4444' }}/></div>
              </div>
              <div className="dev-metric">
                <div className="dev-metric-label">Total Errors</div>
                <div className="dev-metric-value" style={{ color: ds.totalErrors > 0 ? '#ef4444' : '#059669' }}>{ds.totalErrors}</div>
                <div className="dev-metric-sub">of {ds.totalRuns} runs</div>
              </div>
              <div className="dev-metric">
                <div className="dev-metric-label">Avg Resolution</div>
                <div className="dev-metric-value">{ds.avgResolutionMins > 0 ? formatDuration(ds.avgResolutionMins) : 'â'}</div>
                <div className="dev-metric-sub">{ds.avgResolutionMins > 0 ? 'per error' : 'no data'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ Bulk Assign Panel ============
const BulkAssignPanel = ({ workflows, ownerMap, teamMembers, onRefresh }) => {
  const [saving, setSaving] = React.useState({});
  const [filterUnassigned, setFilterUnassigned] = React.useState(false);
  const [bulkOwner, setBulkOwner] = React.useState('');
  const [selected, setSelected] = React.useState(new Set());

  const displayed = filterUnassigned ? workflows.filter(w => !ownerMap[w.id]) : workflows;

  const assignOwner = async (workflowId, ownerId) => {
    setSaving(s => ({ ...s, [workflowId]: true }));
    try {
      const sb = window.EL_SUPABASE;
      if (ownerId === '') {
        await sb.del('el_workflow_owners', `workflow_id=eq.${workflowId}`);
      } else {
        await sb.upsert('el_workflow_owners', { workflow_id: workflowId, owner_id: ownerId, assigned_at: new Date().toISOString() });
      }
      await onRefresh();
    } catch (e) { console.error('Assign error:', e); }
    setSaving(s => ({ ...s, [workflowId]: false }));
  };

  const bulkAssign = async () => {
    if (!bulkOwner || selected.size === 0) return;
    for (const wfId of selected) {
      await assignOwner(wfId, bulkOwner);
    }
    setSelected(new Set());
    setBulkOwner('');
  };

  const toggleSelect = (id) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === displayed.length) setSelected(new Set());
    else setSelected(new Set(displayed.map(w => w.id)));
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={filterUnassigned} onChange={e => setFilterUnassigned(e.target.checked)}/>
          Show unassigned only
        </label>
        <div style={{ flex: 1 }}/>
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selected.size} selected</span>
            <select value={bulkOwner} onChange={e => setBulkOwner(e.target.value)} className="ownership-select">
              <option value="">Assign toâ¦</option>
              {teamMembers.filter(m => m.is_active).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={bulkAssign} disabled={!bulkOwner}
                    style={{ fontSize: 12, padding: '4px 12px' }}>Assign</button>
          </div>
        )}
      </div>

      <table className="bulk-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}><input type="checkbox" checked={selected.size === displayed.length && displayed.length > 0} onChange={toggleAll}/></th>
            <th>Workflow</th>
            <th>Platform</th>
            <th>Status</th>
            <th>Errors</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map(wf => (
            <tr key={wf.id}>
              <td><input type="checkbox" checked={selected.has(wf.id)} onChange={() => toggleSelect(wf.id)}/></td>
              <td style={{ fontWeight: 500 }}>{wf.name}</td>
              <td><PlatformIcon p={wf.platform_type} size={16}/></td>
              <td><span className={`wf-status-badge ${wf.is_active ? 'active' : 'inactive'}`}>{wf.is_active ? 'active' : 'inactive'}</span></td>
              <td style={{ color: (wf.total_errors || 0) > 0 ? 'var(--sev-error)' : undefined }}>{wf.total_errors || 0}</td>
              <td>
                <select value={ownerMap[wf.id]?.id || ''} onChange={e => assignOwner(wf.id, e.target.value)}
                        disabled={saving[wf.id]} className="ownership-select" style={{ minWidth: 120 }}>
                  <option value="">Unassigned</option>
                  {teamMembers.filter(m => m.is_active).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {saving[wf.id] && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 6 }}>savingâ¦</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============ Team Members Panel ============
const TeamMembersPanel = ({ teamMembers, onRefresh }) => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('developer');
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [editName, setEditName] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editRole, setEditRole] = React.useState('');

  const colors = ['#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#818cf8', '#fb923c'];

  const addMember = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const color = colors[teamMembers.length % colors.length];
      await window.EL_SUPABASE.post('el_team_members', {
        name: name.trim(), email: email.trim() || null, role, avatar_color: color, is_active: true
      });
      setName(''); setEmail(''); setRole('developer');
      await onRefresh();
    } catch (e) { console.error('Add member error:', e); }
    setSaving(false);
  };

  const startEdit = (m) => {
    setEditingId(m.id); setEditName(m.name); setEditEmail(m.email || ''); setEditRole(m.role || 'developer');
  };

  const saveEdit = async () => {
    try {
      await window.EL_SUPABASE.patch('el_team_members', `id=eq.${editingId}`, {
        name: editName.trim(), email: editEmail.trim() || null, role: editRole, updated_at: new Date().toISOString()
      });
      setEditingId(null);
      await onRefresh();
    } catch (e) { console.error('Edit member error:', e); }
  };

  const toggleActive = async (member) => {
    try {
      await window.EL_SUPABASE.patch('el_team_members', `id=eq.${member.id}`, {
        is_active: !member.is_active, updated_at: new Date().toISOString()
      });
      await onRefresh();
    } catch (e) { console.error('Toggle member error:', e); }
  };

  return (
    <div>
      {/* Add member form */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>Add Team Member</div>
        <div className="team-form">
          <input className="team-input" placeholder="Name *" value={name} onChange={e => setName(e.target.value)} style={{ flex: '1 1 180px' }}/>
          <input className="team-input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: '1 1 200px' }}/>
          <select value={role} onChange={e => setRole(e.target.value)} className="ownership-select">
            <option value="developer">Developer</option>
            <option value="lead">Team Lead</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn btn-primary" onClick={addMember} disabled={saving || !name.trim()}
                  style={{ fontSize: 12, padding: '6px 16px' }}>
            {saving ? 'Addingâ¦' : 'Add Member'}
          </button>
        </div>
      </div>

      {/* Members list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {teamMembers.map(m => (
          <div key={m.id} className="team-card" style={{ opacity: m.is_active ? 1 : 0.5 }}>
            <div className="dev-avatar-lg" style={{ background: m.avatar_color || '#a78bfa', width: 36, height: 36, fontSize: 13 }}>
              {getInitials(m.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingId === m.id ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <input className="team-input" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: 160 }}/>
                  <input className="team-input" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ width: 200 }}/>
                  <select value={editRole} onChange={e => setEditRole(e.target.value)} className="ownership-select">{['developer','lead','manager','admin'].map(r => <option key={r} value={r}>{r}</option>)}</select>
                  <button className="btn btn-primary" onClick={saveEdit} style={{ fontSize: 11, padding: '3px 10px' }}>Save</button>
                  <button className="btn" onClick={() => setEditingId(null)} style={{ fontSize: 11, padding: '3px 10px' }}>Cancel</button>
                </div>
              ) : (
                <>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.email || 'No email'} Â· {m.role || 'developer'} Â· {m.is_active ? 'Active' : 'Inactive'}</div>
                </>
              )}
            </div>
            {editingId !== m.id && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="icon-btn" onClick={() => startEdit(m)} title="Edit"><Icon name="cog" size={14}/></button>
                <button className="icon-btn" onClick={() => toggleActive(m)} title={m.is_active ? 'Deactivate' : 'Activate'}>
                  <Icon name={m.is_active ? 'x' : 'plus'} size={14}/>
                </button>
              </div>
            )}
          </div>
        ))}
        {teamMembers.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 13 }}>
            No team members yet. Add your first team member above.
          </div>
        )}
      </div>
    </div>
  );
};

// ============ Workflow Card (with owner) ============
const WorkflowCard = ({ wf, expanded, onToggle, owner, teamMembers, onOwnerChange }) => {
  const pt = wf.platform_type;
  const meta = wf.metadata || {};
  const nodes = meta.nodes_detail || [];
  const conns = meta.connections_used || [];
  const graph = meta.connections_graph || [];
  const url = meta.url || '#';
  const statusLabel = wf.is_archived ? 'archived' : wf.is_active ? 'active' : 'inactive';
  const [assigning, setAssigning] = React.useState(false);

  const handleAssign = async (e) => {
    e.stopPropagation();
    const ownerId = e.target.value;
    setAssigning(true);
    try {
      const sb = window.EL_SUPABASE;
      if (ownerId === '') {
        await sb.del('el_workflow_owners', `workflow_id=eq.${wf.id}`);
      } else {
        await sb.upsert('el_workflow_owners', { workflow_id: wf.id, owner_id: ownerId, assigned_at: new Date().toISOString() });
      }
      await onOwnerChange();
    } catch (err) { console.error('Assign error:', err); }
    setAssigning(false);
  };

  return (
    <div className={`wf-card ${expanded ? 'expanded' : ''}`} onClick={onToggle}>
      <div className="wf-card-head">
        <PlatformIcon p={pt} size={34}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wf-card-title">{wf.name || 'Untitled'}</div>
          <div className="wf-card-meta">
            {pt} Â· {wf.trigger_type || 'manual'} Â· {wf.node_count || nodes.length} nodes
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <StatusIndicator status={statusLabel} size={13}/>
          <span className={`wf-status-badge ${statusLabel}`}>{statusLabel}</span>
        </span>
      </div>

      {/* Owner badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {owner ? (
          <div className="owner-badge" style={{ background: (owner.avatar_color || '#a78bfa') + '18' }}>
            <div className="owner-avatar" style={{ background: owner.avatar_color || '#a78bfa' }}>{getInitials(owner.name)}</div>
            <span style={{ color: 'var(--text-primary)' }}>{owner.name}</span>
          </div>
        ) : (
          <div className="owner-badge" style={{ background: 'var(--surface-2)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Unassigned</span>
          </div>
        )}
        <select value={owner?.id || ''} onChange={handleAssign} onClick={e => e.stopPropagation()}
                disabled={assigning} className="ownership-select" style={{ fontSize: 10, padding: '2px 4px' }}>
          <option value="">Unassigned</option>
          {(teamMembers || []).filter(m => m.is_active).map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div className="wf-stats">
        <div className="wf-stat"><b>{wf.total_executions || 0}</b> runs</div>
        <div className="wf-stat" style={{ color: (wf.total_errors || 0) > 0 ? 'var(--sev-error)' : undefined }}>
          <b>{wf.total_errors || 0}</b> errors
        </div>
        <div className="wf-stat"><b>{wf.total_success || 0}</b> success</div>
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
          {meta.description && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>{meta.description}</div>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer"
             style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent, var(--brand))', textDecoration: 'none', marginBottom: 12, fontWeight: 600 }}>
            Open in {pt === 'n8n' ? 'n8n' : 'Make.com'} â
          </a>
          {conns.length > 0 && (
            <>
              <div className="wf-section-title">Connections ({conns.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {conns.map((c, i) => (
                  <div key={i} className="wf-conn-card">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: stringToColor(c.type || '') }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Type: {c.type} Â· Used in: {(c.usedIn || []).join(', ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {nodes.length > 0 && (
            <>
              <div className="wf-section-title">Workflow Flow ({nodes.length} nodes)</div>
              <WorkflowFlowDiagram nodes={nodes} graph={graph}/>
            </>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {wf.created_at && <span>Created: {new Date(wf.created_at).toLocaleDateString()}</span>}
            {wf.last_execution_at && <span>Last run: {relTimeStr(wf.last_execution_at)}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ Workflow Flow Diagram ============
const WorkflowFlowDiagram = ({ nodes, graph }) => {
  const ordered = React.useMemo(() => {
    if (!graph || !graph.length) return nodes;
    const fromMap = {};
    graph.forEach(g => { fromMap[g.from] = g.to; });
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
              <span className="wf-node-type"> Â· {n.app || 'unknown'}{n.operation ? ` â ${n.operation}` : ''}</span>
            </div>
          </div>
          {i < ordered.length - 1 && <div className="wf-flow-arrow">â</div>}
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

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDuration(mins) {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d`;
}

Object.assign(window, { WorkflowsPage });
