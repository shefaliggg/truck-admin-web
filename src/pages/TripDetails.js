import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './TripDetails.css';

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString();
};

const formatStatus = (value) => {
  if (!value) {
    return 'N/A';
  }

  return value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const TripDetails = ({ tripId, onBack }) => {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTripDetails = useCallback(async () => {
    if (!tripId) {
      setError('Trip not found.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://54.174.219.57:5000/api/trips/${tripId}/track`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trip details');
      }

      const data = await response.json();
      setTrip(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch trip details');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTripDetails();
  }, [fetchTripDetails]);

  const timeline = useMemo(() => trip?.timeline || [], [trip]);

  if (loading) {
    return <div className="trip-details-loading">Loading trip details...</div>;
  }

  if (error) {
    return (
      <div className="trip-details-page">
        <div className="trip-details-toolbar">
          <button className="trip-back-btn" onClick={onBack}>Back to Trips</button>
        </div>
        <div className="trip-details-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="trip-details-page">
      <div className="trip-details-toolbar">
        <button className="trip-back-btn" onClick={onBack}>Back to Trips</button>
      </div>

      <div className="trip-details-grid">
        <section className="trip-details-card trip-details-hero">
          <div>
            <span className="trip-section-kicker">Trip</span>
            <h2>#{trip?.tripId ? trip.tripId.slice(-6) : 'N/A'}</h2>
            <p>{trip?.booking?.pickup || 'N/A'} to {trip?.booking?.drop || 'N/A'}</p>
          </div>
          <div className="trip-status-chip">{formatStatus(trip?.status)}</div>
        </section>

        <section className="trip-details-card">
          <h3>Timeline</h3>
          {timeline.length === 0 ? (
            <p className="trip-empty-text">Timeline is not available for this trip yet.</p>
          ) : (
            <div className="trip-timeline-list">
              {timeline.map((step) => (
                <div key={step.key} className={`trip-timeline-item ${step.status}`}>
                  <span className="trip-timeline-dot" />
                  <div>
                    <strong>{step.label}</strong>
                    <p>{formatStatus(step.status)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="trip-details-card">
          <h3>Driver</h3>
          <div className="trip-info-grid">
            <div>
              <span>Name</span>
              <strong>{trip?.driver?.name || 'N/A'}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{trip?.driver?.phone || 'N/A'}</strong>
            </div>
            <div>
              <span>Vehicle Type</span>
              <strong>{trip?.driver?.vehicleType || 'N/A'}</strong>
            </div>
            <div>
              <span>Plate Number</span>
              <strong>{trip?.driver?.plateNumber || 'N/A'}</strong>
            </div>
          </div>
        </section>

        <section className="trip-details-card">
          <h3>Route</h3>
          <div className="trip-address-stack">
            <div>
              <span>Pickup</span>
              <strong>{trip?.booking?.pickup || 'N/A'}</strong>
              <p>
                {trip?.booking?.pickupLocation?.lat && trip?.booking?.pickupLocation?.lng
                  ? `${trip.booking.pickupLocation.lat}, ${trip.booking.pickupLocation.lng}`
                  : 'Coordinates unavailable'}
              </p>
            </div>
            <div>
              <span>Drop</span>
              <strong>{trip?.booking?.drop || 'N/A'}</strong>
              <p>
                {trip?.booking?.dropLocation?.lat && trip?.booking?.dropLocation?.lng
                  ? `${trip.booking.dropLocation.lat}, ${trip.booking.dropLocation.lng}`
                  : 'Coordinates unavailable'}
              </p>
            </div>
            <div>
              <span>Current Location</span>
              <strong>
                {trip?.currentLocation?.latitude && trip?.currentLocation?.longitude
                  ? `${trip.currentLocation.latitude}, ${trip.currentLocation.longitude}`
                  : 'Tracking inactive'}
              </strong>
              <p>Last Updated: {formatDateTime(trip?.lastUpdatedAt)}</p>
            </div>
          </div>
        </section>

        <section className="trip-details-card">
          <h3>Trip Summary</h3>
          <div className="trip-info-grid">
            <div>
              <span>Pickup Date</span>
              <strong>{formatDate(trip?.booking?.pickupDate)}</strong>
            </div>
            <div>
              <span>Started At</span>
              <strong>{formatDateTime(trip?.startedAt)}</strong>
            </div>
            <div>
              <span>Completed At</span>
              <strong>{formatDateTime(trip?.completedAt)}</strong>
            </div>
            <div>
              <span>ETA</span>
              <strong>{trip?.eta || 'N/A'}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TripDetails;
