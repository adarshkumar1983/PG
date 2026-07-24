import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  Save, 
  Building, 
  AlertCircle, 
  CheckCircle, 
  Percent, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  Loader2, 
  RefreshCw, 
  Info, 
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Wallet,
  Check
} from 'lucide-react';
import { evaluateNameMatch } from '../utils/nameMatcher.js';

// Dataset of major Indian banks with custom brand layouts for premium chips
const MAJOR_BANKS = [
  { name: 'State Bank of India', code: 'SBI', prefix: 'SBIN', color: '#1e3a8a', bg: '#eff6ff' },
  { name: 'HDFC Bank', code: 'HDFC', prefix: 'HDFC', color: '#0369a1', bg: '#f0f9ff' },
  { name: 'ICICI Bank', code: 'ICICI', prefix: 'ICIC', color: '#c2410c', bg: '#fff7ed' },
  { name: 'Axis Bank', code: 'Axis', prefix: 'UTIB', color: '#881337', bg: '#fff1f2' },
  { name: 'Kotak Mahindra Bank', code: 'Kotak', prefix: 'KKBK', color: '#b91c1c', bg: '#fef2f2' },
  { name: 'Bank of Baroda', code: 'BOB', prefix: 'BARB', color: '#ea580c', bg: '#fff7ed' },
  { name: 'Punjab National Bank', code: 'PNB', prefix: 'PUNB', color: '#15803d', bg: '#f0fdf4' }
];

