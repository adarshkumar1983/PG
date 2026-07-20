import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Building2, ShieldCheck, Mail, Lock, Eye, EyeOff, Check, ArrowRight, AlertCircle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';

const springTransition = {
  type: "spring",
  stiffness: 120,
  damping: 18
};

export function Login({ onLogin, onSwitchView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
    <motion.main
      className="auth-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <section className="auth-story">
        <motion.div
          className="auth-brand"
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springTransition}
        >
          <span className="brand-mark"><Building2 size={20} /></span>StayZen
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...springTransition, delay: 0.1 }}
        >
          <span className="trust-pill">
            <span className="pulse-dot" />
            <ShieldCheck size={14} /> Enterprise-grade security
          </span>
          <h1>Run every property<br />from one calm place.</h1>
          <p>Residents, rooms, rent, expenses and staff access—organized for growing PG businesses.</p>
          
          <div className="auth-proof">
            <motion.div
              className="proof-card"
              whileHover={{ y: -4, scale: 1.02 }}
              transition={springTransition}
            >
              <b>100%</b>
              <small>Tenant isolation</small>
            </motion.div>
            <motion.div
              className="proof-card"
              whileHover={{ y: -4, scale: 1.02 }}
              transition={springTransition}
            >
              <b>4 roles</b>
              <small>RBAC security</small>
            </motion.div>
            <motion.div
              className="proof-card"
              whileHover={{ y: -4, scale: 1.02 }}
              transition={springTransition}
            >
              <b>24×7</b>
              <small>Real-time analytics</small>
            </motion.div>
          </div>
        </motion.div>

        <motion.small
          className="auth-footer-note"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Built for modern PG & Co-living owners in India
        </motion.small>
      </section>

      <section className="auth-form-wrap">
        <ThemeToggle style={{ position: 'absolute', top: '24px', right: '24px' }} />
        
        <motion.div
          className="auth-card"
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={springTransition}
        >
          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="mobile-auth-brand">
              <span className="brand-mark"><Building2 size={20} /></span>StayZen
            </div>
            <span className="eyebrow">Owner workspace</span>
            <h2>Welcome back</h2>
            <p className="auth-subtitle">Sign in to manage your properties and residents.</p>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  className="form-error"
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={springTransition}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="input-group">
              <label htmlFor="auth-email">Email address</label>
              <motion.div
                className="input-wrapper"
                animate={{ scale: emailFocused ? 1.01 : 1 }}
                transition={springTransition}
              >
                <Mail className="field-icon" size={17} />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="name@company.com"
                  required
                  aria-invalid={Boolean(error)}
                  autoComplete="email"
                />
              </motion.div>
            </div>

            <div className="input-group">
              <div className="label-row">
                <label htmlFor="auth-password">Password</label>
                <button type="button" className="forgot-btn" tabIndex={0}>Forgot password?</button>
              </div>
              <motion.div
                className="input-wrapper"
                animate={{ scale: passwordFocused ? 1.01 : 1 }}
                transition={springTransition}
              >
                <Lock className="field-icon" size={17} />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  required
                  aria-invalid={Boolean(error)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={showPassword ? 'hide' : 'show'}
                      initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: 'grid', placeItems: 'center' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </motion.div>
            </div>

            <div className="remember">
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Remember me for 30 days</span>
              </label>
            </div>

            <motion.button
              type="submit"
              className="primary auth-submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.015 }}
              whileTap={{ scale: loading ? 1 : 0.985 }}
              transition={springTransition}
            >
              {loading ? (
                <span className="btn-spinner" />
              ) : (
                <>
                  <LogIn size={17} />
                  <span>Sign in securely</span>
                </>
              )}
            </motion.button>

            <p className="signup-copy">
              New PG owner?{' '}
              <button type="button" onClick={onSwitchView} className="link-button">
                Create an account <ArrowRight size={13} />
              </button>
            </p>
          </form>
        </motion.div>
      </section>
    </motion.main>
  );
}

export default Login;

