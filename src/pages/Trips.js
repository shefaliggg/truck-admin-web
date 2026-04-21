import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Trips.css';

const Trips = ({ onViewTrip }) => {
  const [allTrips, setAllTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://54.174.219.57:5000/api/trips', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }

      const data = await response.json();
      const normalizedTrips = (data || []).map((trip) => ({
        id: trip._id,
        bookingRef: trip.bookingId?._id ? `#${trip.bookingId._id.slice(-6)}` : 'N/A',
        driverName: trip.driverId?.userId
          ? `${trip.driverId.userId.firstName} ${trip.driverId.userId.lastName}`
          : 'N/A',
        fromLocation: trip.bookingId?.pickupLocation?.address || 'N/A',
        toLocation: trip.bookingId?.deliveryLocation?.address || 'N/A',
        status: trip.status || 'assigned',
        startedAt: trip.startedAt || null,
        updatedAt: trip.updatedAt || null,
      }));
      setAllTrips(normalizedTrips);
    } catch (err) {
      console.error('Failed to fetch trips:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const statusOptions = useMemo(() => {
    const countByStatus = allTrips.reduce((accumulator, trip) => {
      accumulator[trip.status] = (accumulator[trip.status] || 0) + 1;
      return accumulator;
    }, {});

    return [
      { id: 'all', label: 'All', count: allTrips.length },
      { id: 'assigned', label: 'Assigned', count: countByStatus.assigned || 0 },
      { id: 'accepted', label: 'Accepted', count: countByStatus.accepted || 0 },
      { id: 'in_transit', label: 'In Transit', count: countByStatus.in_transit || 0 },
      { id: 'delivered', label: 'Delivered', count: countByStatus.delivered || 0 },
    ];
  }, [allTrips]);

  const filteredTrips = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return allTrips.filter((trip) => {
      if (selectedStatus !== 'all' && trip.status !== selectedStatus) {
        return false;
      }

      if (assignmentFilter === 'assigned' && trip.driverName === 'N/A') {
        return false;
      }

      if (assignmentFilter === 'unassigned' && trip.driverName !== 'N/A') {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        trip.id,
        trip.bookingRef,
        trip.driverName,
        trip.fromLocation,
        trip.toLocation,
        trip.status,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [allTrips, assignmentFilter, searchTerm, selectedStatus]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      assigned: { label: 'Assigned', className: 'status-assigned' },
      accepted: { label: 'Accepted', className: 'status-accepted' },
      going_to_pickup: { label: 'Going to Pickup', className: 'status-enroute' },
      arrived_at_pickup: { label: 'Arrived at Pickup', className: 'status-loading' },
      loading: { label: 'Loading', className: 'status-loading' },
      loaded: { label: 'Loaded', className: 'status-loading' },
      in_transit: { label: 'In Transit', className: 'status-transit' },
      arrived_at_drop: { label: 'Arrived at Drop', className: 'status-arrived' },
      delivered: { label: 'Delivered', className: 'status-delivered' },
      completed: { label: 'Completed', className: 'status-delivered' },
      rejected: { label: 'Rejected', className: 'status-rejected' },
    };
    const config = statusConfig[status] || { label: status, className: 'status-default' };
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  if (loading) {
    return <div className="trips-loading">Loading trips...</div>;
  }

  return (
    <div className="trips-page">
      <div className="trips-filters-panel">
        <div className="trips-filters-grid">
          <div className="trip-filter-field trip-filter-field-wide">
            <label htmlFor="trip-search">Search</label>
            <input
              id="trip-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by trip, booking, driver, route"
            />
          </div>

          <div className="trip-filter-field">
            <label htmlFor="trip-status">Status</label>
            <select
              id="trip-status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              {statusOptions.map((statusOption) => (
                <option key={statusOption.id} value={statusOption.id}>
                  {statusOption.label} ({statusOption.count})
                </option>
              ))}
            </select>
          </div>

          <div className="trip-filter-field">
            <label htmlFor="trip-assignment">Assignment</label>
            <select
              id="trip-assignment"
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value)}
            >
              <option value="all">All Trips</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          <div className="trip-filter-field trip-refresh-wrap">
            <button type="button" className="refresh-btn" onClick={fetchTrips}>Refresh</button>
          </div>
        </div>
      </div>
      
      <div className="table-container">
        <table className="trips-table">
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Booking</th>
              <th>Driver</th>
              <th>Route</th>
              <th>Status</th>
              <th>Started</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrips.map((trip) => (
              <tr key={trip.id}>
                <td className="trip-id">#{trip.id.slice(-6)}</td>
                <td>{trip.bookingRef}</td>
                <td>
                  <div className="driver-info">
                    <div className="driver-name">{trip.driverName}</div>
                  </div>
                </td>
                <td>
                  <div className="route-cell">
                    <div className="route-from">{trip.fromLocation}</div>
                    <div className="route-to">{trip.toLocation}</div>
                  </div>
                </td>
                <td>{getStatusBadge(trip.status)}</td>
                <td>
                  {trip.startedAt
                    ? new Date(trip.startedAt).toLocaleDateString()
                    : '-'}
                </td>
                <td>
                  {trip.updatedAt ? new Date(trip.updatedAt).toLocaleString() : '-'}
                </td>
                <td>
                  <button
                    type="button"
                    className="action-btn view-btn"
                    onClick={() => onViewTrip && onViewTrip(trip.id)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTrips.length === 0 && (
          <div className="no-data">No active trips found</div>
        )}
      </div>
    </div>
  );
};

export default Trips;
