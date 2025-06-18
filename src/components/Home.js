import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

export default function Home() {
  const { currentUser } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    if (currentUser) {
      navigate('/dashboard');
    }

    return () => clearTimeout(timer);
  }, [currentUser, navigate]);

  return (
    <div className={`hero ${isLoaded ? 'loaded' : ''}`}>
      <div className="text-center">
        <h1>
          <span>Project Management</span>
          <span>Your all-in-one solution for project tracking</span>
        </h1>
        <p>
          Simple, fast, and easy-to-use project management platform. Create, organize,
          and control your projects with just a few clicks.
        </p>

        <div className="features">
          <div className="feature-card">
            <div className="icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              </svg>
            </div>
            <h3>Task Management</h3>
            <p>Organize your tasks efficiently and track progress with our intuitive interface.</p>
          </div>

          <div className="feature-card">
            <div className="icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3>Team Collaboration</h3>
            <p>Collaborate seamlessly with your team members in real-time.</p>
          </div>

          <div className="feature-card">
            <div className="icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zM15 19V9a2 2 0 012-2h2a2 2 0 012 2v10M15 19a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14z" />
              </svg>
            </div>
            <h3>Analytics & Reports</h3>
            <p>Get insightful analytics and reports to track your project performance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
