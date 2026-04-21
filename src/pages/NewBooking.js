import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import './NewBooking.css';

const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const loadGoogleMapsScript = () => {
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (!GOOGLE_MAPS_KEY) {
    return Promise.reject(new Error('Google Maps key is missing')); 
  }

  const existingScript = document.getElementById('google-maps-script');
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

const NewBooking = ({ onSuccess, onCancel }) => {
  const [shippers, setShippers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mapsEnabled, setMapsEnabled] = useState(false);
  const [error, setError] = useState('');

  const pickupRef = useRef(null);
  const deliveryRef = useRef(null);

  const [form, setForm] = useState({
    userId: '',
    driverId: '',
    truckId: '',
    truckType: '',
    pickupDate: '',
    deliveryDate: '',
    weight: '',
    loadType: '',
    description: '',
    consigneeName: '',
    consigneePhone: '',
    pickupAddress: '',
    pickupLat: '',
    pickupLng: '',
    deliveryAddress: '',
    deliveryLat: '',
    deliveryLng: '',
  });

  const selectedShipper = useMemo(
    () => shippers.find((shipper) => shipper.id === form.userId),
    [form.userId, shippers]
  );

  useEffect(() => {
    const fetchSources = async () => {
      try {
        setLoadingSources(true);
        const [shippersRes, driversRes, trucksRes] = await Promise.allSettled([
          api.get('/admin/users?role=user'),
          api.get('/admin/drivers/approved'),
          api.get('/admin/trucks'),
        ]);

        const loadedErrors = [];

        if (shippersRes.status === 'fulfilled') {
          const normalizedShippers = (shippersRes.value.data?.users || []).map((shipper) => ({
            ...shipper,
            id: shipper.id || shipper._id,
          }));
          setShippers(normalizedShippers);
        } else {
          setShippers([]);
          loadedErrors.push('shippers');
        }

        if (driversRes.status === 'fulfilled') {
          setDrivers(driversRes.value.data?.drivers || []);
        } else {
          setDrivers([]);
          loadedErrors.push('drivers');
        }

        if (trucksRes.status === 'fulfilled') {
          setTrucks(trucksRes.value.data?.trucks || []);
        } else {
          setTrucks([]);
          loadedErrors.push('trucks');
        }

        if (loadedErrors.length > 0) {
          setError(`Some data could not be loaded: ${loadedErrors.join(', ')}.`);
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load booking source data');
      } finally {
        setLoadingSources(false);
      }
    };

    fetchSources();
  }, []);

  useEffect(() => {
    let pickupAutocomplete;
    let deliveryAutocomplete;

    const enableAutocomplete = async () => {
      try {
        await loadGoogleMapsScript();

        if (!pickupRef.current || !deliveryRef.current || !window.google?.maps?.places) {
          return;
        }

        pickupAutocomplete = new window.google.maps.places.Autocomplete(pickupRef.current, {
          fields: ['formatted_address', 'geometry'],
          types: ['geocode'],
        });

        deliveryAutocomplete = new window.google.maps.places.Autocomplete(deliveryRef.current, {
          fields: ['formatted_address', 'geometry'],
          types: ['geocode'],
        });

        pickupAutocomplete.addListener('place_changed', () => {
          const place = pickupAutocomplete.getPlace();
          if (!place?.geometry?.location) {
            return;
          }

          setForm((prev) => ({
            ...prev,
            pickupAddress: place.formatted_address || prev.pickupAddress,
            pickupLat: place.geometry.location.lat().toString(),
            pickupLng: place.geometry.location.lng().toString(),
          }));
        });

        deliveryAutocomplete.addListener('place_changed', () => {
          const place = deliveryAutocomplete.getPlace();
          if (!place?.geometry?.location) {
            return;
          }

          setForm((prev) => ({
            ...prev,
            deliveryAddress: place.formatted_address || prev.deliveryAddress,
            deliveryLat: place.geometry.location.lat().toString(),
            deliveryLng: place.geometry.location.lng().toString(),
          }));
        });

        setMapsEnabled(true);
      } catch (err) {
        setMapsEnabled(false);
      }
    };

    enableAutocomplete();

    return () => {
      if (pickupAutocomplete) {
        window.google.maps.event.clearInstanceListeners(pickupAutocomplete);
      }
      if (deliveryAutocomplete) {
        window.google.maps.event.clearInstanceListeners(deliveryAutocomplete);
      }
    };
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTruckChange = (truckId) => {
    const selectedTruck = trucks.find((truck) => truck._id === truckId);
    setForm((prev) => ({
      ...prev,
      truckId,
      truckType: selectedTruck?.truckType || prev.truckType,
    }));
  };

  const validate = () => {
    if (!form.userId) return 'Please select a shipper';
    if (!form.truckType) return 'Please provide truck type';
    if (!form.pickupDate) return 'Please select pickup date';
    if (!form.weight || Number(form.weight) <= 0) return 'Please enter valid load weight';
    if (!form.pickupAddress || !form.deliveryAddress) return 'Please provide pickup and delivery addresses';
    if (!form.pickupLat || !form.pickupLng || !form.deliveryLat || !form.deliveryLng) {
      return 'Please provide latitude and longitude for both locations';
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

    setSubmitting(true);
    setError('');

    const payload = {
      userId: form.userId,
      driverId: form.driverId || undefined,
      truckId: form.truckId || undefined,
      shipper: {
        name: selectedShipper ? `${selectedShipper.firstName} ${selectedShipper.lastName}` : 'TBD',
        phone: selectedShipper?.phone || 'TBD',
      },
      consignee: {
        name: form.consigneeName || 'TBD',
        phone: form.consigneePhone || 'TBD',
      },
      pickupLocation: {
        address: form.pickupAddress,
        lat: Number(form.pickupLat),
        lng: Number(form.pickupLng),
      },
      deliveryLocation: {
        address: form.deliveryAddress,
        lat: Number(form.deliveryLat),
        lng: Number(form.deliveryLng),
      },
      pickupDate: form.pickupDate,
      deliveryDate: form.deliveryDate || undefined,
      truckType: form.truckType,
      loadDetails: {
        weight: Number(form.weight),
        type: form.loadType || 'General',
        description: form.description || '',
      },
    };

    try {
      await api.post('/bookings', payload);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSources) {
    return <div className="new-booking-loading">Loading booking form...</div>;
  }

  return (
    <div className="new-booking-page">
      <form className="new-booking-form" onSubmit={handleSubmit}>
        <section className="new-booking-card">
          <h3>Booking Setup</h3>
          <div className="new-booking-grid">
            <div className="new-booking-field">
              <label htmlFor="shipper-select">Shipper</label>
              <select
                id="shipper-select"
                value={form.userId}
                onChange={(event) => handleChange('userId', event.target.value)}
                required
              >
                <option value="">Select shipper</option>
                {shippers.map((shipper) => (
                  <option key={shipper.id} value={shipper.id}>
                    {shipper.firstName} {shipper.lastName} ({shipper.companyName || 'No company'})
                  </option>
                ))}
              </select>
            </div>

            <div className="new-booking-field">
              <label htmlFor="driver-select">Driver (optional)</label>
              <select
                id="driver-select"
                value={form.driverId}
                onChange={(event) => handleChange('driverId', event.target.value)}
              >
                <option value="">Select driver</option>
                {drivers.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.userId?.firstName} {driver.userId?.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="new-booking-field">
              <label htmlFor="truck-select">Truck (optional)</label>
              <select
                id="truck-select"
                value={form.truckId}
                onChange={(event) => handleTruckChange(event.target.value)}
              >
                <option value="">Select truck</option>
                {trucks.map((truck) => (
                  <option key={truck._id} value={truck._id}>
                    {truck.registrationNumber} - {truck.truckType}
                  </option>
                ))}
              </select>
            </div>

            <div className="new-booking-field">
              <label htmlFor="truck-type">Truck Type</label>
              <input
                id="truck-type"
                type="text"
                value={form.truckType}
                onChange={(event) => handleChange('truckType', event.target.value)}
                placeholder="e.g. 20 Ton Truck"
                required
              />
            </div>

            <div className="new-booking-field">
              <label htmlFor="pickup-date">Pickup Date</label>
              <input
                id="pickup-date"
                type="date"
                value={form.pickupDate}
                onChange={(event) => handleChange('pickupDate', event.target.value)}
                required
              />
            </div>

            <div className="new-booking-field">
              <label htmlFor="delivery-date">Delivery Date</label>
              <input
                id="delivery-date"
                type="date"
                value={form.deliveryDate}
                onChange={(event) => handleChange('deliveryDate', event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="new-booking-card">
          <h3>Google Maps Locations</h3>
          {!mapsEnabled && (
            <p className="maps-note">
              Google Maps autocomplete is unavailable. Add REACT_APP_GOOGLE_MAPS_API_KEY to enable search suggestions.
            </p>
          )}
          <div className="new-booking-grid">
            <div className="new-booking-field new-booking-field-wide">
              <label htmlFor="pickup-address">From (Pickup Address)</label>
              <input
                id="pickup-address"
                ref={pickupRef}
                type="text"
                value={form.pickupAddress}
                onChange={(event) => handleChange('pickupAddress', event.target.value)}
                placeholder="Search pickup with Google Maps"
                required
              />
            </div>
            <div className="new-booking-field">
              <label htmlFor="pickup-lat">From Latitude</label>
              <input
                id="pickup-lat"
                type="number"
                step="any"
                value={form.pickupLat}
                onChange={(event) => handleChange('pickupLat', event.target.value)}
                required
              />
            </div>
            <div className="new-booking-field">
              <label htmlFor="pickup-lng">From Longitude</label>
              <input
                id="pickup-lng"
                type="number"
                step="any"
                value={form.pickupLng}
                onChange={(event) => handleChange('pickupLng', event.target.value)}
                required
              />
            </div>

            <div className="new-booking-field new-booking-field-wide">
              <label htmlFor="delivery-address">To (Delivery Address)</label>
              <input
                id="delivery-address"
                ref={deliveryRef}
                type="text"
                value={form.deliveryAddress}
                onChange={(event) => handleChange('deliveryAddress', event.target.value)}
                placeholder="Search delivery with Google Maps"
                required
              />
            </div>
            <div className="new-booking-field">
              <label htmlFor="delivery-lat">To Latitude</label>
              <input
                id="delivery-lat"
                type="number"
                step="any"
                value={form.deliveryLat}
                onChange={(event) => handleChange('deliveryLat', event.target.value)}
                required
              />
            </div>
            <div className="new-booking-field">
              <label htmlFor="delivery-lng">To Longitude</label>
              <input
                id="delivery-lng"
                type="number"
                step="any"
                value={form.deliveryLng}
                onChange={(event) => handleChange('deliveryLng', event.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section className="new-booking-card">
          <h3>Cargo & Consignee</h3>
          <div className="new-booking-grid">
            <div className="new-booking-field">
              <label htmlFor="weight">Load Weight (kg)</label>
              <input
                id="weight"
                type="number"
                min="1"
                value={form.weight}
                onChange={(event) => handleChange('weight', event.target.value)}
                required
              />
            </div>

            <div className="new-booking-field">
              <label htmlFor="load-type">Load Type</label>
              <input
                id="load-type"
                type="text"
                value={form.loadType}
                onChange={(event) => handleChange('loadType', event.target.value)}
                placeholder="General, Fragile, FMCG, etc."
              />
            </div>

            <div className="new-booking-field">
              <label htmlFor="consignee-name">Consignee Name</label>
              <input
                id="consignee-name"
                type="text"
                value={form.consigneeName}
                onChange={(event) => handleChange('consigneeName', event.target.value)}
              />
            </div>

            <div className="new-booking-field">
              <label htmlFor="consignee-phone">Consignee Phone</label>
              <input
                id="consignee-phone"
                type="text"
                value={form.consigneePhone}
                onChange={(event) => handleChange('consigneePhone', event.target.value)}
              />
            </div>

            <div className="new-booking-field new-booking-field-full">
              <label htmlFor="description">Load Description</label>
              <textarea
                id="description"
                rows="3"
                value={form.description}
                onChange={(event) => handleChange('description', event.target.value)}
              />
            </div>
          </div>
        </section>

        {error && <div className="new-booking-error">{error}</div>}

        <div className="new-booking-actions">
          <button type="button" className="new-booking-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="new-booking-submit" disabled={submitting}>
            {submitting ? 'Creating Booking...' : 'Create Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewBooking;
