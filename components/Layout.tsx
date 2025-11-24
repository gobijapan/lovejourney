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
    <div className="flex flex-col h-screen w-full relative overflow-hidden bg-white dark:bg-slate-950">
      {/* Main Content Area */}
      {/* Added pt-[calc(env(safe-area-inset-top)+1rem)] to ensure content starts below Dynamic Island */}
      <div 
        className="flex-1 overflow-y-auto pb-24 relative z-10 scroll-smooth no-scrollbar"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }} 
      >
        {children}
      </div>

      {/* Bottom Navigation Glass Bar */}
      <div className="fixed bottom-0 left-0 w-full z-50 px-2 pb-4 pt-2 mb-[env(safe-area-inset-bottom)]">
        <div className="glass rounded-3xl shadow-lg border border-white/40 dark:border-white/10">
          <div className="flex justify-between items-center px-2 py-2">
            {navItems.map((item, index) => {
              const isActive = currentView === item.id;
              // We use inline styles for the active color to ensure it matches the user-selected theme immediately
              const activeStyle = isActive ? {
                color: 'rgb(var(--theme-rgb))'
              } : {};
              
              const isCenter = index === 2; // Home is now at index 2

              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 w-full ${
                    isActive ? 'transform -translate-y-1' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div 
                    className={`p-2 rounded-2xl transition-all duration-300 ${
                      isActive ? 'shadow-lg' : 'text-slate-500 dark:text-slate-400'
                    } ${isCenter ? 'scale-110' : ''}`}
                    style={isActive ? { backgroundColor: 'rgb(var(--theme-rgb))', color: 'white', boxShadow: '0 4px 14px 0 rgba(var(--theme-rgb), 0.39)' } : {}}
                  >
                    <item.icon size={isCenter ? 24 : 20} fill={isActive && item.id === AppView.HOME ? "currentColor" : "none"} strokeWidth={2.5} />
                  </div>
                  <span 
                    className={`text-[9px] font-bold ${isActive ? '' : 'text-slate-500 dark:text-slate-500'}`}
                    style={activeStyle}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;