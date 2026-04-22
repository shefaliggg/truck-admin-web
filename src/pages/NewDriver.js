import React, { useState } from 'react';
import api from '../services/api';
import './NewDriver.css';

const PLAN_OPTIONS = [
  { type: '10', percent: 10, desc: 'Brokerage only' },
  { type: '12', percent: 12, desc: 'Brokerage + Fuel discounts' },
  { type: '17', percent: 17, desc: 'Fuel + Cargo Insurance' },
  { type: '20', percent: 20, desc: 'Full bundle coverage' },
];

const NewDriver = ({ onSuccess, onCancel }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    planType: '10',
    planPercentage: 10,
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlanChange = (type, percent) => {
    setForm((prev) => ({ ...prev, planType: type, planPercentage: percent }));
  };

  const validate = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password || !form.confirmPassword) {
      return 'Please fill all fields';
    }
    if (form.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (form.password !== form.confirmPassword) {
      return 'Passwords do not match';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await api.post('/admin/drivers', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        planType: form.planType,
        planPercentage: form.planPercentage,
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create driver');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-driver-page">
      <form className="new-driver-form" onSubmit={handleSubmit}>
        <section className="new-driver-card">
          <h3>Select Service Plan</h3>
          <div className="new-driver-plan-grid">
            {PLAN_OPTIONS.map((plan) => {
              const selected = form.planType === plan.type;
              return (
                <button
                  key={plan.type}
                  type="button"
                  className={`new-driver-plan-card ${selected ? 'selected' : ''}`}
                  onClick={() => handlePlanChange(plan.type, plan.percent)}
                >
                  <div>
                    <strong>{plan.percent}%</strong>
                    <p>{plan.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="new-driver-card">
          <h3>Driver Account Details</h3>
          <div className="new-driver-grid">
            <div className="new-driver-field">
              <label htmlFor="driver-first-name">First Name</label>
              <input
                id="driver-first-name"
                type="text"
                value={form.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
              />
            </div>
            <div className="new-driver-field">
              <label htmlFor="driver-last-name">Last Name</label>
              <input
                id="driver-last-name"
                type="text"
                value={form.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
              />
            </div>
            <div className="new-driver-field new-driver-field-wide">
              <label htmlFor="driver-email">Email</label>
              <input
                id="driver-email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>
            <div className="new-driver-field new-driver-field-wide">
              <label htmlFor="driver-phone">Phone</label>
              <input
                id="driver-phone"
                type="text"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
              />
            </div>
            <div className="new-driver-field">
              <label htmlFor="driver-password">Password</label>
              <input
                id="driver-password"
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
              />
            </div>
            <div className="new-driver-field">
              <label htmlFor="driver-confirm-password">Confirm Password</label>
              <input
                id="driver-confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section className="new-driver-card">
          <p className="new-driver-note">
            A verification link will be sent to the driver email after creation.
          </p>
          {error && <div className="new-driver-error">{error}</div>}
          <div className="new-driver-actions">
            <button type="button" className="new-driver-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="new-driver-submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Driver'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
};

export default NewDriver;
