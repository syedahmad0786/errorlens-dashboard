// ErrorLens — Unified AI endpoint powered by Claude
// POST /api/ai with { mode, ...payload } — dispatches to specialized prompts.
//
// Modes:
//   group-errors        — cluster similar errors into groups with a fingerprint
//   rca                 — root cause analysis for a single error
//   anomaly-summary     — narrate a detected anomaly in plain English
//   suggest-resolution  — suggest fix steps for a known error pattern
//   predict-failure     — narrate why a workflow is trending toward failure
//   nl-search           — parse natural language into Supabase REST filter params
//
// Requires ANTHROPIC_API_KEY env var. When unset, returns a stubbed response so
// the UI remains functional in demo mode.

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPTS = {
  'group-errors': `You are an SRE assistant. Given a batch of error messages from automation workflows, cluster them by likely root cause. Output STRICT JSON only: {"groups":[{"fingerprint":"<short slug>","label":"<human label>","count":N,"error_ids":["<id>"...],"likely_cause":"<one-line>"}]}. Group by semantic similarity, not exact text match. Ignore IDs and timestamps when clustering.`,
  'rca': `You are an SRE assistant. Given one error with context (workflow, node, recent runs, related errors), produce a root cause analysis. Output STRICT JSON only: {"cause":"<one-paragraph likely cause>","confidence":0.0-1.0,"reasoning":"<2-3 short bullet points joined with newlines>","next_steps":["<step>"...]}. Be specific. If uncertain, say so honestly in cause and lower confidence.`,
  'anomaly-summary': `You are an SRE assistant. Given a workflow whose error rate has spiked, narrate the anomaly in plain English for an on-call engineer. Output STRICT JSON only: {"headline":"<short alert headline>","summary":"<2-3 sentences>","severity":"low|medium|high"}.`,
  'suggest-resolution': `You are an SRE assistant. Given an error pattern, suggest concrete resolution steps. Output STRICT JSON only: {"summary":"<one-line approach>","steps":[{"action":"<short imperative>","detail":"<why/how, one sentence>"}...],"risk":"low|medium|high"}.`,
  'predict-failure': `You are an SRE assistant. Given a workflow with degrading metrics (rising error rate, rising duration, intermittent timeouts), explain in plain English why it's at risk and what to do. Output STRICT JSON only: {"prediction":"<one-paragraph>","time_to_failure_estimate":"<e.g. 'hours to days' or 'days to weeks'>","leading_indicators":["<indicator>"...],"recommended_action":"<one short imperative>"}.`,
  'nl-search': `You are a query translator. Convert the user's natural language into Supabase REST API filter params for the el_errors table. Output STRICT JSON only: {"params":"<URL query string like 'severity=eq.critical&occurred_at=gte.2026-05-12'>","explanation":"<one-line summary>"}. Available columns: workflow_id, platform_type, severity (info|warn|error|critical), error_type, error_node, is_resolved (bool), occurred_at (timestamp), resolved_at (timestamp). Use PostgREST syntax (eq, gte, lt, in, ilike).`,
};

const STUB_RESPONSES = {
  'group-errors':       { groups: [{ fingerprint: 'stub', label: 'Demo mode — no API key', count: 0, error_ids: [], likely_cause: 'Add ANTHROPIC_API_KEY env var to enable.' }] },
  'rca':                { cause: 'Demo mode — Claude not configured.', confidence: 0, reasoning: 'No ANTHROPIC_API_KEY set on Vercel.', next_steps: ['Add ANTHROPIC_API_KEY env var', 'Redeploy'] },
  'anomaly-summary':    { headline: 'Demo mode', summary: 'Add ANTHROPIC_API_KEY to enable AI narration.', severity: 'low' },
  'suggest-resolution': { summary: 'Demo mode — no AI.', steps: [{ action: 'Add ANTHROPIC_API_KEY', detail: 'Set env var on Vercel then redeploy.' }], risk: 'low' },
  'predict-failure':    { prediction: 'Demo mode.', time_to_failure_estimate: 'N/A', leading_indicators: [], recommended_action: 'Add ANTHROPIC_API_KEY' },
  'nl-search':          { params: 'order=occurred_at.desc&limit=50', explanation: 'Demo: returning recent errors (Claude not configured).' },
};

function buildUserPrompt(mode, payload) {
  // Keep payloads small to control token cost
  switch (mode) {
    case 'group-errors': {
      const items = (payload.errors || []).slice(0, 50).map(e => ({
        id: e.id, msg: (e.error_message || '').slice(0, 240), type: e.error_type, node: e.error_node, platform: e.platform_type,
      }));
      return `Cluster these ${items.length} errors:\n${JSON.stringify(items)}`;
    }
    case 'rca': {
      const { error, workflow, related } = payload;
      return JSON.stringify({
        error: { msg: error?.error_message, type: error?.error_type, node: error?.error_node, platform: error?.platform_type, occurred_at: error?.occurred_at },
        workflow: { name: workflow?.name, platform: workflow?.platform_type, total_executions: workflow?.total_executions, total_errors: workflow?.total_errors },
        related_errors: (related || []).slice(0, 5).map(r => ({ msg: (r.error_message || '').slice(0, 160), occurred_at: r.occurred_at })),
      });
    }
    case 'anomaly-summary': {
      return JSON.stringify({
        workflow: payload.workflow?.name,
        platform: payload.workflow?.platform_type,
        baseline_error_rate: payload.baseline,
        current_error_rate: payload.current,
        window_minutes: payload.window_minutes || 60,
        recent_errors: (payload.recent || []).slice(0, 5).map(e => (e.error_message || '').slice(0, 160)),
      });
    }
    case 'suggest-resolution': {
      return JSON.stringify({
        error_pattern: payload.pattern || payload.error?.error_message,
        error_type: payload.error?.error_type,
        node: payload.error?.error_node,
        platform: payload.error?.platform_type,
      });
    }
    case 'predict-failure': {
      return JSON.stringify({
        workflow: payload.workflow?.name,
        platform: payload.workflow?.platform_type,
        metrics: payload.metrics, // { error_rate_trend, duration_trend, timeout_count_7d, ... }
      });
    }
    case 'nl-search': {
      return `User query: "${payload.query || ''}"`;
    }
    default:
      return JSON.stringify(payload);
  }
}

async function callClaude(mode, payload) {
  if (!ANTHROPIC_KEY) return { stubbed: true, ...STUB_RESPONSES[mode] };

  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPTS[mode],
      messages: [{ role: 'user', content: buildUserPrompt(mode, payload) }],
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Claude API ${r.status}: ${txt}`);
  }
  const data = await r.json();
  const text = data.content?.[0]?.text || '{}';
  // Strip code fences if Claude wrapped JSON
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return { stubbed: false, ...JSON.parse(stripped) };
  } catch {
    return { stubbed: false, _raw: text, _parse_error: true };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { mode, ...payload } = req.body || {};
    if (!SYSTEM_PROMPTS[mode]) return res.status(400).json({ error: `Unknown mode: ${mode}`, valid_modes: Object.keys(SYSTEM_PROMPTS) });

    const result = await callClaude(mode, payload);
    return res.status(200).json({ mode, ...result });
  } catch (e) {
    console.error('[ErrorLens AI]', e);
    return res.status(500).json({ error: 'AI request failed', message: e.message });
  }
};
