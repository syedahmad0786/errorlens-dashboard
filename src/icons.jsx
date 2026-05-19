// ErrorLens â shared icons & UI primitives
// Pure SVG icons, no external dep
const Icon = ({ name, size = 16, className = '', strokeWidth = 1.75 }) => {
  const paths = {
    home:        <><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></>,
    feed:        <><path d="M4 6h16M4 12h16M4 18h10"/></>,
    bell:        <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    plug:        <><path d="M9 2v4M15 2v4M7 9h10v3a5 5 0 0 1-10 0V9z"/><path d="M12 17v5"/></>,
    users:       <><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15 20c0-2.5 1.5-4.5 4-4.5s4 2 4 4.5"/></>,
    card:        <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></>,
    cog:         <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    workflow:    <><circle cx="5" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="20" r="2"/><path d="M7 6h5l5-0M12 14v4M7 7l3 3M17 7l-3 3"/></>,
    search:      <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    download:    <><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></>,
    external:    <><path d="M14 3h7v7M21 3l-9 9M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></>,
    sparkles:    <><path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5z"/><path d="M19 14l1 2.5L22.5 18l-2.5 1L19 21.5l-1-2.5L15.5 18l2.5-1z"/></>,
    brain:       <><path d="M9 4a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3v1a3 3 0 0 0 1 2.2V14a3 3 0 0 0 3 3h1v2a3 3 0 0 0 3 3h0V4z"/><path d="M15 4a3 3 0 0 1 3 3v0a3 3 0 0 1 3 3v1a3 3 0 0 1-1 2.2V14a3 3 0 0 1-3 3h-1v2a3 3 0 0 1-3 3h0V4z"/></>,
    trendingUp:  <><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></>,
    trendingDown:<><path d="m3 7 6 6 4-4 8 8"/><path d="M14 17h7v-7"/></>,
    chevronR:    <><path d="m9 6 6 6-6 6"/></>,
    chevronL:    <><path d="m15 6-6 6 6 6"/></>,
    chevronD:    <><path d="m6 9 6 6 6-6"/></>,
    chevronU:    <><path d="m6 15 6-6 6 6"/></>,
    arrowUp:     <><path d="M12 19V5M5 12l7-7 7 7"/></>,
    arrowDown:   <><path d="M12 5v14M5 12l7 7 7-7"/></>,
    plus:        <><path d="M12 5v14M5 12h14"/></>,
    x:           <><path d="m18 6-12 12M6 6l12 12"/></>,
    check:       <><path d="m5 12 5 5L20 7"/></>,
    copy:        <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
    clock:       <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></>,
    filter:      <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    sort:        <><path d="M3 6h18M6 12h12M9 18h6"/></>,
    bolt:        <><path d="m13 2-9 12h7l-1 8 9-12h-7z"/></>,
    eye:         <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    code:        <><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></>,
    slack:       <><rect x="10" y="2" width="4" height="10" rx="2"/><rect x="2" y="10" width="10" height="4" rx="2"/><rect x="10" y="12" width="4" height="10" rx="2"/><rect x="12" y="10" width="10" height="4" rx="2"/></>,
    mail:        <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></>,
    pager:       <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h6M7 14h4"/></>,
    inbox:       <><path d="M3 13h4l2 3h6l2-3h4"/><path d="M5 13V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/></>,
    sliders:     <><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></>,
    google:      <><path d="M20.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.5 2.6-3.8 2.6-6.7z" fill="#4285F4" stroke="none"/><path d="M12 21c2.4 0 4.5-.8 5.9-2.1l-2.9-2.2c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4.1v2.3A9 9 0 0 0 12 21z" fill="#34A853" stroke="none"/><path d="M7 13.9a5.4 5.4 0 0 1 0-3.5V8.1H4.1a9 9 0 0 0 0 8.1L7 13.9z" fill="#FBBC04" stroke="none"/><path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5A9 9 0 0 0 12 3a9 9 0 0 0-7.9 5.1L7 10.4C7.7 8.2 9.7 6.6 12 6.6z" fill="#EA4335" stroke="none"/></>,
    sparkle:     <><path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></>,
    layers:      <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></>,
    move:        <><path d="M5 9h14M5 15h14M9 5l-4 4 4 4M15 11l4 4-4 4"/></>,
    ext:         <><path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M16 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h5"/></>,
    // New icons for severity, status, and UI
    alertTriangle: <><path d="m12 2 10 18H2z"/><path d="M12 9v4"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></>,
    alertOctagon:  <><path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z"/><path d="M12 8v4"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></>,
    xCircle:       <><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></>,
    checkCircle:   <><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></>,
    infoCircle:    <><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></>,
    shieldAlert:   <><path d="M12 2s8 4 8 10-8 10-8 10-8-4-8-10S12 2 12 2z"/><path d="M12 8v4"/><circle cx="12" cy="15" r="0.5" fill="currentColor"/></>,
    activity:      <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    zap:           <><path d="m13 2-9 12h7l-1 8 9-12h-7z"/></>,
    play:          <><polygon points="6,3 20,12 6,21" fill="currentColor" stroke="none"/></>,
    pause:         <><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/></>,
    refreshCw:     <><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></>,
    globe:         <><circle cx="12" cy="12" r="9"/><path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18M3 12h18"/></>,
    server:        <><rect x="3" y="2" width="18" height="6" rx="2"/><rect x="3" y="10" width="18" height="6" rx="2"/><circle cx="7" cy="5" r="1" fill="currentColor"/><circle cx="7" cy="13" r="1" fill="currentColor"/><path d="M3 18h18v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3"/></>,
    hash:          <><path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18"/></>,
    terminal:      <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 10 3 2-3 2"/><path d="M13 14h4"/></>,
    barChart:      <><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="17" y="2" width="4" height="18" rx="1"/></>,
    trendingUp:    <><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></>,
    shield:        <><path d="M12 2s8 4 8 10-8 10-8 10-8-4-8-10S12 2 12 2z"/></>,
    link:          <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    trash:         <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></>,
    edit:          <><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></>,
    save:          <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></>,
    upload:        <><path d="M12 15V3m0 0l-4 4m4-4l4 4M4 21h16"/></>,
    calendar:      <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    thumbsUp:      <><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/><path d="M14 9V5a3 3 0 0 0-6 0v4"/><path d="M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7"/></>,
    chart:         <><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 5-9"/></>,
    book:          <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    log:           <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name] || null}
    </svg>
  );
};

