// ErrorLens — main app (auth-gated)
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "ma",
  "accent": "gold",
  "density": "compact",
  "sidebar": "full",
  "sparklines": true,
  "timeline": "area",
  "severity": "bar"h
}/*EDITMODE-END*/;

function ErrorLensApp({ inithialRoute = 'overview', forceTheme }) {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState(initialRoute);
  const [openEvent, setOpenEvent] = React.useState(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [authReady, setAuthReady] = React.useState(false);
  const [user, setUser] = React.useState(null);

  // Initialize auth on mount
  React.useEffect(() => {
    window.EL_AUTH.init().then((session) => {
      if (session) {
        setUser(window.EL_AUTH.profile());
      } else {
        setRoute('login');
      }
      setAuthReady(true);
    }).catch(() => {
      setRoute('login');
      setAuthReady(true);
    });
  }, []);

  const theme = forceTheme || tweaks.theme;
  const accent = tweaks.accent === 'default' ? '' : tweaks.accent;
  const tweaksObj = { ...tweaks, set: (k, v) => setTweak(k, v) };

  const goEvent = (e) => { setOpenEvent(e); setRoute('event'); };
  const goWorkflow = (wfId) => { setRoute('workflows'); };

  const handleLogin = () => {
    setUser(window.EL_AUTH.profile());
    setRoute('overview');
  };

  const handleLogout = async () => {
    await window.EL_AUTH.signOut();
    setUser(null);
    setRoute('login');
  };

  const crumbs = (() => {
    if (route === 'overview') return ['Overview'];
    if (route === 'workflows') return ['Monitoring', 'Workflows'];
    if (route === 'events') return ['Monitoring', 'Error feed'];
    if (route === 'event') return ['Monitoring', 'Error feed', openEvent?.id || 'Detail'];
    if (route === 'alerts') return ['Monitoring', 'Alert rules'];
    if (route === 'integrations') return ['Configuration', 'Integrations'];
    if (route === 'users') return ['Configuration', 'Users'];
    if (route === 'settings') return ['Account', 'Settings'];
    if (route === 'login') return ['Sign in'];
    return ['Overview'];
  })();

  const wrapperProps = {
    'data-theme': theme,
    'data-accent': accent,
    'data-density': tweaks.density,
    'data-sidebar': tweaks.sidebar,
    style: { position: 'absolute', inset: 0, overflow: 'hidden' },
  };

  // Show loading while auth initializes
  if (!authReady) {
    return (
      <div {...wrapperProps}>
        <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg,hsl(224,20%,6%))',flexDirection:'column',gap:16 }}>
          <div style={{ width:36,height:36,border:'3px solid hsl(224,14%,22%)',borderTopColor:'hsl(217,91%,60%)',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>
          <div style={{ color:'hsl(224,10%,62%)',fontSize:14 }}>Authenticating...</div>
        </div>
      </div>
    );
  }

  if (route === 'login' || !user) {
    return (
      <>
        <div {...wrapperProps}><LoginPage onLogin={handleLogin}/></div>
        <ErrorLensTweaksPanel tweaks={tweaks} setTweak={setTweak}/>
      </>
    );
  }

  return (
    <>
      <div {...wrapperProps}>
        <div className="app">
          <Sidebar route={route === 'event' ? 'events' : route} onNav={setRoute}
                   sidebar={tweaks.sidebar}
                   onToggleSidebar={() => setTweak('sidebar', tweaks.sidebar === 'icon' ? 'full' : 'icon')}
                   user={user} onLogout={handleLogout}/>
          <div className="main">
            <Topbar crumbs={crumbs}/>
            {route === 'overview'    && <OverviewPage tweaks={tweaksObj} onOpenEvent={goEvent} onNav={setRoute} onOpenWorkflow={goWorkflow}/>}
            {route === 'workflows'   && <WorkflowsPage/>}
            {route === 'events'      && <FeedPage onOpenEvent={goEvent}/>}
            {route === 'event'       && <EventDetailPage event={openEvent || window.EL_DATA.events[0]} onBack={() => setRoute('events')}/>}
            {route === 'alerts'      && <AlertsPage onOpenSheet={() => setSheetOpen(true)}/>}
            {route === 'integrations'&& <IntegrationsPage/>}
            {route === 'users'       && <UsersPage/>}
            {route === 'settings'    && <SettingsPage/>}
          </div>
          <AlertSheet open={sheetOpen} onClose={() => setSheetOpen(false)}/>
        </div>
      </div>
      <ErrorLensTweaksPanel tweaks={tweaks} setTweak={setTweak}/>
    </>
  );
}

function ErrorLensTweaksPanel({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme"/>
      <TweakRadio label="Mode" value={tweaks.theme}
        options={[{value:'dark',label:'Dark'},{value:'light',label:'Light'},{value:'ma',label:'MA'}]}
        onChange={(v) => setTweak('theme', v)}/>
      <TweakRadio label="Accent" value={tweaks.accent}
        options={[{value:'default',label:'Default'},{value:'gold',label:'Gold'},{value:'forest',label:'Forest'},{value:'violet',label:'Violet'}]}
        onChange={(v) => setTweak('accent', v)}/>
      <TweakSection label="Layout"/>
      <TweakRadio label="Density" value={tweaks.density}
        options={[{value:'comfortable',label:'Comfy'},{value:'compact',label:'Compact'}]}
        onChange={(v) => setTweak('density', v)}/>
      <TweakRadio label="Sidebar" value={tweaks.sidebar}
        options={[{value:'full',label:'Full'},{value:'icon',label:'Icon'}]}
        onChange={(v) => setTweak('sidebar', v)}/>
      <TweakSection label="Charts"/>
      <TweakToggle label="KPI sparklines" value={tweaks.sparklines}
        onChange={(v) => setTweak('sparklines', v)}/>
      <TweakRadio label="Timeline" value={tweaks.timeline}
        options={[{value:'area',label:'Area'},{value:'heatmap',label:'Heat'},{value:'ridge',label:'Ridge'}]}
        onChange={(v) => setTweak('timeline', v)}/>
      <TweakRadio label="Severity" value={tweaks.severity}
        options={[{value:'bar',label:'Bar'},{value:'donut',label:'Donut'},{value:'multiples',label:'Multi'}]}
        onChange={(v) => setTweak('severity', v)}/>
    </TweaksPanel>
  );
}

Object.assign(window, { ErrorLensApp, ErrorLensTweaksPanel, TWEAK_DEFAULTS });
