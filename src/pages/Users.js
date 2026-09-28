
import React, { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import './Users.css';
import api from '../services/api';
import * as userService from '../services/user';
import getErrorMessage from '../utils/errorHandler';
import FormField from '../components/FormField';

const INVITE_REQUIRED_FIELDS = ['firstName', 'lastName', 'email'];

const validateInviteField = (field, value) => {
  switch (field) {
    case 'firstName':
    case 'lastName':
    case 'email':
      return value.trim() ? '' : 'Required';
    default:
      return '';
  }
};

const VERIFICATION_LABEL = {
  incomplete: 'Incomplete',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const Users = ({ onViewUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteErrors, setInviteErrors] = useState({});
  const [decidingId, setDecidingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Fetch all users with role=user (shippers)
      const res = await api.get('/admin/users?role=user');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteChange = (field, value) => {
    const nextForm = { ...inviteForm, [field]: value };
    setInviteForm(nextForm);
    setInviteErrors((prev) => {
      if (!(field in prev)) return prev;
      const msg = validateInviteField(field, value);
      if (msg) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const handleOpenInvite = () => {
    setInviteForm({ firstName: '', lastName: '', email: '', phone: '' });
    setInviteErrors({});
    setInviteError('');
    setShowInviteModal(true);
  };

  const handleCloseInvite = () => {
    setShowInviteModal(false);
    setInviteErrors({});
    setInviteError('');
  };

  const handleInviteSubmit = async (event) => {
    event.preventDefault();
    const newErrors = {};
    INVITE_REQUIRED_FIELDS.forEach((field) => {
      const msg = validateInviteField(field, inviteForm[field]);
      if (msg) newErrors[field] = msg;
    });
    if (Object.keys(newErrors).length > 0) {
      setInviteErrors(newErrors);
      return;
    }

    try {
      setInviteSubmitting(true);
      setInviteErrors({});
      setInviteError('');
      await userService.inviteShipper({
        firstName: inviteForm.firstName.trim(),
        lastName: inviteForm.lastName.trim(),
        email: inviteForm.email.trim().toLowerCase(),
        phone: inviteForm.phone.trim() || undefined,
      });
      toast.success('Invitation sent!', {
        description: `${inviteForm.firstName} will receive an email to verify their account and complete their profile.`,
        duration: 4000,
        position: 'top-right',
      });
      setShowInviteModal(false);
      fetchUsers();
    } catch (err) {
      setInviteError(getErrorMessage(err));
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleDecision = async (user, decision) => {
    const verb = decision === 'approve' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${verb} ${user.firstName} ${user.lastName}'s shipper application?`)) return;
    try {
      setDecidingId(user.id);
      if (decision === 'approve') await userService.approveShipper(user.id);
      else await userService.rejectShipper(user.id);
      toast.success(decision === 'approve' ? 'Shipper approved' : 'Shipper rejected', {
        description: decision === 'approve'
          ? 'They can now post loads.'
          : 'They will need to reapply from the app.',
        position: 'top-right',
      });
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err), { position: 'top-right' });
    } finally {
      setDecidingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let result = users.filter((u) => {
      if (activityFilter === 'active' && !(u.activeBookings > 0)) return false;
      if (activityFilter === 'inactive' && u.activeBookings > 0) return false;
      if (verificationFilter !== 'all' && (u.shipperApprovalStatus || 'approved') !== verificationFilter) return false;
      if (!q) return true;
      return (
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    });

    result = [...result].sort((a, b) => {
      let valA, valB;
      if (sortField === 'name') {
        valA = `${a.firstName} ${a.lastName}`.toLowerCase();
        valB = `${b.firstName} ${b.lastName}`.toLowerCase();
      } else if (sortField === 'bookings') {
        valA = a.totalBookings || 0;
        valB = b.totalBookings || 0;
      } else if (sortField === 'registered') {
        valA = new Date(a.registeredDate).getTime();
        valB = new Date(b.registeredDate).getTime();
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [users, searchTerm, activityFilter, verificationFilter, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  if (loading) {
    return <div className="users-loading">Loading users...</div>;
  }

  return (
    <div className="users-page">
      <Toaster position="top-right" richColors />

      <div className="users-filters-panel">
        <div className="users-filters-grid">
          <div className="user-filter-field user-filter-field-wide">
            <label htmlFor="user-search">Search</label>
            <input
              id="user-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, email or phone"
            />
          </div>
          <div className="user-filter-field">
            <label htmlFor="user-activity">Activity</label>
            <select
              id="user-activity"
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
            >
              <option value="all">All ({users.length})</option>
              <option value="active">Has Active Bookings</option>
              <option value="inactive">No Active Bookings</option>
            </select>
          </div>
          <div className="user-filter-field">
            <label htmlFor="user-verification">Verification</label>
            <select
              id="user-verification"
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="incomplete">Incomplete</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="user-filter-field user-refresh-wrap">
            <button type="button" className="invite-btn" onClick={handleOpenInvite}>+ Invite Shipper</button>
            <button type="button" className="refresh-btn" onClick={fetchUsers}>Refresh</button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('name')}>Name{sortIcon('name')}</th>
              <th>Email</th>
              <th>Phone</th>
              <th className="sortable" onClick={() => toggleSort('bookings')}>Total Bookings{sortIcon('bookings')}</th>
              <th>Active Bookings</th>
              <th>Verification</th>
              <th className="sortable" onClick={() => toggleSort('registered')}>Registered{sortIcon('registered')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const verification = user.shipperApprovalStatus || 'approved';
              return (
                <tr key={user.id}>
                  <td className="user-name">
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td className="total-bookings">{user.totalBookings}</td>
                  <td className="active-bookings">{user.activeBookings}</td>
                  <td>
                    <span className={`verification-badge verification-${verification}`}>
                      {VERIFICATION_LABEL[verification] || verification}
                    </span>
                  </td>
                  <td>{new Date(user.registeredDate).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn view-btn" onClick={() => onViewUser && onViewUser(user)}>View</button>
                      {verification === 'pending' && (
                        <>
                          <button
                            className="action-btn approve-btn"
                            disabled={decidingId === user.id}
                            onClick={() => handleDecision(user, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="action-btn reject-btn"
                            disabled={decidingId === user.id}
                            onClick={() => handleDecision(user, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="no-data">No users found</div>
        )}
      </div>

      {showInviteModal && (
        <div className="modal-overlay" onClick={handleCloseInvite}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form className="invite-form" onSubmit={handleInviteSubmit} noValidate>
              <h2>Invite Shipper</h2>
              <div className="invite-form-grid">
                <FormField
                  wrapperClassName="invite-field"
                  label="First Name"
                  id="invite-shipper-first-name"
                  type="text"
                  value={inviteForm.firstName}
                  onChange={(e) => handleInviteChange('firstName', e.target.value)}
                  required
                  error={inviteErrors.firstName}
                />
                <FormField
                  wrapperClassName="invite-field"
                  label="Last Name"
                  id="invite-shipper-last-name"
                  type="text"
                  value={inviteForm.lastName}
                  onChange={(e) => handleInviteChange('lastName', e.target.value)}
                  required
                  error={inviteErrors.lastName}
                />
                <FormField
                  wrapperClassName="invite-field invite-field-wide"
                  label="Email"
                  id="invite-shipper-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => handleInviteChange('email', e.target.value)}
                  required
                  error={inviteErrors.email}
                />
                <div className="invite-field invite-field-wide">
                  <label htmlFor="invite-shipper-phone">Phone (optional)</label>
                  <input
                    id="invite-shipper-phone"
                    type="text"
                    value={inviteForm.phone}
                    onChange={(e) => handleInviteChange('phone', e.target.value)}
                  />
                </div>
              </div>
              <p className="invite-note">
                We'll email an invitation so the shipper can open the CP Shipper app, verify their account, and complete their profile.
              </p>
              {inviteError && <div className="new-driver-error">{inviteError}</div>}
              <div className="new-driver-actions">
                <button type="button" className="new-driver-cancel" onClick={handleCloseInvite} disabled={inviteSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="new-driver-submit" disabled={inviteSubmitting}>
                  {inviteSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
