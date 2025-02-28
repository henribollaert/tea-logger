import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import TeaLogger from './components/TeaLogger';
import Settings from './components/Settings';
import SessionDetails from './components/SessionDetails';
import AllSessions from './components/AllSessions';
import TeaCollection from './components/TeaCollection';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TeaLogger />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/session/:id" element={<SessionDetails />} />
          <Route path="/sessions" element={<AllSessions />} />
          <Route path="/collection" element={<TeaCollection />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;