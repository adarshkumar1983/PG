import React, { useState } from 'react';
import { Building2, ShieldCheck, X } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';

export function AcceptInvite({ onSwitchView }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const token = new URLSearchParams(window.location.search).get('token');

  const submit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to accept invitation.');
      setSuccess(result.message);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-brand">
          <span className="brand-mark"><Building2 size={20} /></span>StayZen
        </div>
        <div>
          <span className="trust-pill"><ShieldCheck size={15} /> Secure invitation workspace</span>
          <h1>Activate your profile</h1>
          <p>Set a secure password to join your organization's PG workspace.</p>
        </div>
        <small>Welcome to StayZen</small>
      </section>

      <section className="auth-form-wrap" style={{ position: 'relative' }}>
        <ThemeToggle style={{ position: 'absolute', top: '24px', right: '24px' }} />
        <form className="auth-form" onSubmit={submit}>
          <div className="mobile-auth-brand">
            <span className="brand-mark"><Building2 size={20} /></span>StayZen
          </div>
          <p className="eyebrow">Onboarding</p>
          <h2>Accept Invitation</h2>
          <p>Set a password to complete your registration.</p>

          {error && <div className="form-error">{error}</div>}
          {success && (
            <div className="form-error" style={{ background: '#e3f1e9', color: '#287154', borderColor: '#bdd6c9' }}>
              {success}
            </div>
          )}

          {!success && (
            <>
              <label>New Password *
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minimum 6 characters" autoFocus />
              </label>
              <label>Confirm Password *
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat password" />
              </label>
              <button className="primary auth-submit" style={{ marginTop: '20px' }} disabled={loading}>
                {loading ? 'Activating account…' : 'Activate Account'}
              </button>
            </>
          )}

          <p className="signup-copy" style={{ marginTop: '20px' }}>
            <button type="button" onClick={onSwitchView}>Return to sign in</button>
          </p>
        </form>
      </section>
    </main>
  );
}
export default AcceptInvite;
