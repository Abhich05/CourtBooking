import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { listBookings, cancelBooking, Booking } from '../api';

const MyBookingsPage = (): JSX.Element => {
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', searchEmail],
    queryFn: () => listBookings({ user_email: searchEmail }),
    enabled: !!searchEmail,
  });
  
  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', searchEmail] });
    },
  });
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchEmail(email);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="badge badge-success">✓ Confirmed</span>;
      case 'cancelled':
        return <span className="badge badge-danger">✕ Cancelled</span>;
      case 'waitlisted':
        return <span className="badge badge-warning">⏳ Waitlisted</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };
  
  return (
    <div className="my-bookings-page">
      <>
        <div className="page-header">
          <h1 className="page-title">My Bookings</h1>
          <p className="page-subtitle">View and manage your court reservations</p>
        </div>

        <div className="card">
          <h3 className="card-title">Find Your Bookings</h3>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter the email used for booking"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!email} style={{ height: 'fit-content' }}>
              Search Bookings
            </button>
          </form>
        </div>
        
        {isLoading && (
          <div className="loading">
            <div className="spinner" />
            <p className="loading-text">Loading your bookings...</p>
          </div>
        )}
        
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>Failed to load bookings. Please try again.</span>
          </div>
        )}
        
        {data && data.bookings.length === 0 && (
          <div className="card empty-state">
            <div className="empty-state-icon">📭</div>
            <h3 className="empty-state-title">No Bookings Found</h3>
            <p className="empty-state-description">
              We couldn&apos;t find any bookings associated with this email address.
            </p>
          </div>
        )}
        
        {data && data.bookings.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 1.5rem 0' }}>
              <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
                Your Reservations
              </h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>
                {data.total} booking{data.total !== 1 ? 's' : ''} found
              </p>
            </div>
            <table className="table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Date & Time</th>
                  <th>Resources</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.map((booking: Booking) => (
                  <tr key={booking.id}>
                    <td>
                      <span style={{ 
                        fontWeight: '700', 
                        color: 'var(--primary)',
                        fontSize: '0.9375rem'
                      }}>
                        #{booking.id.toString().padStart(5, '0')}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{format(parseISO(booking.start_ts), 'MMM d, yyyy')}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                        {format(parseISO(booking.start_ts), 'h:mm a')} - {format(parseISO(booking.end_ts), 'h:mm a')}
                      </div>
                    </td>
                    <td>
                      {booking.allocations.map((alloc, idx) => (
                        <div key={idx} style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '0.125rem 0.5rem',
                            background: 'var(--gray-100)',
                            borderRadius: 'var(--radius-sm)',
                            marginRight: '0.25rem',
                            marginBottom: '0.25rem'
                          }}>
                            {alloc.type}: {alloc.resource_id} {alloc.quantity > 1 ? `×${alloc.quantity}` : ''}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td>
                      <span style={{ 
                        fontWeight: '700', 
                        fontSize: '1rem',
                        color: 'var(--gray-900)'
                      }}>
                        ${booking.total_price.toFixed(2)}
                      </span>
                    </td>
                    <td>{getStatusBadge(booking.status)}</td>
                    <td>
                      {booking.status === 'confirmed' && (
                        <button
                          className="btn btn-secondary"
                          style={{ 
                            padding: '0.5rem 1rem', 
                            fontSize: '0.8125rem',
                            color: 'var(--danger)',
                            borderColor: 'var(--danger-100)',
                            background: 'var(--danger-50)'
                          }}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this booking?')) {
                              cancelMutation.mutate(booking.id);
                            }
                          }}
                          disabled={cancelMutation.isPending}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    </div>
  );
};

export default MyBookingsPage;
