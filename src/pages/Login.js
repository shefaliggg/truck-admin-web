import React, { useState } from 'react';
import * as authService from '../services/auth';
import getErrorMessage from '../utils/errorHandler';
import FormField from '../components/FormField';
import './Login.css';

const validateField = (field, value) => {
  if (field === 'email') return value.trim() ? '' : 'Required';
  if (field === 'password') return value ? '' : 'Required';
  return '';
};

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setErrors((prev) => {
      if (!prev.email) return prev;
      if (validateField('email', value)) return prev;
      const { email: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setErrors((prev) => {
      if (!prev.password) return prev;
      if (validateField('password', value)) return prev;
      const { password: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    const emailError = validateField('email', email);
    if (emailError) newErrors.email = emailError;
    const passwordError = validateField('password', password);
    if (passwordError) newErrors.password = passwordError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    setError('');
    try {
      const result = await authService.login(email, password);
      if (result.user.role !== 'admin') {
        setError('Only admins can access this area. Please login with an admin account.');
        authService.logout();
        return;
      }
      onLoginSuccess(result.user);
    } catch (err) {
      const friendlyError = getErrorMessage(err);
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">🚛 CP Admin</h1>
        <form onSubmit={handleSubmit} noValidate>
          <FormField
            wrapperClassName="form-group"
            label="Email"
            id="login-email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="admin@example.com"
            disabled={loading}
            required
            error={errors.email}
          />
          <FormField
            wrapperClassName="form-group"
            label="Password"
            id="login-password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Your password"
            disabled={loading}
            required
            error={errors.password}
          />
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
