import React, { useState, useEffect, useMemo } from 'react';
import { Building2, BedDouble, ShieldCheck, ChevronRight } from 'lucide-react';
import { money } from '../utils/formatters.js';
import { INDIAN_CITIES_MAP, ALL_INDIAN_STATES } from '../constants/locationData.js';

export function PropertySetup({ session, onDone }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    propertyType: 'Mens PG',
    contactNumber: '',
    address: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    gstNumber: '',
    floors: 1,
    rooms: 10,
    defaultBeds: 2,
    defaultRent: 7500,
    amenities: ['Wi-Fi', 'Power backup'],
    maintenanceEnabled: false,
    maintenanceAmount: 0,
    maintenanceFrequency: 'monthly',
    maintenanceCustomMonths: 1,
    maintenanceNextDueDate: new Date().toISOString().slice(0, 10),
    maintenanceSeparateInvoice: false
  });
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [citiesList, setCitiesList] = useState([]);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (Array.isArray(data)) {
          setCitiesList(data.map(item => ({ name: item.name, state: item.state })));
        }
      })
      .catch(err => {
        console.warn('Could not load online cities list, using local fallback:', err);
        setCitiesList(Object.values(INDIAN_CITIES_MAP));
      });
  }, []);

  const amenities = ['Wi-Fi', 'Power backup', 'Meals', 'Laundry', 'Parking', 'CCTV', 'AC', 'Housekeeping'];
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const toggleAmenity = name => update('amenities', form.amenities.includes(name) ? form.amenities.filter(x => x !== name) : [...form.amenities, name]);

  const handlePincodeChange = async (val) => {
    const numericVal = val.replace(/\D/g, '').slice(0, 6);
    update('pincode', numericVal);

    if (numericVal.length === 6) {
      setFetchingPincode(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${numericVal}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
          const firstOffice = data[0].PostOffice[0];
          setForm(prev => ({
            ...prev,
            pincode: numericVal,
            city: firstOffice.District || firstOffice.Block || prev.city,
            state: firstOffice.State || prev.state
          }));
        }
      } catch (err) {
        console.error('Pincode lookup error:', err);
      } finally {
        setFetchingPincode(false);
      }
    }
  };

  const handleCityChange = (val) => {
    update('city', val);
    const key = val.toLowerCase().trim();
    
    const foundCity = citiesList.find(c => c.name.toLowerCase() === key);
    if (foundCity) {
      update('state', foundCity.state);
    }
    
    if (INDIAN_CITIES_MAP[key]) {
      const match = INDIAN_CITIES_MAP[key];
      setForm(prev => ({
        ...prev,
        city: match.city,
        state: match.state,
        pincode: prev.pincode ? prev.pincode : match.pincode
      }));
    }
  };

  const handleStateChange = (val) => {
    update('state', val);
    if (form.city) {
      const match = citiesList.find(c => c.name.toLowerCase() === form.city.toLowerCase().trim());
      if (match && match.state.toLowerCase() !== val.toLowerCase().trim()) {
        update('city', '');
      }
    }
  };

  const filteredCities = useMemo(() => {
    if (!form.state) return [];
    return citiesList.filter(c => c.state.toLowerCase() === form.state.toLowerCase().trim());
  }, [citiesList, form.state]);

  const next = e => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.contactNumber || !form.address || !form.city || !form.pincode) {
      return setError('Complete all required property and address fields.');
    }
    setStep(2);
  };

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const rooms = Array.from({ length: Number(form.rooms) }, (_, i) => {
        const bedCount = Number(form.defaultBeds);
        const sharingType = bedCount === 1 ? 'single' : bedCount === 2 ? 'double' : bedCount === 3 ? 'triple' : 'four-sharing';
        return {
          number: String(i + 1).padStart(3, '0'),
          floor: String(Math.floor(i / Math.max(1, Math.ceil(form.rooms / form.floors))) + 1),
          category: form.propertyType,
          acType: 'non-ac',
          sharingType,
          beds: Array.from({ length: bedCount }, (_, j) => ({
            label: `Bed ${String.fromCharCode(65 + j)}`,
            monthlyRent: Number(form.defaultRent),
            status: 'vacant'
          }))
        };
      });
      const response = await fetch('/api/tenant/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify({ ...form, rooms })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not create property.');
      onDone(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="setup-page">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Property management</p>
          <h1>Add a new PG</h1>
          <p>Set up the property now. You can customize individual rooms and beds later.</p>
        </div>
        <span className="draft-chip">Saved as draft</span>
      </div>

      <div className="stepper">
        <span className={step >= 1 ? 'done' : ''}><i>{step > 1 ? '✓' : '1'}</i><b>PG details</b><small>Identity and location</small></span>
        <hr />
        <span className={step >= 2 ? 'done' : ''}><i>2</i><b>Rooms and pricing</b><small>Initial inventory</small></span>
        <hr />
        <span><i>3</i><b>Invite residents</b><small>Optional, do later</small></span>
      </div>

      <form className="setup-layout" onSubmit={step === 1 ? next : submit}>
        <section className="card setup-form-card">
          {step === 1 ? (
            <>
              <div className="section-title">
                <span><Building2 /></span>
                <div>
                  <h2>PG information</h2>
                  <p>Basic details residents will see on receipts and notices.</p>
                </div>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="field-grid">
                <label className="wide">PG name *
                  <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Sunrise Men's PG" />
                </label>
                <label>Property type *
                  <select value={form.propertyType} onChange={e => update('propertyType', e.target.value)}>
                    <option>Mens PG</option>
                    <option>Womens PG</option>
                    <option>Co-living</option>
                    <option>Student hostel</option>
                  </select>
                </label>
                <label>Contact number *
                  <input value={form.contactNumber} onChange={e => update('contactNumber', e.target.value)} placeholder="+91 98765 43210" />
                </label>
                <label className="wide">Street address *
                  <textarea value={form.address} onChange={e => update('address', e.target.value)} placeholder="Building, street and landmark" />
                </label>
                
                <label>State *
                  <input 
                    value={form.state} 
                    onChange={e => handleStateChange(e.target.value)} 
                    placeholder="e.g. Karnataka"
                    list="indian-states-list"
                  />
                  <datalist id="indian-states-list">
                    {ALL_INDIAN_STATES.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </label>

                <label style={{ position: 'relative' }}>City *
                  <input 
                    value={form.city} 
                    onChange={e => handleCityChange(e.target.value)} 
                    placeholder={form.state ? "e.g. Bengaluru" : "Choose a state first"}
                    disabled={!form.state}
                    list="indian-cities-list"
                  />
                  <datalist id="indian-cities-list">
                    {filteredCities.map((item, idx) => (
                      <option key={`${item.name}-${idx}`} value={item.name} />
                    ))}
                  </datalist>
                </label>
                
                <label style={{ position: 'relative' }}>PIN code *
                  <input 
                    value={form.pincode} 
                    onChange={e => handlePincodeChange(e.target.value)} 
                    maxLength="6" 
                    placeholder="560001"
                  />
                  {fetchingPincode && (
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      bottom: '12px',
                      fontSize: '11px',
                      color: 'var(--muted)',
                      animation: 'pulse 1.5s infinite'
                    }}>
                      Loading...
                    </span>
                  )}
                </label>
                
                <label>GST number <span>(optional)</span>
                  <input value={form.gstNumber} onChange={e => update('gstNumber', e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5" />
                </label>
              </div>
              <div className="amenity-block">
                <h3>Amenities</h3>
                <p>Select everything available at this property.</p>
                <div>
                  {amenities.map(item => (
                    <button type="button" key={item} className={form.amenities.includes(item) ? 'selected' : ''} onClick={() => toggleAmenity(item)}>
                      {form.amenities.includes(item) ? '✓ ' : '+ '}{item}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="section-title">
                <span><BedDouble /></span>
                <div>
                  <h2>Rooms, beds and pricing</h2>
                  <p>Create a starter inventory. Every room can be edited after setup.</p>
                </div>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="inventory-callout">
                <b>Quick setup</b>
                <span>We’ll generate room numbers and vacant beds automatically.</span>
              </div>
              <div className="field-grid">
                <label>Number of floors
                  <input type="number" min="1" max="30" value={form.floors} onChange={e => update('floors', e.target.value)} />
                </label>
                <label>Total rooms
                  <input type="number" min="1" max="500" value={form.rooms} onChange={e => update('rooms', e.target.value)} />
                </label>
                <label>Beds per room
                  <input type="number" min="1" max="10" value={form.defaultBeds} onChange={e => update('defaultBeds', e.target.value)} />
                </label>
                <label>Default monthly rent (₹)
                  <input type="number" min="0" value={form.defaultRent} onChange={e => update('defaultRent', e.target.value)} />
                </label>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px' }}>Recurring Maintenance Charge</h3>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                  <input 
                    type="checkbox" 
                    id="maintenanceEnabled"
                    checked={form.maintenanceEnabled} 
                    onChange={e => update('maintenanceEnabled', e.target.checked)} 
                    style={{ width: 'auto', marginRight: '6px' }}
                  />
                  <label htmlFor="maintenanceEnabled" style={{ margin: 0, fontWeight: '600', cursor: 'pointer' }}>
                    Enable Recurring Maintenance Charges for this PG
                  </label>
                </div>

                {form.maintenanceEnabled && (
                  <div className="field-grid" style={{ marginTop: '12px' }}>
                    <label>Maintenance Amount (₹) *
                      <input 
                        type="number" 
                        min="0" 
                        value={form.maintenanceAmount} 
                        onChange={e => update('maintenanceAmount', Number(e.target.value))} 
                        required 
                      />
                    </label>
                    <label>Billing Frequency *
                      <select 
                        value={form.maintenanceFrequency} 
                        onChange={e => update('maintenanceFrequency', e.target.value)}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="2_months">Every 2 Months</option>
                        <option value="3_months">Every 3 Months</option>
                        <option value="4_months">Every 4 Months</option>
                        <option value="6_months">Every 6 Months</option>
                        <option value="yearly">Yearly</option>
                        <option value="custom">Custom Interval (X Months)</option>
                      </select>
                    </label>

                    {form.maintenanceFrequency === 'custom' && (
                      <label>Custom Months *
                        <input 
                          type="number" 
                          min="1" 
                          value={form.maintenanceCustomMonths} 
                          onChange={e => update('maintenanceCustomMonths', Number(e.target.value))} 
                          required 
                        />
                      </label>
                    )}

                    <label>Next Due Date *
                      <input 
                        type="date" 
                        value={form.maintenanceNextDueDate} 
                        onChange={e => update('maintenanceNextDueDate', e.target.value)} 
                        required 
                      />
                    </label>

                    <label>Billing Mode *
                      <select 
                        value={form.maintenanceSeparateInvoice ? 'separate' : 'merged'} 
                        onChange={e => update('maintenanceSeparateInvoice', e.target.value === 'separate')}
                      >
                        <option value="merged">Add to resident's monthly rent invoice</option>
                        <option value="separate">Create separate maintenance invoice</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <div className="inventory-preview">
                <div>
                  <span><BedDouble /></span>
                  <p>
                    <b>{form.rooms * form.defaultBeds} beds</b>
                    <small>Across {form.rooms} rooms and {form.floors} floor{form.floors > 1 ? 's' : ''}</small>
                  </p>
                </div>
                <strong>{money(form.rooms * form.defaultBeds * form.defaultRent)}<small>maximum monthly rent</small></strong>
              </div>
            </>
          )}
        </section>

        <aside>
          <section className="card setup-help">
            <span className="help-illustration"><Building2 /></span>
            <h3>{step === 1 ? 'A few things to keep ready' : 'You can refine this later'}</h3>
            <ul>
              {step === 1 ? (
                <>
                  <li>Property contact number</li>
                  <li>Complete postal address</li>
                  <li>GST number, if registered</li>
                  <li>Amenities offered to residents</li>
                </>
              ) : (
                <>
                  <li>Change rent for individual beds</li>
                  <li>Add room categories and deposits</li>
                  <li>Mark rooms under maintenance</li>
                  <li>Import residents using CSV</li>
                </>
              )}
            </ul>
          </section>
          <section className="security-note">
            <ShieldCheck />
            <span>
              <b>Your workspace stays isolated</b>
              <small>Only authorized users in your organization can access this PG.</small>
            </span>
          </section>
        </aside>

        <footer>
          <button type="button" className="secondary" onClick={() => step === 2 ? setStep(1) : onDone()}>
            ← {step === 2 ? 'Back' : 'Cancel'}
          </button>
          <button className="primary" disabled={saving}>
            {step === 1 ? 'Continue to rooms' : saving ? 'Creating PG…' : 'Create PG'}
            {step === 1 && <ChevronRight size={17} />}
          </button>
        </footer>
      </form>
    </div>
  );
}
export default PropertySetup;