// ErrorLens SVG logo icon
const ErrorLensLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="var(--accent, #C8A84E)"/>
    <g stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* Lens / magnifying glass */}
      <circle cx="14" cy="14" r="7"/>
      <path d="M19 19l5 5"/>
      {/* Lightning bolt inside lens = error detection */}
      <path d="M15 10l-3 5h4l-1 4" strokeWidth="1.75"/>
    </g>
  </svg>
);

// Platform icons â proper SVG logos for n8n, Make, Zapier, etc.
const PlatformIcon = ({ p, size = 20 }) => {
  const platforms = {
    n8n: {
      color: '#EA4B71',
      bg: 'rgba(234,75,113,0.12)',
      render: (s) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="6" cy="12" r="2.5" stroke="#EA4B71" strokeWidth="1.5" fill="rgba(234,75,113,0.15)"/>
          <circle cx="18" cy="7" r="2.5" stroke="#EA4B71" strokeWidth="1.5" fill="rgba(234,75,113,0.15)"/>
          <circle cx="18" cy="17" r="2.5" stroke="#EA4B71" strokeWidth="1.5" fill="rgba(234,75,113,0.15)"/>
          <path d="M8.5 12l7-4.5M8.5 12l7 4.5" stroke="#EA4B71" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    make: {
      color: '#6D29D9',
      bg: 'rgba(109,41,217,0.12)',
      render: (s) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#6D29D9" strokeWidth="1.5" fill="rgba(109,41,217,0.08)"/>
          <circle cx="12" cy="12" r="4" stroke="#6D29D9" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="1" fill="#6D29D9"/>
        </svg>
      ),
    },
    zapier: {
      color: '#FF4A00',
      bg: 'rgba(255,74,0,0.12)',
      render: (s) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2v8l6-6M12 2v8l-6-6M12 22v-8l6 6M12 22v-8l-6 6M2 12h8l-6-6M2 12h8l-6 6M22 12h-8l6-6M22 12h-8l6 6" stroke="#FF4A00" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="3" fill="#FF4A00" opacity="0.2" stroke="#FF4A00" strokeWidth="1"/>
        </svg>
      ),
    },
    custom: {
      color: 'var(--text-secondary)',
      bg: 'var(--surface)',
      render: (s) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <path d="m7 10 3 2-3 2"/>
          <path d="M13 14h4"/>
        </svg>
      ),
    },
  };

  const pf = platforms[p] || platforms.custom;
  return (
    <span className={`platform-icon pi-${p}`}
          style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                   borderRadius: 6, background: pf.bg, flexShrink: 0 }}>
      {pf.render(Math.round(size * 0.78))}
    </span>
  );
};

