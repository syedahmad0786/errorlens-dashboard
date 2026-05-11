// ErrorLens — secondary pages
// Use getter so we always get the latest data (mock or live Supabase)
const _getD2 = () => window.EL_DATA;
const D2 = new Proxy({}, { get: (_, prop) => _getD2()[prop] });

// ============ Alerts ============
const AlertsPage = ({ onOpenSheet }) => {
  const [rules, setRules] = useState(D2.alertRules);
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Alert rules</h1>
          <div className="page-sub">{rules.length} active rules · last fired 23m ago</div>
        </div>
        <button className="btn btn-primary" onClick={onOpenSheet}>
          <Icon name="plus" size={14}/> New rule
        </button>
      </div>

      <div>
        {rules.map(r => (
          <div key={r.id} className="rule-card">
            <div>
              <div className="rule-name">{r.name}</div>
              <div className="rule-desc">{r.conditions}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                <span><Icon name="clock" size={10}/> {r.cooldown} cooldown</span>
                <span>Last fired: {r.lastFired}</span>
              </div>
            </div>
            <div className="rule-channels">
              {r.channels.map(c => (
                <div key={c} className="channel-pill" title={c}>
                  <Icon name={c === 'slack' ? 'slack' : c === 'email' ? 'mail' : 'pager'} size={13}/>
                </div>
              ))}
            </div>
            <div className={`toggle ${r.on ? 'on' : ''}`} onClick={() => setRules(rs => rs.map(x => x.id === r.id ? { ...x, on: !x.on } : x))}/>
            <div className="row">
              <button className="icon-btn"><Icon name="cog" size={14}/></button>
              <button className="icon-btn"><Icon name="x" size={14}/></button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Start from a template</div>
        <div className="tmpl-grid">
          {[
            { t: 'Critical error alert', d: 'Page on-call when severity is CRITICAL', i: 'bolt' },
            { t: 'High-volume spike',    d: 'Catch unusual error volume in any 10 min window', i: 'arrowUp' },
            { t: 'Workflow-specific',    d: 'Alert when a named workflow fails', i: 'feed' },
          ].map((t, i) => (
            <button key={i} className="tmpl-card" onClick={onOpenSheet}>
              <div className="tmpl-icon"><Icon name={t.i} size={14}/></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t.t}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t.d}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Sheet for creating alert rule
const AlertSheet = ({ open, onClose }) => {
  const [step, setStep] = useState(1);
  return (
    <>
      <div className={`sheet-overlay ${open ? 'open' : ''}`} onClick={onClose}/>
      <div className={`sheet ${open ? 'open' : ''}`}>
        <div className="sheet-head">
          <div>
            <div className="card-title">Step {step} of 3</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, color: 'var(--text-primary)' }}>
              {step === 1 ? 'Conditions' : step === 2 ? 'Channels' : 'Cooldown & preview'}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>
        <div className="sheet-body">
          {step === 1 && (
            <>
              <div className="field">
                <label>Rule name</label>
                <input defaultValue="Critical errors → Slack #incidents"/>
              </div>
              <div className="field">
                <label>When</label>
                <select defaultValue="critical">
                  <option value="critical">Severity is CRITICAL</option>
                  <option>Severity ≥ ERROR</option>
                  <option>Volume exceeds threshold</option>
                </select>
              </div>
              <div className="field">
                <label>Platforms</label>
                <div className="chip-group">
                  {['n8n','zapier','make','custom'].map(p => (
                    <button key={p} className="chip on" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <PlatformIcon p={p} size={14}/>{p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Workflow filter (optional)</label>
                <input placeholder="e.g. Stripe, Postgres, …"/>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="field">
                <label>Channels</label>
                {[
                  { id: 'slack', name: 'Slack', sub: '#incidents · workspace: modern-amenities' },
                  { id: 'email', name: 'Email', sub: 'on-call@modern-amenities.com' },
                  { id: 'pager', name: 'PagerDuty', sub: 'service: ErrorLens-prod' },
                ].map(c => (
                  <label key={c.id} style={{ display: 'flex', gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 8, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked={c.id !== 'pager'}/>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{c.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="field">
                <label>Cooldown</label>
                <select><option>15 minutes</option><option>30 minutes</option><option>1 hour</option></select>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                <div className="card-title" style={{ marginBottom: 8 }}>Preview</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  When <Badge kind="sev-critical">critical</Badge> events occur on any platform, notify <strong>Slack</strong> and <strong>Email</strong>. Wait 15 minutes between alerts.
                </div>
              </div>
            </>
          )}
        </div>
        <div className="sheet-foot">
          {step > 1 && <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>Back</button>}
          <div className="spacer"/>
          {step < 3 ? <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Continue</button>
                    : <button className="btn btn-primary" onClick={onClose}>Create rule</button>}
        </div>
      </div>
    </>
  );
};

// ============ Integrations ============
const IntegrationsPage = () => {
  const [copied, setCopied] = useState(null);
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Integrations</h1>
          <div className="page-sub">Connect your workflow platforms to start receiving errors</div>
        </div>
      </div>

      <div className="stepper">
        <div className="step done">
          <div className="step-circle"><Icon name="check" size={14} strokeWidth={2.5}/></div>
          <div><div className="step-title">Register platform</div><div className="step-sub">{D2.platformsRegistered.filter(p=>p.status==='active').length} connected</div></div>
        </div>
        <div className="step-line"/>
        <div className="step done">
          <div className="step-circle"><Icon name="check" size={14} strokeWidth={2.5}/></div>
          <div><div className="step-title">Copy webhook URL</div><div className="step-sub">Endpoint generated</div></div>
        </div>
        <div className="step-line"/>
        <div className="step active">
          <div className="step-circle">3</div>
          <div><div className="step-title">Receive errors</div><div className="step-sub">{D2.events.length} errors tracked</div></div>
        </div>
      </div>

      <div className="platform-grid">
        {D2.platformsRegistered.map(p => (
          <div key={p.id} className="platform-card">
            <div className="platform-head">
              <PlatformIcon p={p.id} size={36}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <StatusIndicator status={p.status === 'active' ? 'active' : 'error'} size={12}/>
                  {p.status === 'active' ? 'Active' : 'Connection error'}
                </div>
              </div>
            </div>
            <div>
              <div className="card-title" style={{ marginBottom: 6 }}>Events this month</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{p.events.toLocaleString()}</div>
            </div>
            <div>
              <div className="card-title" style={{ marginBottom: 6 }}>{p.lastSynced ? 'Base URL' : 'Webhook URL'}</div>
              <div className="webhook">
                <code>{p.webhook}</code>
                <button className="icon-btn" onClick={() => { setCopied(p.id); setTimeout(() => setCopied(null), 1500); }}>
                  <Icon name={copied === p.id ? 'check' : 'copy'} size={12}/>
                </button>
              </div>
            </div>
            <div className="row" style={{ marginTop: 'auto' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }}>Configure</button>
            </div>
          </div>
        ))}
        <div className="platform-card platform-add">
          <Icon name="plus" size={28}/>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Add platform</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: -4 }}>n8n · Zapier · Make · Custom HTTP</div>
        </div>
      </div>
    </div>
  );
};

// ============ Users ============
const UsersPage = () => {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showInvite, setShowInvite] = React.useState(false);
  const [invEmail, setInvEmail] = React.useState('');
  const [invPass, setInvPass] = React.useState('');
  const [invName, setInvName] = React.useState('');
  const [invRole, setInvRole] = React.useState('viewer');
  const [inviting, setInviting] = React.useState(false);
  const [invError, setInvError] = React.useState('');
  const [invSuccess, setInvSuccess] = React.useState('');
  const isAdmin = window.EL_AUTH && window.EL_AUTH.isAdmin();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await window.EL_AUTH.listUsers();
      setUsers(list || []);
    } catch(e) { console.error('Failed to load users:', e); }
    setLoading(false);
  };

  React.useEffect(() => { loadUsers(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInvError('');
    setInvSuccess('');
    setInviting(true);
    try {
      // Create user via signup
      const result = await window.EL_AUTH.signUp(invEmail, invPass, { display_name: invName, role: invRole });
      const userId = result.id || (result.user && result.user.id);
      if (!userId) throw new Error('Failed to create user');
      // Create profile
      const SB_URL = 'https://wlnkybvwhsaimeqdcfie.supabase.co/rest/v1';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsbmt5YnZ3aHNhaW1lcWRjZmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Nzc3NzMsImV4cCI6MjA5MzA1Mzc3M30.w9XOgm8wzIr-d5ojACPr_k88TiDJeEMGWV9XiOp7M1c';
      const token = window.EL_AUTH.token();
      await fetch(SB_URL + '/el_profiles', {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: userId, email: invEmail, display_name: invName, role: invRole, created_at: new Date().toISOString() }),
      });
      setInvSuccess('User ' + invEmail + ' created successfully!');
      setInvEmail(''); setInvPass(''); setInvName(''); setInvRole('viewer');
      loadUsers();
    } catch(err) {
      setInvError(err.message);
    }
    setInviting(false);
  };

  const roleColors = { admin: '#a78bfa', manager: '#38bdf8', viewer: '#6ee7b7' };
  const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : '??';

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Users</h1>
          <div className="page-sub">{users.length} members{loading ? ' (loading...)' : ''}</div>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setShowInvite(!showInvite)}><Icon name="plus" size={14}/> Add user</button>}
      </div>

      {showInvite && isAdmin && (
        <div className="card" style={{ maxWidth: 520, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Create new user</h3>
          {invError && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{invError}</div>}
          {invSuccess && <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: '#22c55e', fontSize: 13, marginBottom: 12 }}>{invSuccess}</div>}
          <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label>Display name</label><input value={invName} onChange={e => setInvName(e.target.value)} required placeholder="John Doe"/></div>
            <div className="field"><label>Email</label><input type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)} required placeholder="john@company.com"/></div>
            <div className="field"><label>Password</label><input type="password" value={invPass} onChange={e => setInvPass(e.target.value)} required placeholder="Min 6 characters" minLength={6}/></div>
            <div className="field"><label>Role</label>
              <select value={invRole} onChange={e => setInvRole(e.target.value)} style={{ height: 36, background: 'var(--card-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', padding: '0 10px' }}>
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={inviting} style={{ alignSelf: 'flex-start' }}>
              {inviting ? 'Creating...' : 'Create user'}
            </button>
          </form>
        </div>
      )}

      <div className="users-grid">
        {users.map(u => (
          <div key={u.id} className={'user-card ' + (u.role === 'admin' ? 'admin' : '')}>
            <div className="user-avatar" style={{ background: roleColors[u.role] || '#888' }}>{getInitials(u.display_name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name">{u.display_name || u.email}</div>
              <div className="user-email">{u.email}</div>
              <div className="user-role-row">
                <span className={'role-badge role-' + u.role}>{u.role}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>\u00b7 joined {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', {month:'short',year:'numeric'}) : 'unknown'}</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && users.length === 0 && <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: 20 }}>No users found. Click "Add user" to create the first one.</div>}
      </div>
    </div>
  );
};

// ============ Billing ============

// ============ Settings ============
const SettingsPage = () => {
  const [tab, setTab] = useState('general');
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">Organization preferences · webhooks · danger zone</div>
        </div>
      </div>

      <div className="tabs">
        {['general','notifications','danger zone'].map(t => (
          <button key={t} className={`tab ${tab===t?'on':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="field">
            <label>Organization name</label>
            <input defaultValue="Modern Amenities"/>
          </div>
          <div className="field">
            <label>Plan</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'var(--card-hover)', borderRadius: 'var(--radius)' }}>
              <Badge kind="sev-info">Pro</Badge>
              <span style={{ fontSize: 13 }}>Renews May 11, 2026</span>
            </div>
          </div>
          <div className="field">
            <label>Organization ID</label>
            <div className="webhook"><code>org_8fH2k9aB3DpQ7r2mNxLkJ</code><button className="icon-btn"><Icon name="copy" size={12}/></button></div>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="field">
            <label>Slack webhook URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ flex: 1 }} defaultValue="https://hooks.slack.com/services/T0…/B0…/xxxx"/>
              <button className="btn btn-ghost">Send test</button>
            </div>
          </div>
          <div className="field">
            <label>Email recipients</label>
            <textarea rows="3" defaultValue="on-call@modern-amenities.com&#10;sasha@modern-amenities.com"/>
          </div>
          <div className="field" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="toggle on"/>
            <span style={{ fontSize: 13 }}>Send daily summary email at 9:00 UTC</span>
          </div>
        </div>
      )}

      {tab === 'danger zone' && (
        <div className="danger" style={{ maxWidth: 640 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sev-critical)', marginBottom: 4 }}>Delete organization</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
            All events, alert rules, and integrations will be permanently deleted. This cannot be undone.
          </div>
          <button className="btn" style={{ background: 'var(--sev-critical)', color: 'white' }}>Delete Modern Amenities</button>
        </div>
      )}
    </div>
  );
};

// ============ Login ============
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await window.EL_AUTH.signIn(email, password);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <ErrorLensLogo size={32}/>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>ErrorLens</div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>A Modern Amenities product</div>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 16 }}>For ops teams who hate 3am pages</div>
          <h1 style={{ fontSize: 44, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', lineHeight: 1.05, color: 'white', margin: 0 }}>
            Never miss a workflow failure again.
          </h1>
          <p style={{ marginTop: 20, color: 'rgba(255,255,255,0.7)', fontSize: 15, maxWidth: 420, lineHeight: 1.55 }}>
            Catch errors across n8n, Zapier, Make, and custom workflows in one feed. Triage faster. Sleep better.
          </p>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 24, fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600 }}>
            <span>10,000+ workflows monitored</span>
            <span>\u00b7</span>
            <span>SOC 2 type II</span>
          </div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Sign in to ErrorLens</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>Welcome back. Enter your credentials.</p>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required style={{ height: 44 }}/>
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required style={{ height: 44 }}/>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Contact your admin if you need an account.
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AlertsPage, AlertSheet, IntegrationsPage, UsersPage, SettingsPage, LoginPage });
