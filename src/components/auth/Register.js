// components/auth/Register.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AuthStyles.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const evaluatePasswordStrength = (password) => {
    if (!password) return '';
    
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;
    
    const strength = [hasLower, hasUpper, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  useEffect(() => {
    setPasswordStrength(evaluatePasswordStrength(password));
  }, [password]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!agreeToTerms) {
      return setError('You must agree to the terms to register');
    }

    if (password !== passwordConfirm) {
      return setError('Passwords do not match');
    }

    if (passwordStrength === 'weak') {
      return setError('Please choose a stronger password');
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password, displayName);
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      setError('Account could not be created: ' + (error.message || 'Please check your information'));
    } finally {
      setLoading(false);
    }
  }

  const getPasswordFeedback = () => {
    if (!password) return null;

    const messages = {
      weak: 'Weak: Please choose a stronger password',
      medium: 'Medium: Getting better, consider making it even stronger',
      strong: 'Strong: Great password!'
    };

    return (
      <div>
        <div className={`password-strength ${passwordStrength}`}></div>
        <p className={`password-info ${passwordStrength}`}>{messages[passwordStrength]}</p>
      </div>
    );
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">A</div>
        <h2 className="auth-title">Create a New Account</h2>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="display-name" className="form-label">Full Name</label>
            <input
              id="display-name"
              name="displayName"
              type="text"
              required
              className="form-input"
              placeholder="Your full name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email-address" className="form-label">Email Address</label>
            <input
              id="email-address"
              name="email"
              type="email"
              required
              className="form-input"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="form-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength="8"
              />
              <span 
                className="password-toggle" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🔓" : "🔒"}
              </span>
            </div>
            {getPasswordFeedback()}
          </div>

          <div className="form-group">
            <label htmlFor="password-confirm" className="form-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password-confirm"
                name="passwordConfirm"
                type={showConfirmPassword ? "text" : "password"}
                required
                className="form-input"
                placeholder="Re-enter your password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
              />
              <span 
                className="password-toggle" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? "🔓" : "🔒"}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', fontSize: '0.875rem', color: '#4b5563' }}>
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                style={{ marginRight: '0.5rem', marginTop: '0.2rem' }}
                required
              />
              <span>
                I have read and agree to the <Link to="/terms" className="auth-link">Terms of Service</Link> and{' '}
                <Link to="/privacy" className="auth-link">Privacy Policy</Link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`auth-button ${loading ? 'auth-button-loading' : ''}`}
          >
            {loading ? 'Registering...' : 'Sign Up'}
          </button>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