// Severity icons â proper icon + color combos
const SeverityIcon = ({ sev, size = 16 }) => {
  const config = {
    critical: { icon: 'shieldAlert', color: 'var(--sev-critical)', bg: 'rgba(239,68,68,0.12)' },
    error:    { icon: 'xCircle',     color: 'var(--sev-error)',    bg: 'rgba(245,158,11,0.12)' },
    warn:     { icon: 'alertTriangle', color: 'var(--sev-warn)',   bg: 'rgba(234,179,8,0.12)' },
    info:     { icon: 'infoCircle',  color: 'var(--sev-info)',     bg: 'rgba(59,130,246,0.12)' },
  };
  const c = config[sev] || config.info;
  return (
    <span className={`sev-icon sev-icon-${sev}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                   width: size + 6, height: size + 6, borderRadius: 6, background: c.bg, flexShrink: 0 }}>
      <Icon name={c.icon} size={size} className="" strokeWidth={2}/>
      <style>{`.sev-icon-${sev} svg { color: ${c.color}; }`}</style>
    </span>
  );
};

// Backward-compatible SeverityDot (still used in legends, small contexts)
const SeverityDot = ({ sev, size = 8, withIcon = false }) => {
  const colors = { critical: 'var(--sev-critical)', error: 'var(--sev-error)', warn: 'var(--sev-warn)', info: 'var(--sev-info)' };
  if (withIcon) return <SeverityIcon sev={sev} size={size}/>;
  return <span className="sev-dot" style={{ width: size, height: size, background: colors[sev] }} />;
};

// Status indicator (for workflow health)
const StatusIndicator = ({ status, size = 14 }) => {
  const config = {
    active:   { icon: 'checkCircle', color: 'var(--status-resolved, #22c55e)', label: 'Active' },
    healthy:  { icon: 'checkCircle', color: 'var(--status-resolved, #22c55e)', label: 'Healthy' },
    running:  { icon: 'activity',    color: 'var(--accent, #3b82f6)',         label: 'Running' },
    warning:  { icon: 'alertTriangle', color: 'var(--sev-warn)',              label: 'Warning' },
    error:    { icon: 'xCircle',     color: 'var(--sev-error)',               label: 'Error' },
    inactive: { icon: 'pause',       color: 'var(--text-tertiary)',           label: 'Inactive' },
    archived: { icon: 'inbox',       color: 'var(--text-tertiary)',           label: 'Archived' },
  };
  const c = config[status] || config.inactive;
  return (
    <span className="status-indicator" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          title={c.label}>
      <span style={{ color: c.color, display: 'inline-flex' }}>
        <Icon name={c.icon} size={size} strokeWidth={2}/>
      </span>
    </span>
  );
};

const Badge = ({ kind, children }) => <span className={`badge ${kind}`}>{children}</span>;

// tiny sparkline
const Sparkline = ({ data, color = 'currentColor', height = 36, fill = true }) => {
  const w = 120;
  const h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / range) * h * 0.85 - 2]);
  const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-z]/gi,'')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#spark-${color.replace(/[^a-z]/gi,'')})`} />}
      <path d={line} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// Stacked area chart for timeline
const TimelineChart = ({ data, mode = 'area' }) => {
  const w = 800, h = 240, pad = { l: 36, r: 12, t: 12, b: 28 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const sevs = ['info', 'warn', 'error', 'critical'];
  const colors = { info: 'var(--sev-info)', warn: 'var(--sev-warn)', error: 'var(--sev-error)', critical: 'var(--sev-critical)' };
  const totals = data.map(d => d.critical + d.error + d.warn + d.info);
  const max = Math.max(...totals) * 1.15;

  if (mode === 'heatmap') {
    const cellW = iw / data.length;
    const rowH = ih / 4;
    return (
      <svg className="timeline-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {sevs.slice().reverse().map((s, ri) => (
          <g key={s}>
            <text x={pad.l - 8} y={pad.t + ri * rowH + rowH / 2 + 4} textAnchor="end"
                  fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-tertiary)" textTransform="uppercase">
              {s.slice(0, 4)}
            </text>
            {data.map((d, i) => {
              const v = d[s];
              const max1 = Math.max(...data.map(x => x[s])) || 1;
              const op = 0.15 + (v / max1) * 0.85;
              return (
                <rect key={i} x={pad.l + i * cellW + 1} y={pad.t + ri * rowH + 2}
                      width={cellW - 2} height={rowH - 4}
                      fill={colors[s]} opacity={op} rx="2"/>
              );
            })}
          </g>
        ))}
        {[0, 6, 12, 18, 23].map(h0 => (
          <text key={h0} x={pad.l + (h0 / 23) * iw} y={h - 8}
                textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-tertiary)">
            {String(h0).padStart(2,'0')}:00
          </text>
        ))}
      </svg>
    );
  }

  if (mode === 'ridge') {
    const rowH = ih / 4;
    return (
      <svg className="timeline-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {sevs.slice().reverse().map((s, ri) => {
          const max1 = Math.max(...data.map(x => x[s])) || 1;
          const yBase = pad.t + (ri + 1) * rowH;
          const pts = data.map((d, i) => [pad.l + (i / (data.length - 1)) * iw, yBase - (d[s] / max1) * rowH * 0.85]);
          const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
          const area = `${line} L${pad.l + iw},${yBase} L${pad.l},${yBase} Z`;
          return (
            <g key={s}>
              <text x={pad.l - 8} y={yBase - rowH / 2 + 4} textAnchor="end"
                    fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-tertiary)">
                {s.slice(0,4).toUpperCase()}
              </text>
              <path d={area} fill={colors[s]} opacity="0.25"/>
              <path d={line} stroke={colors[s]} strokeWidth="1.5" fill="none"/>
            </g>
          );
        })}
        {[0, 6, 12, 18, 23].map(h0 => (
          <text key={h0} x={pad.l + (h0 / 23) * iw} y={h - 8}
                textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-tertiary)">
            {String(h0).padStart(2,'0')}:00
          </text>
        ))}
      </svg>
    );
  }

  // default stacked area
  const stackPath = (sevIdx) => {
    const stacks = data.map(d => sevs.slice(0, sevIdx + 1).reduce((a, k) => a + d[k], 0));
    const stacksPrev = data.map(d => sevs.slice(0, sevIdx).reduce((a, k) => a + d[k], 0));
    const x = i => pad.l + (i / (data.length - 1)) * iw;
    const y = v => pad.t + ih - (v / max) * ih;
    let p = '';
    stacks.forEach((v, i) => p += (i === 0 ? 'M' : 'L') + x(i) + ',' + y(v));
    for (let i = stacksPrev.length - 1; i >= 0; i--) p += 'L' + x(i) + ',' + y(stacksPrev[i]);
    p += 'Z';
    return p;
  };

  return (
    <svg className="timeline-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        {sevs.map(s => (
          <linearGradient key={s} id={`tl-${s}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={colors[s]} stopOpacity="0.5"/>
            <stop offset="100%" stopColor={colors[s]} stopOpacity="0"/>
          </linearGradient>
        ))}
      </defs>
      <g className="timeline-grid">
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={pad.l} x2={pad.l + iw} y1={pad.t + ih * p} y2={pad.t + ih * p} />
        ))}
      </g>
      {sevs.map((s, i) => (
        <path key={s} d={stackPath(i)} fill={`url(#tl-${s})`} stroke={colors[s]} strokeWidth="1"/>
      ))}
      <g className="timeline-axis">
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <text key={p} x={pad.l - 6} y={pad.t + ih * (1 - p) + 4} textAnchor="end">
            {Math.round(max * p)}
          </text>
        ))}
        {[0, 4, 8, 12, 16, 20, 23].map(h0 => (
          <text key={h0} x={pad.l + (h0 / 23) * iw} y={h - 8} textAnchor="middle">
            {String(h0).padStart(2,'0')}:00
          </text>
        ))}
      </g>
    </svg>
  );
};

