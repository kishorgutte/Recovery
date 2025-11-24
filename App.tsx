import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ConsumerList from './pages/ConsumerList';
import ConsumerDetail from './pages/ConsumerDetail';
import ImportData from './pages/ImportData';
import Settings from './pages/Settings';

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <Router>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
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
};

export default App;