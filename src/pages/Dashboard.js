import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster, toast } from 'sonner';
import {
  FiRefreshCw,
  FiPackage,
  FiActivity,
  FiUserX,
  FiTruck,
  FiCheckCircle,
  FiAlertTriangle,
  FiPlus,
} from 'react-icons/fi';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api from '../services/api';
import FormField from '../components/FormField';
import getErrorMessage from '../utils/errorHandler';
import './Dashboard.css';

const STAGES = [
  { id: 'posted', label: 'Posted' },
  { id: 'awaiting_driver', label: 'Awaiting Driver' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'at_pickup', label: 'At Pickup' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'at_delivery', label: 'At Delivery' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.label]));

const FLAGS = [
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'driver_declined', label: 'Driver Declined' },
  { id: 'pickup_soon', label: 'Pickup Approaching' },
  { id: 'delayed', label: 'Delayed' },
  { id: 'delivery_issue', label: 'Delivery Issue' },
  { id: 'missing_docs', label: 'Missing Documents' },
];

const FLAG_LABEL = Object.fromEntries(FLAGS.map((f) => [f.id, f.label]));
const NEEDS_DRIVER_FLAGS = ['unassigned', 'driver_declined'];

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
};

const formatMoney = (value) => `$${Number(value || 0).toLocaleString()}`;

const timeAgo = (value) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Categorical slots 1-4 from the validated data-viz palette (fixed order).
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const AXIS_TICK = { fontSize: 11, fill: '#64748b' };
const GRID_STROKE = '#e2e8f0';

const shortDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const ChartTooltip = ({ active, payload, label, labelFormatter, valueFormatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dash-tooltip">
      <div className="dash-tooltip-title">{labelFormatter ? labelFormatter(label) : label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="dash-tooltip-row">
          <span className="dash-swatch" style={{ background: entry.color || entry.payload?.fill }} />
          <span>{entry.name}</span>
          <strong>{valueFormatter ? valueFormatter(entry.value) : entry.value}</strong>
        </div>
      ))}
    </div>
  );
};

const ChartEmpty = ({ children }) => <div className="dash-chart-empty">{children}</div>;

const Route = ({ load }) => (
  <span className="dash-route">
    {load.pickup || 'N/A'} <span className="dash-route-arrow">→</span> {load.delivery || 'N/A'}
  </span>
);