// severity breakdown variants
const SeverityBreakdown = ({ counts, mode = 'bar' }) => {
  const total = counts.critical + counts.error + counts.warn + counts.info || 1;
  const items = [
    { sev: 'critical', label: 'Critical', n: counts.critical, color: 'var(--sev-critical)' },
    { sev: 'error',    label: 'Error',    n: counts.error,    color: 'var(--sev-error)' },
    { sev: 'warn',     label: 'Warning',  n: counts.warn,     color: 'var(--sev-warn)' },
    { sev: 'info',     label: 'Info',     n: counts.info,     color: 'var(--sev-info)' },
  ];

  if (mode === 'donut') {
    const r = 64, cx = 90, cy = 90;
    let cum = 0;
    return (
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          {items.map((it, i) => {
            const start = cum / total * Math.PI * 2 - Math.PI/2;
            cum += it.n;
            const end   = cum / total * Math.PI * 2 - Math.PI/2;
            const large = (end - start) > Math.PI ? 1 : 0;
            const x1 = cx + Math.cos(start) * r, y1 = cy + Math.sin(start) * r;
            const x2 = cx + Math.cos(end)   * r, y2 = cy + Math.sin(end)   * r;
            return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={it.color} stroke="var(--card)" strokeWidth="2"/>;
          })}
          <circle cx={cx} cy={cy} r="38" fill="var(--card)"/>
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text-primary)" fontFamily="var(--font-display)">{total}</text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="9" fill="var(--text-tertiary)" letterSpacing="0.1em">EVENTS</text>
        </svg>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, display: 'grid', gap: 8 }}>
          {items.map(it => (
            <li key={it.sev} className="sev-legend-row">
              <SeverityIcon sev={it.sev} size={12}/>
              <span className="name">{it.label}</span>
              <span className="count">{it.n} Â· {Math.round(it.n/total*100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (mode === 'multiples') {
    return (
      <div className="sm-grid">
        {items.map(it => {
          const w = 140;
          const data = Array.from({length: 12}, (_, i) => Math.max(0, Math.round(it.n/3 + Math.sin(i*0.7+it.sev.length)*it.n*0.15)));
          const max = Math.max(...data) || 1;
          return (
            <div key={it.sev} className="sm-card">
              <div className="sm-head"><SeverityIcon sev={it.sev} size={10}/>{it.label}</div>
              <div className="sm-num" style={{ color: it.color }}>{it.n}</div>
              <svg viewBox={`0 0 ${w} 26`} preserveAspectRatio="none">
                {data.map((v, i) => (
                  <rect key={i} x={i*(w/data.length) + 1} y={26 - (v/max)*22 - 1}
                        width={w/data.length - 2} height={(v/max)*22 + 1} fill={it.color} opacity="0.7" rx="1"/>
                ))}
              </svg>
            </div>
          );
        })}
      </div>
    );
  }

  // default horizontal stacked bar
  return (
    <div>
      <div className="sev-bar">
        {items.map(it => (
          <div key={it.sev} title={`${it.label}: ${it.n}`}
               style={{ flex: it.n, backgr