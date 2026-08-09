import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ShieldCheck, Mail, ArrowLeft, AlertCircle, Check } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';

const springTransition = {
  type: "spring",
  stiffness: 120,
  damping: 18
};

export function ForgotPassword({ onSwitchView }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devResetLink, setDevResetLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevResetLink('');
    if (!email) return setError('Please enter your email address.');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to request password reset.');
      setSuccess(result.message || 'A password reset link has been sent to your email.');
      if (result.devResetLink) {
        setDevResetLink(result.devResetLink);
      }
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
            <ShieldCheck size={14} /> Password Recovery Workspace
          </span>
          <h1>Reset your<br />account password.</h1>
          <p>We will send a secure password reset link to your registered email address.</p>
        </motion.div>

        <motion.small
          className="auth-footer-note"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Need support? Contact admin
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
            <span className="eyebrow">Recovery</span>
            <h2>Forgot Password?</h2>
            <p className="auth-subtitle">Enter your email and we'll send you a link to reset your password.</p>

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

              {success && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  <motion.div
                    className="form-error"
                    role="alert"
                    aria-live="assertive"
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={springTransition}
                    style={{ background: '#e3f1e9', color: '#287154', borderColor: '#bdd6c9', margin: 0 }}
                  >
                    <Check size={16} />
                    <span>{success}</span>
                  </motion.div>
                  {devResetLink && (
                    <div style={{ padding: '12px', background: 'var(--color-primary-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)', textAlign: 'left' }}>
                      <p style={{ margin: '0 0 6px 0', fontWeight: '700' }}>Staging/Testing reset link:</p>
                      <a href={devResetLink} style={{ color: 'var(--color-primary)', wordBreak: 'break-all', fontWeight: 'bold' }}>{devResetLink}</a>
                    </div>
                  )}
                </div>
              )}
            </AnimatePresence>

            {!success && (
              <>
                <div className="input-group">
                  <label htmlFor="recovery-email">Email address</label>
                  <motion.div
                    className="input-wrapper"
                    animate={{ scale: emailFocused ? 1.01 : 1 }}
                    transition={springTransition}
                  >
                    <Mail className="field-icon" size={17} />
                    <input
                      id="recovery-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder="name@company.com"
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </motion.div>
                </div>

                <motion.button
                  type="submit"
                  className="primary auth-submit"
                  style={{ marginTop: '20px' }}
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.015 }}
                  whileTap={{ scale: loading ? 1 : 0.985 }}
                  transition={springTransition}
                >
                  {loading ? (
                    <span className="btn-spinner" />
                  ) : (
                    <span>Send recovery link</span>
                  )}
                </motion.button>
              </>
            )}

            <p className="signup-copy" style={{ marginTop: '20px' }}>
              <button type="button" onClick={onSwitchView} className="link-button">
                <ArrowLeft size={13} /> Return to sign in
              </button>
            </p>
          </form>
        </motion.div>
      </section>
    </motion.main>
  );
}

export default ForgotPassword;
