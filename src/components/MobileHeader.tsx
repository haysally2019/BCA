import React from 'react';
import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  onMenuToggle: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuToggle }) => {
  const handleToggle = () => {
    console.log('Mobile menu toggle clicked');
    onMenuToggle();
  };

  return (
    <div
      className="
        md:hidden fixed top-0 left-0 right-0 h-14 z-50
        flex items-center px-3
        bg-slate-950/95 backdrop-blur-xl
        border-b border-slate-800
        shadow-[0_4px_20px_rgba(0,0,0,0.7)]
      "
    >
      <button
        onClick={handleToggle}
        className="
          mr-2 rounded-xl p-2.5
          text-slate-200
          hover:bg-slate-800/70
          active:scale-[0.98]
          transition
          touch-manipulation
        "
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center space-x-2 min-w-0">
        <img
          src="/bca.png"
          alt="Blue Collar Academy Logo"
          className="w-8 h-8 object-contain rounded-md border border-slate-800/60 bg-slate-900"
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-100 leading-tight">
            BCA Sales Portal
          </span>
          <span className="text-[11px] text-slate-400 leading-tight">
            Roofing CRM & Sales Hub
          </span>
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;