import React, { useCallback, useEffect, useState } from 'react';
import './ShipperDetails.css';
import { API_BASE_URL } from '../services/api';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const formatStatus = (value) => {
  if (!value) return 'N/A';
  return value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const STATUS_CLASS = {
  pending: 'sd-status-pending',
  confirmed: 'sd-status-confirmed',
  in_progress: 'sd-status-inprogress',
  completed: 'sd-status-completed',
  cancelled: 'sd-status-cancelled',
};

const ShipperDetails = ({ user, onBack, onViewBooking }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();
      const all = Array.isArray(data) ? data : data.bookings || [];
      const filtered = all.filter(
        (b) => b.userId?._id === user.id || b.userId === user.id
      );
      setBookings(filtered);
    } catch (err) {
      console.error('Failed to fetch shipper bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      b._id?.toLowerCase().includes(search) ||
      b.pickupLocation?.address?.toLowerCase().includes(search) ||
      b.deliveryLocation?.address?.toLowerCase().includes(search) ||
      b.status?.toLowerCase().includes(search)
    );
  });

  const statusCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="sd-page">
      <div className="sd-toolbar">
        <button type="button" className="sd-back-btn" onClick={onBack}>
          Back to Shippers
        </button>
      </div>

      <div className="sd-grid">
        {/* Profile hero */}
        <section className="sd-card sd-hero">
          <div className="sd-avatar">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div className="sd-hero-info">
            <span className="sd-kicker">Shipper</span>
            <h2>{user.firstName} {user.lastName}</h2>
            <p>{user.email}</p>
          </div>
        </section>

        {/* Stats */}
        <section className="sd-card sd-stats-row">
          <div className="sd-stat">
            <span>Total Bookings</span>
            <strong>{user.totalBookings ?? bookings.length}</strong>
          </div>
          <div className="sd-stat">
            <span>Active Bookings</span>
            <strong>{user.activeBookings ?? (statusCounts.in_progress || 0)}</strong>
          </div>
          <div className="sd-stat">
            <span>Completed</span>
            <strong>{statusCounts.completed || 0}</strong>
          </div>
          <div className="sd-stat">
            <span>Phone</span>
            <strong>{user.phone || 'N/A'}</strong>
          </div>
          <div className="sd-stat">
            <span>Registered</span>
            <strong>{formatDate(user.registeredDate)}</strong>
          </div>
        </section>

        {/* Booking history */}
        <section className="sd-card sd-bookings-card">
          <div className="sd-bookings-header">
            <h3>Booking History</h3>
            <div className="sd-bookings-filters">
              <input
                type="text"
                placeholder="Search bookings…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sd-search-input"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="sd-status-select"
              >
                <option value="all">All ({bookings.length})</option>
                {Object.entries(statusCounts).map(([s, c]) => (
                  <option key={s} value={s}>
                    {formatStatus(s)} ({c})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="sd-loading">Loading bookings…</div>
          ) : filteredBookings.length === 0 ? (
            <div className="sd-empty">No bookings found.</div>
          ) : (
            <div className="sd-table-wrap">
              <table className="sd-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Pickup</th>
                    <th>Drop</th>
                    <th>Truck Type</th>
                    <th>Pickup Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b._id}>
                      <td className="sd-booking-id">#{b._id.slice(-6)}</td>
                      <td>{b.pickupLocation?.address || 'N/A'}</td>
                      <td>{b.deliveryLocation?.address || 'N/A'}</td>
                      <td>{b.truckType || 'N/A'}</td>
                      <td>{formatDate(b.pickupDate)}</td>
                      <td>
                        <span className={`sd-status-badge ${STATUS_CLASS[b.status] || 'sd-status-default'}`}>
                          {formatStatus(b.status)}
                        </span>
                      </td>
                      <td>
                        {onViewBooking && (
                          <button
                            type="button"
                            className="sd-action-btn"
                            onClick={() => onViewBooking(b._id)}
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ShipperDetails;
