import React, { useEffect, useMemo, useState } from 'react';
import api, { API_ORIGIN } from '../services/api';
import './DriverDetails.css';

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

const DriverDetails = ({ driverId, onBack }) => {
  const [driver, setDriver] = useState(null);
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      if (!driverId) {
        setError('Driver not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [pendingRes, approvedRes, rejectedRes, tripsRes, bookingsRes] = await Promise.allSettled([
          api.get('/admin/drivers/pending'),
          api.get('/admin/drivers/approved'),
          api.get('/admin/drivers/rejected'),
          api.get('/trips'),
          api.get('/bookings'),
        ]);

        const allDrivers = [
          ...(pendingRes.status === 'fulfilled' ? (pendingRes.value.data?.drivers || []) : []),
          ...(approvedRes.status === 'fulfilled' ? (approvedRes.value.data?.drivers || []) : []),
          ...(rejectedRes.status === 'fulfilled' ? (rejectedRes.value.data?.drivers || []) : []),
        ];

        const foundDriver = allDrivers.find((d) => d._id === driverId);
        setDriver(foundDriver || null);

        const allTrips = tripsRes.status === 'fulfilled' ? (tripsRes.value.data || []) : [];
        setTrips(
          allTrips.filter((t) => (t.driverId?._id || t.driverId) === driverId)
        );

        const allBookings = bookingsRes.status === 'fulfilled' ? (bookingsRes.value.data || []) : [];
        setBookings(
          allBookings.filter((b) => (b.driverId?._id || b.driverId) === driverId)
        );
      } catch (err) {
        setError('Failed to load driver details');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [driverId]);

  const completionRate = useMemo(() => {
    if (trips.length === 0) return '0%';
    const completed = trips.filter((trip) => ['completed', 'delivered'].includes(trip.status)).length;
    return `${Math.round((completed / trips.length) * 100)}%`;
  }, [trips]);

  if (loading) {
    return <div className="driver-details-loading">Loading driver details...</div>;
  }

  if (error || !driver) {
    return (
      <div className="driver-details-page">
        <div className="driver-details-toolbar">
          <button className="driver-back-btn" onClick={onBack}>Back to Drivers</button>
        </div>
        <div className="driver-details-error">{error || 'Driver not found'}</div>
      </div>
    );
  }

  return (
    <div className="driver-details-page">
      <div className="driver-details-toolbar">
        <button className="driver-back-btn" onClick={onBack}>Back to Drivers</button>
      </div>

      <div className="driver-details-grid">
        <section className="driver-details-card driver-details-hero">
          <div>
            <span className="driver-kicker">Driver</span>
            <h2>{driver.userId?.firstName} {driver.userId?.lastName}</h2>
            <p>{driver.userId?.email || 'N/A'} | {driver.userId?.phone || 'N/A'}</p>
          </div>
          <span className={`driver-status-chip ${driver.approvalStatus || 'incomplete'}`}>
            {formatStatus(driver.approvalStatus)}
          </span>
        </section>

        <section className="driver-details-card">
          <h3>Profile</h3>
          <div className="driver-info-grid">
            <div><span>Vehicle Number</span><strong>{driver.vehicleNumber || 'N/A'}</strong></div>
            <div><span>Vehicle Type</span><strong>{driver.vehicleType || 'N/A'}</strong></div>
            <div><span>Vehicle Capacity</span><strong>{driver.vehicleCapacity || 'N/A'}</strong></div>
            <div><span>License Number</span><strong>{driver.licenseNumber || 'N/A'}</strong></div>
            <div><span>License Expiry</span><strong>{formatDate(driver.licenseExpiry)}</strong></div>
            <div><span>Registered</span><strong>{formatDate(driver.createdAt)}</strong></div>
          </div>
        </section>

        <section className="driver-details-card">
          <h3>Commercial & Bank</h3>
          <div className="driver-info-grid">
            <div><span>Plan Type</span><strong>{driver.planType || 'N/A'}</strong></div>
            <div><span>Plan Percentage</span><strong>{driver.planPercentage != null ? `${driver.planPercentage}%` : 'N/A'}</strong></div>
            <div><span>Bank Verified</span><strong>{driver.bankDetails?.isVerified ? 'Yes' : 'No'}</strong></div>
            <div><span>Bank Name</span><strong>{driver.bankDetails?.bankName || 'N/A'}</strong></div>
            <div><span>Account Holder</span><strong>{driver.bankDetails?.accountHolderName || 'N/A'}</strong></div>
            <div><span>IFSC</span><strong>{driver.bankDetails?.ifscCode || 'N/A'}</strong></div>
          </div>
        </section>

        <section className="driver-details-card driver-documents-card">
          <h3>Documents</h3>
          <div className="driver-doc-grid">
            <div className="driver-doc-item">
              <h4>License Document</h4>
              {driver.licenseImageUrl ? (
                <img src={`${API_ORIGIN}/${driver.licenseImageUrl}`} alt="License" className="driver-doc-image" />
              ) : (
                <div className="driver-doc-empty">No license document uploaded</div>
              )}
            </div>
            <div className="driver-doc-item">
              <h4>RC Document</h4>
              {driver.rcImageUrl ? (
                <img src={`${API_ORIGIN}/${driver.rcImageUrl}`} alt="RC" className="driver-doc-image" />
              ) : (
                <div className="driver-doc-empty">No RC document uploaded</div>
              )}
            </div>
          </div>
        </section>

        <section className="driver-details-card driver-history-card">
          <h3>Driver History</h3>
          <div className="driver-history-stats">
            <div><span>Total Trips</span><strong>{trips.length}</strong></div>
            <div><span>Total Bookings</span><strong>{bookings.length}</strong></div>
            <div><span>Completion Rate</span><strong>{completionRate}</strong></div>
          </div>

          <div className="driver-history-table-wrap">
            <table className="driver-history-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Booking</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="driver-history-empty">No trips found for this driver.</td>
                  </tr>
                ) : (
                  trips.map((trip) => (
                    <tr key={trip._id}>
                      <td>#{trip._id?.slice(-6)}</td>
                      <td>#{trip.bookingId?._id?.slice(-6) || 'N/A'}</td>
                      <td>{trip.bookingId?.pickupLocation?.address || 'N/A'} to {trip.bookingId?.deliveryLocation?.address || 'N/A'}</td>
                      <td>{formatStatus(trip.status)}</td>
                      <td>{formatDate(trip.updatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DriverDetails;
