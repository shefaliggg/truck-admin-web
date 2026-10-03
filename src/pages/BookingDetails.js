import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';
import './BookingDetails.css';
import api, { API_ORIGIN } from '../services/api';
import { getBookingMessages } from '../services/chat';
import { socket } from '../services/socket';
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
  return Number.isNaN(date.getTime()) ? NA : date.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

const formatRelativeTime = (value) => {
  if (!value) return NA;
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (!Number.isFinite(elapsedMinutes)) return NA;
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes} min${elapsedMinutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
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

const TRIP_STATUS_LABEL = {
  assigned: 'Driver Assigned',
  accepted: 'Driver Accepted',
  going_to_pickup: 'En Route to Pickup',
  arrived_at_pickup: 'At Pickup',
  loading: 'Loading',
  loaded: 'Picked Up',
  in_transit: 'In Transit',
  arrived_at_drop: 'At Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  pod_uploaded: 'POD Submitted',
  pod_approved: 'Documents Verified',
  pod_rejected: 'POD Rejected',
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

const EventTimeline = ({ events }) => (
  events.length ? (
    <ol className="booking-status-timeline">
      {events.map((event) => (
        <li key={event.id} className={event.category === 'exception' ? 'exception' : ''}>
          <span className="booking-status-timeline-dot" />
          <article className="booking-status-event">
            <div className="booking-status-event-heading">
              <strong>{event.title || formatStatus(event.status)}</strong>
              {event.category === 'exception' && <span className="booking-event-exception">Exception</span>}
            </div>
            <time dateTime={new Date(event.changedAt).toISOString()}>{formatDateTime(event.changedAt)}</time>
            {event.details && <p>{event.details}</p>}
            {(event.location || event.destination) && (
              <p className="booking-event-location">
                {event.location && `Location: ${event.location}`}
                {event.destination && ` · Delivery: ${event.destination}`}
              </p>
            )}
            {event.reason && <p>Reason: {event.reason}</p>}
            <div className="booking-event-meta">
              <span>Performed by: {event.performedBy?.role || 'System'}{event.performedBy?.name ? ` · ${event.performedBy.name}` : ''}</span>
              <span>{event.automatic ? 'Automatic' : 'Manual action'}</span>
            </div>
            {event.relatedDocument?.fileUrl && (
              <a href={`${API_ORIGIN}/${event.relatedDocument.fileUrl}`} target="_blank" rel="noreferrer">
                Open {event.relatedDocument.fileName || 'related document'}
              </a>
            )}
          </article>
        </li>
      ))}
    </ol>
  ) : <div className="booking-quotes-empty">No load activity recorded yet.</div>
);

const BookingDetails = ({ bookingId, onBack }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quoteActionLoading, setQuoteActionLoading] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [rateConfirmationApprovalLoading, setRateConfirmationApprovalLoading] = useState(false);
  const [documentUploadLoading, setDocumentUploadLoading] = useState(false);
  const [documentType, setDocumentType] = useState('other');
  const [activeTab, setActiveTab] = useState('Load Details');
  const [chatTripIds, setChatTripIds] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatTripFound, setChatTripFound] = useState(null);

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

  useEffect(() => {
    if (activeTab !== 'Messages' || !booking?._id) return undefined;
    let cancelled = false;

    const loadMessages = async () => {
      setChatLoading(true);
      setChatError('');
      setChatTripFound(null);
      setChatTripIds([]);
      setChatMessages([]);
      try {
        const result = await getBookingMessages(booking._id);
        if (!cancelled) {
          setChatTripIds(result.tripIds || []);
          setChatTripFound((result.tripIds || []).length > 0);
          setChatMessages(result.messages || []);
        }
      } catch (err) {
        if (!cancelled) {
          setChatError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    };

    loadMessages();
    return () => { cancelled = true; };
  }, [activeTab, booking?._id]);

  useEffect(() => {
    if (activeTab !== 'Messages' || chatTripIds.length === 0) return undefined;
    chatTripIds.forEach((tripId) => socket.emit('join-trip', tripId));
    const onMessage = (message) => {
      if (!chatTripIds.includes(String(message.tripId))) return;
      setChatMessages((current) => (current.some((item) => item._id === message._id)
        ? current
        : [...current, message]));
    };
    socket.on('chat-message', onMessage);
    return () => socket.off('chat-message', onMessage);
  }, [activeTab, chatTripIds]);

  // Cheapest first, so the admin sees the best bid at the top.
  const quotes = useMemo(
    () => (booking?.quotations || []).map((quote, index) => ({ ...quote, index }))
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)),
    [booking]
  );
  const lowestPrice = quotes.length ? quotes[0].price : null;

  const handleApproveLoad = async () => {
    try {
      setApprovalLoading(true);
      await api.put(`/bookings/${booking._id}/approve`);
      toast.success('Load approved', { description: 'The load is now open for driver bids.' });
      await fetchBooking();
    } catch (err) {
      toast.error('Could not approve load', { description: err?.response?.data?.message || getErrorMessage(err) });
    } finally {
      setApprovalLoading(false);
    }
  };

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

  const handleApproveRateConfirmation = async () => {
    try {
      setRateConfirmationApprovalLoading(true);
      const response = await api.post(`/bookings/${booking._id}/rate-confirmation/approve`);
      toast.success('Rate Confirmation issued', { description: 'The assigned carrier can now acknowledge the agreed rate.' });
      await fetchBooking();
      if (response.data.pdfUrl) window.open(`${API_ORIGIN}${response.data.pdfUrl}`, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error('Could not issue Rate Confirmation', { description: err?.response?.data?.message || getErrorMessage(err) });
    } finally {
      setRateConfirmationApprovalLoading(false);
    }
  };

  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Document is too large', { description: 'Choose a file smaller than 5 MB.' });
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('bookingDocument', file);
    formData.append('docType', documentType);
    try {
      setDocumentUploadLoading(true);
      await api.post(`/bookings/${booking._id}/documents`, formData);
      toast.success('Document added to load');
      await fetchBooking();
    } catch (err) {
      toast.error('Could not upload document', { description: err?.response?.data?.message || getErrorMessage(err) });
    } finally {
      setDocumentUploadLoading(false);
      event.target.value = '';
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
  const reqs = booking.requirements || {};
  const rate = booking.rate || {};
  const documents = booking.documents || [];
  const loadDocuments = booking.loadDocuments || documents;
  const timeline = booking.statusTimeline || [];
  const financials = booking.financials || { invoices: [], settlements: [] };
  const loadNumber = booking.loadNumber || booking.referenceNumber || `#${String(booking._id).slice(-6)}`;
  const displayLoadNumber = loadNumber.startsWith('#') || loadNumber.startsWith('CP-') || loadNumber.startsWith('VCG-')
    ? loadNumber
    : `#${loadNumber}`;
  const currentStatus = booking.isDraft
    ? 'Draft'
    : ['REJECTED', 'rejected'].includes(booking.status)
      ? 'Load Rejected'
      : booking.stage === 'posted' && booking.status === 'PENDING_APPROVAL'
        ? 'Pending Admin Review'
        : booking.stage === 'posted' && ['OPEN_FOR_QUOTES', 'open_for_quotes'].includes(booking.status)
          ? 'Open for Bids'
          : TRIP_STATUS_LABEL[booking.tripStatus]
            || (booking.stage === 'assigned' && ['carrier_acknowledged', 'driver_accepted'].includes(booking.rateConfirmation?.status) ? 'Rate Confirmed' : null)
            || STAGE_LABEL[booking.stage]
            || formatStatus(booking.status);
  const latestUpdate = timeline[timeline.length - 1]?.changedAt || booking.updatedAt || booking.createdAt;
  const tabs = ['Load Details', 'Timeline', 'Documents', 'Quotes', 'Messages', 'Financials'];
  const dimensions = load.dimensions;
  const requirementFlags = [
    reqs.hazmat && 'Hazmat',
    reqs.oversized && 'Oversized',
    reqs.teamDriverRequired && 'Team driver',
    reqs.liftgateRequired && 'Liftgate',
    reqs.loadingType && formatStatus(reqs.loadingType),
    reqs.unloadingType && formatStatus(reqs.unloadingType),
  ].filter(Boolean);

  return (
    <div className="booking-details-page">
      <Toaster position="top-right" richColors />

      <div className="booking-details-toolbar">
        <button className="booking-back-btn" onClick={onBack}>Back to Loads</button>
      </div>

      <section className={`booking-current-status ${booking.status === 'REJECTED' || booking.status === 'rejected' ? 'exception' : ''}`}>
        <div className="booking-current-status-main">
          <div className="booking-load-number-heading">
            <strong>{displayLoadNumber}</strong>
          </div>
          <p>
            {booking.currentLocation?.address ? `${booking.currentLocation.address} · ` : ''}{booking.pickupLocation?.address || NA} <span aria-hidden="true">→</span> {booking.deliveryLocation?.address || NA}
            <span className="booking-current-status-meta">
              <span>Driver: {booking.driverId ? personName(booking.driverId.userId) : 'Not assigned'}</span>
              <span>Equipment: {booking.truckType || NA}</span>
              <span>Shipper: {company?.companyName || personName(shipper)}</span>
            </span>
          </p>
        </div>
        <div className="booking-current-status-side">
          <div className="booking-current-status-actions">
            <div className="booking-current-status-title">
              <span className="booking-current-status-dot" />
              <strong>{currentStatus}</strong>
            </div>
            {['PENDING_APPROVAL', 'pending_approval'].includes(booking.status) && !booking.isDraft && (
              <button type="button" className="booking-approve-btn" onClick={handleApproveLoad} disabled={approvalLoading}>
                {approvalLoading ? 'Approving...' : 'Approve Load'}
              </button>
            )}
          </div>
          <div className="booking-current-status-update">
            <strong>Updated {formatRelativeTime(latestUpdate)}</strong>
            <span title={formatDateTime(latestUpdate)}>Delivery {formatDate(booking.deliveryDate)}{booking.deliveryDetails?.time ? ` · ${booking.deliveryDetails.time}` : ''}</span>
          </div>
        </div>
      </section>

      <nav className="booking-detail-tabs" role="tablist" aria-label="Load details sections">
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            id={`load-tab-${tab.toLowerCase()}`}
            aria-selected={activeTab === tab}
            aria-controls="load-detail-panel"
            className={activeTab === tab ? 'active' : ''}
            key={tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Quotes' && <span>{quotes.length}</span>}
            {tab === 'Documents' && <span>{loadDocuments.length}</span>}
          </button>
        ))}
      </nav>

      <main className="booking-detail-panel" role="tabpanel" id="load-detail-panel" aria-labelledby={`load-tab-${activeTab.toLowerCase()}`}>
        {activeTab === 'Timeline' && (
          <section className="booking-timeline-section">
            <div className="booking-panel-heading">
              <div>
                <h3>Load Timeline</h3>
                <p>{timeline.length} recorded event{timeline.length === 1 ? '' : 's'} · oldest first</p>
              </div>
              <span className="booking-load-reference">{displayLoadNumber}</span>
            </div>
            <EventTimeline events={timeline} />
          </section>
        )}

        {activeTab === 'Load Details' && (
          <section className="booking-detail-section">
            <div className="booking-panel-heading">
              <div><h3>Load Details</h3><p>Shipment, contacts, requirements, and notes</p></div>
              <span className="booking-load-reference">{displayLoadNumber}</span>
            </div>
            <div className="booking-info-grid">
              <Field label="Shipper">{company?.companyName || personName(shipper)}</Field>
              <Field label="Reference #">{booking.referenceNumber}</Field>
              <Field label="Pickup" sub={`${formatDate(booking.pickupDate)}${booking.pickupDetails?.time ? ` · ${booking.pickupDetails.time}` : ''}`}>
                {booking.pickupLocation?.address}
              </Field>
              <Field label="Delivery" sub={`${formatDate(booking.deliveryDate)}${booking.deliveryDetails?.time ? ` · ${booking.deliveryDetails.time}` : ''}`}>
                {booking.deliveryLocation?.address}
              </Field>
              <Field label="Shipper Contact" sub={booking.shipper?.phone}>{booking.shipper?.name || personName(shipper)}</Field>
              <Field label="Consignee" sub={booking.consignee?.phone}>{booking.consignee?.name}</Field>
              <Field label="Equipment">{booking.truckType}</Field>
              <Field label="Trailer Size">{booking.equipmentDetails?.trailerSize}</Field>
              <Field label="Commodity">{load.type}</Field>
              <Field label="Weight">{load.weight ? `${load.weight.toLocaleString()} lb` : null}</Field>
              <Field label="Pieces">{load.pieces}</Field>
              <Field label="Freight Class">{load.freightClass}</Field>
              <Field label="Dimensions">
                {dimensions && (dimensions.length || dimensions.width || dimensions.height)
                  ? `${dimensions.length || '?'} × ${dimensions.width || '?'} × ${dimensions.height || '?'}`
                  : null}
              </Field>
            </div>
            {requirementFlags.length > 0 && (
              <div className="booking-description-block">
                <span>Requirements</span>
                <p>{requirementFlags.join(' · ')}</p>
              </div>
            )}
            <div className="booking-load-notes">
              <h4>Load Notes</h4>
              {[load.description, reqs.otherRequirements, booking.internalNotes].filter(Boolean).length ? (
                [load.description, reqs.otherRequirements, booking.internalNotes].filter(Boolean).map((note, index) => <p key={index}>{note}</p>)
              ) : (
                <p>No load notes provided.</p>
              )}
            </div>
          </section>
        )}

        {activeTab === 'Documents' && (
          <section className="booking-detail-section">
            <div className="booking-panel-heading">
              <div><h3>Documents</h3><p>Load paperwork and proof of delivery</p></div>
              <div className="booking-doc-upload">
                <select aria-label="Document type" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                  <option value="bol">Bill of Lading</option>
                  <option value="other">Other</option>
                </select>
                <label className={documentUploadLoading ? 'disabled' : ''}>
                  {documentUploadLoading ? 'Uploading...' : 'Upload document'}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleDocumentUpload}
                    disabled={documentUploadLoading}
                  />
                </label>
                <span className="booking-load-reference">{loadDocuments.length} files</span>
              </div>
            </div>
            {loadDocuments.length === 0 ? (
              <div className="booking-quotes-empty">No documents uploaded yet.</div>
            ) : (
              <ul className="booking-doc-list">
                {loadDocuments.map((doc, index) => (
                  <li key={doc._id || doc.fileUrl || index}>
                    <div>
                      <strong>{DOC_LABEL[doc.docType] || formatStatus(doc.docType)}</strong>
                      <p>{doc.fileName || doc.fileUrl} · {formatDateTime(doc.uploadedAt)}{doc.relatedTo === 'trip' ? ' · Trip' : ''}</p>
                    </div>
                    <a href={new URL(doc.fileUrl, `${API_ORIGIN}/`).href} target="_blank" rel="noreferrer">Open</a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === 'Quotes' && (
          <section className="booking-detail-section booking-quotes-card">
          <div className="booking-quotes-header">
            <div>
              <h3>Quotes</h3>
              <p>
                {['PENDING_APPROVAL', 'pending_approval'].includes(booking.status)
                  ? 'Bidding is paused until an admin approves this load.'
                  : booking.canSelectQuote
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
        )}

        {activeTab === 'Messages' && (
          <section className="booking-detail-section">
            <div className="booking-panel-heading"><div><h3>Messages</h3><p>Load-related communication</p></div></div>
            <p className="booking-chat-review-note">Read-only conversation. Messages may be reviewed by authorized admins to resolve disputes or provide support.</p>
            <div className="booking-chat-thread" aria-live="polite">
              {chatLoading ? (
                <div className="booking-quotes-empty">Loading conversation...</div>
              ) : chatError ? (
                <div className="booking-quotes-empty">{chatError}</div>
              ) : chatTripFound === false ? (
                <div className="booking-quotes-empty">Chat becomes available after a driver is assigned to this load.</div>
              ) : chatMessages.length === 0 ? (
                <div className="booking-quotes-empty">No messages have been sent for this load yet.</div>
              ) : (
                <div className="booking-chat-message-list">
                  {chatMessages.map((message) => (
                    <article className={`booking-chat-message ${message.senderRole || 'user'}`} key={message._id}>
                      <div className="booking-chat-message-meta">
                        <strong>{message.senderName || formatStatus(message.senderRole)}</strong>
                        <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
                      </div>
                      <p>{message.text}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'Financials' && (
          <section className="booking-detail-section">
            <div className="booking-panel-heading"><div><h3>Financials</h3><p>Rate, invoice, settlement, and payout records</p></div></div>
            <div className="booking-financial-summary">
              <Field label="Accepted Rate">{formatMoney(booking.rateConfirmation?.amount || booking.selectedQuote?.price)}</Field>
              <Field label="Shipper Offer">{formatMoney(rate.offeredRate)}</Field>
              <Field label="Payment Terms">{rate.paymentTerms}</Field>
              <Field label="Rate Confirmation">{formatStatus(booking.rateConfirmation?.status)}</Field>
            </div>
            {booking.rateConfirmation?.status === 'awaiting_admin_approval' && (
              <div className="booking-load-notes">
                <h4>Rate Confirmation Review</h4>
                <p>Review the load details and agreed carrier rate above, then issue the confirmation for carrier acknowledgment.</p>
                <button
                  type="button"
                  className="booking-quote-select-btn"
                  onClick={handleApproveRateConfirmation}
                  disabled={rateConfirmationApprovalLoading}
                >
                  {rateConfirmationApprovalLoading ? 'Issuing...' : 'Approve & Issue Rate Confirmation'}
                </button>
              </div>
            )}
            {booking.rateConfirmation?.pdfUrl && (
              <div className="booking-load-notes">
                <h4>Rate Confirmation PDF</h4>
                <a href={`${API_ORIGIN}${booking.rateConfirmation.pdfUrl}`} target="_blank" rel="noreferrer">Open Rate Confirmation</a>
                {booking.rateConfirmation.acknowledgedAt && (
                  <p>Acknowledged by {booking.rateConfirmation.acknowledgedByName || 'assigned carrier'} · {formatDateTime(booking.rateConfirmation.acknowledgedAt)}</p>
                )}
              </div>
            )}
            <h4>Invoices</h4>
            {financials.invoices.length ? financials.invoices.map((invoice) => (
              <div className="booking-financial-row" key={invoice._id}>
                <div><strong>Invoice {String(invoice._id).slice(-8)}</strong><span>{formatStatus(invoice.status)} · {formatDateTime(invoice.createdAt)}</span></div>
                <strong>{formatMoney(invoice.totalAmount)}</strong>
              </div>
            )) : <div className="booking-quotes-empty">No invoices recorded.</div>}
            <h4>Settlements</h4>
            {financials.settlements.length ? financials.settlements.map((settlement) => (
              <div className="booking-financial-row" key={settlement._id}>
                <div><strong>{formatStatus(settlement.status)} · {personName(settlement.driver?.userId)}</strong><span>{formatDateTime(settlement.payoutInfo?.paidAt || settlement.createdAt)}{settlement.payoutInfo?.transactionId ? ` · ${settlement.payoutInfo.transactionId}` : ''}</span></div>
                <strong>{formatMoney(settlement.totalDriverPayout)}</strong>
              </div>
            )) : <div className="booking-quotes-empty">No settlements recorded.</div>}
          </section>
        )}

      </main>
    </div>
  );
};

export default BookingDetails;
