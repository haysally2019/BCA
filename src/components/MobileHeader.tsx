import React from 'react';
import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  onMenuToggle: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuToggle }) => {
  return (
    <header className="bg-slate-950 text-white h-16 flex items-center px-4 shadow-sm border-b border-slate-800">
      <button
        onClick={onMenuToggle}
        className="p-2 -ml-2 mr-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center border border-blue-500/30 shadow-inner">
          <img
            src="/bca.png"
            alt="BCA"
            className="w-5 h-5 object-contain brightness-100 invert-0"
          />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-none tracking-tight text-slate-100">
            Sales Portal
          </h1>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
            Blue Collar Academy
          </p>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;