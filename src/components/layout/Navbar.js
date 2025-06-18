import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navbar.css';

// English only translations
const t = {
  login: "Login",
  signup: "Sign Up",
  logout: "Log Out",
  dashboard: "Dashboard",
  home: "Home",
  user: "User",
  projectTool: "Project Management Tool"
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Track display name separately to ensure we update when it changes
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  
  // Update displayName whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
    }
  }, [currentUser]);

  const path = location.pathname;

  const isHomePage = path === '/';
  const isAuthPage = ['/login', '/register', '/reset-password'].includes(path);
  const isDashboard = path === '/dashboard';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const renderDesktopLinks = () => {
    if (isHomePage) {
      return (
        <>
          <Link to="/login" className="navbar-link">{t.login}</Link>
          <Link to="/register" className="navbar-button navbar-button-signup">{t.signup}</Link>
        </>
      );
    }

    if (isAuthPage) {
      return (
        <>
          <Link to="/" className="navbar-link">{t.home}</Link>
        </>
      );
    }

    if (currentUser) {
      return (
        <>
          {!isDashboard && (
            <Link to="/dashboard" className="navbar-link">{t.dashboard}</Link>
          )}
          <button onClick={handleLogout} className="navbar-button navbar-button-logout">{t.logout}</button>
          <button
            className="navbar-user-button"
            onClick={() => navigate(`/user/${currentUser.uid}`)}
          >
            <div className="avatar small">
              {displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <span className="user-name">{displayName || t.user}</span>
          </button>
        </>
      );
    }

    return null;
  };

  const renderMobileLinks = () => {
    if (isHomePage) {
      return (
        <>
          <Link to="/login" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>{t.login}</Link>
          <Link to="/register" className="navbar-mobile-button" onClick={() => setMenuOpen(false)}>{t.signup}</Link>
        </>
      );
    }

    if (isAuthPage) {
      return (
        <>
          <Link to="/" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>{t.home}</Link>
        </>
      );
    }

    if (currentUser) {
      return (
        <>
          {!isDashboard && (
            <Link to="/dashboard" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>{t.dashboard}</Link>
          )}
          <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="navbar-mobile-button">{t.logout}</button>
          <button
            className="navbar-mobile-button"
            onClick={() => { 
              navigate(`/user/${currentUser.uid}`); 
              setMenuOpen(false); 
            }}
          >
            {displayName || t.user}
          </button>
        </>
      );
    }

    return null;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={currentUser ? "/dashboard" : "/"} className="navbar-logo">
          <svg xmlns="http://www.w3.org/2000/svg" className="navbar-logo-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          <span className="navbar-logo-text">{t.projectTool}</span>
        </Link>

        <div className="navbar-links">
          {renderDesktopLinks()}
        </div>

        <button className="navbar-menu-button" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="navbar-mobile-menu">
          {renderMobileLinks()}
        </div>
      )}
    </nav>
  );
}