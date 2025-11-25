
import React from 'react';
import { Heart, Image, MapPin, Settings, CalendarClock } from 'lucide-react';
import { AppView } from '../types';

interface LayoutProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, children }) => {
  // Reordered: Plans -> Memories -> HOME -> Places -> Settings
  const navItems = [
    { id: AppView.PLANS, icon: CalendarClock, label: 'Dự Định' },
    { id: AppView.MEMORIES, icon: Image, label: 'Kỷ Niệm' },
    { id: AppView.HOME, icon: Heart, label: 'Tình Yêu' }, // Center
    { id: AppView.PLACES, icon: MapPin, label: 'Hẹn Hò' },
    { id: AppView.SETTINGS, icon: Settings, label: 'Cài Đặt' },
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full relative overflow-hidden bg-white dark:bg-slate-950">
      {/* Main Content Area */}
      {/* Increased padding top and bottom for safe areas */}
      <div 
        className="flex-1 overflow-y-auto pb-48 relative z-10 scroll-smooth no-scrollbar"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }} 
      >
        {children}
      </div>

      {/* Bottom Navigation Bar - Full Width Fixed */}
      <div className="fixed bottom-0 left-0 w-full z-50 glass border-t border-slate-200/50 dark:border-slate-800/50 pb-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl transition-all">
        <div className="flex justify-between items-center px-2 py-3">
            {navItems.map((item, index) => {
              const isActive = currentView === item.id;
              const isCenter = index === 2; // Home is now at index 2

              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 flex-1 ${
                    isActive ? '' : 'opacity-60 hover:opacity-100 text-slate-500 dark:text-slate-400'
                  }`}
                  style={isActive && !isCenter ? { color: 'rgb(var(--theme-rgb))' } : {}}
                >
                  <div 
                    className={`transition-all duration-300 flex items-center justify-center ${
                       isCenter 
                        ? `w-12 h-12 rounded-full shadow-lg ${isActive ? 'scale-105 shadow-theme-500/40' : ''}` 
                        : ''
                    }`}
                    style={isCenter ? { backgroundColor: 'rgb(var(--theme-rgb))', color: 'white' } : {}}
                  >
                    <item.icon 
                        size={24} 
                        fill={isActive && item.id === AppView.HOME ? "currentColor" : "none"} 
                        strokeWidth={2.5} 
                    />
                  </div>
                  
                  {!isCenter && (
                      <span className="text-[10px] font-bold leading-none">
                        {item.label}
                      </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default Layout;
