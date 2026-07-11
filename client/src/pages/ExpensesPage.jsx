import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, IndianRupee, Tag, Calendar, FileText, Check, X, AlertCircle } from 'lucide-react';
import { money } from '../utils/formatters.js';

export default function ExpensesPage({ session, properties = [], onRefresh }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [form, setForm] = useState({
    propertyId: properties[0]?._id || '',
    category: 'maintenance',
    amount: '',
    occurredAt: new Date().toISOString().slice(0, 10),
    note: ''
  });

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadExpenses = () => {
    fetch('/api/tenant/expenses', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setExpenses)
      .catch(err => console.error("Error loading expenses:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExpenses();
  }, [session]);

  // Set default property in form if properties load
  useEffect(() => {
    if (properties.length > 0 && !form.propertyId) {
      setForm(prev => ({ ...prev, propertyId: properties[0]._id }));
    }
  }, [properties]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/tenant/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify({
          propertyId: form.propertyId,
          category: form.category,
          amount: Number(form.amount),
          occurredAt: new Date(form.occurredAt).toISOString(),
          note: form.note
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to record expense');

      notify('Expense logged successfully!');
      setOpenModal(false);
      setForm({
        propertyId: properties[0]?._id || '',
        category: 'maintenance',
        amount: '',
        occurredAt: new Date().toISOString().slice(0, 10),
        note: ''
      });
      loadExpenses();
    } catch (err) {
      setError(err.message || 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  };

  // Compute stats
  const stats = useMemo(() => {
    let monthlyTotal = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    expenses.forEach(e => {
      const date = new Date(e.occurredAt);
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        monthlyTotal += e.amount;
      }
    });

    return { monthlyTotal };
  }, [expenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const noteStr = e.note || '';
      const matchSearch = noteStr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'all' ? true : e.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading expenses data...</div>;
  }

  return (
    <div className="expenses-page">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Operating Outflows</p>
          <h1>Expense Tracker</h1>
          <p>Reconcile property utility bills, employee payouts, maintenance dues, and general PG expenses.</p>
        </div>
        <button className="primary" onClick={() => setOpenModal(true)}>
          <Plus size={17} /> Log Expense
        </button>
      </div>

      {/* Metrics Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        <article className="card metric" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Expenses This Month</small>
          <strong style={{ color: '#ea580c', fontSize: '24px' }}>{money(stats.monthlyTotal)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Operating expenditures</span>
        </article>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
        <div className="search" style={{ flex: 1, minWidth: '240px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <Search size={18} />
          <input 
            placeholder="Search expenses by category or note..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select 
          value={categoryFilter} 
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '13px' }}
        >
          <option value="all">All Categories</option>
          <option value="electricity">Electricity</option>
          <option value="wifi">WiFi / Act Fiber</option>
          <option value="maintenance">Maintenance</option>
          <option value="salary">Staff Salary</option>
          <option value="other">Other Outflow</option>
        </select>
      </div>

      {/* Expense ledger ledger list */}
      <section className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: '700px' }}>
          <div className="tr table-head" style={{ borderBottom: '1px solid var(--border)', padding: '14px 20px', background: 'var(--table-head-bg)' }}>
            <span style={{ flex: 1.5 }}>Category</span>
            <span style={{ flex: 2 }}>Notes / Detail</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Amount</span>
            <span style={{ flex: 1.5, textAlign: 'right' }}>Occurred On</span>
          </div>

          {filteredExpenses.map(e => {
            return (
              <div 
                className="tr" 
                key={e._id} 
                style={{ 
                  padding: '14px 20px', 
                  borderBottom: '1px solid var(--border)', 
                  display: 'flex', 
                  alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseOver={el => el.currentTarget.style.backgroundColor = 'var(--table-row-hover)'}
                onMouseOut={el => el.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: '26px', height: '26px', background: 'var(--app-bg)', borderRadius: '6px', color: 'var(--muted)' }}><Tag size={13} /></span>
                  {e.category}
                </span>

                <span style={{ flex: 2, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {e.note || 'Operating bill'}
                </span>

                <strong style={{ flex: 1, textAlign: 'right', fontSize: '13px', color: '#ea580c' }}>
                  {money(e.amount)}
                </strong>

                <span style={{ flex: 1.5, textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {new Date(e.occurredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            );
          })}

          {filteredExpenses.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No expenses recorded.
            </div>
          )}
        </div>
      </section>

      {/* Log Expense Modal */}
      {openModal && (
        <div className="modal-backdrop" onMouseDown={() => setOpenModal(false)}>
          <form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={handleSubmit} style={{ maxWidth: '400px' }}>
            <button type="button" className="modal-x" onClick={() => setOpenModal(false)}><X size={18} /></button>
            <span className="modal-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}><IndianRupee /></span>
            <h2>Log Property Expense</h2>
            <p>Enter details of property capital or operating expenditure.</p>

            {error && (
              <div className="alert danger" style={{ padding: '8px 12px', fontSize: '12px', marginBottom: '12px', display: 'flex', gap: '6px' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px', textAlign: 'left' }}>
              <label>Select Property
                <select 
                  value={form.propertyId} 
                  onChange={e => setForm(prev => ({ ...prev, propertyId: e.target.value }))}
                  required
                >
                  {properties.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                  {properties.length === 0 && <option value="">No properties available</option>}
                </select>
              </label>

              <label>Category
                <select 
                  value={form.category} 
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  required
                >
                  <option value="electricity">Electricity Bill</option>
                  <option value="wifi">WiFi / Internet</option>
                  <option value="maintenance">Maintenance & Repairs</option>
                  <option value="salary">Staff Salary</option>
                  <option value="other">Other Expense</option>
                </select>
              </label>

              <label>Amount (₹)
                <input 
                  type="number" 
                  min="1" 
                  value={form.amount} 
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="e.g. 1500" 
                  required 
                />
              </label>

              <label>Date of Outflow
                <input 
                  type="date" 
                  value={form.occurredAt} 
                  onChange={e => setForm(prev => ({ ...prev, occurredAt: e.target.value }))}
                  required 
                />
              </label>

              <label>Note / Detail
                <input 
                  value={form.note} 
                  onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="e.g. Electric billing meter reading for floor 1" 
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="secondary" onClick={() => setOpenModal(false)} disabled={saving}>Cancel</button>
              <button className="primary" style={{ backgroundColor: 'var(--green)' }} disabled={saving}>
                {saving ? 'Logging...' : 'Log Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
