import React, { useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';

export function Register({ onSwitchView }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile, password, organizationName })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to register account.');
      setSuccess(result.message);
      setName('');
      setEmail('');
      setMobile('');
      setPassword('');
      setOrganizationName('');
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
          <h2>Create an account</h2>
          <p>Register your PG business and start managing it today.</p>

          {error && <div className="form-error">{error}</div>}
          {success && (
            <div className="form-error" style={{ background: '#e3f1e9', color: '#287154', borderColor: '#bdd6c9' }}>
              {success}
            </div>
          )}

          <label>Full name *
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Adarsh Kumar" />
          </label>

          <div className="form-row">
            <label>Email address *
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="e.g. owner@stayzen.demo" />
            </label>
            <label>Mobile number
              <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="e.g. +91 98765 43210" />
            </label>
          </div>

          <label>Password *
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minimum 6 characters" />
          </label>

          <label>PG / Property name *
            <input value={organizationName} onChange={e => setOrganizationName(e.target.value)} required placeholder="e.g. Greenview Residency" />
          </label>

          <button className="primary auth-submit" style={{ marginTop: '20px' }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="signup-copy" style={{ marginTop: '20px' }}>
            Already have an account? <button type="button" onClick={onSwitchView}>Sign in instead</button>
          </p>
        </form>
      </section>
    </main>
  );
}
export default Register;
