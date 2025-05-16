// components/layout/Layout.js
import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 pt-20">
        {children}
      </main>
    </div>
  );
}
