import React, { useCallback, useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import './ShipperDetails.css';
import { API_ORIGIN, API_BASE_URL } from '../services/api';
import * as userService from '../services/user';
import getErrorMessage from '../utils/errorHandler';

const VERIFICATION_LABEL = {
  incomplete: 'Incomplete',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const DOC_TYPE_LABEL = {
  business_license: 'Business License',
  insurance_coi: 'Certificate of Insurance',
  w9: 'W-9 Form',
  other: 'Other Document',
};

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

const STATUS_CLASS = {
  pending: 'sd-status-pending',
  confirmed: 'sd-status-confirmed',
  in_progress: 'sd-status-inprogress',
  completed: 'sd-status-completed',
  cancelled: 'sd-status-cancelled',
};

const AgreementRow = ({ label, agreement }) => (
  <div>
    <span>{label}</span>
    <strong>{agreement?.accepted ? `Accepted ${formatDate(agreement.acceptedAt)}` : 'Not accepted'}</strong>
  </div>
);

const ShipperDetails = ({ user, onBack, onViewBooking }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('profile');
  const [verificationDetail, setVerificationDetail] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);

  const fetchVerification = useCallback(async () => {
    try {
      setVerificationLoading(true);
      const shipper = await userService.getShipperById(user.id);
      setVerificationDetail(shipper);
    } catch (err) {
      console.error('Failed to fetch shipper verification detail:', err);
    } finally {
      setVerificationLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const handleDecision = async (decision) => {
    const verb = decision === 'approve' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${verb} this shipper's application?`)) return;
    try {
      setDeciding(true);
      if (decision === 'approve') await userService.approveShipper(user.id);
      else await userService.rejectShipper(user.id);
      toast.success(decision === 'approve' ? 'Shipper approved' : 'Shipper rejected', { position: 'top-right' });
      fetchVerification();
    } catch (err) {
      toast.error(getErrorMessage(err), { position: 'top-right' });
    } finally {
      setDeciding(false);
    }
  };

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();
      const all = Array.isArray(data) ? data : data.bookings || [];
      const filtered = all.filter(
        (b) => b.userId?._id === user.id || b.userId === user.id
      );
      setBookings(filtered);
    } catch (err) {
      console.error('Failed to fetch shipper bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      b._id?.toLowerCase().includes(search) ||
      b.pickupLocation?.address?.toLowerCase().includes(search) ||
      b.deliveryLocation?.address?.toLowerCase().includes(search) ||
      b.status?.toLowerCase().includes(search)
    );
  });

  const statusCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  const isBusiness = user.accountType === 'business';
  const companyProfile = user.companyProfile || {};

  const verificationStatus = verificationDetail?.shipperApprovalStatus || user.shipperApprovalStatus || 'approved';
  const documents = verificationDetail?.documents || [];

  return (
    <div className="sd-page">
      <Toaster position="top-right" richColors />
      <div className="sd-toolbar">
        <button type="button" className="sd-back-btn" onClick={onBack}>
          Back to Shippers
        </button>
      </div>

      <section className="sd-card sd-hero">
        <div className="sd-avatar">
          {user.firstName?.[0]}{user.lastName?.[0]}
        </div>
        <div className="sd-hero-info">
          <span className="sd-kicker">Shipper</span>
          <h2>{user.firstName} {user.lastName}</h2>
          <p>{user.email} | {user.phone || 'N/A'}</p>
        </div>
        <div className="sd-status-chips">
          <span className="sd-status-chip">{user.accountType ? formatStatus(user.accountType) : 'Individual'}</span>
          <span className="sd-status-chip onboarding">{formatStatus(user.shipperOnboardingStep) || 'Your Info'}</span>
          <span className={`verification-badge verification-${verificationStatus}`}>
            {VERIFICATION_LABEL[verificationStatus] || verificationStatus}
          </span>
        </div>
      </section>

      {verificationStatus !== 'approved' && (
        <section className="sd-card">
          <h3>Admin Verification</h3>
          {verificationLoading ? (
            <div className="sd-loading">Loading verification details…</div>
          ) : (
            <>
              <div className="sd-info-grid">
                <div><span>Status</span><strong>{VERIFICATION_LABEL[verificationStatus] || verificationStatus}</strong></div>
                <div><span>Onboarding Step</span><strong>{formatStatus(verificationDetail?.shipperOnboardingStep)}</strong></div>
                <div><span>Signed</span><strong>{verificationDetail?.signedAt ? formatDate(verificationDetail.signedAt) : 'Not yet'}</strong></div>
                <div><span>Billing Contact</span><strong>{verificationDetail?.billingProfile?.contactName || 'N/A'}</strong></div>
                <div><span>Payment Terms</span><strong>{formatStatus(verificationDetail?.billingProfile?.paymentTerms) || 'N/A'}</strong></div>
              </div>

              <h4 className="sd-subhead" style={{ marginTop: 16 }}>Required Documents</h4>
              {documents.length === 0 ? (
                <div className="sd-empty">No documents uploaded yet.</div>
              ) : (
                <div className="sd-info-grid">
                  {documents.map((doc) => (
                    <div key={doc._id}>
                      <span>{DOC_TYPE_LABEL[doc.docType] || doc.docType}</span>
                      <strong>
                        <a href={`${API_ORIGIN}/${doc.fileUrl}`} target="_blank" rel="noreferrer">
                          {doc.fileName || 'View file'}
                        </a>
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              {verificationStatus === 'pending' && (
                <div className="action-buttons" style={{ marginTop: 16 }}>
                  <button className="action-btn approve-btn" disabled={deciding} onClick={() => handleDecision('approve')}>
                    Approve Shipper
                  </button>
                  <button className="action-btn reject-btn" disabled={deciding} onClick={() => handleDecision('reject')}>
                    Reject Shipper
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <div className="sd-tabs">
        <button
          type="button"
          className={`sd-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          type="button"
          className={`sd-tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings / Loads
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="sd-grid">
          <section className="sd-card">
            <h3>Account Info</h3>
            <div className="sd-info-grid">
              <div><span>Account Type</span><strong>{formatStatus(user.accountType) || 'Individual'}</strong></div>
              <div><span>Email Verified</span><strong>{user.emailVerified ? 'Yes' : 'No'}</strong></div>
              <div><span>Address</span><strong>{user.primaryLocation?.line1 || 'N/A'}</strong></div>
              <div><span>City</span><strong>{user.primaryLocation?.city || 'N/A'}</strong></div>
              <div><span>State</span><strong>{user.primaryLocation?.state || 'N/A'}</strong></div>
              <div><span>Zip</span><strong>{user.primaryLocation?.zip || 'N/A'}</strong></div>
              <div><span>Registered</span><strong>{formatDate(user.registeredDate)}</strong></div>
            </div>
          </section>

          {isBusiness && (
            <section className="sd-card">
              <h3>Company Info</h3>
              <div className="sd-info-grid">
                <div><span>Company Name</span><strong>{companyProfile.companyName || 'N/A'}</strong></div>
                <div><span>Billing Address</span><strong>{companyProfile.billingAddress || 'N/A'}</strong></div>
                <div><span>City</span><strong>{companyProfile.city || 'N/A'}</strong></div>
                <div><span>State</span><strong>{companyProfile.state || 'N/A'}</strong></div>
                <div><span>Zip</span><strong>{companyProfile.zip || 'N/A'}</strong></div>
                <div><span>Tax ID</span><strong>{companyProfile.taxId || 'N/A'}</strong></div>
                <div><span>GST Number</span><strong>{companyProfile.gstNumber || 'N/A'}</strong></div>
                <div><span>Company Email</span><strong>{companyProfile.email || 'N/A'}</strong></div>
                <div><span>Company Phone</span><strong>{companyProfile.phone || 'N/A'}</strong></div>
              </div>
            </section>
          )}

          <section className="sd-card">
            <h3>Agreements</h3>
            <div className="sd-info-grid">
              <AgreementRow label="Terms of Service" agreement={user.agreements?.tos} />
              <AgreementRow label="Privacy Policy" agreement={user.agreements?.privacyPolicy} />
            </div>
          </section>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="sd-grid">
          <section className="sd-card sd-stats-row">
            <div className="sd-stat">
              <span>Total Bookings</span>
              <strong>{user.totalBookings ?? bookings.length}</strong>
            </div>
            <div className="sd-stat">
              <span>Active Bookings</span>
              <strong>{user.activeBookings ?? (statusCounts.in_progress || 0)}</strong>
            </div>
            <div className="sd-stat">
              <span>Completed</span>
              <strong>{statusCounts.completed || 0}</strong>
            </div>
          </section>

          <section className="sd-card sd-bookings-card">
            <div className="sd-bookings-header">
              <h3>Booking History</h3>
              <div className="sd-bookings-filters">
                <input
                  type="text"
                  placeholder="Search bookings…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="sd-search-input"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="sd-status-select"
                >
                  <option value="all">All ({bookings.length})</option>
                  {Object.entries(statusCounts).map(([s, c]) => (
                    <option key={s} value={s}>
                      {formatStatus(s)} ({c})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="sd-loading">Loading bookings…</div>
            ) : filteredBookings.length === 0 ? (
              <div className="sd-empty">No bookings found.</div>
            ) : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Pickup</th>
                      <th>Drop</th>
                      <th>Truck Type</th>
                      <th>Pickup Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b._id}>
                        <td className="sd-booking-id">#{b._id.slice(-6)}</td>
                        <td>{b.pickupLocation?.address || 'N/A'}</td>
                        <td>{b.deliveryLocation?.address || 'N/A'}</td>
                        <td>{b.truckType || 'N/A'}</td>
                        <td>{formatDate(b.pickupDate)}</td>
                        <td>
                          <span className={`sd-status-badge ${STATUS_CLASS[b.status] || 'sd-status-default'}`}>
                            {formatStatus(b.status)}
                          </span>
                        </td>
                        <td>
                          {onViewBooking && (
                            <button
                              type="button"
                              className="sd-action-btn"
                              onClick={() => onViewBooking(b._id)}
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ShipperDetails;
