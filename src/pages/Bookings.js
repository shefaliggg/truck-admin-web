import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import './Bookings.css';
import api from '../services/api';
import FormField from '../components/FormField';
import getErrorMessage from '../utils/errorHandler';

const TABS = [
  { id: 'all', label: 'All' },
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

  const [assignTarget, setAssignTarget] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assignError, setAssignError] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

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

  const openAssignModal = async (load) => {
    setAssignTarget(load);
    setSelectedDriver('');
    setAssignError('');
    try {
      const res = await api.get('/admin/drivers/approved');
      setDrivers(res.data.drivers || []);
    } catch (err) {
      setAssignError(getErrorMessage(err));
    }
  };

  const closeAssignModal = () => {
    if (!assignLoading) setAssignTarget(null);
  };

  const handleAssignDriver = async (event) => {
    event.preventDefault();
    if (!selectedDriver) {
      setAssignError('Select a driver');
      return;
    }
    setAssignLoading(true);
    try {
      await api.post(`/admin/bookings/${assignTarget.id}/assign`, { driverId: selectedDriver });
      toast.success('Driver assigned', { description: 'The load now follows the rate-confirmation flow.' });
      setAssignTarget(null);
      fetchLoads();
    } catch (err) {
      setAssignError(err?.response?.data?.message || getErrorMessage(err));
    } finally {
      setAssignLoading(false);
    }
  };

  if (loading && loads.length === 0) {
    return <div className="bookings-loading">Loading loads...</div>;
  }

  return (
    <div className="bookings-page">
      <Toaster position="top-right" richColors />

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
              <th>Route</th>
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
                <td>{load.pickup || 'N/A'} → {load.delivery || 'N/A'}</td>
                <td>
                  <span className={`loads-quotes ${load.quoteCount > 0 ? 'has-quotes' : ''}`}>{load.quoteCount}</span>
                  {load.lowestQuote != null && <div className="loads-quote-low">from {formatMoney(load.lowestQuote)}</div>}
                </td>
                <td><span className={`loads-stage loads-stage-${load.stage}`}>{STAGE_LABEL[load.stage]}</span></td>
                <td>{formatDate(load.pickupDate)}</td>
                <td>{load.driver || <span className="no-driver">Not assigned</span>}</td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn view-btn" onClick={() => onViewBooking?.(load.id)}>View</button>
                    {!load.driver && (
                      <button className="action-btn assign-btn" onClick={() => openAssignModal(load)}>Assign Driver</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLoads.length === 0 && <div className="no-data">No loads found for this view.</div>}
      </div>

      {assignTarget && (
        <div className="modal-overlay" onClick={closeAssignModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Assign Driver</h2>
            <p className="modal-booking-info">
              {assignTarget.loadNumber}: {assignTarget.pickup || 'N/A'} → {assignTarget.delivery || 'N/A'}
            </p>
            <form className="modal-form" onSubmit={handleAssignDriver} noValidate>
              <FormField
                as="select"
                label="Driver"
                id="load-assign-driver"
                value={selectedDriver}
                error={assignError}
                disabled={assignLoading}
                onChange={(e) => { setSelectedDriver(e.target.value); setAssignError(''); }}
              >
                <option value="">-- Select approved driver --</option>
                {drivers.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.userId?.firstName} {driver.userId?.lastName}
                    {driver.truckId?.truckType ? ` · ${driver.truckId.truckType}` : ''}
                  </option>
                ))}
              </FormField>
              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={closeAssignModal} disabled={assignLoading}>Cancel</button>
                <button type="submit" className="btn btn-confirm" disabled={assignLoading}>
                  {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
