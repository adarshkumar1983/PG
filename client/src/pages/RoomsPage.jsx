import React, { useState, useEffect } from 'react';
import { Plus, Building2, BedDouble } from 'lucide-react';
import AddRoomModal from '../components/AddRoomModal.jsx';
import EditRoomModal from '../components/EditRoomModal.jsx';

export function RoomsPage({ session, property, members = [], onUpdate }) {
  const [rooms, setRooms] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(null);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const getOccupantName = (bedId) => {
    if (!members || members.length === 0) return null;
    const occ = members.find(m => m.role === 'resident' && m.bedId?.toString() === bedId?.toString());
    return occ ? occ.name : null;
  };

  useEffect(() => {
    if (property) {
      setRooms(property.rooms || []);
    }
  }, [property]);

  const notify = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  if (!property) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', margin: '40px auto', maxWidth: '500px' }} className="card">
        <Building2 size={48} style={{ color: 'var(--green)', marginBottom: '16px' }} />
        <h2>No Property Found</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>Please set up a property first under the "My PG" tab.</p>
      </div>
    );
  }

  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((acc, r) => acc + r.beds.length, 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0);
  const vacantBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'vacant').length, 0);
  const maintenanceBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'maintenance').length, 0);

  const floors = rooms.reduce((acc, r) => {
    const f = r.floor || '1';
    if (!acc[f]) acc[f] = [];
    acc[f].push(r);
    return acc;
  }, {});

  const sortedFloors = Object.keys(floors).sort((a, b) => Number(a) - Number(b));
  sortedFloors.forEach(f => {
    floors[f].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  });

  const handleSaveProperty = async (updatedRooms) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/properties/${property._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify({ ...property, rooms: updatedRooms })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update property');
      onUpdate(result);
      notify('Property inventory saved successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRoom = (newRoom) => {
    const updated = [...rooms, newRoom];
    setRooms(updated);
    handleSaveProperty(updated);
    setOpenAdd(false);
  };

  const handleEditRoom = (editedRoom) => {
    const updated = rooms.map(r => r._id === editedRoom._id ? editedRoom : r);
    setRooms(updated);
    handleSaveProperty(updated);
    setOpenEdit(null);
  };

  return (
    <div className="rooms-page">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Property Inventory</p>
          <h1>Rooms & Beds</h1>
          <p>Configure room details, pricing, AC status, and view real-time occupancy status.</p>
        </div>
        <button className="primary" onClick={() => setOpenAdd(true)}>
          <Plus size={17} /> Add Room
        </button>
      </div>

      <div className="room-stats">
        <article className="card metric" style={{ padding: '16px' }}>
          <small>Total Rooms</small>
          <strong>{totalRooms}</strong>
        </article>
        <article className="card metric" style={{ padding: '16px' }}>
          <small>Total Beds</small>
          <strong>{totalBeds}</strong>
        </article>
        <article className="card metric" style={{ padding: '16px' }}>
          <small>Occupied Beds</small>
          <strong style={{ color: 'var(--green)' }}>{occupiedBeds}</strong>
        </article>
        <article className="card metric" style={{ padding: '16px' }}>
          <small>Vacant Beds</small>
          <strong style={{ color: 'var(--color-success)' }}>{vacantBeds}</strong>
        </article>
        <article className="card metric" style={{ padding: '16px' }}>
          <small>Maintenance</small>
          <strong style={{ color: 'var(--color-warning)' }}>{maintenanceBeds}</strong>
        </article>
      </div>

      {sortedFloors.map(floor => (
        <div key={floor} className="floor-section">
          <h2 className="floor-title">Floor {floor}</h2>
          <div className="rooms-grid">
            {floors[floor].map(room => {
              const baseRent = room.beds[0]?.monthlyRent || 0;
              const hasDifferingRents = room.beds.some(b => b.monthlyRent !== baseRent);
              const rentString = hasDifferingRents ? 'Varies' : `₹${new Intl.NumberFormat('en-IN').format(baseRent)}`;

              return (
                <div key={room._id} className="card room-card" onClick={() => setOpenEdit(room)}>
                  <div className="room-card-header">
                    <h3>Room {room.number}</h3>
                    <div className="room-badges">
                      <span className={`badge ${room.acType === 'ac' ? 'ac' : 'non-ac'}`}>
                        {room.acType === 'ac' ? 'AC' : 'Non-AC'}
                      </span>
                      <span className="badge sharing">
                        {room.sharingType}
                      </span>
                    </div>
                  </div>

                  <div className="bed-list">
                    {room.beds.map((bed, idx) => {
                      const occupantName = getOccupantName(bed._id);
                      return (
                        <div key={bed._id || idx} className="bed-item">
                          <div className="bed-info">
                            <span className={`bed-dot ${bed.status || 'vacant'}`} />
                            <span>{bed.label}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                            {occupantName ? `Occupied: ${occupantName}` : bed.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="room-card-footer">
                    <span>Rent per bed</span>
                    <strong>{rentString}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {openAdd && (
        <AddRoomModal 
          onClose={() => setOpenAdd(false)} 
          onAdd={handleAddRoom} 
        />
      )}

      {openEdit && (
        <EditRoomModal 
          room={openEdit} 
          onClose={() => setOpenEdit(null)} 
          onSave={handleEditRoom} 
        />
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
export default RoomsPage;
