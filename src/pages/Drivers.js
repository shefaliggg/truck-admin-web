import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import * as driverService from '../services/driver';
import getErrorMessage from '../utils/errorHandler';
import './Drivers.css';
import { verifyDriverBank } from '../services/driver';

// Table component for reuse (must be outside main component)
function DriverTable({
  drivers,
  actionLoading,
  onViewDriver,
  handleApprove,
  handleReject,
  getStatusBadge,
  onBankVerified,
  onSort,
  sortIcon,
}) {
  if (!drivers || drivers.length === 0) return <div className="no-data">No drivers found</div>;
  const handleVerifyBank = async (driverId) => {
    try {
      const confirm = window.confirm(
        "Are you sure you want to verify this driver's bank details?"
      );

      if (!confirm) return;

      await verifyDriverBank(driverId);

      alert("Bank verified successfully ✅");

 if(onBankVerified) onBankVerified();

    } catch (error) {
      console.error("Bank verification failed:", error);
      alert("Failed to verify bank details ❌");
    }
  };
  return (
    <div className="table-container">
      <table className="drivers-table">
        <thead>
          <tr>
            <th className="sortable" onClick={() => onSort && onSort('name')}>Driver Name{sortIcon ? sortIcon('name') : ''}</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Bank Verification</th>
            <th className="sortable" onClick={() => onSort && onSort('registered')}>Registered{sortIcon ? sortIcon('registered') : ''}</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver._id}>
              <td className="driver-name">
                {driver.userId?.firstName} {driver.userId?.lastName}
              </td>
              <td>{driver.userId?.email}</td>
              <td>{driver.userId?.phone}</td>
              <td>{getStatusBadge(driver.approvalStatus)}</td>
              <td>
                {driver.bankDetails?.isVerified ? (
                  <span className="verified-badge">Verified ✅</span>
                ) : (
                  <button
                    className="verify-btn"
                    onClick={() => handleVerifyBank(driver._id)}
                  >
                    Verify Bank
                  </button>
                )}
              </td>
              <td>{new Date(driver.createdAt).toLocaleDateString()}</td>
              <td>
                <div className="action-buttons">
                  <button
                    className="action-btn view-btn"
                    onClick={() => onViewDriver && onViewDriver(driver)}
                  >
                    View
                  </button>
                  {handleApprove && handleReject && driver.approvalStatus === 'pending' && (
                    <>
                      <button
                        className="action-btn approve-btn"
                        onClick={() => handleApprove(driver._id)}
                        disabled={actionLoading === driver._id}
                      >
                        Approve
                      </button>
                      <button
                        className="action-btn reject-btn"
                        onClick={() => handleReject(driver._id)}
                        disabled={actionLoading === driver._id}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Drivers = ({ onViewDriver }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const pending = await driverService.getPendingDrivers();
      const approved = await driverService.getApprovedDrivers();
      const rejected = await driverService.getRejectedDrivers();
      setDrivers({ pending, approved, rejected });
    } catch (err) {
      const friendlyError = getErrorMessage(err);
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleApprove = async (driverId) => {
    setConfirmAction({ type: 'approve', driverId });
    setShowConfirmModal(true);
  };

  const handleReject = async (driverId) => {
    setConfirmAction({ type: 'reject', driverId });
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setActionLoading(confirmAction.driverId);
    try {
      if (confirmAction.type === 'approve') {
        await driverService.approveDriver(confirmAction.driverId);
        fetchDrivers();
        toast.success('Driver Approved!', {
          description: 'The driver can now start accepting bookings.',
          duration: 4000,
          position: 'top-right'
        });
      } else if (confirmAction.type === 'reject') {
        await driverService.rejectDriver(confirmAction.driverId);
        fetchDrivers();
        toast.error('Driver Rejected', {
          description: 'The driver has been rejected and will be notified.',
          duration: 4000,
          position: 'top-right'
        });
      }
    } catch (err) {
      const friendlyError = getErrorMessage(err);
      if (confirmAction.type === 'approve') {
        toast.error('Approval Failed', {
          description: friendlyError,
          duration: 4000,
          position: 'top-right'
        });
      } else {
        toast.error('Rejection Failed', {
          description: friendlyError,
          duration: 4000,
          position: 'top-right'
        });
      }
    } finally {
      setActionLoading(null);
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'status-pending' },
      approved: { label: 'Approved', className: 'status-approved' },
      rejected: { label: 'Rejected', className: 'status-rejected' },
      incomplete: { label: 'Incomplete', className: 'status-incomplete' },
    };
    const config = statusConfig[status] || { label: status, className: 'status-default' };
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const currentDrivers = useMemo(() => {
    return [
      ...(drivers.pending || []),
      ...(drivers.approved || []),
      ...(drivers.rejected || []),
    ];
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = currentDrivers.filter((driver) => {
      if (statusFilter !== 'all' && driver.approvalStatus !== statusFilter) return false;

      if (!q) return true;

      const fullName = `${driver.userId?.firstName || ''} ${driver.userId?.lastName || ''}`.toLowerCase();
      const email = (driver.userId?.email || '').toLowerCase();
      const phone = (driver.userId?.phone || '').toLowerCase();

      return (
        fullName.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      let valA;
      let valB;

      if (sortField === 'registered') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else {
        valA = `${a.userId?.firstName || ''} ${a.userId?.lastName || ''}`.toLowerCase();
        valB = `${b.userId?.firstName || ''} ${b.userId?.lastName || ''}`.toLowerCase();
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [currentDrivers, searchTerm, sortDir, sortField, statusFilter]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDir('asc');
  };

  const sortIcon = (field) => {
    if (sortField !== field) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="drivers-page">
      <Toaster position="top-right" richColors />

      <div className="drivers-filters-panel">
        <div className="drivers-filters-grid">
          <div className="driver-filter-field driver-filter-field-wide">
            <label htmlFor="driver-search">Search</label>
            <input
              id="driver-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Name, email, phone"
            />
          </div>
          <div className="driver-filter-field">
            <label htmlFor="driver-status">Status</label>
            <select
              id="driver-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="driver-filter-field driver-refresh-wrap">
            <button type="button" className="refresh-btn" onClick={fetchDrivers}>Refresh</button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading drivers...</div>
      ) : (
        <DriverTable
          drivers={filteredDrivers}
          onBankVerified={fetchDrivers}
          actionLoading={actionLoading}
          onViewDriver={onViewDriver}
          handleApprove={handleApprove}
          handleReject={handleReject}
          getStatusBadge={getStatusBadge}
          onSort={toggleSort}
          sortIcon={sortIcon}
        />
      )}


      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="modal-overlay" onClick={handleConfirmCancel}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon ${confirmAction.type === 'approve' ? 'approve-icon' : 'reject-icon'}`}>
              {confirmAction.type === 'approve' ? '✓' : '!'}
            </div>
            <h2>
              {confirmAction.type === 'approve' ? 'Approve Driver?' : 'Reject Driver?'}
            </h2>
            <p>
              {confirmAction.type === 'approve'
                ? 'Are you sure you want to approve this driver? They will be able to start accepting bookings immediately.'
                : 'Are you sure you want to reject this driver? They will be notified of the rejection.'}
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-btn cancel-btn"
                onClick={handleConfirmCancel}
                disabled={actionLoading === confirmAction.driverId}
              >
                Cancel
              </button>
              <button
                className={`confirm-btn action-btn ${confirmAction.type === 'approve' ? 'approve-action-btn' : 'reject-action-btn'
                  }`}
                onClick={handleConfirmAction}
                disabled={actionLoading === confirmAction.driverId}
              >
                {actionLoading === confirmAction.driverId ? 'Processing...' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};



export default Drivers;
