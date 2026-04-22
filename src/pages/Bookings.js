import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Bookings.css';
import { API_BASE_URL } from '../services/api';

const Bookings = ({ onViewBooking }) => {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTruckType, setSelectedTruckType] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');

  const statusOptions = useMemo(() => {
    const countByStatus = allBookings.reduce((accumulator, booking) => {
      accumulator[booking.status] = (accumulator[booking.status] || 0) + 1;
      return accumulator;
    }, {});

    return [
      { id: 'all', label: 'All', count: allBookings.length },
      { id: 'pending', label: 'Pending', count: countByStatus.pending || 0 },
      { id: 'confirmed', label: 'Confirmed', count: countByStatus.confirmed || 0 },
      { id: 'assigned', label: 'Assigned', count: countByStatus.assigned || 0 },
      { id: 'in_progress', label: 'In Progress', count: countByStatus.in_progress || 0 },
    ];
  }, [allBookings]);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const allBookings = await response.json();
      // Transform backend data to UI format
      const transformedBookings = allBookings.map(booking => ({
        id: booking._id,
        user: booking.userId ? `${booking.userId.firstName} ${booking.userId.lastName}` : 'Unknown User',
        fromLocation: booking.pickupLocation?.address || 'N/A',
        toLocation: booking.deliveryLocation?.address || 'N/A',
        pickupDate: booking.pickupDate ? new Date(booking.pickupDate).toISOString().split('T')[0] : 'N/A',
        truckType: booking.truckType || 'N/A',
        loadWeight: booking.loadDetails?.weight ? `${booking.loadDetails.weight} kg` : 'N/A',
        amount: booking.loadDetails?.weight ? booking.loadDetails.weight * 5 : 0,
        status: booking.status || 'pending',
        assignedDriver: booking.driverId?.userId ? `${booking.driverId.userId.firstName} ${booking.driverId.userId.lastName}` : null,
        driverId: booking.driverId?._id || null
      }));
      setAllBookings(transformedBookings);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const truckTypeOptions = useMemo(
    () => Array.from(new Set(allBookings.map((booking) => booking.truckType).filter(Boolean))),
    [allBookings]
  );

  const filteredBookings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return allBookings.filter((booking) => {
      if (selectedStatus !== 'all' && booking.status !== selectedStatus) {
        return false;
      }

      if (selectedTruckType !== 'all' && booking.truckType !== selectedTruckType) {
        return false;
      }

      if (assignmentFilter === 'assigned' && !booking.assignedDriver) {
        return false;
      }

      if (assignmentFilter === 'unassigned' && booking.assignedDriver) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        booking.id,
        booking.user,
        booking.fromLocation,
        booking.toLocation,
        booking.truckType,
        booking.assignedDriver || 'unassigned',
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [allBookings, assignmentFilter, searchTerm, selectedStatus, selectedTruckType]);

  const openAssignModal = async (booking) => {
    setSelectedBooking(booking);
    setShowAssignModal(true);
    // Fetch approved drivers
    const token = localStorage.getItem('adminToken');
    try {
      const driversRes = await fetch(`${API_BASE_URL}/admin/drivers/approved`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const driversData = await driversRes.json();
      setDrivers(driversData.drivers || []);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
      alert('Failed to load drivers');
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver) {
      alert('Please select a driver');
      return;
    }
    setAssignLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/bookings/${selectedBooking.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          driverId: selectedDriver
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign driver');
      }
      alert('✓ Driver assigned successfully!');
      setShowAssignModal(false);
      setSelectedBooking(null);
      setSelectedDriver('');
      fetchBookings(); // Refresh list
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'status-pending' },
      confirmed: { label: 'Confirmed', className: 'status-confirmed' },
      assigned: { label: 'Assigned', className: 'status-assigned' },
      in_progress: { label: 'In Progress', className: 'status-progress' },
      completed: { label: 'Completed', className: 'status-completed' },
    };
    const config = statusConfig[status] || { label: status, className: 'status-default' };
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  if (loading) {
    return <div className="bookings-loading">Loading bookings...</div>;
  }

  return (
    <div className="bookings-page">
      <div className="bookings-filters-panel">
        <div className="bookings-filters-grid">
          <div className="filter-field filter-field-wide">
            <label htmlFor="booking-search">Search</label>
            <input
              id="booking-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by user, booking ID, pickup, drop, truck type"
            />
          </div>

          <div className="filter-field">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
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

          <div className="filter-field">
            <label htmlFor="truck-type-filter">Truck Type</label>
            <select
              id="truck-type-filter"
              value={selectedTruckType}
              onChange={(event) => setSelectedTruckType(event.target.value)}
            >
              <option value="all">All Truck Types</option>
              {truckTypeOptions.map((truckType) => (
                <option key={truckType} value={truckType}>
                  {truckType}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="assignment-filter">Assignment</label>
            <select
              id="assignment-filter"
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value)}
            >
              <option value="all">All Bookings</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>

      </div>

      {/* Bookings Table */}
      <div className="table-container">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Pickup Date</th>
              <th>Truck Type</th>
              <th>Load Weight</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Assigned Driver</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.user}</td>
                <td>{new Date(booking.pickupDate).toLocaleDateString()}</td>
                <td>{booking.truckType}</td>
                <td>{booking.loadWeight}</td>
                <td className="amount">₹{booking.amount.toLocaleString()}</td>
                <td>{getStatusBadge(booking.status)}</td>
                <td>
                  {booking.assignedDriver ? (
                    <div>{booking.assignedDriver}</div>
                  ) : (
                    <span className="no-driver">Not assigned</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => onViewBooking?.(booking.id)}
                    >
                      View
                    </button>
                    {(booking.status === 'pending' || booking.status === 'confirmed') && !booking.driverId && (
                      <button 
                        className="action-btn assign-btn"
                        onClick={() => openAssignModal(booking)}
                      >
                        Assign Driver
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredBookings.length === 0 && (
          <div className="no-data">No bookings found for this category</div>
        )}
      </div>

      {/* Assign Driver Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Assign Driver</h2>
            <p className="modal-booking-info">
              Booking: {selectedBooking?.fromLocation} → {selectedBooking?.toLocation}
            </p>

            <div className="modal-form">
              <div className="form-group">
                <label>Select Driver *</label>
                <select 
                  value={selectedDriver} 
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  disabled={assignLoading}
                >
                  <option value="">-- Select Driver --</option>
                  {drivers.map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.userId.firstName} {driver.userId.lastName} - {driver.vehicleType || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-cancel" 
                  onClick={() => setShowAssignModal(false)}
                  disabled={assignLoading}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-confirm" 
                  onClick={handleAssignDriver}
                  disabled={assignLoading || !selectedDriver}
                >
                  {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Bookings;
