import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';
import './BookingDetails.css';
import api, { API_ORIGIN } from '../services/api';
import getErrorMessage from '../utils/errorHandler';

const NA = 'N/A';

const formatDate = (value) => {
  if (!value) return NA;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? NA : date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return NA;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? NA : date.toLocaleString();
};

const formatMoney = (value) => (typeof value === 'number' && !Number.isNaN(value) ? `$${value.toLocaleString()}` : NA);

const formatStatus = (value) => {
  if (!value) return NA;
  return value.toString().replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

const STAGE_LABEL = {
  posted: 'Posted',
  awaiting_driver: 'Bidding',
  assigned: 'Assigned',
  at_pickup: 'At Pickup',
  in_transit: 'In Transit',
  at_delivery: 'At Delivery',
  delivered: 'Delivered',
};

const DOC_LABEL = { bol: 'Bill of Lading', rate_confirmation: 'Rate Confirmation', other: 'Other' };

const personName = (user) => (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || NA : NA);

const Field = ({ label, children, sub }) => (
  <div>
    <span>{label}</span>
    <strong>{children ?? NA}</strong>
    {sub && <p>{sub}</p>}
  </div>
);

const Timing = ({ title, location, date, details }) => (
  <div>
    <span>{title}</span>
    <strong>{location?.address || NA}</strong>
    <p>
      {formatDate(date)}
      {details?.time ? ` at ${details.time}` : ''}
      {details?.windowStart || details?.windowEnd ? ` · window ${details.windowStart || '?'}–${details.windowEnd || '?'}` : ''}
      {details?.appointmentRequired ? ' · appointment required' : ''}
    </p>
    {(details?.contactName || details?.contactPhone) && (
      <p>Contact: {[details.contactName, details.contactPhone].filter(Boolean).join(' · ')}</p>
    )}
    {details?.instructions && <p>Instructions: {details.instructions}</p>}
  </div>
);

const BookingDetails = ({ bookingId, onBack }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quoteActionLoading, setQuoteActionLoading] = useState(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setError('Load not found.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/admin/loads/${bookingId}`);
      setBooking(res.data);
    } catch (err) {
      setError(err?.response?.status === 404 ? 'Load not found.' : getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Cheapest first, so the admin sees the best bid at the top.
  const quotes = useMemo(
    () => (booking?.quotations || []).map((quote, index) => ({ ...quote, index }))
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)),
    [booking]
  );
  const lowestPrice = quotes.length ? quotes[0].price : null;

  const handleSelectQuote = async (quote) => {
    const name = personName(quote.driverId?.userId);
    if (!window.confirm(`Select ${name}'s quote of ${formatMoney(quote.price)}? This assigns them to the load.`)) return;
    try {
      setQuoteActionLoading(quote._id);
      // Same endpoint the shipper uses; it takes the quote's position in the quotations array.
      await api.post(`/bookings/${booking._id}/select-quote`, { quoteIndex: quote.index });
      toast.success('Quote selected', { description: `${name} is now assigned to this load.` });
      await fetchBooking();
    } catch (err) {
      toast.error('Could not select quote', { description: err?.response?.data?.message || getErrorMessage(err) });
    } finally {
      setQuoteActionLoading(null);
    }
  };

  if (loading) return <div className="booking-details-loading">Loading load details...</div>;

  if (error) {
    return (
      <div className="booking-details-page">
        <div className="booking-details-toolbar">
          <button className="booking-back-btn" onClick={onBack}>Back to Loads</button>
        </div>
        <div className="booking-details-error">{error}</div>
      </div>
    );
  }

  const shipper = booking.userId;
  const company = shipper?.companyProfile;
  const load = booking.loadDetails || {};
  const equipment = booking.equipmentDetails || {};
  const reqs = booking.requirements || {};
  const rate = booking.rate || {};
  const documents = booking.documents || [];
  const requirementFlags = [
    reqs.hazmat && 'Hazmat',
    reqs.oversized && 'Oversized',
    reqs.teamDriverRequired && 'Team driver',
    reqs.liftgateRequired && 'Liftgate',
    reqs.loadingType && formatStatus(reqs.loadingType),
    reqs.unloadingType && formatStatus(reqs.unloadingType),
  ].filter(Boolean);
  const dims = load.dimensions;

  return (
    <div className="booking-details-page">
      <Toaster position="top-right" richColors />

      <div className="booking-details-toolbar">
        <button className="booking-back-btn" onClick={onBack}>Back to Loads</button>
      </div>

      <div className="booking-details-grid">
        <section className="booking-details-card booking-details-hero">
          <div>
            <span className="booking-section-kicker">Load {booking.loadNumber}</span>
            <h2>{booking.pickupLocation?.address || NA} → {booking.deliveryLocation?.address || NA}</h2>
            <p>
              {company?.companyName || personName(shipper)} · {quotes.length} quote{quotes.length === 1 ? '' : 's'}
              {lowestPrice != null ? ` · lowest ${formatMoney(lowestPrice)}` : ''}
            </p>
          </div>
          <div className="booking-status-chip">{STAGE_LABEL[booking.stage] || formatStatus(booking.status)}</div>
        </section>

        <section className="booking-details-card">
          <h3>Shipper</h3>
          <div className="booking-info-grid">
            <Field label="Company">{company?.companyName}</Field>
            <Field label="Contact" sub={shipper?.email}>{personName(shipper)}</Field>
            <Field label="Phone">{shipper?.phone}</Field>
            <Field label="Billing Address">{company?.billingAddress}</Field>
            <Field label="Shipper on Load" sub={booking.shipper?.phone}>{booking.shipper?.name}</Field>
            <Field label="Consignee" sub={booking.consignee?.phone}>{booking.consignee?.name}</Field>
          </div>
        </section>

        <section className="booking-details-card">
          <h3>Pickup & Delivery</h3>
          <div className="booking-address-stack">
            <Timing title="Pickup" location={booking.pickupLocation} date={booking.pickupDate} details={booking.pickupDetails} />
            <Timing title="Delivery" location={booking.deliveryLocation} date={booking.deliveryDate} details={booking.deliveryDetails} />
          </div>
        </section>

        <section className="booking-details-card">
          <h3>Load Requirements</h3>
          <div className="booking-info-grid">
            <Field label="Equipment">{booking.truckType}</Field>
            <Field label="Trailer Size">{equipment.trailerSize}</Field>
            <Field label="Weight">{load.weight ? `${load.weight.toLocaleString()} lb` : null}</Field>
            <Field label="Commodity">{load.type}</Field>
            <Field label="Pieces">{load.pieces}</Field>
            <Field label="Package Type">{load.packageType ? formatStatus(load.packageType) : null}</Field>
            <Field label="Dimensions">{dims && (dims.length || dims.width || dims.height) ? `${dims.length || '?'} × ${dims.width || '?'} × ${dims.height || '?'}` : null}</Field>
            <Field label="Freight Class">{load.freightClass}</Field>
            <Field label="Temperature">{equipment.temperatureRequirements}</Field>
            <Field label="Special Equipment">{equipment.specialEquipment}</Field>
          </div>
          {requirementFlags.length > 0 && (
            <div className="booking-description-block">
              <span>Requirements</span>
              <p>{requirementFlags.join(' · ')}</p>
            </div>
          )}
          {(load.description || reqs.otherRequirements) && (
            <div className="booking-description-block">
              <span>Notes</span>
              <p>{[load.description, reqs.otherRequirements].filter(Boolean).join(' — ')}</p>
            </div>
          )}
        </section>

        <section className="booking-details-card">
          <h3>Rate & Status</h3>
          <div className="booking-info-grid">
            <Field label="Current Status" sub={booking.tripStatus ? `Trip: ${formatStatus(booking.tripStatus)}` : null}>
              {STAGE_LABEL[booking.stage] || formatStatus(booking.status)}
            </Field>
            <Field label="Assigned Driver" sub={booking.driverId?.userId?.phone || booking.driverId?.userId?.email}>
              {booking.driverId ? personName(booking.driverId.userId) : 'Not assigned'}
            </Field>
            <Field label="Shipper's Offered Rate" sub={rate.type ? formatStatus(rate.type) : null}>
              {formatMoney(rate.offeredRate)}
            </Field>
            <Field label="Rate Confirmation" sub={booking.rateConfirmation?.amount ? formatMoney(booking.rateConfirmation.amount) : null}>
              {formatStatus(booking.rateConfirmation?.status)}
            </Field>
            <Field label="Payment Terms">{rate.paymentTerms}</Field>
            <Field label="Posted">{formatDateTime(booking.createdAt)}</Field>
            <Field label="Reference #">{booking.referenceNumber}</Field>
            <Field label="Truck">{booking.truckId?.registrationNumber}</Field>
          </div>
          {booking.internalNotes && (
            <div className="booking-description-block">
              <span>Internal Notes</span>
              <p>{booking.internalNotes}</p>
            </div>
          )}
        </section>

        <section className="booking-details-card">
          <h3>Documents</h3>
          {documents.length === 0 ? (
            <div className="booking-quotes-empty">No documents uploaded yet.</div>
          ) : (
            <ul className="booking-doc-list">
              {documents.map((doc) => (
                <li key={doc._id || doc.fileUrl}>
                  <div>
                    <strong>{DOC_LABEL[doc.docType] || formatStatus(doc.docType)}</strong>
                    <p>{doc.fileName || doc.fileUrl} · {formatDateTime(doc.uploadedAt)}</p>
                  </div>
                  <a href={`${API_ORIGIN}/${doc.fileUrl}`} target="_blank" rel="noreferrer">Open</a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="booking-details-card booking-quotes-card">
          <div className="booking-quotes-header">
            <div>
              <h3>Quotes</h3>
              <p>
                {booking.canSelectQuote
                  ? 'Bidding is open. Select a quote to assign the carrier if the shipper needs help.'
                  : 'A carrier is already assigned, so quotes can no longer be selected.'}
              </p>
            </div>
            <div className="booking-quotes-count">{quotes.length} total</div>
          </div>

          {quotes.length === 0 ? (
            <div className="booking-quotes-empty">No quotes submitted yet.</div>
          ) : (
            <div className="booking-quotes-table-wrap">
              <table className="booking-quotes-table">
                <thead>
                  <tr>
                    <th>Carrier / Driver</th>
                    <th>Contact</th>
                    <th>Truck</th>
                    <th>Rating</th>
                    <th>Quote</th>
                    <th>Notes</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => {
                    const driver = quote.driverId;
                    const isSelected = Boolean(quote.selected);
                    const isLowest = quote.price === lowestPrice && quotes.length > 1;
                    const truck = driver?.truckId;
                    const overOffer = typeof rate.offeredRate === 'number' && typeof quote.price === 'number' ? quote.price - rate.offeredRate : null;
                    return (
                      <tr key={quote._id || quote.index}>
                        <td>{personName(driver?.userId)}</td>
                        <td>{driver?.userId?.phone || driver?.userId?.email || NA}</td>
                        <td>{truck?.truckType || driver?.vehicleType || NA}</td>
                        <td>{driver?.totalRatings ? `${Number(driver.averageRating).toFixed(1)} (${driver.totalRatings})` : 'No ratings'}</td>
                        <td className="booking-quote-price">
                          {formatMoney(quote.price)}
                          {isLowest && <span className="booking-quote-tag">Lowest</span>}
                          {overOffer != null && overOffer !== 0 && (
                            <div className="booking-quote-diff">{overOffer > 0 ? '+' : '−'}{formatMoney(Math.abs(overOffer))} vs offer</div>
                          )}
                        </td>
                        <td>{quote.notes || 'No notes'}</td>
                        <td>{formatDateTime(quote.createdAt)}</td>
                        <td>
                          <span className={`booking-quote-status ${isSelected ? 'selected' : 'pending'}`}>
                            {isSelected ? 'Selected' : 'Open'}
                          </span>
                        </td>
                        <td>
                          {isSelected ? (
                            <span className="booking-quote-selected-text">Current Quote</span>
                          ) : booking.canSelectQuote ? (
                            <button
                              type="button"
                              className="booking-quote-select-btn"
                              onClick={() => handleSelectQuote(quote)}
                              disabled={quoteActionLoading === quote._id}
                            >
                              {quoteActionLoading === quote._id ? 'Selecting...' : 'Select Quote'}
                            </button>
                          ) : (
                            <span className="booking-quote-selected-text">—</span>
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
