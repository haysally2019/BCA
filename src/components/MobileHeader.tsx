import React from 'react';
import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  onMenuToggle: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuToggle }) => {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 shadow-sm z-30 flex items-center px-3">
      <button
        onClick={onMenuToggle}
        className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors mr-2 touch-manipulation"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>
      <div className="flex items-center space-x-2">
        <img
          src="/bca.png"
          alt="Blue Collar Academy Logo"
          className="w-8 h-8 object-contain"
        />
        <div className="text-sm font-semibold text-gray-900">BCA Sales Portal</div>
      </div>
    </div>
  );
};

export default MobileHeader;
