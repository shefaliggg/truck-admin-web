import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './TripDetails.css';
import { API_BASE_URL } from '../services/api';

const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const loadGoogleMapsScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }
    if (!GOOGLE_MAPS_KEY) {
      reject(new Error('Google Maps API key is not configured'));
      return;
    }
    const existing = document.querySelector('script[data-gm-trip]');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=maps`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-gm-trip', '1');
    script.addEventListener('load', resolve);
    script.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
    document.head.appendChild(script);
  });
};

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
  const [mapError, setMapError] = useState('');
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

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
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/track`, {
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

  // Initialise map once we have trip data and the container is mounted
  useEffect(() => {
    if (!trip || !mapContainerRef.current) {
      return;
    }

    const pickupLat = trip.booking?.pickupLocation?.lat;
    const pickupLng = trip.booking?.pickupLocation?.lng;
    const dropLat = trip.booking?.dropLocation?.lat;
    const dropLng = trip.booking?.dropLocation?.lng;

    const hasPickup = pickupLat != null && pickupLng != null;
    const hasDrop = dropLat != null && dropLng != null;

    if (!hasPickup && !hasDrop) {
      setMapError('Location coordinates are not available for this trip.');
      return;
    }

    loadGoogleMapsScript()
      .then(() => {
        const google = window.google;
        const container = mapContainerRef.current;

        const centerLat = hasPickup ? pickupLat : dropLat;
        const centerLng = hasPickup ? pickupLng : dropLng;

        const mapInstance = new google.maps.Map(container, {
          center: { lat: Number(centerLat), lng: Number(centerLng) },
          zoom: 10,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });
        mapInstanceRef.current = mapInstance;

        // Pickup marker
        if (hasPickup) {
          new google.maps.Marker({
            position: { lat: Number(pickupLat), lng: Number(pickupLng) },
            map: mapInstance,
            title: 'Pickup: ' + (trip.booking?.pickup || ''),
            icon: {
              url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
              scaledSize: new google.maps.Size(40, 40),
            },
            label: { text: 'P', color: '#fff', fontWeight: 'bold', fontSize: '12px' },
          });
        }

        // Drop marker
        if (hasDrop) {
          new google.maps.Marker({
            position: { lat: Number(dropLat), lng: Number(dropLng) },
            map: mapInstance,
            title: 'Drop: ' + (trip.booking?.drop || ''),
            icon: {
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new google.maps.Size(40, 40),
            },
            label: { text: 'D', color: '#fff', fontWeight: 'bold', fontSize: '12px' },
          });
        }

        // Driver current location marker
        const curLat = trip.currentLocation?.latitude;
        const curLng = trip.currentLocation?.longitude;
        if (curLat != null && curLng != null) {
          new google.maps.Marker({
            position: { lat: Number(curLat), lng: Number(curLng) },
            map: mapInstance,
            title: 'Driver current location',
            icon: {
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new google.maps.Size(44, 44),
            },
          });
        }

        // Directions route between pickup and drop
        if (hasPickup && hasDrop) {
          const directionsService = new google.maps.DirectionsService();
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map: mapInstance,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#2FA084',
              strokeWeight: 5,
              strokeOpacity: 0.85,
            },
          });

          directionsService.route(
            {
              origin: { lat: Number(pickupLat), lng: Number(pickupLng) },
              destination: { lat: Number(dropLat), lng: Number(dropLng) },
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(result);
              }
              // silently ignore – straight-line markers already visible
            }
          );
        }
      })
      .catch((err) => {
        setMapError(err.message || 'Unable to load map.');
      });

    return () => {
      mapInstanceRef.current = null;
    };
  }, [trip]);

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

        <section className="trip-details-card trip-card-map">
          <div className="trip-map-header">
            <h3>Route Map</h3>
            <div className="trip-map-legend">
              <span className="trip-legend-item trip-legend-pickup">Pickup</span>
              <span className="trip-legend-item trip-legend-drop">Drop</span>
              <span className="trip-legend-item trip-legend-driver">Driver</span>
            </div>
          </div>
          {mapError ? (
            <div className="trip-map-unavailable">{mapError}</div>
          ) : (
            <div ref={mapContainerRef} className="trip-map-canvas" />
          )}
        </section>

        <section className="trip-details-card trip-card-timeline">
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

        <section className="trip-details-card trip-card-driver">
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

        <section className="trip-details-card trip-card-route">
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

        <section className="trip-details-card trip-card-summary">
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
