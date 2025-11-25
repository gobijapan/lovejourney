
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
    <div className="flex flex-col h-[100dvh] w-full relative overflow-hidden transition-colors duration-500">
      {/* Main Content Area */}
      {/* Sử dụng biến env() để đảm bảo nội dung luôn nằm dưới Dynamic Island và trên thanh Dock */}
      {/* Increased padding bottom to pb-8 to work in conjunction with spacers in views */}
      <div 
        className="flex-1 w-full overflow-y-auto relative z-10 scroll-smooth no-scrollbar"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)' }} 
      >
        {children}
      </div>

      {/* Bottom Navigation Bar - Full Width Fixed */}
      {/* Áp dụng padding-bottom dựa trên safe-area-inset-bottom để tránh thanh Home ảo */}
      <div className="fixed bottom-0 left-0 w-full z-50 glass border-t border-white/20 dark:border-white/10 pb-[env(safe-area-inset-bottom)] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl transition-all shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-end w-full px-1">
            {navItems.map((item, index) => {
              const isActive = currentView === item.id;
              const isCenter = index === 2; // Home is now at index 2

              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`flex flex-col items-center justify-end py-2 transition-all duration-300 flex-1 h-[60px] ${
                    isActive ? '' : 'opacity-60 hover:opacity-100 text-slate-500 dark:text-slate-400'
                  }`}
                  style={isActive && !isCenter ? { color: 'rgb(var(--theme-rgb))' } : {}}
                >
                  <div 
                    className={`transition-all duration-300 flex items-center justify-center ${
                       isCenter 
                        ? `w-10 h-10 rounded-full mb-1 shadow-md ${isActive ? 'scale-110 shadow-theme-500/50' : ''}` 
                        : ''
                    }`}
                    style={isCenter ? { backgroundColor: 'rgb(var(--theme-rgb))', color: 'white' } : {}}
                  >
                    <item.icon 
                        size={isCenter ? 20 : 22} 
                        fill={isActive && item.id === AppView.HOME ? "currentColor" : "none"} 
                        strokeWidth={isCenter ? 2 : 2.5} 
                    />
                  </div>
                  
                  {!isCenter && (
                      <span className={`text-[10px] font-bold leading-none mt-1 ${isActive ? 'scale-110' : ''}`}>
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
