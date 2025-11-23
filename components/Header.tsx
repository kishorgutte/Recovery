import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  rightAction?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, onMenuClick, rightAction }) => {
  return (
    <header className="sticky top-0 z-30 bg-blue-700 text-white shadow-md px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="p-1 rounded hover:bg-blue-600 focus:outline-none lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold tracking-wide truncate max-w-[200px] sm:max-w-md">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {rightAction}
      </div>
    </header>
  );
};

export default Header;