export default function SettingsPage({ session }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'settlement' | 'razorpay'

  const [form, setForm] = useState({
    name: '',
    upiId: '',
    linkedAccountId: '',
    bankDetails: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: ''
    }
  });

  // UI validations
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showConfirmAccountNumber, setShowConfirmAccountNumber] = useState(false);
  
  // IFSC variables
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscError, setIfscError] = useState(null);
  const [ifscResolvedData, setIfscResolvedData] = useState(null);

  // Penny drop simulator
  const [pennyDropStatus, setPennyDropStatus] = useState('idle'); // 'idle' | 'verifying' | 'success' | 'failed'
  const [pennyDropResult, setPennyDropResult] = useState(null);

  // Fee Calculator amount
  const [simulatorAmount, setSimulatorAmount] = useState('15000');

  useEffect(() => {
    fetch('/api/tenant/organization', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'x-organization-id': session.organizationId
      }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setForm({
          name: data.name || '',
          upiId: data.upiId || '',
          linkedAccountId: data.linkedAccountId || '',
          bankDetails: data.bankDetails || {
            accountName: '',
            accountNumber: '',
            bankName: '',
            ifscCode: ''
          }
        });
        
        // Match confirm field initially
        if (data.bankDetails?.accountNumber) {
          setConfirmAccountNumber(data.bankDetails.accountNumber);
        }
      })
      .catch(() => showMsg('danger', 'Failed to load organization settings.'))
      .finally(() => setLoading(false));
  }, [session]);

  // IFSC Auto Resolver
  useEffect(() => {
    const ifsc = form.bankDetails.ifscCode;
    if (ifsc && ifsc.length === 11) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(ifsc)) {
        setIfscError('IFSC format is incorrect (should match: e.g. HDFC0000123)');
        setIfscResolvedData(null);
        return;
      }
      
      setIfscLoading(true);
      setIfscError(null);
      
      fetch(`https://ifsc.razorpay.com/${ifsc}`)
        .then(res => {
          if (!res.ok) throw new Error('Branch lookup failed. Please verify code.');
          return res.json();
        })
        .then(data => {
          setIfscResolvedData(data);
          handleBankChange('bankName', data.BANK);
        })
        .catch(err => {
          setIfscError(err.message || 'IFSC validation failed.');
          setIfscResolvedData(null);
        })
        .finally(() => setIfscLoading(false));
    } else {
      setIfscResolvedData(null);
      setIfscError(null);
    }
  }, [form.bankDetails.ifscCode]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 6000);
  };

  const handleBankChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value
      }
    }));
  };

  const handleQuickBankSelect = (bank) => {
    setForm(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        bankName: bank.name,
        ifscCode: bank.prefix
      }
    }));
    setIfscResolvedData(null);
    setIfscError(null);
    showMsg('info', `Selected ${bank.name}. Please enter your specific 7-digit branch suffix.`);
  };

  const runPennyDropSim = () => {
    if (!form.bankDetails.accountNumber || !form.bankDetails.ifscCode) {
      showMsg('danger', 'Complete Account Number and IFSC Code to verify.');
      return;
    }
    
    setPennyDropStatus('verifying');
    setPennyDropResult(null);

    // Fallback to the official beneficiary title if input name is not yet entered
    const verifyName = form.bankDetails.accountName || form.name || 'Workspace Owner';

    fetch('/api/tenant/organization/verify-bank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'x-organization-id': session.organizationId
      },
      body: JSON.stringify({
        accountName: verifyName,
        accountNumber: form.bankDetails.accountNumber,
        ifscCode: form.bankDetails.ifscCode
      })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => Promise.reject(new Error(data.message || 'Verification failed.')));
        }
        return res.json();
      })
      .then(data => {
        setPennyDropStatus('success');

        // Automatically populate/update the Account Holder Name input field with the registered bank name
        setForm(prev => ({
          ...prev,
          bankDetails: {
            ...prev.bankDetails,
            accountName: data.registeredName
          }
        }));

        setPennyDropResult({
          registeredName: data.registeredName,
          score: data.score,
          matched: data.matched,
          text: data.text,
          color: data.color,
          bankRef: data.bankRef
        });
        
        if (data.matched) {
          showMsg('success', `Penny drop verified! Auto-filled Account Holder Name: "${data.registeredName}"`);
        } else {
          showMsg('warning', `Penny drop succeeded! Auto-filled Name: "${data.registeredName}" (Fuzzy Match: ${data.score}%)`);
        }
      })
      .catch(err => {
        setPennyDropStatus('failed');
        showMsg('danger', err.message || 'Penny drop validation request failed.');
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.bankDetails.accountNumber !== confirmAccountNumber) {
      showMsg('danger', 'Account Number and Confirmation Account Number must match.');
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/tenant/organization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify(form)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to save settings.');

      showMsg('success', 'Workspace settings updated successfully.');
    } catch (err) {
      showMsg('danger', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--muted)', fontSize: '15px' }}>Loading configuration workspace...</div>;
  }

  // Evaluate matching score dynamically
  const localMatchEval = form.bankDetails.accountName && form.name
    ? evaluateNameMatch(form.bankDetails.accountName, form.name)
    : null;

  // Split Payout Math
  const sampleAmt = parseFloat(simulatorAmount) || 0;
  const platformFee = sampleAmt * 0.02;
  const youReceive = sampleAmt - platformFee;

  return (
    <div className="settings-page-wrapper" style={{ maxWidth: '1140px', margin: '0 auto', padding: '24px' }}>
      
      {/* Scoped CSS styling rules for a world-class UI */}
      <style dangerouslySetInnerHTML={{__html: `
        .settings-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 36px;
          margin-top: 28px;
        }
        @media (max-width: 860px) {
          .settings-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
        .aside-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: 12px;
          text-align: left;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .nav-link:hover {
          background-color: var(--sidebar-hover-bg, rgba(11, 68, 56, 0.03));
          color: var(--green);
        }
        .nav-link.active {
          background-color: var(--card-bg);
          color: var(--green);
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(27, 39, 36, 0.04);
          border: 1px solid var(--border);
        }
        .nav-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 12px;
          bottom: 12px;
          width: 4px;
          background-color: var(--green);
          border-radius: 0 4px 4px 0;
        }
        .settings-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 36px;
          box-shadow: 0 10px 30px -10px rgba(27, 39, 36, 0.04);
          margin-bottom: 24px;
        }
        .form-label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .styled-input {
          height: 44px;
          border: 1.5px solid var(--border);
          border-radius: 10px;
          padding: 0 16px;
          font-size: 14px;
          outline: none;
          background: var(--input-bg);
          color: var(--text-primary);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
        }
        .styled-input:focus {
          border-color: var(--green);
          background-color: var(--card-bg);
          box-shadow: 0 0 0 4px var(--input-focus-shadow, rgba(47, 168, 129, 0.15));
        }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-with-icon input {
          padding-right: 44px;
        }
        .input-icon-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }
        .input-icon-btn:hover {
          color: var(--green);
        }
        .bank-selector-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 12px;
          margin-top: 10px;
        }
        .bank-pill {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          border: 1.5px solid var(--border);
          background: var(--card-bg);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          gap: 10px;
        }
        .bank-pill:hover {
          border-color: var(--green);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .bank-pill.selected {
          border-color: var(--green);
          background-color: var(--mint) !important;
          box-shadow: 0 4px 16px rgba(11, 68, 56, 0.06);
          font-weight: 600;
        }
        .bank-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--mint);
          color: var(--green);
          transition: transform 0.2s ease;
        }
        .bank-pill.selected .bank-avatar {
          background-color: var(--green);
          color: #fff;
        }
        .bank-pill:hover .bank-avatar {
          transform: scale(1.05);
        }
        .bank-title-text {
          font-size: 11px;
          color: var(--text-primary);
          font-weight: 500;
        }
        .bank-pill.selected .bank-title-text {
          color: var(--green);
          font-weight: 600;
        }
        .resolved-badge {
          background-color: rgba(22, 163, 74, 0.08);
          border: 1px solid rgba(22, 163, 74, 0.25);
          color: #16a34a;
          padding: 12px;
          border-radius: 10px;
          font-size: 12px;
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 2px 4px rgba(22, 101, 52, 0.02);
        }
        .sim-card {
          border: 1.5px solid var(--green);
          background-color: var(--card-bg);
          border-radius: 14px;
          padding: 20px;
          margin-top: 20px;
          box-shadow: 0 6px 20px rgba(11, 68, 56, 0.03);
        }
        .indicator-pulse {
          animation: pulse-animate 1.5s infinite;
        }
        @keyframes pulse-animate {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* Page Header */}
      <div className="setup-heading" style={{ marginBottom: '10px' }}>
        <div>
          <p className="eyebrow" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', fontSize: '11px', color: 'var(--green)' }}>Fintech Configuration</p>
          <h1 style={{ fontSize: '30px', fontWeight: '800', margin: '4px 0 0 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Workspace Settings</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '4px 0 0 0', fontWeight: '500' }}>Manage bank details, direct settlements, and online split payment configurations.</p>
        </div>
      </div>

      {/* Global Toast Messages */}
      {message.text && (
        <div 
          className={`alert ${message.type}`} 
          style={{ 
            padding: '14px 20px', 
            borderRadius: '14px', 
            fontSize: '13px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginTop: '20px',
            backgroundColor: message.type === 'success' ? 'rgba(22, 163, 74, 0.08)' : message.type === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            color: message.type === 'success' ? '#16a34a' : message.type === 'warning' ? '#d97706' : '#dc2626',
            border: message.type === 'success' ? '1px solid rgba(22, 163, 74, 0.25)' : message.type === 'warning' ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
          }}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : message.type === 'warning' ? <AlertCircle size={18} /> : <ShieldAlert size={18} />}
          <span style={{ fontWeight: '600' }}>{message.text}</span>
        </div>
      )}

      {/* Content Layout Grid */}
      <div className="settings-grid">
        
        {/* Navigation Sidebar */}
        <aside className="aside-nav">
          <button 
            type="button" 
            className={`nav-link ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Building size={16} />
            <span>General Profile</span>
          </button>
          
          <button 
            type="button" 
            className={`nav-link ${activeTab === 'settlement' ? 'active' : ''}`}
            onClick={() => setActiveTab('settlement')}
          >
            <Landmark size={16} />
            <span>Direct Settlement</span>
          </button>
          
          <button 
            type="button" 
            className={`nav-link ${activeTab === 'razorpay' ? 'active' : ''}`}
            onClick={() => setActiveTab('razorpay')}
          >
            <Percent size={16} />
            <span>Razorpay Route</span>
          </button>

          <div style={{ marginTop: '24px', padding: '16px', borderRadius: '14px', background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <h5 style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--green)', letterSpacing: '0.04em' }}>Compliance Check</h5>
            <p style={{ margin: '0', fontSize: '11.5px', color: 'var(--muted)', lineHeight: '1.4', fontWeight: '500' }}>
              RBI regulations mandate mapping settlement accounts to registered legal entity titles to combat transactional invoice fraud.
            </p>
          </div>
        </aside>

        {/* Dynamic Panels */}
        <form onSubmit={handleSubmit} style={{ minWidth: 0 }}>
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div key="general" className="settings-card fade-in-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#edf4f1', color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
                  <Building size={20} />
                </div>
                <div>
                  <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>General Profile</h3>
                  <p style={{ margin: '0', fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>Define the primary billing beneficiary for matching verification checks.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                <label className="form-label">
                  Beneficiary Name (Official Workspace Name)
                  <input
                    type="text"
                    className="styled-input"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="e.g. Kotlas Residency"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', fontWeight: '500' }}>
                    Verify this is the official corporate or trade beneficiary name matching your bank registry.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px' }}>
                <button 
                  type="submit" 
                  className="primary" 
                  disabled={saving} 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--green)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '13px', transition: 'all 0.15s ease' }}
                >
                  <Save size={15} /> {saving ? 'Saving...' : 'Save Workspace Name'}
                </button>
              </div>
            </div>
          )}

          {/* Settlement Details Tab */}
          {activeTab === 'settlement' && (
            <div key="settlement" className="fade-in-up">
              <div className="settings-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#edf4f1', color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
                    <Landmark size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Offline Settlement Details</h3>
                    <p style={{ margin: '0', fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>Bank info presented to residents for direct deposits or manual UPI settle actions.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '24px', marginTop: '28px' }}>
                  
                  {/* UPI ID */}
                  <label className="form-label">
                    Settlement UPI ID
                    <input
                      type="text"
                      className="styled-input"
                      value={form.upiId}
                      onChange={e => setForm(prev => ({ ...prev, upiId: e.target.value.trim() }))}
                      placeholder="e.g. stayzen@okaxis"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', fontWeight: '500' }}>
                      Allows residents to trigger instant UPI transactions on mobile client dashboards.
                    </span>
                  </label>

                  <hr style={{ border: 0, borderTop: '1.5px solid var(--border)', margin: '4px 0' }} />

                  {/* Account Numbers (Masked and Confirmed) */}
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <label className="form-label">
                      Account Number
                      <div className="input-with-icon">
                        <input
                          type={showAccountNumber ? 'text' : 'password'}
                          className="styled-input"
                          value={form.bankDetails.accountNumber}
                          onChange={e => handleBankChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                          placeholder="Enter account number"
                        />
                        <button 
                          type="button" 
                          className="input-icon-btn"
                          onClick={() => setShowAccountNumber(!showAccountNumber)}
                        >
                          {showAccountNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>

                    <label className="form-label">
                      Confirm Account Number
                      <div className="input-with-icon">
                        <input
                          type={showConfirmAccountNumber ? 'text' : 'password'}
                          className="styled-input"
                          value={confirmAccountNumber}
                          onChange={e => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="Confirm account number"
                        />
                        <button 
                          type="button" 
                          className="input-icon-btn"
                          onClick={() => setShowConfirmAccountNumber(!showConfirmAccountNumber)}
                        >
                          {showConfirmAccountNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      
                      {confirmAccountNumber && form.bankDetails.accountNumber !== confirmAccountNumber && (
                        <span style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                          <AlertCircle size={12} /> Account numbers do not match.
                        </span>
                      )}
                      
                      {confirmAccountNumber && form.bankDetails.accountNumber === confirmAccountNumber && (
                        <span style={{ fontSize: '11px', color: '#166534', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                          <CheckCircle size={12} /> Account numbers matched.
                        </span>
                      )}
                    </label>
                  </div>

                  {/* IFSC Code & Bank Name */}
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <label className="form-label">
                      Bank IFSC Code
                      <div className="input-with-icon">
                        <input
                          type="text"
                          className="styled-input"
                          value={form.bankDetails.ifscCode}
                          onChange={e => handleBankChange('ifscCode', e.target.value.toUpperCase().slice(0, 11))}
                          placeholder="e.g. HDFC0000123"
                        />
                        {ifscLoading && (
                          <span style={{ position: 'absolute', right: '14px', display: 'flex', alignItems: 'center' }}>
                            <Loader2 size={16} className="indicator-pulse" style={{ color: 'var(--green)', animation: 'spin 1s linear infinite' }} />
                          </span>
                        )}
                      </div>
                      
                      {ifscError && (
                        <span style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                          <AlertCircle size={12} /> {ifscError}
                        </span>
                      )}

                      {ifscResolvedData && (
                        <div className="resolved-badge">
                          <span style={{ fontWeight: '800', fontSize: '11.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🏛️ {ifscResolvedData.BANK}
                          </span>
                          <span style={{ opacity: 0.8, fontSize: '10.5px', fontWeight: '500' }}>
                            Branch: {ifscResolvedData.BRANCH} | {ifscResolvedData.CITY}, {ifscResolvedData.STATE}
                          </span>
                          <span style={{ fontSize: '10px', color: '#16a34a', fontStyle: 'italic', fontWeight: '600', marginTop: '2px' }}>
                            ✓ Branch found & validated
                          </span>
                        </div>
                      )}
                    </label>

                    <label className="form-label">
                      Bank Name
                      <input
                        type="text"
                        className="styled-input"
                        value={form.bankDetails.bankName}
                        onChange={e => handleBankChange('bankName', e.target.value)}
                        placeholder="e.g. HDFC Bank"
                      />
                    </label>
                  </div>

                  {/* Account Name with visual match meter */}
                  <label className="form-label" style={{ marginTop: '4px' }}>
                    Account Holder Name
                    <input
                      type="text"
                      className="styled-input"
                      value={form.bankDetails.accountName}
                      onChange={e => handleBankChange('accountName', e.target.value)}
                      placeholder="e.g. Arjun Mehta"
                    />
                    
                    {/* Premium Name Match Progress Bar Meter */}
                    {localMatchEval && (
                      <div style={{
                        marginTop: '10px',
                        padding: '12px 14px',
                        backgroundColor: 'var(--app-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>Name Match Score</span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: localMatchEval.color }}>
                            {localMatchEval.score}% ({localMatchEval.text})
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${localMatchEval.score}%`,
                            height: '100%',
                            backgroundColor: localMatchEval.color,
                            transition: 'width 0.4s ease-out'
                          }} />
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '500', display: 'block' }}>
                          Checked against workspace title: "{form.name}"
                        </span>
                      </div>
                    )}
                  </label>

                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                  <button 
                    type="submit" 
                    className="primary" 
                    disabled={saving} 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--green)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '13px', transition: 'all 0.15s ease' }}
                  >
                    <Save size={15} /> {saving ? 'Saving...' : 'Save Settlement Details'}
                  </button>
                </div>
              </div>

              {/* Account Validation Penny Drop Simulation */}
              <div className="settings-card" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Sparkles size={18} style={{ color: 'var(--green)' }} />
                  <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Penny Drop validation simulation</h4>
                </div>
                <p style={{ margin: '0 0 18px 0', fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5', fontWeight: '500' }}>
                  Penny drop verification validates bank account validity programmatically before live transfers start. The API deposities a tiny sum (e.g. ₹1.00) in the bank network, resolves the registered KYC holder name, and conducts automatic fuzzy matching.
                </p>

                <button
                  type="button"
                  onClick={runPennyDropSim}
                  disabled={pennyDropStatus === 'verifying'}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1.5px solid var(--green)',
                    color: 'var(--green)',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(11, 68, 56, 0.04)' }}
                  onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {pennyDropStatus === 'verifying' ? (
                    <>
                      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Verifying account details (IMPS)...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      <span>Verify Account Details (Penny Drop)</span>
                    </>
                  )}
                </button>

                {pennyDropStatus === 'success' && pennyDropResult && (
                  <div className="sim-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '10px', color: '#15803d', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '4px', fontWeight: '700', border: '1px solid #bbf7d0', letterSpacing: '0.04em' }}>
                        IMPS PENNY DROP COMPLETED
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>Ref: {pennyDropResult.bankRef}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', marginBottom: '4px', fontWeight: '600' }}>NPCI-Registered Holder Name</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{pennyDropResult.registeredName}</strong>
                      </div>
                      
                      <div>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', marginBottom: '4px', fontWeight: '600' }}>Fuzzy Match Confidence</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: pennyDropResult.color }}></span>
                          <strong style={{ color: 'var(--text-primary)' }}>{pennyDropResult.score}% ({pennyDropResult.text})</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '12px', fontSize: '11.5px', color: 'var(--muted)', fontWeight: '500' }}>
                      {pennyDropResult.matched ? (
                        <div style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle size={14} />
                          <span>Verification successful. Name matches your legal entity directory correctly.</span>
                        </div>
                      ) : (
                        <div style={{ color: '#b45309', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                          <span>Match score falls below optimal threshold. Verify spelling differences or initials to prevent settlement failures.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Razorpay Gateway Tab */}
          {activeTab === 'razorpay' && (
            <div key="razorpay" className="settings-card fade-in-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#edf4f1', color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
                  <Percent size={20} />
                </div>
                <div>
                  <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Razorpay Split Settlements</h3>
                  <p style={{ margin: '0', fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>Integrate split transaction onboarding structures through Razorpay Route.</p>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px 0', fontWeight: '500' }}>
                Link your commercial business account using Razorpay Route. When residents pay online via card, UPI, or netbanking, transaction amounts are split instantly: settlements flow directly to your linked ledger minus StayZen's platform fee.
              </p>

              <div style={{ display: 'grid', gap: '20px' }}>
                <label className="form-label">
                  Razorpay Linked Account ID (Route Partner Code)
                  <input
                    type="text"
                    className="styled-input"
                    value={form.linkedAccountId}
                    onChange={e => setForm(prev => ({ ...prev, linkedAccountId: e.target.value.trim() }))}
                    placeholder="e.g. acc_Fv8a2H18kls7y"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', lineHeight: '1.4', display: 'block', fontWeight: '500' }}>
                    Generate or copy this ID from **Route / Partner Accounts** tab in your Razorpay Dashboard.
                  </span>
                </label>
              </div>
                           {/* Premium Commission visual split flow diagram */}
              <div style={{ backgroundColor: 'var(--app-bg)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '24px', marginTop: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Payout Routing Visualizer</h5>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: '600' }}>Rent Invoice Amount:</span>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>₹</span>
                    <input 
                      type="number"
                      value={simulatorAmount}
                      onChange={e => setSimulatorAmount(e.target.value)}
                      style={{ paddingLeft: '24px', height: '36px', width: '130px', fontWeight: '600' }}
                      className="styled-input"
                    />
                  </div>
                </div>

                {/* Flow Diagram */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginTop: '20px',
                  padding: '20px',
                  backgroundColor: 'var(--card-bg)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                  flexWrap: 'wrap'
                }}>
                  {/* Left: Rent Invoice */}
                  <div style={{
                    flex: '1 1 120px',
                    padding: '12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Tenant Invoice</span>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      ₹{sampleAmt.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '9px', color: '#0284c7', backgroundColor: 'rgba(2, 132, 199, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>Rent Paid</span>
                  </div>

                  {/* Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight size={16} style={{ color: 'var(--muted)' }} />
                  </div>

                  {/* Middle: Split Commission */}
                  <div style={{
                    flex: '1 1 120px',
                    padding: '12px',
                    border: '1.5px solid rgba(220, 38, 38, 0.25)',
                    backgroundColor: 'rgba(220, 38, 38, 0.05)',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Platform Fee (2%)</span>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>
                      - ₹{platformFee.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '9px', color: '#dc2626', backgroundColor: 'rgba(220, 38, 38, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>StayZen Share</span>
                  </div>

                  {/* Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight size={16} style={{ color: 'var(--muted)' }} />
                  </div>

                  {/* Right: Direct Payout */}
                  <div style={{
                    flex: '1 1 120px',
                    padding: '12px',
                    backgroundColor: 'rgba(22, 163, 74, 0.05)',
                    border: '1.5px solid rgba(22, 163, 74, 0.25)',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Your Payout</span>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#16a34a', marginBottom: '4px' }}>
                      ₹{youReceive.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '9px', color: '#fff', backgroundColor: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>Routed to Bank</span>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px', display: 'flex', gap: '6px', alignItems: 'flex-start', lineHeight: '1.4' }}>
                  <Info size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>The platform fee covers PG rent gateway splits, payment settlements, and automatic IMPS transfers. Funds land in your beneficiary account according to standard T+1 settlement cycles.</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px' }}>
                <button 
                  type="submit" 
                  className="primary" 
                  disabled={saving} 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--green)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '13px', transition: 'all 0.15s ease' }}
                >
                  <Save size={15} /> {saving ? 'Saving...' : 'Link Razorpay Account'}
                </button>
              </div>
            </div>
          )}
          
        </form>
      </div>
    </div>
  );
}
