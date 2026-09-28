import React, { useState } from 'react';
import api from '../services/api';
import FormField from '../components/FormField';
import './NewShipper.css';

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (India)' },
  { code: '+1', label: '+1 (USA)' },
  { code: '+971', label: '+971 (UAE)' },
];

const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'];

const validateField = (field, value, currentForm) => {
  switch (field) {
    case 'firstName':
    case 'lastName':
      return value.trim() ? '' : 'Required';
    case 'email':
      if (!value.trim()) return 'Required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
      return '';
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

const NewShipper = ({ onSuccess, onCancel }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+91',
    password: '',
    confirmPassword: '',
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

      await api.post('/admin/users', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: `${form.countryCode}${form.phone.trim()}`,
        password: form.password,
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create shipper');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-shipper-page">
      <form className="new-shipper-form" onSubmit={handleSubmit} noValidate>
        <section className="new-shipper-card">
          <h3>Shipper Account Details</h3>
          <div className="new-shipper-grid">
            <FormField
              wrapperClassName="new-shipper-field"
              label="First Name"
              id="shipper-first-name"
              type="text"
              value={form.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
              error={errors.firstName}
            />
            <FormField
              wrapperClassName="new-shipper-field"
              label="Last Name"
              id="shipper-last-name"
              type="text"
              value={form.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              required
              error={errors.lastName}
            />

            <FormField
              wrapperClassName="new-shipper-field new-shipper-field-wide"
              label="Email"
              id="shipper-email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              error={errors.email}
            />

            <div className="new-shipper-field new-shipper-field-wide">
              <label htmlFor="shipper-phone">Phone</label>
              <div className="new-shipper-phone-row">
                <select
                  id="shipper-country-code"
                  value={form.countryCode}
                  onChange={(e) => handleChange('countryCode', e.target.value)}
                >
                  {COUNTRY_CODES.map((country) => (
                    <option key={country.code} value={country.code}>{country.label}</option>
                  ))}
                </select>
                <input
                  id="shipper-phone"
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Phone number"
                  required
                  style={errors.phone ? { borderColor: 'var(--danger)' } : undefined}
                />
              </div>
              {errors.phone && <div className="new-shipper-field-error">{errors.phone}</div>}
            </div>

            <FormField
              wrapperClassName="new-shipper-field"
              label="Password"
              id="shipper-password"
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
              error={errors.password}
            />
            <FormField
              wrapperClassName="new-shipper-field"
              label="Confirm Password"
              id="shipper-confirm-password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              required
              error={errors.confirmPassword}
            />
          </div>
        </section>

        <section className="new-shipper-card">
          <p className="new-shipper-note">
            A verification link will be sent to this shipper email after account creation.
          </p>
          {error && <div className="new-shipper-error">{error}</div>}
          <div className="new-shipper-actions">
            <button type="button" className="new-shipper-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="new-shipper-submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Shipper'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
};

export default NewShipper;
