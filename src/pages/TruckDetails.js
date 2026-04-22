import React, { useEffect, useState } from 'react';
import api, { API_ORIGIN } from '../services/api';
import './TruckDetails.css';

const TruckDetails = ({ truckId, onBack }) => {
  const [truck, setTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTruck = async () => {
      if (!truckId) {
        setError('Truck not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/admin/trucks/${truckId}`);
        setTruck(response.data?.truck || null);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load truck details');
        setTruck(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTruck();
  }, [truckId]);

  const getStatusLabel = (status) => {
    const map = {
      available: 'Available',
      assigned: 'Assigned',
      maintenance: 'Maintenance',
    };

    return map[status] || status || 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  };

  const imageUrl = truck?.truckImageUrl
    ? `${API_ORIGIN}${truck.truckImageUrl.startsWith('/') ? '' : '/'}${truck.truckImageUrl}`
    : '';

  if (loading) {
    return <div className="truck-details-loading">Loading truck details...</div>;
  }

  if (error || !truck) {
    return (
      <div className="truck-details-page">
        <div className="truck-details-card">
          <div className="truck-details-error">{error || 'Truck not found'}</div>
          <button type="button" className="truck-details-back" onClick={onBack}>Back to Trucks</button>
        </div>
      </div>
    );
  }

  return (
    <div className="truck-details-page">
      <div className="truck-details-top">
        <button type="button" className="truck-details-back" onClick={onBack}>Back to Trucks</button>
      </div>

      <div className="truck-details-grid">
        <section className="truck-details-card">
          <h3>Truck Information</h3>
          <div className="truck-details-list">
            <div><span>Registration Number</span><strong>{truck.registrationNumber || 'N/A'}</strong></div>
            <div><span>Truck Type</span><strong>{truck.truckType || 'N/A'}</strong></div>
            <div><span>Capacity</span><strong>{truck.capacity != null ? `${truck.capacity} kg` : 'N/A'}</strong></div>
            <div><span>Status</span><strong>{getStatusLabel(truck.status)}</strong></div>
            <div><span>Created</span><strong>{formatDate(truck.createdAt)}</strong></div>
            <div><span>Last Updated</span><strong>{formatDate(truck.updatedAt)}</strong></div>
          </div>
        </section>

        <section className="truck-details-card">
          <h3>Assigned Driver</h3>
          <div className="truck-details-list">
            <div>
              <span>Name</span>
              <strong>
                {truck.driverId?.userId
                  ? `${truck.driverId.userId.firstName || ''} ${truck.driverId.userId.lastName || ''}`.trim() || 'N/A'
                  : 'Unassigned'}
              </strong>
            </div>
            <div><span>Email</span><strong>{truck.driverId?.userId?.email || 'N/A'}</strong></div>
            <div><span>Phone</span><strong>{truck.driverId?.userId?.phone || 'N/A'}</strong></div>
          </div>
        </section>

        <section className="truck-details-card">
          <h3>Current Location</h3>
          <div className="truck-details-list">
            <div><span>Address</span><strong>{truck.currentLocation?.address || 'N/A'}</strong></div>
            <div><span>Latitude</span><strong>{truck.currentLocation?.lat != null ? truck.currentLocation.lat : 'N/A'}</strong></div>
            <div><span>Longitude</span><strong>{truck.currentLocation?.lng != null ? truck.currentLocation.lng : 'N/A'}</strong></div>
          </div>
        </section>

        <section className="truck-details-card">
          <h3>Truck Image</h3>
          {imageUrl ? (
            <img src={imageUrl} alt="Truck" className="truck-details-image" />
          ) : (
            <div className="truck-details-no-image">No truck image uploaded</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TruckDetails;
