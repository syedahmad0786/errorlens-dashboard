// ErrorLens — Supabase Auth layer
// Uses Supabase Auth REST API directly (no client library)

window.EL_AUTH = (() => {
  const SB_URL = 'https://wlnkybvwhsaimeqdcfie.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsbmt5YnZ3aHNhaW1lcWRjZmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Nzc3NzMsImV4cCI6MjA5MzA1Mzc3M30.w9XOgm8wzIr-d5ojACPr_k88TiDJeEMGWV9XiOp7M1c';

  let _session = null; // { access_token, refresh_token, user }
  let _profile = null; // { id, email, display_name, role }
  const _listeners = [];

  // Restore session from localStorage
  try {
    const saved = localStorage.getItem('el_session');
    if (saved) _session = JSON.parse(saved);
  } catch(e) {}

  function _save() {
    if (_session) localStorage.setItem('el_session', JSON.stringify(_session));
    else localStorage.removeItem('el_session');
    _listeners.forEach(fn => fn(_session, _profile));
  }

  function _headers(token) {
    return {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${token || ANON_KEY}`,
    };
  }

  // Sign in with email + password
  async function signIn(email, password) {
    const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: _headers(),
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error_description || err.msg || 'Invalid credentials');
    }
    const data = await r.json();
    _session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
    await _loadProfile();
    _save();
    return _session;
  }

  // Sign up new user (admin-only: called via admin invite flow)
  async function signUp(email, password, metadata) {
    const r = await fetch(`${SB_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: _headers(),
      body: JSON.stringify({ email, password, data: metadata || {} }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error_description || err.msg || 'Sign up failed');
    }
    return r.json();
  }

  // Sign out
  async function signOut() {
    if (_session) {
      await fetch(`${SB_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: _headers(_session.access_token),
      }).catch(() => {});
    }
    _session = null;
    _profile = null;
    _save();
  }

  // Get current user from auth
  async function getUser() {
    if (!_session) return null;
    const r = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: _headers(_session.access_token),
    });
    if (!r.ok) { _session = null; _profile = null; _save(); return null; }
    const user = await r.json();
    _session.user = user;
    return user;
  }

  // Load user profile from el_profiles table
  async function _loadProfile() {
    if (!_session) return;
    try {
      const SB_REST = `${SB_URL}/rest/v1`;
      const r = await fetch(`${SB_REST}/el_profiles?id=eq.${_session.user.id}&select=*`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${_session.access_token}` },
      });
      if (r.ok) {
        const rows = await r.json();
        _profile = rows[0] || { id: _session.user.id, email: _session.user.email, display_name: _session.user.email.split('@')[0], role: 'viewer' };
      }
    } catch(e) {
      _profile = { id: _session.user.id, email: _session.user.email, display_name: _session.user.email.split('@')[0], role: 'viewer' };
    }
  }

  // List all users (admin only) — reads from el_profiles
  async function listUsers() {
    if (!_session) return [];
    const SB_REST = `${SB_URL}/rest/v1`;
    const r = await fetch(`${SB_REST}/el_profiles?select=*&order=created_at.asc`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${_session.access_token}` },
    });
    if (!r.ok) return [];
    return r.json();
  }

  // Update user role (admin only)
  async function updateUserRole(userId, role) {
    const SB_REST = `${SB_URL}/rest/v1`;
    const r = await fetch(`${SB_REST}/el_profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { ...{ apikey: ANON_KEY, Authorization: `Bearer ${_session.access_token}` }, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ role }),
    });
    return r.ok;
  }

  // Error status persistence (acknowledge / resolve)
  async function setErrorStatus(errorId, status) {
    // status: 'open', 'acknowledged', 'resolved'
    if (!_session) throw new Error('Not authenticated');
    const SB_REST = `${SB_URL}/rest/v1`;
    // Upsert into el_error_status
    const body = {
      error_id: errorId,
      status: status,
      updated_by: _session.user.id,
      updated_at: new Date().toISOString(),
    };
    const r = await fetch(`${SB_REST}/el_error_status`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${_session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update error status');
    }
    return r.json();
  }

  // Get all error statuses
  async function getErrorStatuses() {
    if (!_session) return [];
    const SB_REST = `${SB_URL}/rest/v1`;
    const r = await fetch(`${SB_REST}/el_error_status?select=*`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${_session.access_token}` },
    });
    if (!r.ok) return [];
    return r.json();
  }

  // Refresh session on load
  async function init() {
    if (!_session) return null;
    try {
      // Verify token is still valid
      const user = await getUser();
      if (user) {
        await _loadProfile();
        _save();
        return _session;
      }
      // Try refresh
      if (_session.refresh_token) {
        const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: _headers(),
          body: JSON.stringify({ refresh_token: _session.refresh_token }),
        });
        if (r.ok) {
          const data = await r.json();
          _session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
          await _loadProfile();
          _save();
          return _session;
        }
      }
    } catch(e) {}
    _session = null;
    _profile = null;
    _save();
    return null;
  }

  function onAuthChange(fn) { _listeners.push(fn); }
  function session() { return _session; }
  function profile() { return _profile; }
  function isAdmin() { return _profile && _profile.role === 'admin'; }
  function token() { return _session ? _session.access_token : null; }

  return { signIn, signUp, signOut, getUser, init, onAuthChange, session, profile, isAdmin, token, listUsers, updateUserRole, setErrorStatus, getErrorStatuses };
})();
