import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Trucks.css';

const Trucks = ({ onViewTruck }) => {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/trucks');
      const mapped = (response.data?.trucks || []).map((truck) => ({
        id: truck._id,
        displayId: `TRK-${truck._id.slice(-4).toUpperCase()}`,
        vehicleNumber: truck.registrationNumber,
        driver: truck.driverId?.userId
          ? `${truck.driverId.userId.firstName} ${truck.driverId.userId.lastName}`
          : 'Unassigned',
        vehicleType: truck.truckType,
        capacity: `${truck.capacity || 0} kg`,
        status: truck.status,
        lastService: truck.updatedAt || truck.createdAt,
      }));
      setTrucks(mapped);
    } catch (err) {
      console.error('Failed to fetch trucks:', err);
      setTrucks([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      available: { label: 'Available', className: 'status-available' },
      assigned: { label: 'Assigned', className: 'status-on-trip' },
      maintenance: { label: 'Maintenance', className: 'status-maintenance' },
      offline: { label: 'Offline', className: 'status-offline' },
    };
    const config = statusConfig[status] || { label: status, className: 'status-default' };
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  if (loading) {
    return <div className="trucks-loading">Loading trucks...</div>;
  }

  return (
    <div className="trucks-page">
      <div className="table-container">
        <table className="trucks-table">
          <thead>
            <tr>
              <th>Truck ID</th>
              <th>Vehicle Number</th>
              <th>Driver</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Last Service</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((truck) => (
              <tr key={truck.id}>
                <td className="truck-id">{truck.displayId}</td>
                <td className="vehicle-number">{truck.vehicleNumber}</td>
                <td>{truck.driver}</td>
                <td>{truck.vehicleType}</td>
                <td className="capacity">{truck.capacity}</td>
                <td>{getStatusBadge(truck.status)}</td>
                <td>{new Date(truck.lastService).toLocaleDateString()}</td>
                <td>
                  <button
                    className="action-btn view-btn"
                    onClick={() => onViewTruck && onViewTruck(truck.id)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {trucks.length === 0 && (
          <div className="no-data">No trucks found</div>
        )}
      </div>
    </div>
  );
};

export default Trucks;
