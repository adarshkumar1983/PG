import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ShieldCheck, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, Check } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';

const springTransition = {
  type: "spring",
  stiffness: 120,
  damping: 18
};

export function ResetPassword({ onSwitchView }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const token = new URLSearchParams(window.location.search).get('resetToken');

  const submit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (!token) return setError('Reset token is missing or invalid.');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to reset password.');
      setSuccess(result.message || 'Password has been reset successfully!');
      // Clean up the URL search params after successful reset
      window.history.replaceState({}, document.title, window.location.pathname);
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
            <ShieldCheck size={14} /> Password Reset Workspace
          </span>
          <h1>Create a new<br />secure password.</h1>
          <p>Please type your new password below and confirm it to activate your account.</p>
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
            <h2>Reset Password</h2>
            <p className="auth-subtitle">Choose a strong, unique password to secure your account.</p>

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
                <motion.div
                  className="form-error"
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={springTransition}
                  style={{ background: '#e3f1e9', color: '#287154', borderColor: '#bdd6c9' }}
                >
                  <Check size={16} />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!success && (
              <>
                <div className="input-group">
                  <label htmlFor="reset-pass">New Password *</label>
                  <motion.div
                    className="input-wrapper"
                    animate={{ scale: passwordFocused ? 1.01 : 1 }}
                    transition={springTransition}
                  >
                    <Lock className="field-icon" size={17} />
                    <input
                      id="reset-pass"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      placeholder="Minimum 6 characters"
                      required
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
                  </motion.div>
                </div>

                <div className="input-group">
                  <label htmlFor="reset-confirm">Confirm Password *</label>
                  <motion.div
                    className="input-wrapper"
                    animate={{ scale: confirmPasswordFocused ? 1.01 : 1 }}
                    transition={springTransition}
                  >
                    <Lock className="field-icon" size={17} />
                    <input
                      id="reset-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onFocus={() => setConfirmPasswordFocused(true)}
                      onBlur={() => setConfirmPasswordFocused(false)}
                      placeholder="Repeat password"
                      required
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
                    <span>Save password</span>
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

export default ResetPassword;
