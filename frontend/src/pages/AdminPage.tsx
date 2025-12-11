import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Routes, Route, NavLink } from 'react-router-dom';
import {
  adminListCourts,
  adminCreateCourt,
  adminUpdateCourt,
  adminDeleteCourt,
  adminListEquipment,
  adminCreateEquipment,
  adminUpdateEquipment,
  adminDeleteEquipment,
  adminListCoaches,
  adminCreateCoach,
  adminUpdateCoach,
  adminDeleteCoach,
  Court,
  Equipment,
  Coach,
} from '../api';

// Courts Management
const CourtsAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingCourt, setEditingCourt] = useState<Partial<Court> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const { data: courts, isLoading } = useQuery({
    queryKey: ['admin-courts'],
    queryFn: adminListCourts,
  });
  
  const createMutation = useMutation({
    mutationFn: adminCreateCourt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courts'] });
      setIsCreating(false);
      setEditingCourt(null);
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Court> }) => adminUpdateCourt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courts'] });
      setEditingCourt(null);
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: adminDeleteCourt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courts'] });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourt) return;
    
    if (isCreating) {
      createMutation.mutate(editingCourt);
    } else if (editingCourt.id) {
      updateMutation.mutate({ id: editingCourt.id, data: editingCourt });
    }
  };
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>Courts</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>{courts?.length || 0} court{courts?.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsCreating(true); setEditingCourt({ name: '', type: 'indoor', base_price: 30, enabled: true }); }}>
          + Add New Court
        </button>
      </div>
      
      {editingCourt && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">{isCreating ? 'Create Court' : 'Edit Court'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={editingCourt.name || ''}
                onChange={(e) => setEditingCourt({ ...editingCourt, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={editingCourt.type || 'indoor'}
                onChange={(e) => setEditingCourt({ ...editingCourt, type: e.target.value as 'indoor' | 'outdoor' })}
              >
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Base Price ($/hr)</label>
              <input
                type="number"
                className="form-input"
                value={editingCourt.base_price || 0}
                onChange={(e) => setEditingCourt({ ...editingCourt, base_price: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={editingCourt.enabled ?? true}
                  onChange={(e) => setEditingCourt({ ...editingCourt, enabled: e.target.checked })}
                />{' '}
                Enabled
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setEditingCourt(null); setIsCreating(false); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      
      {isLoading ? (
        <div className="loading">
          <div className="spinner" />
          <p className="loading-text">Loading courts...</p>
        </div>
      ) : !courts || courts.length === 0 ? (
        <div className="empty-state" style={{ padding: '4rem 2rem' }}>
          <div className="empty-state-icon">🏸</div>
          <h3 className="empty-state-title">No Courts Yet</h3>
          <p className="empty-state-description">Add your first court to start accepting bookings</p>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => { setIsCreating(true); setEditingCourt({ name: '', type: 'indoor', base_price: 30, enabled: true }); }}>
            + Add First Court
          </button>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Base Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courts?.map((court: Court) => (
              <tr key={court.id}>
                <td><span style={{ fontWeight: '600', color: 'var(--gray-600)' }}>#{court.id}</span></td>
                <td><span style={{ fontWeight: '600' }}>{court.name}</span></td>
                <td><span className={`badge ${court.type === 'indoor' ? 'badge-primary' : 'badge-success'}`}>{court.type === 'indoor' ? '🏠 Indoor' : '🌳 Outdoor'}</span></td>
                <td><span style={{ fontWeight: '600', color: 'var(--primary)' }}>${court.base_price}</span><span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>/hr</span></td>
                <td><span className={`badge ${court.enabled ? 'badge-success' : 'badge-danger'}`}>{court.enabled ? '✓ Active' : '✕ Disabled'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }} onClick={() => { setEditingCourt(court); setIsCreating(false); }}>Edit</button>
                    <button className="btn" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', background: 'var(--danger-50)', color: 'var(--danger)', border: '1px solid var(--danger-100)' }} onClick={() => window.confirm('Delete this court? This cannot be undone.') && deleteMutation.mutate(court.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Equipment Management
const EquipmentAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingEquipment, setEditingEquipment] = useState<Partial<Equipment> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const { data: equipment, isLoading } = useQuery({
    queryKey: ['admin-equipment'],
    queryFn: adminListEquipment,
  });
  
  const createMutation = useMutation({
    mutationFn: adminCreateEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-equipment'] });
      setIsCreating(false);
      setEditingEquipment(null);
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ sku, data }: { sku: string; data: Partial<Equipment> }) => adminUpdateEquipment(sku, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-equipment'] });
      setEditingEquipment(null);
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: adminDeleteEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-equipment'] });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment) return;
    
    if (isCreating) {
      createMutation.mutate(editingEquipment);
    } else if (editingEquipment.sku) {
      updateMutation.mutate({ sku: editingEquipment.sku, data: editingEquipment });
    }
  };
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>Equipment</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>{equipment?.length || 0} item{equipment?.length !== 1 ? 's' : ''} in inventory</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsCreating(true); setEditingEquipment({ sku: '', name: '', total_quantity: 1, rental_price: 5, active: true }); }}>
          + Add New Equipment
        </button>
      </div>
      
      {editingEquipment && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">{isCreating ? 'Create Equipment' : 'Edit Equipment'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                type="text"
                className="form-input"
                value={editingEquipment.sku || ''}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, sku: e.target.value })}
                disabled={!isCreating}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={editingEquipment.name || ''}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Total Quantity</label>
              <input
                type="number"
                className="form-input"
                value={editingEquipment.total_quantity || 0}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, total_quantity: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rental Price ($/hr)</label>
              <input
                type="number"
                className="form-input"
                step="0.01"
                value={editingEquipment.rental_price || 0}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, rental_price: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={editingEquipment.active ?? true}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, active: e.target.checked })}
                />{' '}
                Active
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setEditingEquipment(null); setIsCreating(false); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      
      {isLoading ? (
        <div className="loading">
          <div className="spinner" />
          <p className="loading-text">Loading equipment...</p>
        </div>
      ) : !equipment || equipment.length === 0 ? (
        <div className="empty-state" style={{ padding: '4rem 2rem' }}>
          <div className="empty-state-icon">🎾</div>
          <h3 className="empty-state-title">No Equipment Yet</h3>
          <p className="empty-state-description">Add equipment items like rackets, shoes, or shuttlecocks for rent</p>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => { setIsCreating(true); setEditingEquipment({ sku: '', name: '', total_quantity: 1, rental_price: 5, active: true }); }}>
            + Add First Equipment
          </button>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Quantity</th>
              <th>Rental Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {equipment?.map((item: Equipment) => (
              <tr key={item.sku}>
                <td><code style={{ fontSize: '0.8125rem', background: 'var(--gray-100)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>{item.sku}</code></td>
                <td><span style={{ fontWeight: '600' }}>{item.name}</span></td>
                <td><span style={{ fontWeight: '600', color: item.total_quantity > 5 ? 'var(--success-600)' : 'var(--warning-600)' }}>{item.total_quantity}</span> <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>units</span></td>
                <td><span style={{ fontWeight: '600', color: 'var(--primary)' }}>${item.rental_price}</span><span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>/hr</span></td>
                <td><span className={`badge ${item.active ? 'badge-success' : 'badge-danger'}`}>{item.active ? '✓ Active' : '✕ Inactive'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }} onClick={() => { setEditingEquipment(item); setIsCreating(false); }}>Edit</button>
                    <button className="btn" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', background: 'var(--danger-50)', color: 'var(--danger)', border: '1px solid var(--danger-100)' }} onClick={() => window.confirm('Delete this equipment? This cannot be undone.') && deleteMutation.mutate(item.sku)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Coaches Management
const CoachesAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingCoach, setEditingCoach] = useState<Partial<Coach> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const { data: coaches, isLoading } = useQuery({
    queryKey: ['admin-coaches'],
    queryFn: adminListCoaches,
  });
  
  const createMutation = useMutation({
    mutationFn: adminCreateCoach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coaches'] });
      setIsCreating(false);
      setEditingCoach(null);
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Coach> }) => adminUpdateCoach(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coaches'] });
      setEditingCoach(null);
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: adminDeleteCoach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coaches'] });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoach) return;
    
    if (isCreating) {
      createMutation.mutate(editingCoach);
    } else if (editingCoach.id) {
      updateMutation.mutate({ id: editingCoach.id, data: editingCoach });
    }
  };
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>Coaches</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>{coaches?.length || 0} coach{coaches?.length !== 1 ? 'es' : ''} available</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsCreating(true); setEditingCoach({ name: '', hourly_rate: 50, active: true }); }}>
          + Add New Coach
        </button>
      </div>
      
      {editingCoach && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">{isCreating ? 'Create Coach' : 'Edit Coach'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={editingCoach.name || ''}
                onChange={(e) => setEditingCoach({ ...editingCoach, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Hourly Rate ($)</label>
              <input
                type="number"
                className="form-input"
                step="0.01"
                value={editingCoach.hourly_rate || 0}
                onChange={(e) => setEditingCoach({ ...editingCoach, hourly_rate: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={editingCoach.active ?? true}
                  onChange={(e) => setEditingCoach({ ...editingCoach, active: e.target.checked })}
                />{' '}
                Active
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setEditingCoach(null); setIsCreating(false); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      
      {isLoading ? (
        <div className="loading">
          <div className="spinner" />
          <p className="loading-text">Loading coaches...</p>
        </div>
      ) : !coaches || coaches.length === 0 ? (
        <div className="empty-state" style={{ padding: '4rem 2rem' }}>
          <div className="empty-state-icon">👨‍🏫</div>
          <h3 className="empty-state-title">No Coaches Yet</h3>
          <p className="empty-state-description">Add professional coaches to offer training sessions</p>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => { setIsCreating(true); setEditingCoach({ name: '', hourly_rate: 50, active: true }); }}>
            + Add First Coach
          </button>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Hourly Rate</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coaches?.map((coach: Coach) => (
              <tr key={coach.id}>
                <td><span style={{ fontWeight: '600', color: 'var(--gray-600)' }}>#{coach.id}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: 'var(--radius-full)', 
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '0.875rem'
                    }}>
                      {coach.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: '600' }}>{coach.name}</span>
                  </div>
                </td>
                <td><span style={{ fontWeight: '600', color: 'var(--success-600)' }}>${coach.hourly_rate}</span><span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>/hr</span></td>
                <td><span className={`badge ${coach.active ? 'badge-success' : 'badge-danger'}`}>{coach.active ? '✓ Active' : '✕ Inactive'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }} onClick={() => { setEditingCoach(coach); setIsCreating(false); }}>Edit</button>
                    <button className="btn" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', background: 'var(--danger-50)', color: 'var(--danger)', border: '1px solid var(--danger-100)' }} onClick={() => window.confirm('Delete this coach? This cannot be undone.') && deleteMutation.mutate(coach.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Main Admin Page
const AdminPage: React.FC = () => {
  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage courts, equipment, coaches, and bookings</p>
      </div>
      
      <div className="nav-links" style={{ 
        background: 'white', 
        padding: '0.5rem', 
        borderRadius: 'var(--radius-xl)', 
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <NavLink to="/admin/courts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ flex: '1', minWidth: '100px', textAlign: 'center' }}>
          🏸 Courts
        </NavLink>
        <NavLink to="/admin/equipment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ flex: '1', minWidth: '100px', textAlign: 'center' }}>
          🎾 Equipment
        </NavLink>
        <NavLink to="/admin/coaches" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ flex: '1', minWidth: '100px', textAlign: 'center' }}>
          👨‍🏫 Coaches
        </NavLink>
      </div>
      
      <div className="card">
        <Routes>
          <Route path="/" element={<CourtsAdmin />} />
          <Route path="/courts" element={<CourtsAdmin />} />
          <Route path="/equipment" element={<EquipmentAdmin />} />
          <Route path="/coaches" element={<CoachesAdmin />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminPage;
