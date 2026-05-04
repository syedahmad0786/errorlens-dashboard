// ErrorLens — shared icons & UI primitives
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
    search:      <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    download:    <><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></>,
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
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name] || null}
    </svg>
  );
};

const PlatformIcon = ({ p, size = 18 }) => {
  const map = { n8n: 'N', zapier: 'Z', make: 'M', custom: 'C' };
  return (
    <span className={`platform-icon pi-${p}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}>
      {map[p] || '?'}
    </span>
  );
};

const SeverityDot = ({ sev, size = 8 }) => {
  const colors = { critical: 'var(--sev-critical)', error: 'var(--sev-error)', warn: 'var(--sev-warn)', info: 'var(--sev-info)' };
  return <span className="sev-dot" style={{ width: size, height: size, background: colors[sev] }} />;
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
              <span className="dot" style={{ background: it.color }}/>
              <span className="name">{it.label}</span>
              <span className="count">{it.n} · {Math.round(it.n/total*100)}%</span>
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
              <div className="sm-head"><span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: it.color }}/>{it.label}</div>
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
               style={{ flex: it.n, background: it.color, minWidth: it.n ? 4 : 0 }}/>
        ))}
      </div>
      <ul className="sev-legend" style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
        {items.map(it => (
          <li key={it.sev} className="sev-legend-row">
            <span className="dot" style={{ background: it.color }}/>
            <span className="name">{it.label}</span>
            <span className="count">{it.n} · {Math.round(it.n/total*100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

Object.assign(window, { Icon, PlatformIcon, SeverityDot, Badge, Sparkline, TimelineChart, SeverityBreakdown });
