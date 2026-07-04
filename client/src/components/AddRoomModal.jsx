import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

export function AddRoomModal({ onClose, onAdd }) {
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('1');
  const [acType, setAcType] = useState('non-ac');
  const [sharingType, setSharingType] = useState('double');
  const [rent, setRent] = useState('7500');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!number || !floor || !rent) return;

    const bedCount = sharingType === 'single' ? 1 : sharingType === 'double' ? 2 : sharingType === 'triple' ? 3 : 4;
    const beds = Array.from({ length: bedCount }, (_, i) => ({
      _id: `bed-${Date.now()}-${i}`,
      label: `Bed ${String.fromCharCode(65 + i)}`,
      monthlyRent: Number(rent),
      status: 'vacant'
    }));

    onAdd({
      _id: `room-${Date.now()}`,
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
      <form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <button type="button" className="modal-x" onClick={onClose}><X /></button>
        <span className="modal-icon"><Plus /></span>
        <h2>Add Room</h2>
        <p>Configure a new room space for your residents.</p>
        
        <div className="form-row">
          <label>Room Number *
            <input required value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 301" autoFocus />
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
            <select value={sharingType} onChange={e => setSharingType(e.target.value)}>
              <option value="single">Single Sharing</option>
              <option value="double">Double Sharing</option>
              <option value="triple">Triple Sharing</option>
              <option value="four-sharing">Four Sharing</option>
            </select>
          </label>
        </div>

        <label>Rent per bed (₹/month) *
          <input required type="number" min="0" value={rent} onChange={e => setRent(e.target.value)} />
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Add Room</button>
        </div>
      </form>
    </div>
  );
}
export default AddRoomModal;
