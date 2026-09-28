import React, { useEffect, useState } from 'react';
import api from '../services/api';
import FormField from '../components/FormField';
import './NewTruck.css';

const REQUIRED_FIELDS = ['registrationNumber', 'truckType', 'capacity', 'locationLat', 'locationLng'];

const validateField = (field, value, currentForm) => {
  switch (field) {
    case 'registrationNumber':
      return value.trim() ? '' : 'Required';
    case 'truckType':
      return value.trim() ? '' : 'Required';
    case 'capacity':
      return value && Number(value) > 0 ? '' : 'Enter a valid capacity';
    case 'locationLat':
      return currentForm.locationLng && !value ? 'Required with longitude' : '';
    case 'locationLng':
      return currentForm.locationLat && !value ? 'Required with latitude' : '';
    default:
      return '';
  }
};

const NewTruck = ({ onSuccess, onCancel }) => {
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
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
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    setErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const updated = { ...prev };
      // Latitude/longitude validity depends on each other, so re-check both.
      const fieldsToRecheck = field === 'locationLat' || field === 'locationLng'
        ? ['locationLat', 'locationLng']
        : [field];
      let changed = false;
      fieldsToRecheck.forEach((f) => {
        if (!(f in updated)) return;
        const msg = validateField(f, nextForm[f], nextForm);
        changed = true;
        if (msg) updated[f] = msg;
        else delete updated[f];
      });
      return changed ? updated : prev;
    });
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
    const newErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      const msg = validateField(field, form[field], form);
      if (msg) newErrors[field] = msg;
    });
    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});
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
      <form className="new-truck-form" onSubmit={handleSubmit} noValidate>
        <section className="new-truck-card">
          <h3>Truck Details</h3>
          <div className="new-truck-grid">
            <FormField
              wrapperClassName="new-truck-field"
              label="Registration Number"
              id="truck-reg-no"
              type="text"
              value={form.registrationNumber}
              onChange={(e) => handleChange('registrationNumber', e.target.value)}
              placeholder="MH-01-AB-1234"
              required
              error={errors.registrationNumber}
            />
            <FormField
              wrapperClassName="new-truck-field"
              label="Truck Type"
              id="truck-type"
              type="text"
              value={form.truckType}
              onChange={(e) => handleChange('truckType', e.target.value)}
              placeholder="20 Ton Truck"
              required
              error={errors.truckType}
            />
            <FormField
              wrapperClassName="new-truck-field"
              label="Capacity (kg)"
              id="truck-capacity"
              type="number"
              value={form.capacity}
              onChange={(e) => handleChange('capacity', e.target.value)}
              min="1"
              required
              error={errors.capacity}
            />
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
            <FormField
              wrapperClassName="new-truck-field"
              label="Latitude"
              id="truck-loc-lat"
              type="number"
              step="any"
              value={form.locationLat}
              onChange={(e) => handleChange('locationLat', e.target.value)}
              error={errors.locationLat}
            />
            <FormField
              wrapperClassName="new-truck-field"
              label="Longitude"
              id="truck-loc-lng"
              type="number"
              step="any"
              value={form.locationLng}
              onChange={(e) => handleChange('locationLng', e.target.value)}
              error={errors.locationLng}
            />
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
