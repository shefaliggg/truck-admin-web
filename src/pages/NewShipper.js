import React, { useState } from 'react';
import api from '../services/api';
import './NewShipper.css';

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (India)' },
  { code: '+1', label: '+1 (USA)' },
  { code: '+971', label: '+971 (UAE)' },
];

const NewShipper = ({ onSuccess, onCancel }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
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
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password || !form.confirmPassword) {
      return 'Please fill all fields';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Please enter a valid email address';
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
      <form className="new-shipper-form" onSubmit={handleSubmit}>
        <section className="new-shipper-card">
          <h3>Shipper Account Details</h3>
          <div className="new-shipper-grid">
            <div className="new-shipper-field">
              <label htmlFor="shipper-first-name">First Name</label>
              <input
                id="shipper-first-name"
                type="text"
                value={form.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
              />
            </div>
            <div className="new-shipper-field">
              <label htmlFor="shipper-last-name">Last Name</label>
              <input
                id="shipper-last-name"
                type="text"
                value={form.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
              />
            </div>

            <div className="new-shipper-field new-shipper-field-wide">
              <label htmlFor="shipper-email">Email</label>
              <input
                id="shipper-email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>

            <div className="new-shipper-field new-shipper-field-wide">
              <label htmlFor="shipper-country-code">Phone</label>
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
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Phone number"
                  required
                />
              </div>
            </div>

            <div className="new-shipper-field">
              <label htmlFor="shipper-password">Password</label>
              <input
                id="shipper-password"
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
              />
            </div>
            <div className="new-shipper-field">
              <label htmlFor="shipper-confirm-password">Confirm Password</label>
              <input
                id="shipper-confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                required
              />
            </div>
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
