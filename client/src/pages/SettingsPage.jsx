import React, { useState, useEffect } from 'react';
import { Landmark, Save, Building, AlertCircle, CheckCircle, Percent } from 'lucide-react';

export default function SettingsPage({ session }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
      })
      .catch(() => showMsg('danger', 'Failed to load organization settings.'))
      .finally(() => setLoading(false));
  }, [session]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading settings workspace...</div>;
  }

  return (
    <div className="settings-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div className="setup-heading" style={{ marginBottom: '30px' }}>
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Workspace Settings</h1>
          <p>Configure property profiles, online checkout splits, and direct settlement channels.</p>
        </div>
      </div>

      {message.text && (
        <div 
          className={`alert ${message.type}`} 
          style={{ 
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontSize: '13px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            marginBottom: '20px',
            backgroundColor: message.type === 'success' ? '#e6efe9' : '#fde8e4',
            color: message.type === 'success' ? 'var(--green)' : '#b45309',
            border: message.type === 'success' ? '1px solid #c2ffd4' : '1px solid #fed7aa'
          }}
        >
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* PG Profile */}
        <section className="card" style={{ padding: '24px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
            <Building size={18} style={{ color: 'var(--green)' }} /> General Profile
          </h3>
          <div style={{ display: 'grid', gap: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>PG / Organization Name
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder="e.g. Kotlas Residency"
                style={{ width: '100%' }}
              />
            </label>
          </div>
        </section>

        {/* Razorpay Setup */}
        <section className="card" style={{ padding: '24px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
            <Percent size={18} style={{ color: 'var(--green)' }} /> Razorpay Split Payments
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '-8px', marginBottom: '18px' }}>
            Link your business bank account through Razorpay Route. When residents pay online, funds are routed directly to your linked account minus a standard platform commission (2%).
          </p>
          <div style={{ display: 'grid', gap: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>Razorpay Linked Account ID
              <input
                type="text"
                value={form.linkedAccountId}
                onChange={e => setForm(prev => ({ ...prev, linkedAccountId: e.target.value }))}
                placeholder="e.g. acc_Fv8a2H18kls7y"
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                You can generate and view your Linked Account IDs inside the **Route / Partners** section of your main Razorpay Dashboard.
              </span>
            </label>
          </div>
        </section>

        {/* UPI & Bank Details */}
        <section className="card" style={{ padding: '24px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
            <Landmark size={18} style={{ color: 'var(--green)' }} /> Offline / Direct Settlement
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '-8px', marginBottom: '18px' }}>
            Residents will see these details on their dashboards for manual direct UPI transfers or bank deposits.
          </p>
          <div style={{ display: 'grid', gap: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>UPI ID (for Direct Pay)
              <input
                type="text"
                value={form.upiId}
                onChange={e => setForm(prev => ({ ...prev, upiId: e.target.value }))}
                placeholder="e.g. stayzen@okaxis"
                style={{ width: '100%' }}
              />
            </label>

            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '10px 0' }} />

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>Account Holder Name
                <input
                  type="text"
                  value={form.bankDetails.accountName}
                  onChange={e => handleBankChange('accountName', e.target.value)}
                  placeholder="e.g. Arjun Mehta"
                  style={{ width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>Account Number
                <input
                  type="text"
                  value={form.bankDetails.accountNumber}
                  onChange={e => handleBankChange('accountNumber', e.target.value)}
                  placeholder="e.g. 5010012345678"
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>Bank Name
                <input
                  type="text"
                  value={form.bankDetails.bankName}
                  onChange={e => handleBankChange('bankName', e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  style={{ width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>IFSC Code
                <input
                  type="text"
                  value={form.bankDetails.ifscCode}
                  onChange={e => handleBankChange('ifscCode', e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0000123"
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          </div>
        </section>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            type="submit" 
            className="primary" 
            disabled={saving} 
            style={{ 
              backgroundColor: 'var(--green)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            <Save size={16} /> {saving ? 'Saving Workspace...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
