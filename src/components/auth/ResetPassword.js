// components/auth/ResetPassword.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AuthStyles.css';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = error || message ? setTimeout(() => {
      setError('');
      setMessage('');
    }, 4000) : null;

    return () => timer && clearTimeout(timer);
  }, [error, message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await resetPassword(email);
      setMessage('✅ Password reset email sent successfully.');
    } catch (err) {
      setError('⚠️ Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">🔐</div>
        <h2 className="auth-title">Reset Password</h2>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            className={`auth-button ${loading ? 'auth-button-loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login" className="auth-link">Back to Login</Link>
          <Link to="/register" className="auth-link">Create Account</Link>
        </div>

        <div className="auth-info">
          Enter your email address and we’ll send you a link to reset your password.
        </div>
      </div>
    </div>
  );
}
