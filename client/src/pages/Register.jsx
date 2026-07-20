import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ShieldCheck, Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2, Check } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';

const springTransition = {
  type: "spring",
  stiffness: 120,
  damping: 18
};

export function Register({ onSwitchView }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Focus tracking for spring scale animation
  const [focusedField, setFocusedField] = useState(null);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }

    if (!termsAccepted) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

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
      setConfirmPassword('');
      setOrganizationName('');
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
            <ShieldCheck size={14} /> Multi-tenant PG OS
          </span>
          <h1>Start your journey<br />with StayZen today.</h1>
          <p>Join hundreds of modern PG owners scaling their rental operations seamlessly.</p>
          
          <div className="auth-proof">
            <motion.div
              className="proof-card"
              whileHover={{ y: -4, scale: 1.02 }}
              transition={springTransition}
            >
              <b>Instant</b>
              <small>Workspace setup</small>
            </motion.div>
            <motion.div
              className="proof-card"
              whileHover={{ y: -4, scale: 1.02 }}
              transition={springTransition}
            >
              <b>Automated</b>
              <small>Rent invoicing</small>
            </motion.div>
            <motion.div
              className="proof-card"
              whileHover={{ y: -4, scale: 1.02 }}
              transition={springTransition}
            >
              <b>WhatsApp</b>
              <small>Receipt dispatch</small>
            </motion.div>
          </div>
        </motion.div>

        <motion.small
          className="auth-footer-note"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Built for modern PG owners in India
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
            <h2>Create an account</h2>
            <p className="auth-subtitle">Register your PG business and start managing it today.</p>

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
                  className="form-success"
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={springTransition}
                >
                  <CheckCircle2 size={16} />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="input-group">
              <label htmlFor="reg-name">Full name *</label>
              <motion.div
                className="input-wrapper"
                animate={{ scale: focusedField === 'name' ? 1.01 : 1 }}
                transition={springTransition}
              >
                <User className="field-icon" size={17} />
                <input
                  id="reg-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  required
                  placeholder="e.g. Adarsh Kumar"
                  autoComplete="name"
                />
              </motion.div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label htmlFor="reg-email">Email address *</label>
                <motion.div
                  className="input-wrapper"
                  animate={{ scale: focusedField === 'email' ? 1.01 : 1 }}
                  transition={springTransition}
                >
                  <Mail className="field-icon" size={17} />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder="owner@stayzen.demo"
                    autoComplete="email"
                  />
                </motion.div>
              </div>

              <div className="input-group">
                <label htmlFor="reg-mobile">Mobile number</label>
                <motion.div
                  className="input-wrapper"
                  animate={{ scale: focusedField === 'mobile' ? 1.01 : 1 }}
                  transition={springTransition}
                >
                  <Phone className="field-icon" size={17} />
                  <input
                    id="reg-mobile"
                    type="tel"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    onFocus={() => setFocusedField('mobile')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />
                </motion.div>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label htmlFor="reg-password">Password *</label>
                <motion.div
                  className="input-wrapper"
                  animate={{ scale: focusedField === 'password' ? 1.01 : 1 }}
                  transition={springTransition}
                >
                  <Lock className="field-icon" size={17} />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
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

              <div className="input-group">
                <label htmlFor="reg-confirm-password">Confirm Password</label>
                <motion.div
                  className="input-wrapper"
                  animate={{ scale: focusedField === 'confirmPassword' ? 1.01 : 1 }}
                  transition={springTransition}
                >
                  <Lock className="field-icon" size={17} />
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={showConfirmPassword ? 'hide' : 'show'}
                        initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        style={{ display: 'grid', placeItems: 'center' }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </motion.div>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="reg-org">PG / Property name *</label>
              <motion.div
                className="input-wrapper"
                animate={{ scale: focusedField === 'org' ? 1.01 : 1 }}
                transition={springTransition}
              >
                <Building2 className="field-icon" size={17} />
                <input
                  id="reg-org"
                  value={organizationName}
                  onChange={e => setOrganizationName(e.target.value)}
                  onFocus={() => setFocusedField('org')}
                  onBlur={() => setFocusedField(null)}
                  required
                  placeholder="e.g. Greenview Residency"
                />
              </motion.div>
            </div>

            <div className="remember" style={{ margin: '10px 0 16px' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                />
                <span>I agree to the Terms of Service & Privacy Policy</span>
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
                  <Check size={17} />
                  <span>Create account</span>
                </>
              )}
            </motion.button>

            <p className="signup-copy" style={{ marginTop: '20px' }}>
              Already have an account?{' '}
              <button type="button" onClick={onSwitchView} className="link-button">
                <ArrowLeft size={13} /> Sign in instead
              </button>
            </p>
          </form>
        </motion.div>
      </section>
    </motion.main>
  );
}

export default Register;

