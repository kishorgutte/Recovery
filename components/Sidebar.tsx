import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Upload, Settings, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/consumers', icon: Users, label: 'Consumer List' },
    { to: '/import', icon: Upload, label: 'Import' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-4 flex items-center justify-between border-b border-slate-700">
          <div className="font-bold text-xl text-blue-400">MRA Assistant</div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-800 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => onClose()} // Close on mobile when clicked
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-600 text-white font-medium' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          Offline Capable • v1.8.0
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
