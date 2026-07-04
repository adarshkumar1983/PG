import React, { useState } from 'react';
import { BedDouble, X } from 'lucide-react';

export function EditRoomModal({ room, onClose, onSave }) {
  const [number, setNumber] = useState(room.number || '');
  const [floor, setFloor] = useState(room.floor || '1');
  const [acType, setAcType] = useState(room.acType || 'non-ac');
  const [sharingType, setSharingType] = useState(room.sharingType || 'double');
  const [rent, setRent] = useState(() => {
    return String(room.beds[0]?.monthlyRent || 7500);
  });
  const [beds, setBeds] = useState(room.beds || []);

  const handleRentChange = (newRent) => {
    setRent(newRent);
    setBeds(current => current.map(b => ({ ...b, monthlyRent: Number(newRent) })));
  };

  const handleSharingChange = (newSharing) => {
    setSharingType(newSharing);
    const targetCount = newSharing === 'single' ? 1 : newSharing === 'double' ? 2 : newSharing === 'triple' ? 3 : 4;
    
    setBeds(current => {
      let updatedBeds = [];
      for (let i = 0; i < targetCount; i++) {
        if (current[i]) {
          updatedBeds.push(current[i]);
        } else {
          updatedBeds.push({
            _id: `bed-${Date.now()}-${i}`,
            label: `Bed ${String.fromCharCode(65 + i)}`,
            monthlyRent: Number(rent),
            status: 'vacant'
          });
        }
      }
      return updatedBeds;
    });
  };

  const handleBedStatusChange = (index, newStatus) => {
    setBeds(current => current.map((b, idx) => idx === index ? { ...b, status: newStatus } : b));
  };

  const handleBedLabelChange = (index, newLabel) => {
    setBeds(current => current.map((b, idx) => idx === index ? { ...b, label: newLabel } : b));
  };

  const handleBedRentChange = (index, newBedRent) => {
    setBeds(current => current.map((b, idx) => idx === index ? { ...b, monthlyRent: Number(newBedRent) } : b));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!number || !floor) return;

    onSave({
      ...room,
      number,
      floor,
      category: `${acType === 'ac' ? 'AC' : 'Non-AC'} ${sharingType.charAt(0).toUpperCase() + sharingType.slice(1)}`,
      acType,
      sharingType,
      beds
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" style={{ width: 'min(580px, 100%)' }} onMouseDown={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <button type="button" className="modal-x" onClick={onClose}><X /></button>
        <span className="modal-icon"><BedDouble /></span>
        <h2>Edit Room {room.number}</h2>
        <p>Modify room settings, AC/sharing config, and set custom pricing for beds.</p>

        <div className="form-row">
          <label>Room Number *
            <input required value={number} onChange={e => setNumber(e.target.value)} />
          </label>
          <label>Floor *
            <input required type="number" min="1" max="30" value={floor} onChange={e => setFloor(e.target.value)} />
          </label>
        </div>

        <div className="form-row">
          <label>AC Status
            <select value={acType} onChange={e => setAcType(e.target.value)}>
              <option value="non-ac">Non-AC</option>
              <option value="ac">AC</option>
            </select>
          </label>
          <label>Sharing Type
            <select value={sharingType} onChange={e => handleSharingChange(e.target.value)}>
              <option value="single">Single Sharing</option>
              <option value="double">Double Sharing</option>
              <option value="triple">Triple Sharing</option>
              <option value="four-sharing">Four Sharing</option>
            </select>
          </label>
        </div>

        <label>Common Rent per bed (₹/month)
          <input type="number" min="0" value={rent} onChange={e => handleRentChange(e.target.value)} placeholder="Applies to all beds" />
        </label>

        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
          <h3 style={{ font: '700 13px Manrope', margin: '0 0 10px' }}>Configure Beds</h3>
          {beds.map((bed, idx) => (
            <div key={bed._id || idx} className="bed-edit-row">
              <input 
                required 
                placeholder="Bed Label" 
                value={bed.label} 
                onChange={e => handleBedLabelChange(idx, e.target.value)} 
                style={{ height: '36px', fontSize: '12px' }}
              />
              <select 
                value={bed.status} 
                onChange={e => handleBedStatusChange(idx, e.target.value)}
                style={{ height: '36px', fontSize: '12px' }}
              >
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <input 
                required 
                type="number" 
                min="0" 
                placeholder="Rent" 
                value={bed.monthlyRent} 
                onChange={e => handleBedRentChange(idx, e.target.value)}
                style={{ height: '36px', fontSize: '12px' }}
              />
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Save Changes</button>
        </div>
      </form>
    </div>
  );
}
export default EditRoomModal;
