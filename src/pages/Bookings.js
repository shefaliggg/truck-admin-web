import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Bookings.css';
import api from '../services/api';
import getErrorMessage from '../utils/errorHandler';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'posted', label: 'Posted' },
  { id: 'bidding', label: 'Bidding' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'delivered', label: 'Delivered' },
];

const STAGE_LABEL = {
  posted: 'Posted',
  awaiting_driver: 'Bidding',
  assigned: 'Assigned',
  at_pickup: 'At Pickup',
  in_transit: 'In Transit',
  at_delivery: 'At Delivery',
  delivered: 'Delivered',
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
};

const formatMoney = (value) => `$${Number(value).toLocaleString()}`;
const ROUTE_WIDTH_STORAGE_KEY = 'admin-loads-route-column-width';
const DEFAULT_ROUTE_WIDTH = 190;
const MIN_ROUTE_WIDTH = 140;
const MAX_ROUTE_WIDTH = 480;
const clampRouteWidth = (width) => Math.min(MAX_ROUTE_WIDTH, Math.max(MIN_ROUTE_WIDTH, width));

// initialAssignment ('all' | 'assigned' | 'unassigned') lets the dashboard KPI cards deep-link here.
const Bookings = ({ onViewBooking, initialAssignment = 'all' }) => {
  const [loads, setLoads] = useState([]);
  const [tabCounts, setTabCounts] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTruckType, setSelectedTruckType] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState(initialAssignment);
  const [routeColumnWidth, setRouteColumnWidth] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_ROUTE_WIDTH;
    const savedWidth = Number(window.localStorage.getItem(ROUTE_WIDTH_STORAGE_KEY));
    return Number.isFinite(savedWidth) && savedWidth > 0 ? clampRouteWidth(savedWidth) : DEFAULT_ROUTE_WIDTH;
  });

  const fetchLoads = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/loads');
      setLoads(res.data.loads || []);
      setTabCounts(res.data.tabCounts || {});
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads]);

  useEffect(() => {
    window.localStorage.setItem(ROUTE_WIDTH_STORAGE_KEY, String(routeColumnWidth));
  }, [routeColumnWidth]);

  const handleRouteResizeStart = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = routeColumnWidth;
    document.body.classList.add('table-column-resizing');

    const handlePointerMove = (moveEvent) => {
      setRouteColumnWidth(clampRouteWidth(startWidth + moveEvent.clientX - startX));
    };
    const handlePointerEnd = () => {
      document.body.classList.remove('table-column-resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
  };

  const handleRouteResizeKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    setRouteColumnWidth((width) => clampRouteWidth(width + direction * 16));
  };

  const truckTypeOptions = useMemo(
    () => [...new Set(loads.map((load) => load.truckType).filter(Boolean))].sort(),
    [loads]
  );

  const filteredLoads = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return loads.filter((load) => {
      if (activeTab !== 'all' && load.tab !== activeTab) return false;
      if (selectedTruckType !== 'all' && load.truckType !== selectedTruckType) return false;
      if (assignmentFilter === 'assigned' && !load.driver) return false;
      if (assignmentFilter === 'unassigned' && load.driver) return false;
      if (!q) return true;
      return [load.loadNumber, load.shipper, load.pickup, load.delivery, load.driver, load.truckType]
        .some((value) => value && value.toLowerCase().includes(q));
    });
  }, [loads, activeTab, selectedTruckType, assignmentFilter, searchTerm]);

  if (loading && loads.length === 0) {
    return <div className="bookings-loading">Loading loads...</div>;
  }

  return (
    <div className="bookings-page">
      <div className="loads-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`loads-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="loads-tab-count">{tabCounts[tab.id] || 0}</span>
          </button>
        ))}
      </div>

      <div className="bookings-filters-panel">
        <div className="bookings-filters-grid">
          <div className="filter-field filter-field-wide">
            <label htmlFor="load-search">Search</label>
            <input
              id="load-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Load #, shipper, route, driver, truck type"
            />
          </div>

          <div className="filter-field">
            <label htmlFor="truck-type-filter">Truck Type</label>
            <select id="truck-type-filter" value={selectedTruckType} onChange={(event) => setSelectedTruckType(event.target.value)}>
              <option value="all">All Truck Types</option>
              {truckTypeOptions.map((truckType) => (
                <option key={truckType} value={truckType}>{truckType}</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="assignment-filter">Assignment</label>
            <select id="assignment-filter" value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)}>
              <option value="all">All Loads</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Load #</th>
              <th>Shipper</th>
              <th className="loads-route-heading" style={{ width: routeColumnWidth, minWidth: routeColumnWidth, maxWidth: routeColumnWidth }}>
                Route
                <div
                  className="loads-route-resizer"
                  role="separator"
                  aria-label="Resize Route column"
                  aria-orientation="vertical"
                  aria-valuemin={MIN_ROUTE_WIDTH}
                  aria-valuemax={MAX_ROUTE_WIDTH}
                  aria-valuenow={routeColumnWidth}
                  tabIndex={0}
                  title="Drag to resize. Use arrow keys, or double-click to reset."
                  onPointerDown={handleRouteResizeStart}
                  onKeyDown={handleRouteResizeKeyDown}
                  onDoubleClick={() => setRouteColumnWidth(DEFAULT_ROUTE_WIDTH)}
                />
              </th>
              <th>Quotes</th>
              <th>Status</th>
              <th>Pickup</th>
              <th>Driver</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoads.map((load) => (
              <tr key={load.id}>
                <td className="loads-number">{load.loadNumber}</td>
                <td>{load.shipper}</td>
                <td
                  className="loads-route"
                  style={{ width: routeColumnWidth, minWidth: routeColumnWidth, maxWidth: routeColumnWidth }}
                  title={`${load.pickup || 'N/A'} → ${load.delivery || 'N/A'}`}
                >
                  {load.pickup || 'N/A'} → {load.delivery || 'N/A'}
                </td>
                <td>
                  <span className={`loads-quotes ${load.quoteCount > 0 ? 'has-quotes' : ''}`}>{load.quoteCount}</span>
                  {load.lowestQuote != null && <div className="loads-quote-low">from {formatMoney(load.lowestQuote)}</div>}
                </td>
                <td>
                  <span className={`loads-stage ${['PENDING_APPROVAL', 'pending_approval'].includes(load.status) ? 'loads-stage-pending-review' : `loads-stage-${load.stage}`}`}>
                    {['PENDING_APPROVAL', 'pending_approval'].includes(load.status) ? 'Pending Review' : STAGE_LABEL[load.stage] || load.status}
                  </span>
                </td>
                <td>{formatDate(load.pickupDate)}</td>
                <td>{load.driver || <span className="no-driver">Not assigned</span>}</td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn view-btn" onClick={() => onViewBooking?.(load.id)}>View</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLoads.length === 0 && <div className="no-data">No loads found for this view.</div>}
      </div>
    </div>
  );
};

export default Bookings;
