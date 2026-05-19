// ErrorLens â Supabase Auth layer
// Provides window.EL_AUTH for login, logout, session management

window.EL_AUTH = (() => {
  const SB_URL = 'https://erpzzrdgbrhapzlcielt.supabase.co';
  const ANON_KEY = 'sb_publishable_r5FDMEL2kufqPFtAjj9HKA_0tPJXC_4';

  let _session = null;
  let _user = null;

  // Storage keys
  const ACCESS_KEY = 'el_access_token';
  const REFRESH_KEY = 'el_refresh_token';

  async function _fetch(path, opts = {}) {
    const url = `${SB_URL}/auth/v1${path}`;
    const headers = {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      ...(opts.headers || {}),
    };
    const res = await fetch(url, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || `Auth error ${res.status}`);
    return data;
  }

  // Initialize â check for existing session in localStorage
  async function init() {
    const accessToken = localStorage.getItem(ACCESS_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);

    if (!accessToken || !refreshToken) return null;

    // Try to get user with existing token
    try {
      const user = await _fetch('/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (user && user.id) {
        _session = { access_token: accessToken, refresh_token: refreshToken };
        _user = user;
        return _session;
      }
    } catch (e) {
      // Token expired â try refresh
      try {
        const refreshed = await _fetch('/token?grant_type=refresh_token', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshed.access_token) {
          _session = refreshed;
          _user = refreshed.user;
          localStorage.setItem(ACCESS_KEY, refreshed.access_token);
          localStorage.setItem(REFRESH_KEY, refreshed.refresh_token);
          return _session;
        }
      } catch (e2) {
        // Refresh failed â clear and require re-login
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
    }
    return null;
  }

  // Sign in with email + password
  async function signIn(email, password) {
    const data = await _fetch('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) {
      _session = data;
      _user = data.user;
      localStorage.setItem(ACCESS_KEY, data.access_token);
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
      return data;
    }
    throw new Error('Sign in failed');
  }

  // Sign out
  async function signOut() {
    if (_session && _session.access_token) {
      try {
        await _fetch('/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${_session.access_token}` },
        });
      } catch (e) { /* ignore logout errors */ }
    }
    _session = null;
    _user = null;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  // Get user profile in the shape the app expects
  function profile() {
    if (!_user) return null;
    const meta = _user.user_metadata || {};
    const name = meta.display_name || meta.full_name || _user.email.split('@')[0];
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return {
      name,
      email: _user.email,
      role: meta.role || 'viewer',
      initials,
      color: '#a78bfa',
    };
  }

  // Get access token (for authenticated API calls)
  function accessToken() {
    return _session ? _session.access_token : null;
  }

  return { init, signIn, signOut, profile, accessToken };
})();
