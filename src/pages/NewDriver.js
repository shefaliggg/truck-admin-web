import React, { useState } from 'react';
import api from '../services/api';
import FormField from '../components/FormField';
import './NewDriver.css';

const PLAN_OPTIONS = [
  { type: '10', percent: 10, desc: 'Brokerage only' },
  { type: '12', percent: 12, desc: 'Brokerage + Fuel discounts' },
  { type: '17', percent: 17, desc: 'Fuel + Cargo Insurance' },
  { type: '20', percent: 20, desc: 'Full bundle coverage' },
];

const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'];

const validateField = (field, value, currentForm) => {
  switch (field) {
    case 'firstName':
    case 'lastName':
    case 'email':
    case 'phone':
      return value.trim() ? '' : 'Required';
    case 'password':
      if (!value) return 'Required';
      if (value.length < 6) return 'Must be at least 6 characters';
      return '';
    case 'confirmPassword':
      if (!value) return 'Required';
      if (value !== currentForm.password) return 'Passwords do not match';
      return '';
    default:
      return '';
  }
};

const NewDriver = ({ onSuccess, onCancel }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
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
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const msg = validateField(field, value, nextForm);
      if (msg) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const handlePlanChange = (type, percent) => {
    setForm((prev) => ({ ...prev, planType: type, planPercentage: percent }));
  };

  const validate = () => {
    const newErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      const msg = validateField(field, form[field], form);
      if (msg) newErrors[field] = msg;
    });
    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});
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
      <form className="new-driver-form" onSubmit={handleSubmit} noValidate>
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
            <FormField
              wrapperClassName="new-driver-field"
              label="First Name"
              id="driver-first-name"
              type="text"
              value={form.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
              error={errors.firstName}
            />
            <FormField
              wrapperClassName="new-driver-field"
              label="Last Name"
              id="driver-last-name"
              type="text"
              value={form.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              required
              error={errors.lastName}
            />
            <FormField
              wrapperClassName="new-driver-field new-driver-field-wide"
              label="Email"
              id="driver-email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              error={errors.email}
            />
            <FormField
              wrapperClassName="new-driver-field new-driver-field-wide"
              label="Phone"
              id="driver-phone"
              type="text"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              required
              error={errors.phone}
            />
            <FormField
              wrapperClassName="new-driver-field"
              label="Password"
              id="driver-password"
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
              error={errors.password}
            />
            <FormField
              wrapperClassName="new-driver-field"
              label="Confirm Password"
              id="driver-confirm-password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              required
              error={errors.confirmPassword}
            />
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
