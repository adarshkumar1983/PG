import React, { useState } from 'react';
import { Building2, ShieldCheck, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';

export function AcceptInvite({ onSwitchView }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
          <span className="trust-pill">
            <span className="pulse-dot" />
            <ShieldCheck size={14} /> Secure invitation workspace
          </span>
          <h1>Activate your profile</h1>
          <p>Set a secure password to join your organization's PG workspace.</p>
        </div>
        <small className="auth-footer-note">Welcome to StayZen</small>
      </section>

      <section className="auth-form-wrap">
        <ThemeToggle style={{ position: 'absolute', top: '24px', right: '24px' }} />
        <div className="auth-card">
          <form className="auth-form" onSubmit={submit}>
            <div className="mobile-auth-brand">
              <span className="brand-mark"><Building2 size={20} /></span>StayZen
            </div>
            <span className="eyebrow">Onboarding</span>
            <h2>Accept Invitation</h2>
            <p className="auth-subtitle">Set a password to complete your registration.</p>

            {error && <div className="form-error">{error}</div>}
            {success && (
              <div className="form-error" style={{ background: '#e3f1e9', color: '#287154', borderColor: '#bdd6c9' }}>
                {success}
              </div>
            )}

            {!success && (
              <>
                <div className="input-group">
                  <label htmlFor="invite-pass">New Password *</label>
                  <div className="input-wrapper">
                    <Lock className="field-icon" size={17} />
                    <input
                      id="invite-pass"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Minimum 6 characters"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="invite-confirm">Confirm Password *</label>
                  <div className="input-wrapper">
                    <Lock className="field-icon" size={17} />
                    <input
                      id="invite-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repeat password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button className="primary auth-submit" style={{ marginTop: '20px' }} disabled={loading}>
                  {loading ? <span className="btn-spinner" /> : 'Activate Account'}
                </button>
              </>
            )}

            <p className="signup-copy" style={{ marginTop: '20px' }}>
              <button type="button" onClick={onSwitchView} className="link-button">
                <ArrowLeft size={13} /> Return to sign in
              </button>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
export default AcceptInvite;
