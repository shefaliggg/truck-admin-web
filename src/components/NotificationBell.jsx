import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiBell, FiCheckCircle, FiTruck, FiUsers, FiPackage, FiCamera, FiAlertTriangle, FiFileText } from 'react-icons/fi';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from '../services/notification';
import { socket } from '../services/socket';
import './NotificationBell.css';

const POLL_MS = 25000;

const TYPE_META = {
  driver_pending_approval: { icon: <FiTruck />, page: 'drivers' },
  shipper_pending_approval: { icon: <FiUsers />, page: 'users' },
  booking_pending_approval: { icon: <FiPackage />, page: 'bookings' },
  pod_pending_review: { icon: <FiCamera />, page: 'pods' },
  issue_reported: { icon: <FiAlertTriangle />, page: null },
  rate_confirmation_signed: { icon: <FiFileText />, page: 'bookings' },
};

const timeAgo = (value) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const NotificationBell = ({ user, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch notification count:', err);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    if (!user?._id) return undefined;
    const onIncoming = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };
    socket.on(`notification:${user._id}`, onIncoming);
    return () => {
      socket.off(`notification:${user._id}`, onIncoming);
    };
  }, [user?._id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePanel = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const data = await getMyNotifications();
        setNotifications(data);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleItemClick = (notification) => {
    const meta = TYPE_META[notification.type];
    if (meta?.page && onNavigate) {
      onNavigate(meta.page);
      setOpen(false);
    }
  };

  return (
    <div className="notification-bell" ref={panelRef}>
      <button className="header-icon-btn" onClick={togglePanel} aria-label="Notifications">
        <FiBell />
        {unreadCount > 0 && (
          <span className="header-icon-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="header-dropdown notification-dropdown">
          <div className="header-dropdown-title-row">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="header-dropdown-link" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="header-dropdown-list">
            {loading ? (
              <div className="header-dropdown-empty">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="header-dropdown-empty">
                <FiCheckCircle size={22} />
                <span>You're all caught up</span>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] || {};
                return (
                  <button
                    key={n._id}
                    className={`notification-item ${n.isRead ? '' : 'unread'} ${meta.page ? 'clickable' : ''}`}
                    onClick={() => handleItemClick(n)}
                    disabled={!meta.page}
                  >
                    <span className="notification-item-icon">{meta.icon || <FiBell />}</span>
                    <span className="notification-item-body">
                      <span className="notification-item-title">{n.title}</span>
                      {n.body && <span className="notification-item-text">{n.body}</span>}
                      <span className="notification-item-time">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.isRead && <span className="notification-item-dot" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
