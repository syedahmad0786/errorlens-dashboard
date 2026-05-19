// ErrorLens — Client-side helper for /api/ai
// Usage: window.EL_AI.groupErrors(errors)  →  { groups: [...] }
//        window.EL_AI.rca(error, workflow, related) → { cause, confidence, ... }
//        window.EL_AI.nlSearch(query) → { params, explanation }

window.EL_AI = (() => {
  const URL = '/api/ai';

  async function call(mode, payload) {
    try {
      const r = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, ...payload }),
      });
      if (!r.ok) {
        const t = await r.text();
        return { error: `HTTP ${r.status}`, message: t };
      }
      return await r.json();
    } catch (e) {
      return { error: 'network', message: e.message };
    }
  }

  return {
    groupErrors:        (errors)                     => call('group-errors',       { errors }),
    rca:                (error, workflow, related)   => call('rca',                { error, workflow, related }),
    anomalySummary:     (opts)                       => call('anomaly-summary',    opts),
    suggestResolution:  (error, pattern)             => call('suggest-resolution', { error, pattern }),
    predictFailure:     (workflow, metrics)          => call('predict-failure',    { workflow, metrics }),
    nlSearch:           (query)                      => call('nl-search',          { query }),
  };
})();

// --- Statistical anomaly detection (runs client-side, narration goes via Claude) ---
// Detect workflows whose 1h error rate exceeds 3-sigma of their 7d baseline.
window.EL_DETECT_ANOMALIES = () => {
  const raw = window.EL_RAW || {};
  const errors = raw.errors || [];
  const wfs = raw.workflows || [];
  const dailyStats = raw.dailyStats || [];

  const oneHourAgo = Date.now() - 3600000;
  const anomalies = [];

  for (const wf of wfs) {
    // 7-day baseline: median + stddev of daily error count
    const wfDaily = dailyStats.filter(d => d.workflow_id === wf.id).slice(0, 14);
    if (wfDaily.length < 3) continue; // need history
    const counts = wfDaily.map(d => d.error_count || 0);
    const mean = counts.reduce((s, n) => s + n, 0) / counts.length;
    const variance = counts.reduce((s, n) => s + (n - mean) ** 2, 0) / counts.length;
    const stddev = Math.sqrt(variance);
    const threshold = mean + 3 * stddev;

    // Current hour error count
    const recent = errors.filter(e => e.workflow_id === wf.id && new Date(e.occurred_at).getTime() > oneHourAgo);
    const currentRate = recent.length * 24; // extrapolate hour → day for fair compare

    if (currentRate > threshold && recent.length >= 3) {
      anomalies.push({
        workflow_id: wf.id,
        workflow_name: wf.name,
        platform_type: wf.platform_type,
        baseline_daily_errors: parseFloat(mean.toFixed(1)),
        current_hourly_errors: recent.length,
        threshold_daily: parseFloat(threshold.toFixed(1)),
        recent_errors: recent.slice(0, 5),
      });
    }
  }

  return anomalies.sort((a, b) => b.current_hourly_errors - a.current_hourly_errors);
};

// --- Predictive failure detection ---
// Look for workflows where error rate slope over last 7d is positive AND avg duration is rising.
window.EL_DETECT_AT_RISK = () => {
  const raw = window.EL_RAW || {};
  const wfs = raw.workflows || [];
  const dailyStats = raw.dailyStats || [];

  const atRisk = [];

  for (const wf of wfs) {
    const wfDaily = dailyStats.filter(d => d.workflow_id === wf.id).sort((a, b) => a.stat_date.localeCompare(b.stat_date)).slice(-7);
    if (wfDaily.length < 4) continue;

    const rates = wfDaily.map(d => (d.total_runs > 0 ? (d.error_count || 0) / d.total_runs : 0));
    const durations = wfDaily.map(d => d.avg_duration_ms || 0).filter(d => d > 0);

    // Simple linear slope: compare first half avg to second half avg
    const half = Math.floor(rates.length / 2);
    const firstHalfAvg = rates.slice(0, half).reduce((s, r) => s + r, 0) / half;
    const secondHalfAvg = rates.slice(half).reduce((s, r) => s + r, 0) / (rates.length - half);
    const errorSlope = secondHalfAvg - firstHalfAvg;

    let durationSlope = 0;
    if (durations.length >= 4) {
      const dHalf = Math.floor(durations.length / 2);
      const dFirstAvg = durations.slice(0, dHalf).reduce((s, d) => s + d, 0) / dHalf;
      const dSecondAvg = durations.slice(dHalf).reduce((s, d) => s + d, 0) / (durations.length - dHalf);
      durationSlope = dSecondAvg - dFirstAvg;
    }

    // At risk if error rate trending up by >2pp AND we have at least 3 errors in last day
    if (errorSlope > 0.02 && (wfDaily[wfDaily.length - 1].error_count || 0) >= 3) {
      atRisk.push({
        workflow_id: wf.id,
        workflow_name: wf.name,
        platform_type: wf.platform_type,
        error_rate_trend_pp: parseFloat((errorSlope * 100).toFixed(2)),
        duration_trend_ms: Math.round(durationSlope),
        recent_error_count: wfDaily[wfDaily.length - 1].error_count,
        last_7d_error_count: wfDaily.reduce((s, d) => s + (d.error_count || 0), 0),
      });
    }
  }

  return atRisk.sort((a, b) => b.error_rate_trend_pp - a.error_rate_trend_pp);
};
