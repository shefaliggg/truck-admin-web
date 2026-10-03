import React, { useState } from 'react';
import { Toaster } from 'sonner';
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
import NotificationBell from './NotificationBell';
import './Layout.css';

const Layout = ({
  children,
  user,
  onLogout,
  currentPage,
  onNavigate,
  pageTitle,
  onAddBooking,
  showAddBookingButton,
  onAddShipper,
  showAddShipperButton,
  onAddDriver,
  showAddDriverButton,
  onAddTruck,
  showAddTruckButton,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiHome /> },
    { id: 'bookings', label: 'Loads', icon: <FiPackage /> },
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

  const adminName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin Account';
  const adminInitials = adminName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="layout">
      <Toaster position="top-right" richColors />

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>

        <div className="sidebar-header">
          <div className="logo-area">
            <FaTruckMoving className="logo-icon" />
            {!sidebarCollapsed && <h2>CP Admin</h2>}
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
          <div className="header-heading">
            <span className="header-eyebrow">Operations</span>
            <h1 className="page-title">
              {pageTitle || menuItems.find(i => i.id === currentPage)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="header-controls">
            <div id="header-actions-slot" className="header-actions-slot" />
            {showAddBookingButton && (
              <button className="header-add-booking-btn" onClick={onAddBooking}>
                <FiPlus />
                <span>Add Load</span>
              </button>
            )}
            {showAddShipperButton && (
              <button className="header-add-shipper-btn" onClick={onAddShipper}>
                <FiPlus />
                <span>Add Shipper</span>
              </button>
            )}
            {showAddDriverButton && (
              <button className="header-add-driver-btn" onClick={onAddDriver}>
                <FiPlus />
                <span>Add Driver</span>
              </button>
            )}
            {showAddTruckButton && (
              <button className="header-add-truck-btn" onClick={onAddTruck}>
                <FiPlus />
                <span>Add Truck</span>
              </button>
            )}
            <div className="header-admin" title={adminName}>
              <span className="header-admin-avatar">{adminInitials}</span>
              <span className="header-admin-details">
                <strong>{adminName}</strong>
                <span>Administrator</span>
              </span>
            </div>
            <NotificationBell user={user} onNavigate={onNavigate} />
          </div>
        </header>

        <main className="content-area">
          {children}
        </main>

      </div>
    </div>
  );
};

export default Layout;