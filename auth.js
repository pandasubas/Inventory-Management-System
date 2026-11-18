// Shared auth helpers for Stockly login/signup pages
window.Auth = {
  USERS_KEY: 'stockly:users',
  SESSION_KEY: 'stockly:session',
  isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); },
  getUsers() {
    try { return JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]'); }
    catch { return []; }
  },
  saveUsers(users) { localStorage.setItem(this.USERS_KEY, JSON.stringify(users)); },
  setSession(session) { localStorage.setItem(this.SESSION_KEY, JSON.stringify(session)); },
  clearSession() { localStorage.removeItem(this.SESSION_KEY); },
  getSession() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null'); }
    catch { return null; }
  },
  togglePw(input, btn) {
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? '🙈' : '👁';
    btn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
  },
};