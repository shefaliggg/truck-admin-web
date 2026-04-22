import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './NewTruck.css';

const NewTruck = ({ onSuccess, onCancel }) => {
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [truckImageFile, setTruckImageFile] = useState(null);
  const [truckImagePreview, setTruckImagePreview] = useState('');
  const [form, setForm] = useState({
    registrationNumber: '',
    truckType: '',
    capacity: '',
    status: 'available',
    driverId: '',
    locationAddress: '',
    locationLat: '',
    locationLng: '',
  });

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoadingDrivers(true);
        const response = await api.get('/admin/drivers/approved');
        setDrivers(response.data?.drivers || []);
      } catch (err) {
        setDrivers([]);
      } finally {
        setLoadingDrivers(false);
      }
    };

    fetchDrivers();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTruckImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setTruckImageFile(null);
      setTruckImagePreview('');
      return;
    }

    setTruckImageFile(file);
    setTruckImagePreview(URL.createObjectURL(file));
  };

  const validate = () => {
    if (!form.registrationNumber.trim()) return 'Registration number is required';
    if (!form.truckType.trim()) return 'Truck type is required';
    if (!form.capacity || Number(form.capacity) <= 0) return 'Capacity must be a positive number';
    if ((form.locationLat && !form.locationLng) || (!form.locationLat && form.locationLng)) {
      return 'Provide both latitude and longitude when adding location coordinates';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      let truckImageUrl;
      if (truckImageFile) {
        const formData = new FormData();
        formData.append('uploadType', 'truck');
        formData.append('truckImage', truckImageFile);

        const uploadResponse = await api.post('/upload/truck-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        truckImageUrl = uploadResponse?.data?.fileUrl;
      }

      await api.post('/admin/trucks', {
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        truckType: form.truckType.trim(),
        capacity: Number(form.capacity),
        status: form.status,
        driverId: form.driverId || undefined,
        truckImageUrl,
        currentLocation: {
          address: form.locationAddress || undefined,
          lat: form.locationLat ? Number(form.locationLat) : undefined,
          lng: form.locationLng ? Number(form.locationLng) : undefined,
        },
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create truck');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-truck-page">
      <form className="new-truck-form" onSubmit={handleSubmit}>
        <section className="new-truck-card">
          <h3>Truck Details</h3>
          <div className="new-truck-grid">
            <div className="new-truck-field">
              <label htmlFor="truck-reg-no">Registration Number</label>
              <input
                id="truck-reg-no"
                type="text"
                value={form.registrationNumber}
                onChange={(e) => handleChange('registrationNumber', e.target.value)}
                placeholder="MH-01-AB-1234"
                required
              />
            </div>
            <div className="new-truck-field">
              <label htmlFor="truck-type">Truck Type</label>
              <input
                id="truck-type"
                type="text"
                value={form.truckType}
                onChange={(e) => handleChange('truckType', e.target.value)}
                placeholder="20 Ton Truck"
                required
              />
            </div>
            <div className="new-truck-field">
              <label htmlFor="truck-capacity">Capacity (kg)</label>
              <input
                id="truck-capacity"
                type="number"
                value={form.capacity}
                onChange={(e) => handleChange('capacity', e.target.value)}
                min="1"
                required
              />
            </div>
            <div className="new-truck-field">
              <label htmlFor="truck-status">Status</label>
              <select
                id="truck-status"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="new-truck-field new-truck-field-wide">
              <label htmlFor="truck-driver">Assign Driver (optional)</label>
              <select
                id="truck-driver"
                value={form.driverId}
                onChange={(e) => handleChange('driverId', e.target.value)}
                disabled={loadingDrivers}
              >
                <option value="">Unassigned</option>
                {drivers.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.userId?.firstName} {driver.userId?.lastName} ({driver.userId?.phone || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="new-truck-card">
          <h3>Truck Image (optional)</h3>
          <div className="new-truck-grid">
            <div className="new-truck-field new-truck-field-wide">
              <label htmlFor="truck-image">Upload Truck Photo</label>
              <input
                id="truck-image"
                type="file"
                accept="image/*"
                onChange={handleTruckImageChange}
              />
            </div>
            {truckImagePreview && (
              <div className="new-truck-image-preview-wrap new-truck-field-wide">
                <img src={truckImagePreview} alt="Truck preview" className="new-truck-image-preview" />
              </div>
            )}
          </div>
        </section>

        <section className="new-truck-card">
          <h3>Current Location (optional)</h3>
          <div className="new-truck-grid">
            <div className="new-truck-field new-truck-field-wide">
              <label htmlFor="truck-loc-address">Address</label>
              <input
                id="truck-loc-address"
                type="text"
                value={form.locationAddress}
                onChange={(e) => handleChange('locationAddress', e.target.value)}
                placeholder="Current location address"
              />
            </div>
            <div className="new-truck-field">
              <label htmlFor="truck-loc-lat">Latitude</label>
              <input
                id="truck-loc-lat"
                type="number"
                step="any"
                value={form.locationLat}
                onChange={(e) => handleChange('locationLat', e.target.value)}
              />
            </div>
            <div className="new-truck-field">
              <label htmlFor="truck-loc-lng">Longitude</label>
              <input
                id="truck-loc-lng"
                type="number"
                step="any"
                value={form.locationLng}
                onChange={(e) => handleChange('locationLng', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="new-truck-card">
          {error && <div className="new-truck-error">{error}</div>}
          <div className="new-truck-actions">
            <button type="button" className="new-truck-cancel" onClick={onCancel}>Cancel</button>
            <button type="submit" className="new-truck-submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Truck'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
};

export default NewTruck;
