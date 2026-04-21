import React, { useState } from 'react';
import {
  FiHome,
  FiPackage,
  FiMap,
  FiUsers,
  FiTruck,
  FiCamera,
  FiDollarSign,
  FiStar,
  FiMessageCircle,
  FiSettings,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiPlus
} from 'react-icons/fi';
import { FaToiletPaper, FaTruckMoving } from 'react-icons/fa';
import './Layout.css';

const Layout = ({ children, user, onLogout, currentPage, onNavigate, pageTitle, onAddBooking, showAddBookingButton }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiHome /> },
    { id: 'bookings', label: 'Bookings', icon: <FiPackage /> },
    { id: 'trips', label: 'Trips', icon: <FiMap /> },
    { id: 'users', label: 'Users (Shippers)', icon: <FiUsers /> },
    { id: 'drivers', label: 'Drivers', icon: <FiTruck /> },
    { id: 'trucks', label: 'Trucks', icon: <FaTruckMoving /> },
    { id: 'pods', label: 'POD Review', icon: <FiCamera /> },
    { id: 'invoices', label: 'Invoices', icon: <FaToiletPaper /> },
    { id: 'settlements', label: 'Settlements', icon: <FiDollarSign /> },
    { id: 'ratings', label: 'Ratings', icon: <FiStar /> },
    { id: 'support', label: 'Support', icon: <FiMessageCircle /> },
    { id: 'settings', label: 'Settings', icon: <FiSettings /> },
  ];

  return (
    <div className="layout">

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>

        <div className="sidebar-header">
          <div className="logo-area">
            <FaTruckMoving className="logo-icon" />
            {!sidebarCollapsed && <h2>VCG Admin</h2>}
          </div>

          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="nav-label">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <span className="nav-icon"><FiLogOut /></span>
            {!sidebarCollapsed && <span className="nav-label">Logout</span>}
          </button>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <div className="main-container">

        <header className="top-header">
          <h1 className="page-title">
            {pageTitle || menuItems.find(i => i.id === currentPage)?.label || 'Dashboard'}
          </h1>
          {showAddBookingButton && (
            <button className="header-add-booking-btn" onClick={onAddBooking}>
              <FiPlus />
              <span>Add Booking</span>
            </button>
          )}
        </header>

        <main className="content-area">
          {children}
        </main>

      </div>
    </div>
  );
};

export default Layout;