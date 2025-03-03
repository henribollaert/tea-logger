// src/App.js - Enhanced with Error Boundary
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import TeaLogger from './components/TeaLogger';
import Settings from './components/Settings';
import SessionDetails from './components/SessionDetails';
import AllSessions from './components/AllSessions';
import TeaCollection from './components/TeaCollection';
import VendorManagement from './components/VendorManagement';
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
  // Add Roboto font
  React.useEffect(() => {
    // Add Google Fonts link dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
    document.head.appendChild(link);
    
    return () => {
      // Cleanup
      document.head.removeChild(link);
    };
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <div className="App">
          <Routes>
            <Route path="/" element={<TeaLogger />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/session/:id" element={<SessionDetails />} />
            <Route path="/sessions" element={<AllSessions />} />
            <Route path="/collection" element={<TeaCollection />} />
            <Route path="/vendors" element={<VendorManagement />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;