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
                  {['n8n','zapier','make','custom'].map(p => <button key={p} className="chip on">{p}</button>)}
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
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.status === 'active' ? 'var(--status-resolved)' : 'var(--sev-critical)' }}/>
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
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Users</h1>
          <div className="page-sub">{D2.teamUsers.length} members · 1 admin · 2 managers</div>
        </div>
        <button className="btn btn-primary"><Icon name="plus" size={14}/> Invite user</button>
      </div>

      <div className="users-grid">
        {D2.teamUsers.map(u => (
          <div key={u.email} className={`user-card ${u.role === 'admin' ? 'admin' : ''}`}>
            <div className="user-avatar" style={{ background: u.color }}>{u.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name">{u.name}</div>
              <div className="user-email">{u.email}</div>
              <div className="user-role-row">
                <span className={`role-badge role-${u.role}`}>{u.role}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>· joined {u.joined}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ Billing ============
const BillingPage = () => {
  const [billed, setBilled] = useState('annual');
  const used = 18742, limit = 50000;
  const tiers = [
    { name: 'Starter', price: 0, period: 'forever', feats: ['10K events / month', '7-day retention', '2 platforms', '1 alert rule', 'Community support'], cta: 'Current plan', current: true },
    { name: 'Pro', price: billed === 'annual' ? 49 : 59, period: 'per month', feats: ['100K events / month', '30-day retention', 'Unlimited platforms', 'Unlimited alert rules', 'Slack + PagerDuty', 'Email support'], cta: 'Upgrade to Pro', featured: true },
    { name: 'Enterprise', price: 'Custom', period: '', feats: ['Unlimited events', '1-year retention', 'SAML SSO', 'Audit log', 'Dedicated support', '99.99% SLA'], cta: 'Contact sales' },
  ];
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Billing</h1>
          <div className="page-sub">You're on the Starter plan · Upgrade for unlimited platforms</div>
        </div>
      </div>

      <div className="plan-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div className="card-title">Current plan</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>Starter</div>
          </div>
          <button className="btn btn-ghost">Manage plan</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
          <span><strong style={{ color: 'var(--text-primary)' }}>{used.toLocaleString()}</strong> / {limit.toLocaleString()} events</span>
          <span>14 days left in cycle</span>
        </div>
        <div className="usage-bar"><div className="usage-fill" style={{ width: `${used/limit*100}%` }}/></div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{Math.round(used/limit*100)}% used · resets May 11</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Plans</h2>
        <div className="seg">
          <button className={billed==='monthly'?'on':''} onClick={()=>setBilled('monthly')}>Monthly</button>
          <button className={billed==='annual'?'on':''} onClick={()=>setBilled('annual')}>Annual · save 20%</button>
        </div>
      </div>

      <div className="pricing-grid">
        {tiers.map(t => (
          <div key={t.name} className={`pricing-card ${t.featured ? 'featured' : ''}`}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.name}</div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="price">{typeof t.price === 'number' ? `$${t.price}` : t.price}</span>
              <span className="price-period">{t.period}</span>
            </div>
            <ul className="feature-list">
              {t.feats.map((f, i) => (
                <li key={i}><Icon name="check" size={14} className="check" strokeWidth={2.5}/>{f}</li>
              ))}
            </ul>
            <button className={`btn btn-lg ${t.featured ? 'btn-primary' : 'btn-ghost'}`} disabled={t.current} style={{ width: '100%', justifyContent: 'center' }}>{t.cta}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

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
  return (
    <div className="login-wrap">
      <div className="login-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', position: 'relative' }}>
            <span style={{ position: 'absolute', inset: 7, border: '2px solid white', borderRadius: '50%' }}/>
          </div>
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
            <span>·</span>
            <span>SOC 2 type II</span>
          </div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Sign in to ErrorLens</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>Welcome back. Pick up where you left off.</p>

          <button className="oauth-btn" onClick={onLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M20.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.5 2.6-3.8 2.6-6.7z" fill="#4285F4"/>
              <path d="M12 21c2.4 0 4.5-.8 5.9-2.1l-2.9-2.2c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4.1v2.3A9 9 0 0 0 12 21z" fill="#34A853"/>
              <path d="M7 13.9a5.4 5.4 0 0 1 0-3.5V8.1H4.1a9 9 0 0 0 0 8.1L7 13.9z" fill="#FBBC04"/>
              <path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5A9 9 0 0 0 12 3a9 9 0 0 0-7.9 5.1L7 10.4C7.7 8.2 9.7 6.6 12 6.6z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
            or
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label>Work email</label>
            <input type="email" placeholder="you@company.com" style={{ height: 44 }}/>
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={onLogin}>Send magic link</button>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Don't have an account? <a style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }} href="#">Start free →</a>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AlertsPage, AlertSheet, IntegrationsPage, UsersPage, BillingPage, SettingsPage, LoginPage });
