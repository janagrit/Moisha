import React from 'react';
import { Bot, Clock, Play, Sparkles, Coins, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  isScanning: boolean;
  onTriggerScan: () => void;
  lastScannedTime: string | null;
  agentStatus: 'standby' | 'scanning' | 'alert' | 'ok';
}

export const Navbar: React.FC<NavbarProps> = ({
  isScanning,
  onTriggerScan,
  lastScannedTime,
  agentStatus
}) => {
  return (
    <header className="border-b border-amber-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 flex items-center justify-center shadow-md shadow-blue-900/15 ring-2 ring-amber-300">
            <span className="text-xl select-none" role="img" aria-label="Moisha">🕎</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-extrabold text-2xl tracking-tight text-blue-950">
                MOISHA
              </span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300/80 uppercase tracking-wider font-bold shadow-xs">
                Wise Pocket Advisor
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block font-medium">
              Real Estate Savvy • Neighbor Rate Sentinel • 1114 Florida Ave NE
            </p>
          </div>
        </div>

        {/* Center: Moisha's Watch Status */}
        <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#FAF8F5] border border-amber-200/70 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                agentStatus === 'alert' ? 'bg-amber-400' : isScanning ? 'bg-blue-400' : 'bg-emerald-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                agentStatus === 'alert' ? 'bg-amber-600' : isScanning ? 'bg-blue-600' : 'bg-emerald-600'
              }`}></span>
            </span>
            <span className="text-slate-700 font-semibold">
              {isScanning ? 'Moisha is checking Florida Ave neighbors...' : agentStatus === 'alert' ? 'Oy Vey: 5 Empty Days Need Action' : 'Market In Harmony'}
            </span>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Morning Review: <strong className="text-slate-800">8:00 AM</strong></span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {lastScannedTime && (
            <span className="text-xs text-slate-500 hidden lg:inline-block font-mono bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
              Checked: {lastScannedTime}
            </span>
          )}

          <button
            onClick={onTriggerScan}
            disabled={isScanning}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
              isScanning
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-300'
                : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white shadow-blue-900/20 active:scale-95 ring-1 ring-blue-950'
            }`}
          >
            {isScanning ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                <span>Moisha is analyzing...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-amber-300" />
                <span>Consult Uncle Moisha</span>
              </>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
