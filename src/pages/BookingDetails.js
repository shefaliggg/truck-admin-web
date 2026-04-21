import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './BookingDetails.css';

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

const formatCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A';
  }

  return `₹${value.toLocaleString()}`;
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

const BookingDetails = ({ bookingId, onBack }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quoteActionLoading, setQuoteActionLoading] = useState('');

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setError('Booking not found.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://54.174.219.57:5000/api/bookings/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }

      const data = await response.json();
      setBooking(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch booking details');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const selectedQuote = useMemo(() => booking?.selectedQuote || null, [booking]);
  const quotations = useMemo(() => booking?.quotations || [], [booking]);

  const handleSelectQuote = async (quoteId) => {
    try {
      setQuoteActionLoading(quoteId);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://54.174.219.57:5000/api/quotations/${quoteId}/select`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to select quotation');
      }

      await fetchBooking();
    } catch (err) {
      alert(err.message || 'Failed to select quotation');
    } finally {
      setQuoteActionLoading('');
    }
  };

  if (loading) {
    return <div className="booking-details-loading">Loading booking details...</div>;
  }

  if (error) {
    return (
      <div className="booking-details-page">
        <div className="booking-details-toolbar">
          <button className="booking-back-btn" onClick={onBack}>Back to Bookings</button>
        </div>
        <div className="booking-details-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="booking-details-page">
      <div className="booking-details-toolbar">
        <button className="booking-back-btn" onClick={onBack}>Back to Bookings</button>
      </div>

      <div className="booking-details-grid">
        <section className="booking-details-card booking-details-hero">
          <div>
            <span className="booking-section-kicker">Booking</span>
            <h2>{booking?.userId ? `${booking.userId.firstName} ${booking.userId.lastName}` : 'Unknown User'}</h2>
            <p>{booking?.pickupLocation?.address || 'N/A'} to {booking?.deliveryLocation?.address || 'N/A'}</p>
          </div>
          <div className="booking-status-chip">{formatStatus(booking?.status)}</div>
        </section>

        <section className="booking-details-card">
          <h3>Trip Summary</h3>
          <div className="booking-info-grid">
            <div>
              <span>Pickup Date</span>
              <strong>{formatDate(booking?.pickupDate)}</strong>
            </div>
            <div>
              <span>Delivery Date</span>
              <strong>{formatDate(booking?.deliveryDate)}</strong>
            </div>
            <div>
              <span>Truck Type</span>
              <strong>{booking?.truckType || 'N/A'}</strong>
            </div>
            <div>
              <span>Load Weight</span>
              <strong>{booking?.loadDetails?.weight ? `${booking.loadDetails.weight} kg` : 'N/A'}</strong>
            </div>
            <div>
              <span>Load Type</span>
              <strong>{booking?.loadDetails?.type || 'N/A'}</strong>
            </div>
            <div>
              <span>Estimated Amount</span>
              <strong>{formatCurrency(booking?.loadDetails?.weight ? booking.loadDetails.weight * 5 : undefined)}</strong>
            </div>
          </div>
          <div className="booking-description-block">
            <span>Description</span>
            <p>{booking?.loadDetails?.description || 'No load description provided.'}</p>
          </div>
        </section>

        <section className="booking-details-card">
          <h3>People</h3>
          <div className="booking-info-grid">
            <div>
              <span>Customer</span>
              <strong>{booking?.userId ? `${booking.userId.firstName} ${booking.userId.lastName}` : 'N/A'}</strong>
              <p>{booking?.userId?.phone || booking?.userId?.email || 'N/A'}</p>
            </div>
            <div>
              <span>Assigned Driver</span>
              <strong>{booking?.driverId?.userId ? `${booking.driverId.userId.firstName} ${booking.driverId.userId.lastName}` : 'Not assigned'}</strong>
              <p>{booking?.driverId?.userId?.phone || booking?.driverId?.userId?.email || 'N/A'}</p>
            </div>
            <div>
              <span>Shipper</span>
              <strong>{booking?.shipper?.name || 'N/A'}</strong>
              <p>{booking?.shipper?.phone || 'N/A'}</p>
            </div>
            <div>
              <span>Consignee</span>
              <strong>{booking?.consignee?.name || 'N/A'}</strong>
              <p>{booking?.consignee?.phone || 'N/A'}</p>
            </div>
          </div>
        </section>

        <section className="booking-details-card">
          <h3>Locations</h3>
          <div className="booking-address-stack">
            <div>
              <span>Pickup</span>
              <strong>{booking?.pickupLocation?.address || 'N/A'}</strong>
              <p>{booking?.pickupLocation?.lat && booking?.pickupLocation?.lng ? `${booking.pickupLocation.lat}, ${booking.pickupLocation.lng}` : 'Coordinates unavailable'}</p>
            </div>
            <div>
              <span>Delivery</span>
              <strong>{booking?.deliveryLocation?.address || 'N/A'}</strong>
              <p>{booking?.deliveryLocation?.lat && booking?.deliveryLocation?.lng ? `${booking.deliveryLocation.lat}, ${booking.deliveryLocation.lng}` : 'Coordinates unavailable'}</p>
            </div>
            <div>
              <span>Current Location</span>
              <strong>
                {booking?.currentLocation?.latitude && booking?.currentLocation?.longitude
                  ? `${booking.currentLocation.latitude}, ${booking.currentLocation.longitude}`
                  : 'Tracking inactive'}
              </strong>
              <p>{formatDateTime(booking?.currentLocation?.updatedAt)}</p>
            </div>
          </div>
        </section>

        <section className="booking-details-card">
          <h3>Commercials</h3>
          <div className="booking-info-grid">
            <div>
              <span>Selected Quote</span>
              <strong>{selectedQuote ? formatCurrency(selectedQuote.price) : 'Not selected'}</strong>
              <p>
                {selectedQuote?.driverId?.userId
                  ? `${selectedQuote.driverId.userId.firstName} ${selectedQuote.driverId.userId.lastName}`
                  : 'No driver selected'}
              </p>
            </div>
            <div>
              <span>Quote Count</span>
              <strong>{booking?.quotations?.length || 0}</strong>
            </div>
            <div>
              <span>Rate Confirmation</span>
              <strong>{formatStatus(booking?.rateConfirmation?.status)}</strong>
              <p>{booking?.rateConfirmation?.amount ? formatCurrency(booking.rateConfirmation.amount) : 'No amount generated'}</p>
            </div>
            <div>
              <span>Truck</span>
              <strong>{booking?.truckId?.registrationNumber || 'Not assigned'}</strong>
              <p>{booking?.truckId?.truckType || 'N/A'}</p>
            </div>
          </div>
          {selectedQuote?.notes && (
            <div className="booking-description-block">
              <span>Selected Quote Notes</span>
              <p>{selectedQuote.notes}</p>
            </div>
          )}
        </section>

        <section className="booking-details-card booking-quotes-card">
          <div className="booking-quotes-header">
            <div>
              <h3>Quotations</h3>
              <p>Review submitted quotations and select one without leaving this page.</p>
            </div>
            <div className="booking-quotes-count">{quotations.length} total</div>
          </div>

          {quotations.length === 0 ? (
            <div className="booking-quotes-empty">No quotations available for this booking yet.</div>
          ) : (
            <div className="booking-quotes-table-wrap">
              <table className="booking-quotes-table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Contact</th>
                    <th>Price</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quote) => {
                    const driverName = quote?.driverId?.userId
                      ? `${quote.driverId.userId.firstName} ${quote.driverId.userId.lastName}`
                      : 'N/A';
                    const isSelected = Boolean(quote.selected) || selectedQuote?._id === quote._id;

                    return (
                      <tr key={quote._id}>
                        <td>{driverName}</td>
                        <td>{quote?.driverId?.userId?.phone || quote?.driverId?.userId?.email || 'N/A'}</td>
                        <td className="booking-quote-price">{formatCurrency(quote.price)}</td>
                        <td>{quote.notes || 'No notes'}</td>
                        <td>
                          <span className={`booking-quote-status ${isSelected ? 'selected' : 'pending'}`}>
                            {isSelected ? 'Selected' : 'Available'}
                          </span>
                        </td>
                        <td>
                          {isSelected ? (
                            <span className="booking-quote-selected-text">Current Quote</span>
                          ) : (
                            <button
                              type="button"
                              className="booking-quote-select-btn"
                              onClick={() => handleSelectQuote(quote._id)}
                              disabled={quoteActionLoading === quote._id}
                            >
                              {quoteActionLoading === quote._id ? 'Selecting...' : 'Select Quote'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default BookingDetails;
