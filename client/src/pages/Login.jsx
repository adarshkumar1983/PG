import React, { useState } from 'react';
import { LogIn, Building2, ShieldCheck } from 'lucide-react';

export function Login({ onLogin, onSwitchView }) {
  const [email, setEmail] = useState('owner@stayzen.demo');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to sign in.');
      onLogin({ ...result, organizationId: result.organizations?.[0]?.id || 'demo-org' });
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
          <span className="trust-pill"><ShieldCheck size={15} /> Secure multi-tenant workspace</span>
          <h1>Run every property<br />from one calm place.</h1>
          <p>Residents, rooms, rent, expenses and staff access—organized for growing PG businesses.</p>
          <div className="auth-proof">
            <span><b>100%</b><small>Tenant-isolated</small></span>
            <span><b>4 roles</b><small>Permission controlled</small></span>
            <span><b>24×7</b><small>Payment tracking</small></span>
          </div>
        </div>
        <small>Built for modern PG owners in India</small>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <div className="mobile-auth-brand">
            <span className="brand-mark"><Building2 size={20} /></span>StayZen
          </div>
          <p className="eyebrow">Owner workspace</p>
          <h2>Welcome back</h2>
          <p>Sign in to manage your properties.</p>

          {error && <div className="form-error">{error}</div>}

          <label>Email address
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>

          <label>Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>

          <div className="remember">
            <label><input type="checkbox" defaultChecked /> Remember me</label>
            <button type="button">Forgot password?</button>
          </div>

          <button className="primary auth-submit" disabled={loading}>
            <LogIn size={17} />
            {loading ? 'Signing in…' : 'Sign in securely'}
          </button>

          <div className="demo-note">
            <b>Demo account</b>
            <span>owner@stayzen.demo · demo1234</span>
          </div>

          <p className="signup-copy">New PG owner? <button type="button" onClick={onSwitchView}>Create an account</button></p>
        </form>
      </section>
    </main>
  );
}
export default Login;
