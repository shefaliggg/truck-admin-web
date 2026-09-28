import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';
import api, { API_ORIGIN } from '../services/api';
import * as driverService from '../services/driver';
import getErrorMessage from '../utils/errorHandler';
import './DriverDetails.css';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const formatStatus = (value) => {
  if (!value) return 'N/A';
  return value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

const findDocument = (documents, docType) =>
  (documents || []).find((doc) => doc.docType === docType) || null;

const DocumentPreview = ({ label, document }) => {
  if (!document) {
    return (
      <div className="driver-doc-item">
        <h4>{label}</h4>
        <div className="driver-doc-empty">Not submitted yet</div>
      </div>
    );
  }

  const isImage = IMAGE_EXTENSIONS.some((ext) => document.fileUrl?.toLowerCase().endsWith(ext));
  const fileHref = `${API_ORIGIN}/${document.fileUrl}`;

  return (
    <div className="driver-doc-item">
      <div className="driver-doc-item-header">
        <h4>{label}</h4>
        <span className={`driver-doc-status ${document.status || 'pending'}`}>{formatStatus(document.status)}</span>
      </div>
      {isImage ? (
        <a href={fileHref} target="_blank" rel="noreferrer">
          <img src={fileHref} alt={label} className="driver-doc-image" />
        </a>
      ) : (
        <a href={fileHref} target="_blank" rel="noreferrer" className="driver-doc-link">
          View {document.fileName || 'document'}
        </a>
      )}
      {document.expiresAt && (
        <p className="driver-doc-meta">Expires {formatDate(document.expiresAt)}</p>
      )}
      {document.status === 'rejected' && document.rejectionReason && (
        <p className="driver-doc-rejection">Rejected: {document.rejectionReason}</p>
      )}
    </div>
  );
};

const AgreementRow = ({ label, agreement }) => (
  <div>
    <span>{label}</span>
    <strong>
      {agreement?.accepted
        ? `Accepted ${formatDate(agreement.acceptedAt)}${agreement.version ? ` (${agreement.version})` : ''}`
        : 'Not accepted'}
    </strong>
  </div>
);

const DriverDetails = ({ driverId, onBack }) => {
  const [driver, setDriver] = useState(null);
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmActionType, setConfirmActionType] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!driverId) {
      setError('Driver not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [incompleteRes, pendingRes, approvedRes, rejectedRes, tripsRes, bookingsRes] = await Promise.allSettled([
        api.get('/admin/drivers/incomplete'),
        api.get('/admin/drivers/pending'),
        api.get('/admin/drivers/approved'),
        api.get('/admin/drivers/rejected'),
        api.get('/trips'),
        api.get('/bookings'),
      ]);

      const allDrivers = [
        ...(incompleteRes.status === 'fulfilled' ? (incompleteRes.value.data?.drivers || []) : []),
        ...(pendingRes.status === 'fulfilled' ? (pendingRes.value.data?.drivers || []) : []),
        ...(approvedRes.status === 'fulfilled' ? (approvedRes.value.data?.drivers || []) : []),
        ...(rejectedRes.status === 'fulfilled' ? (rejectedRes.value.data?.drivers || []) : []),
      ];

      const foundDriver = allDrivers.find((d) => d._id === driverId);
      setDriver(foundDriver || null);

      const allTrips = tripsRes.status === 'fulfilled' ? (tripsRes.value.data || []) : [];
      setTrips(
        allTrips.filter((t) => (t.driverId?._id || t.driverId) === driverId)
      );

      const allBookings = bookingsRes.status === 'fulfilled' ? (bookingsRes.value.data || []) : [];
      setBookings(
        allBookings.filter((b) => (b.driverId?._id || b.driverId) === driverId)
      );
    } catch (err) {
      setError('Failed to load driver details');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleConfirmAction = async () => {
    if (!confirmActionType || !driver) return;
    setActionLoading(true);
    try {
      if (confirmActionType === 'approve') {
        await driverService.approveDriver(driver._id);
        toast.success('Driver approved!', { description: 'The driver can now start accepting bookings.' });
      } else {
        await driverService.rejectDriver(driver._id);
        toast.error('Driver rejected', { description: 'The driver has been notified.' });
      }
      await fetchAll();
    } catch (err) {
      toast.error(confirmActionType === 'approve' ? 'Approval failed' : 'Rejection failed', {
        description: getErrorMessage(err),
      });
    } finally {
      setActionLoading(false);
      setShowConfirmModal(false);
      setConfirmActionType(null);
    }
  };

  const handleVerifyBank = async () => {
    if (!driver) return;
    if (!window.confirm("Are you sure you want to verify this driver's bank details?")) return;
    setActionLoading(true);
    try {
      await driverService.verifyDriverBank(driver._id);
      toast.success('Bank verified successfully');
      await fetchAll();
    } catch (err) {
      toast.error('Failed to verify bank details', { description: getErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  };

  const completionRate = useMemo(() => {
    if (trips.length === 0) return '0%';
    const completed = trips.filter((trip) => ['completed', 'delivered'].includes(trip.status)).length;
    return `${Math.round((completed / trips.length) * 100)}%`;
  }, [trips]);

  if (loading) {
    return <div className="driver-details-loading">Loading driver details...</div>;
  }

  if (error || !driver) {
    return (
      <div className="driver-details-page">
        <div className="driver-details-toolbar">
          <button className="driver-back-btn" onClick={onBack}>Back to Drivers</button>
        </div>
        <div className="driver-details-error">{error || 'Driver not found'}</div>
      </div>
    );
  }

  const truck = driver.truckId;
  const documents = driver.documents || [];
  const cdlDocument = findDocument(documents, 'cdl');
  const medicalCertDocument = findDocument(documents, 'medical_cert');
  const registrationDocument = findDocument(documents, 'vehicle_registration');
  const insuranceDocument = findDocument(documents, 'insurance');
  const inspectionDocument = findDocument(documents, 'inspection');
  const operatingAuthorityDocument = findDocument(documents, 'operating_authority');

  return (
    <div className="driver-details-page">
      <Toaster position="top-right" richColors />

      <div className="driver-details-toolbar">
        <button className="driver-back-btn" onClick={onBack}>Back to Drivers</button>
      </div>

      <section className="driver-details-card driver-details-hero">
        <div>
          <span className="driver-kicker">Driver</span>
          <h2>{driver.userId?.firstName} {driver.userId?.lastName}</h2>
          <p>{driver.userId?.email || 'N/A'} | {driver.userId?.phone || 'N/A'}</p>
        </div>
        <div className="driver-status-chips">
          <span className={`driver-status-chip ${driver.approvalStatus || 'incomplete'}`}>
            {formatStatus(driver.approvalStatus)}
          </span>
          <span className="driver-status-chip onboarding">
            {formatStatus(driver.onboardingStep) || 'Driver Info'}
          </span>
          {driver.approvalStatus === 'pending' && (
            <div className="action-buttons">
              <button
                className="action-btn approve-btn"
                disabled={actionLoading}
                onClick={() => { setConfirmActionType('approve'); setShowConfirmModal(true); }}
              >
                Approve
              </button>
              <button
                className="action-btn reject-btn"
                disabled={actionLoading}
                onClick={() => { setConfirmActionType('reject'); setShowConfirmModal(true); }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="driver-details-tabs">
        <button
          type="button"
          className={`driver-details-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          type="button"
          className={`driver-details-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Driving History
        </button>
      </div>

      {activeTab === 'profile' && (
      <div className="driver-details-grid">
        <section className="driver-details-card">
          <h3>Personal Info</h3>
          <div className="driver-info-grid">
            <div><span>Date of Birth</span><strong>{formatDate(driver.dateOfBirth)}</strong></div>
            <div><span>Address</span><strong>{driver.address?.line1 || 'N/A'}</strong></div>
            <div><span>City</span><strong>{driver.address?.city || 'N/A'}</strong></div>
            <div><span>State</span><strong>{driver.address?.state || 'N/A'}</strong></div>
            <div><span>Zip</span><strong>{driver.address?.zip || 'N/A'}</strong></div>
            <div><span>Registered</span><strong>{formatDate(driver.createdAt)}</strong></div>
          </div>
        </section>

        <section className="driver-details-card">
          <h3>CDL Info</h3>
          <div className="driver-info-grid">
            <div><span>CDL Number</span><strong>{driver.licenseNumber || 'N/A'}</strong></div>
            <div><span>Issuing State</span><strong>{driver.cdlState || 'N/A'}</strong></div>
            <div><span>Class</span><strong>{driver.cdlClass || 'N/A'}</strong></div>
            <div><span>Endorsements</span><strong>{driver.endorsements?.length ? driver.endorsements.join(', ') : 'None'}</strong></div>
            <div><span>Expiry</span><strong>{formatDate(driver.licenseExpiry)}</strong></div>
          </div>
        </section>

        <section className="driver-details-card">
          <h3>Qualification</h3>
          <div className="driver-info-grid">
            <div><span>Years of CDL Experience</span><strong>{driver.qualification?.yearsCdlExperience ?? 'N/A'}</strong></div>
            <div><span>Medical Cert Status</span><strong>{formatStatus(driver.qualification?.medicalCertStatus)}</strong></div>
            <div><span>Medical Cert Expiry</span><strong>{formatDate(driver.qualification?.medicalCertExpiry)}</strong></div>
            <div><span>MVR Consent</span><strong>{driver.qualification?.mvrConsentGiven ? `Given ${formatDate(driver.qualification.mvrConsentAt)}` : 'Not given'}</strong></div>
            <div><span>Road Test</span><strong>{formatStatus(driver.qualification?.roadTestStatus)}</strong></div>
            <div><span>Road Test Notes</span><strong>{driver.qualification?.roadTestNotes || 'N/A'}</strong></div>
          </div>
        </section>

        <section className="driver-details-card">
          <h3>Truck Info</h3>
          <div className="driver-info-grid">
            <div><span>Unit Number</span><strong>{truck?.unitNumber || 'N/A'}</strong></div>
            <div><span>VIN</span><strong>{truck?.vin || 'N/A'}</strong></div>
            <div><span>Plate Number</span><strong>{truck?.plateNumber || 'N/A'}</strong></div>
            <div><span>Plate State</span><strong>{truck?.plateState || 'N/A'}</strong></div>
            <div><span>Truck Type</span><strong>{truck?.truckType || 'N/A'}</strong></div>
            <div><span>Make / Model</span><strong>{truck ? `${truck.make || 'N/A'} ${truck.model || ''}`.trim() : 'N/A'}</strong></div>
            <div><span>Year</span><strong>{truck?.year || 'N/A'}</strong></div>
          </div>
        </section>

        <section className="driver-details-card">
          <h3>Agreements</h3>
          <div className="driver-info-grid">
            <AgreementRow label="Terms of Service" agreement={driver.agreements?.tos} />
            <AgreementRow label="Privacy Policy" agreement={driver.agreements?.privacyPolicy} />
            <AgreementRow label="Driver Agreement" agreement={driver.agreements?.driverAgreement} />
            <AgreementRow label="MVR Consent" agreement={driver.agreements?.mvrConsent} />
          </div>
        </section>

        <section className="driver-details-card">
          <h3>Commercial & Bank</h3>
          <div className="driver-info-grid">
            <div><span>Plan Type</span><strong>{driver.planType || 'N/A'}</strong></div>
            <div><span>Plan Percentage</span><strong>{driver.planPercentage != null ? `${driver.planPercentage}%` : 'N/A'}</strong></div>
            <div>
              <span>Bank Verified</span>
              {driver.bankDetails?.isVerified ? (
                <strong className="verified-badge">Verified ✅</strong>
              ) : (
                <button className="verify-btn" disabled={actionLoading} onClick={handleVerifyBank}>
                  Verify Bank
                </button>
              )}
            </div>
            <div><span>Bank Name</span><strong>{driver.bankDetails?.bankName || 'N/A'}</strong></div>
            <div><span>Account Holder</span><strong>{driver.bankDetails?.accountHolderName || 'N/A'}</strong></div>
          </div>
        </section>

        <section className="driver-details-card driver-documents-card">
          <h3>Driver Documents</h3>
          <div className="driver-doc-grid">
            <DocumentPreview label="CDL" document={cdlDocument} />
            <DocumentPreview label="Medical Certificate" document={medicalCertDocument} />
          </div>
        </section>

        <section className="driver-details-card driver-documents-card">
          <h3>Truck Documents</h3>
          <div className="driver-doc-grid">
            <DocumentPreview label="Vehicle Registration" document={registrationDocument} />
            <DocumentPreview label="Insurance" document={insuranceDocument} />
            <DocumentPreview label="Inspection" document={inspectionDocument} />
            <DocumentPreview label="Operating Authority" document={operatingAuthorityDocument} />
          </div>
        </section>
      </div>
      )}

      {activeTab === 'history' && (
      <div className="driver-details-grid">
        <section className="driver-details-card driver-history-card">
          <h3>Driver History</h3>
          <div className="driver-history-stats">
            <div><span>Total Trips</span><strong>{trips.length}</strong></div>
            <div><span>Total Bookings</span><strong>{bookings.length}</strong></div>
            <div><span>Completion Rate</span><strong>{completionRate}</strong></div>
          </div>

          <div className="driver-history-table-wrap">
            <table className="driver-history-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Booking</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="driver-history-empty">No trips found for this driver.</td>
                  </tr>
                ) : (
                  trips.map((trip) => (
                    <tr key={trip._id}>
                      <td>#{trip._id?.slice(-6)}</td>
                      <td>#{trip.bookingId?._id?.slice(-6) || 'N/A'}</td>
                      <td>{trip.bookingId?.pickupLocation?.address || 'N/A'} to {trip.bookingId?.deliveryLocation?.address || 'N/A'}</td>
                      <td>{formatStatus(trip.status)}</td>
                      <td>{formatDate(trip.updatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      )}

      {showConfirmModal && confirmActionType && (
        <div className="modal-overlay" onClick={() => !actionLoading && setShowConfirmModal(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon ${confirmActionType === 'approve' ? 'approve-icon' : 'reject-icon'}`}>
              {confirmActionType === 'approve' ? '✓' : '!'}
            </div>
            <h2>{confirmActionType === 'approve' ? 'Approve Driver?' : 'Reject Driver?'}</h2>
            <p>
              {confirmActionType === 'approve'
                ? 'Are you sure you want to approve this driver? They will be able to start accepting bookings immediately.'
                : 'Are you sure you want to reject this driver? They will be notified of the rejection.'}
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-btn cancel-btn"
                onClick={() => setShowConfirmModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className={`confirm-btn action-btn ${confirmActionType === 'approve' ? 'approve-action-btn' : 'reject-action-btn'}`}
                onClick={handleConfirmAction}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDetails;
