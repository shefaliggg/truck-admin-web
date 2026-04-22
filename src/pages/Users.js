
import React, { useState, useEffect, useMemo } from 'react';
import './Users.css';
import api from '../services/api';

const Users = ({ onViewUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

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

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let result = users.filter((u) => {
      if (activityFilter === 'active' && !(u.activeBookings > 0)) return false;
      if (activityFilter === 'inactive' && u.activeBookings > 0) return false;
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
  }, [users, searchTerm, activityFilter, sortField, sortDir]);

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
          <div className="user-filter-field user-refresh-wrap">
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
              <th className="sortable" onClick={() => toggleSort('registered')}>Registered{sortIcon('registered')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="user-name">
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td className="total-bookings">{user.totalBookings}</td>
                <td className="active-bookings">{user.activeBookings}</td>
                <td>{new Date(user.registeredDate).toLocaleDateString()}</td>
                <td>
                  <button className="action-btn view-btn" onClick={() => onViewUser && onViewUser(user)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="no-data">No users found</div>
        )}
      </div>
    </div>
  );
};

export default Users;