const AssignDriverModal = ({ loads, initialLoadId, onClose, onAssigned }) => {
  const [loadId, setLoadId] = useState(initialLoadId || '');
  const [drivers, setDrivers] = useState([]);
  const [driverId, setDriverId] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/drivers/approved')
      .then((res) => setDrivers(res.data?.drivers || []))
      .catch((err) => setErrors({ form: getErrorMessage(err) }));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!loadId) next.load = 'Select a load';
    if (!driverId) next.driver = 'Select a driver';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setSaving(true);
    try {
      await api.post(`/admin/bookings/${loadId}/assign`, { driverId });
      toast.success('Driver assigned', { description: 'The load now follows the rate-confirmation flow.' });
      onAssigned();
    } catch (err) {
      setErrors({ form: err?.response?.data?.message || getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form className="dash-assign-form" onSubmit={handleSubmit} noValidate>
          <h2>Assign Driver</h2>
          <FormField
            as="select"
            label="Load"
            id="dash-assign-load"
            value={loadId}
            error={errors.load}
            disabled={saving}
            onChange={(e) => { setLoadId(e.target.value); setErrors({}); }}
          >
            <option value="">-- Select load --</option>
            {loads.map((load) => (
              <option key={load.id} value={load.id}>
                {load.loadNumber} · {load.pickup || 'N/A'} → {load.delivery || 'N/A'}
              </option>
            ))}
          </FormField>
          <FormField
            as="select"
            label="Driver"
            id="dash-assign-driver"
            value={driverId}
            error={errors.driver}
            disabled={saving}
            onChange={(e) => { setDriverId(e.target.value); setErrors({}); }}
          >
            <option value="">-- Select approved driver --</option>
            {drivers.map((driver) => (
              <option key={driver._id} value={driver._id}>
                {driver.userId?.firstName} {driver.userId?.lastName}
                {driver.truckId?.truckType ? ` · ${driver.truckId.truckType}` : ''}
              </option>
            ))}
          </FormField>
          {errors.form && <div className="form-field-error">{errors.form}</div>}
          <div className="dash-assign-actions">
            <button type="button" className="dash-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="dash-btn-primary" disabled={saving}>
              {saving ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Dashboard = ({
  onNavigate,
  onAddShipper,
  onAddDriver,
  onAddBooking,
  onViewBooking,
  onViewTrip,
  onOpenBookings,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flagFilter, setFlagFilter] = useState('all');
  const [assignModal, setAssignModal] = useState(null);
  const [headerSlot, setHeaderSlot] = useState(null);

  // The quick actions live in the app header (Layout renders the slot).
  useEffect(() => {
    setHeaderSlot(document.getElementById('header-actions-slot'));
  }, []);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/dashboard/overview');
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading && !data) return <div className="dashboard-loading">Loading Dashboard...</div>;
  if (!data) {
    return (
      <div className="dashboard">
        <div className="dash-error">{error || 'Could not load the dashboard.'}</div>
        <button className="dash-btn-primary" onClick={fetchOverview}>Retry</button>
      </div>
    );
  }

  const { kpis, attention, activeLoads, stageCounts, trend, drivers, shippers, activity, financial } = data;
  const goToBookings = (assignment) => (onOpenBookings ? onOpenBookings(assignment) : onNavigate?.('bookings'));

  const kpiCards = [
    { label: 'Total Loads', value: kpis.totalLoads, icon: <FiPackage size={22} />, tone: 'blue', onClick: () => goToBookings('all') },
    { label: 'Active Loads', value: kpis.activeLoads, icon: <FiActivity size={22} />, tone: 'purple', onClick: () => goToBookings('assigned') },
    { label: 'Unassigned', value: kpis.unassignedLoads, icon: <FiUserX size={22} />, tone: 'orange', onClick: () => goToBookings('unassigned') },
    { label: 'In Transit', value: kpis.inTransit, icon: <FiTruck size={22} />, tone: 'blue', onClick: () => onNavigate?.('trips') },
    { label: 'Delivered', value: kpis.delivered, icon: <FiCheckCircle size={22} />, tone: 'green', onClick: () => goToBookings('all') },
    {
      label: 'Exceptions / Delayed',
      value: kpis.exceptions,
      icon: <FiAlertTriangle size={22} />,
      tone: 'red',
      onClick: () => document.getElementById('dash-attention')?.scrollIntoView({ behavior: 'smooth' }),
    },
  ];

  const attentionLoads = attention.loads.filter((load) => flagFilter === 'all' || load.flags.includes(flagFilter));
  const unassignedLoads = attention.loads.filter((load) => load.flags.some((flag) => NEEDS_DRIVER_FLAGS.includes(flag)));

  const trendHasData = trend.some((day) => day.posted || day.delivered);
  const stageData = STAGES.map((stage) => ({ ...stage, count: stageCounts[stage.id] || 0 }));
  const hasLoads = stageData.some((stage) => stage.count > 0);

  const financialData = [
    { name: 'Total Revenue', amount: financial.totalRevenue },
    { name: 'Shipper Charges', amount: financial.shipperCharges },
    { name: 'Pending Payments', amount: financial.pendingPayments },
    { name: 'Driver Payouts', amount: financial.driverPayouts },
    { name: 'Outstanding Payouts', amount: financial.outstandingAmounts },
  ];
  const hasMoney = financialData.some((row) => row.amount > 0);

  // Partition of all drivers: on trip / available / offline / inactive (sums to the driver total).
  const approvedWorking = drivers.onTrip + drivers.available;
  const driverMix = [
    { id: 'onTrip', label: 'On Trip', value: drivers.onTrip, color: SERIES[0], text: '#fff' },
    { id: 'available', label: 'Available', value: drivers.available, color: SERIES[2] },
    { id: 'offline', label: 'Offline', value: drivers.offline, color: SERIES[1] },
    { id: 'inactive', label: 'Inactive', value: drivers.inactive, color: SERIES[3] },
  ];
  const driverTotal = driverMix.reduce((sum, item) => sum + item.value, 0);

  const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

  return (
    <div className="dashboard">
      <Toaster position="top-right" richColors />

      {headerSlot && createPortal(
        <>
          <button className="dash-btn-primary" onClick={onAddBooking}><FiPlus size={14} /> Create Load</button>
          <button className="dash-btn-secondary" onClick={() => setAssignModal({ loadId: '' })}>Assign Driver</button>
          <button className="dash-btn-secondary" onClick={onAddShipper}><FiPlus size={14} /> Add Shipper</button>
          <button className="dash-btn-secondary" onClick={onAddDriver}><FiPlus size={14} /> Add Driver</button>
          <button className="dash-btn-secondary" onClick={() => goToBookings('all')}>View All Loads</button>
          <button className="dash-btn-secondary" onClick={fetchOverview} disabled={loading} aria-label="Refresh dashboard" title="Refresh">
            <FiRefreshCw size={15} className={loading ? 'dash-spin' : ''} />
          </button>
        </>,
        headerSlot
      )}

      {error &&<div className="dash-error">{error}</div>}

      <div className="stats-grid">
        {kpiCards.map((card) => (
          <button key={card.label} type="button" className={`stat-card stat-card-clickable tone-${card.tone}`} onClick={card.onClick}>
            <div className={`stat-icon ${card.tone}`}>{card.icon}</div>
            <div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="dash-two-col dash-two-col-wide">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h3>Load Volume</h3>
              <p className="dash-panel-sub">Posted vs delivered, last 14 days</p>
            </div>
            <div className="dash-legend">
              <span><i style={{ background: SERIES[0] }} />Posted</span>
              <span><i style={{ background: SERIES[1] }} />Delivered</span>
            </div>
          </div>
          {trendHasData ? (
            <div className="dash-chart" role="img" aria-label="Line chart of loads posted and delivered per day over the last 14 days">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dash-grad-posted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="dash-grad-delivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[1]} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={SERIES[1]} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip labelFormatter={shortDate} />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} />
                  <Area type="monotone" dataKey="posted" name="Posted" stroke={SERIES[0]} strokeWidth={2} fill="url(#dash-grad-posted)" dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="delivered" name="Delivered" stroke={SERIES[1]} strokeWidth={2} fill="url(#dash-grad-delivered)" dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmpty>No loads posted or delivered in the last 14 days.</ChartEmpty>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h3>Load Status</h3>
              <p className="dash-panel-sub">All loads by stage</p>
            </div>
          </div>
          {hasLoads ? (
            <div className="dash-chart" role="img" aria-label="Bar chart of load counts by stage">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stageData} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }} barCategoryGap={8}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={104} tick={{ ...AXIS_TICK, fill: '#334155' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} load${v === 1 ? '' : 's'}`} />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                  <Bar dataKey="count" name="Loads" fill={SERIES[0]} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} label={{ position: 'right', fill: '#0f172a', fontSize: 11, fontWeight: 700 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmpty>No loads yet.</ChartEmpty>
          )}
        </section>
      </div>

      <section className="dash-panel" id="dash-attention">
        <div className="dash-panel-head">
          <div>
            <h3>Loads Requiring Attention</h3>
            <p className="dash-panel-sub">Most urgent first</p>
          </div>
        </div>
        <div className="dash-chips">
          <button type="button" className={`dash-chip ${flagFilter === 'all' ? 'active' : ''}`} onClick={() => setFlagFilter('all')}>
            All ({attention.loads.length})
          </button>
          {FLAGS.map((flag) => (
            <button
              key={flag.id}
              type="button"
              className={`dash-chip ${flagFilter === flag.id ? 'active' : ''}`}
              onClick={() => setFlagFilter(flag.id)}
            >
              {flag.label} ({attention.counts[flag.id] || 0})
            </button>
          ))}
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Load #</th><th>Shipper</th><th>Route</th><th>Driver</th><th>Status</th><th>Pickup</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {attentionLoads.length === 0 ? (
                <tr><td colSpan="7" className="dash-empty">Nothing needs attention right now.</td></tr>
              ) : attentionLoads.map((load) => (
                <tr key={load.id}>
                  <td className="dash-mono">{load.loadNumber}</td>
                  <td>{load.shipper}</td>
                  <td><Route load={load} /></td>
                  <td>{load.driver || <span className="dash-muted">Not assigned</span>}</td>
                  <td>
                    <div className="dash-status-stack">
                      <span className={`dash-stage dash-stage-${load.stage}`}>{STAGE_LABEL[load.stage]}</span>
                      {load.flags.map((flag) => (
                        <span key={flag} className={`dash-flag dash-flag-${flag}`}>{FLAG_LABEL[flag]}</span>
                      ))}
                    </div>
                  </td>
                  <td>{formatDate(load.pickupDate)}</td>
                  <td>
                    <div className="dash-row-actions">
                      <button className="dash-link-btn" onClick={() => onViewBooking?.(load.id)}>View</button>
                      {load.flags.some((flag) => NEEDS_DRIVER_FLAGS.includes(flag)) && (
                        <button className="dash-link-btn strong" onClick={() => setAssignModal({ loadId: load.id })}>Assign Driver</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h3>Active Loads</h3>
            <p className="dash-panel-sub">Assigned and moving</p>
          </div>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Load #</th><th>Shipper</th><th>Driver</th><th>Pickup → Delivery</th>
                <th>Pickup Date</th><th>Delivery Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeLoads.length === 0 ? (
                <tr><td colSpan="8" className="dash-empty">No active loads.</td></tr>
              ) : activeLoads.map((load) => (
                <tr key={load.id}>
                  <td className="dash-mono">{load.loadNumber}</td>
                  <td>{load.shipper}</td>
                  <td>{load.driver || <span className="dash-muted">Not assigned</span>}</td>
                  <td><Route load={load} /></td>
                  <td>{formatDate(load.pickupDate)}</td>
                  <td>{formatDate(load.deliveryDate)}</td>
                  <td><span className={`dash-stage dash-stage-${load.stage}`}>{STAGE_LABEL[load.stage]}</span></td>
                  <td>
                    <div className="dash-row-actions">
                      <button className="dash-link-btn" onClick={() => onViewBooking?.(load.id)}>View</button>
                      {load.tripId && <button className="dash-link-btn" onClick={() => onViewTrip?.(load.tripId)}>Track</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="dash-two-col">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h3>Driver Overview</h3>
              <p className="dash-panel-sub">{driverTotal} drivers · {approvedWorking} approved and working</p>
            </div>
            <button className="dash-link-btn strong" onClick={() => onNavigate?.('drivers')}>View Drivers</button>
          </div>
          {driverTotal > 0 ? (
            <>
              <div className="dash-stackbar" role="img" aria-label={`Driver mix: ${driverMix.map((i) => `${i.value} ${i.label}`).join(', ')}`}>
                {driverMix.filter((item) => item.value > 0).map((item) => (
                  <div
                    key={item.id}
                    className="dash-stackbar-seg"
                    style={{ flexGrow: item.value, background: item.color, color: item.text || '#0f172a' }}
                    title={`${item.label}: ${item.value}`}
                  >
                    {item.value}
                  </div>
                ))}
              </div>
              <div className="dash-legend-grid">
                {driverMix.map((item) => (
                  <div key={item.id}>
                    <i style={{ background: item.color }} />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{pct(item.value, driverTotal)}%</em>
                  </div>
                ))}
              </div>
              <div className="dash-foot-note">
                {drivers.pendingApproval} awaiting approval · {drivers.online} online now
              </div>
            </>
          ) : (
            <ChartEmpty>No drivers yet.</ChartEmpty>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h3>Shipper Overview</h3>
              <p className="dash-panel-sub">{shippers.total} shippers</p>
            </div>
            <button className="dash-link-btn strong" onClick={() => onNavigate?.('users')}>View Shippers</button>
          </div>
          <div className="dash-meter-list">
            <div className="dash-meter">
              <div className="dash-meter-top"><span>Active (have open loads)</span><strong>{shippers.active} / {shippers.total}</strong></div>
              <div className="dash-meter-track"><div style={{ width: `${pct(shippers.active, shippers.total)}%`, background: SERIES[0] }} /></div>
            </div>
            <div className="dash-meter">
              <div className="dash-meter-top"><span>Pending onboarding</span><strong>{shippers.pendingOnboarding} / {shippers.total}</strong></div>
              <div className="dash-meter-track"><div style={{ width: `${pct(shippers.pendingOnboarding, shippers.total)}%`, background: SERIES[3] }} /></div>
            </div>
          </div>
          <h4 className="dash-subhead">Recent Shippers</h4>
          {shippers.recent.length === 0 ? (
            <div className="dash-empty">No shippers yet.</div>
          ) : (
            <ul className="dash-list">
              {shippers.recent.map((shipper) => (
                <li key={shipper.id}>
                  <span className="dash-avatar">{shipper.name?.[0]?.toUpperCase() || '?'}</span>
                  <span className="dash-list-name">{shipper.name}</span>
                  <span className="dash-muted">{formatDate(shipper.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="dash-two-col">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h3>Recent Activity</h3>
              <p className="dash-panel-sub">Latest events across loads</p>
            </div>
          </div>
          {activity.length === 0 ? (
            <ChartEmpty>No activity yet.</ChartEmpty>
          ) : (
            <ul className="dash-timeline">
              {activity.map((item, index) => (
                <li key={`${item.type}-${item.at}-${index}`}>
                  <span className={`dash-dot dash-dot-${item.type}`} />
                  <div>
                    <div>{item.text}</div>
                    <div className="dash-muted">{timeAgo(item.at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h3>Financial Summary</h3>
              <p className="dash-panel-sub">Amounts in USD</p>
            </div>
          </div>
          {hasMoney ? (
            <div className="dash-chart" role="img" aria-label="Bar chart of revenue, charges, pending payments, payouts and outstanding payouts">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={financialData} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }} barCategoryGap={10}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={128} tick={{ ...AXIS_TICK, fill: '#334155' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip valueFormatter={formatMoney} />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                  <Bar dataKey="amount" name="Amount" fill={SERIES[0]} radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false} label={{ position: 'right', fill: '#0f172a', fontSize: 11, fontWeight: 700, formatter: formatMoney }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmpty>No invoices or payouts yet.</ChartEmpty>
          )}
          <div className="dash-fin-list">
            {financialData.map((row) => (
              <div key={row.name}><span>{row.name}</span><strong>{formatMoney(row.amount)}</strong></div>
            ))}
          </div>
        </section>
      </div>

      {assignModal && (
        <AssignDriverModal
          loads={unassignedLoads}
          initialLoadId={assignModal.loadId}
          onClose={() => setAssignModal(null)}
          onAssigned={() => { setAssignModal(null); fetchOverview(); }}
        />
      )}
    </div>
  );
};

export default Dashboard;
