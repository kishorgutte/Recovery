import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ConsumerList from './pages/ConsumerList';
import ConsumerDetail from './pages/ConsumerDetail';
import ImportData from './pages/ImportData';
import Settings from './pages/Settings';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        
        <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden">
            <Routes>
                <Route path="/" element={<Dashboard toggleSidebar={toggleSidebar} />} />
                <Route path="/consumers" element={<ConsumerList toggleSidebar={toggleSidebar} />} />
                <Route path="/consumers/:id" element={<ConsumerDetail />} /> 
                <Route path="/import" element={<ImportData toggleSidebar={toggleSidebar} />} />
                <Route path="/settings" element={<Settings toggleSidebar={toggleSidebar} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
      </div>
    </Router>
  );
}