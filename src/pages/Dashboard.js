import React, { useEffect, useState } from "react";
import {
  FiTruck,
  FiPackage,
  FiCamera,
  FiDollarSign,
  FiUserCheck,
  FiRefreshCw
} from "react-icons/fi";
import api from '../services/api';
import "./Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeDrivers: 0,
    activeLoads: 0,
    pendingPods: 0,
    revenue: 0,
  });

  const [pendingActions, setPendingActions] = useState({
    driversAwaitingApproval: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

 const fetchDashboardData = async () => {
  try {
    setLoading(true);

    const res = await api.get('/admin/dashboard');
  console.log('dashboard',res.data)
    setStats(res.data.stats);
    setPendingActions(res.data.pendingActions);

  } catch (err) {
    console.error("Dashboard fetch failed:", err);
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return <div className="dashboard-loading">Loading Dashboard...</div>;
  }

  return (
    <div className="dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <h2>Admin Dashboard</h2>
        <button className="refresh-btn" onClick={fetchDashboardData}>
          <FiRefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-icon blue">
            <FiTruck size={28} />
          </div>
          <div>
            <div className="stat-value">{stats.activeDrivers}</div>
            <div className="stat-label">Active Drivers</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <FiPackage size={28} />
          </div>
          <div>
            <div className="stat-value">{stats.activeLoads}</div>
            <div className="stat-label">Active Loads</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <FiCamera size={28} />
          </div>
          <div>
            <div className="stat-value">{stats.pendingPods}</div>
            <div className="stat-label">Pending PODs</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FiDollarSign size={28} />
          </div>
          <div>
            <div className="stat-value">
              ${stats.revenue.toLocaleString()}
            </div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>

      </div>

      {/* Pending Section */}
      <div className="pending-section">
        <h3>Pending Approvals</h3>

        <div className="pending-item">
          <FiUserCheck size={18} />
          <span>Drivers Awaiting Approval</span>
          <span className="pending-badge">
            {pendingActions.driversAwaitingApproval}
          </span>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;