
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Layout from './components/Layout';
import HeartCanvas from './components/HeartCanvas';
import { PLACE_CATEGORIES, getGoogleMapsLink } from './services/geminiService';
import { dbService } from './services/db';
import { 
  CoupleData, Memory, PlanItem, AppView, DetailedTime 
} from './types';
import { 
  calculateDetailedTime, getNextMilestone, getZodiacSign, formatDateVN, hexToRgb
} from './utils/helpers';
import { 
  Calendar, MapPin, CheckCircle2, Lock, Heart, Trash2, Sun, Image as ImageIcon, Plus, Clock, Pin, X, Shield, LogOut, Palette, LayoutTemplate, Edit2, Search, AlertCircle, Camera, BellRing, Bell, History, Sliders, ChevronDown, Share, Loader2, Play, ExternalLink, Navigation, AlertTriangle, MessageSquare, Download, Upload, ChevronLeft, ChevronRight
} from 'lucide-react';

// --- THEME CONSTANTS ---
const FONTS: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  rounded: 'font-rounded',
  fun: 'font-fun',
  classic: 'font-classic',
  modern: 'font-modern',
  handwriting: 'font-handwriting'
};

const FONT_OPTIONS = [
    { id: 'sans', name: 'Tiêu chuẩn' },
    { id: 'serif', name: 'Trang trọng' },
    { id: 'rounded', name: 'Tròn trịa' },
    { id: 'fun', name: 'Vui vẻ' },
    { id: 'classic', name: 'Cổ điển' },
    { id: 'modern', name: 'Hiện đại' },
    { id: 'handwriting', name: 'Viết tay' },
];

const DEFAULT_DATA: CoupleData = {
  startDate: new Date().toISOString(),
  bgImage: null,
  bgOpacity: 0.6,
  cardOpacity: 0.6, // Default opacity for cards
  partner1Name: "Anh",
  partner2Name: "Em",
  partner1Dob: "",
  partner2Dob: "",
  partner1Avatar: null,
  partner2Avatar: null,
  securityPin: null,
  themeEffect: 'hearts',
  countFromDayOne: true,
  themeColor: '#fa3452',
  fontStyle: 'sans',
  showTimeDetails: false,
  globalBackground: false,
  notifications: {
      anniversary: true,
      valentine: true,
      holidays: true,
      onThisDay: true
  },
  reminderDays: [0, 1] // Default: On the day (0) and 1 day before
};

// --- HELPER FUNCTIONS ---
const resizeImage = (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        if (base64Str.startsWith('data:video')) {
            resolve(base64Str);
            return;
        }

        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str);
    });
};

// --- PORTAL COMPONENT ---
const Portal = ({ children }: { children?: React.ReactNode }) => {
    return createPortal(children, document.body);
};

// --- CONFIRMATION MODAL ---
const ConfirmModal: React.FC<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel: () => void 
}> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if(!isOpen) return null;
    return (
        <Portal>
            <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onCancel}>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl w-full max-w-xs shadow-2xl animate-scale-up border border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-3">
                            <AlertTriangle size={24}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Hủy
                        </button>
                        <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/30">
                            Xóa
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

// --- HELPER COMPONENTS ---
const SafeDisplay = ({ value, label }: { value: number, label: string }) => {
  const safeValue = isNaN(value) ? 0 : value;
  return (
    <div className="flex flex-col items-center">
      <span className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-none">{String(safeValue).padStart(2,'0')}</span>
      <span className="text-[10px] uppercase text-slate-500 font-medium tracking-wide">{label}</span>
    </div>
  );
};

// --- MÀN HÌNH CHÍNH (HOME) ---
const HomeView: React.FC<{ data: CoupleData, plans: PlanItem[], memories: Memory[] }> = ({ data, plans, memories }) => {
  const [time, setTime] = useState<DetailedTime>(calculateDetailedTime(data.startDate, data.countFromDayOne));
  const milestone = getNextMilestone(data.startDate);
  const [activeReminders, setActiveReminders] = useState<{title: string, date: string, type: 'event'|'plan'|'memory'}[]>([]);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
      if ('Notification' in window && Notification.permission === 'default') {
          setTimeout(() => {
              Notification.requestPermission();
          }, 3000);
      }
  }, []);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isIOS && !isStandalone) {
        const hasSeen = sessionStorage.getItem('ios_pwa_prompt');
        if(!hasSeen) {
            setShowIOSPrompt(true);
            sessionStorage.setItem('ios_pwa_prompt', 'true');
        }
    }
  }, []);
  
  useEffect(() => {
    setTime(calculateDetailedTime(data.startDate, data.countFromDayOne));
    const timer = setInterval(() => {
        setTime(calculateDetailedTime(data.startDate, data.countFromDayOne));
    }, 1000);
    return () => clearInterval(timer);
  }, [data.startDate, data.countFromDayOne]);

  useEffect(() => {
      const reminders: {title: string, date: string, type: 'event'|'plan'|'memory'}[] = [];
      const now = new Date();
      const today = new Date();
      today.setHours(0,0,0,0);
      const reminderDays = data.reminderDays || [0];

      const checkAndNotify = (title: string, body: string) => {
          if ('Notification' in window && Notification.permission === 'granted') {
              const key = `notified_${title}_${today.toDateString()}`;
              if (!sessionStorage.getItem(key)) {
                  new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' });
                  sessionStorage.setItem(key, 'true');
              }
          }
      }

      const checkDate = (targetDateStr: string, title: string, type: 'event'|'plan', specificReminderTime?: string) => {
          const target = new Date(targetDateStr);
          target.setHours(0,0,0,0);
          if(isNaN(target.getTime())) return;

          if (type === 'plan') {
              const diffTime = target.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (reminderDays.includes(diffDays)) {
                  reminders.push({ title: `${title} (Còn ${diffDays} ngày)`, date: targetDateStr, type });
              }

              if (specificReminderTime) {
                  const remTime = new Date(specificReminderTime);
                  if (remTime.getDate() === now.getDate() && 
                      remTime.getMonth() === now.getMonth() && 
                      remTime.getFullYear() === now.getFullYear()) {
                       if (now.getTime() >= remTime.getTime()) {
                           reminders.push({ title: `Đến giờ: ${title}`, date: specificReminderTime, type });
                           checkAndNotify("Nhắc nhở từ LoveJourney", `Đã đến giờ cho dự định: ${title}`);
                       }
                  }
              }
          } else {
              [0, 1].forEach(offset => {
                  const t = new Date(target);
                  t.setFullYear(today.getFullYear() + offset);
                  const diffTime = t.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                   if (reminderDays.includes(diffDays) && diffDays >= 0) {
                      reminders.push({ title: `${title} (Còn ${diffDays} ngày)`, date: t.toISOString(), type });
                      if(diffDays === 0) checkAndNotify("Ngày quan trọng!", `Hôm nay là ${title}`);
                  }
              });
          }
      };

      plans.filter(p => !p.completed).forEach(p => checkDate(p.targetDate, p.title, 'plan', p.reminderEnabled ? p.reminderTime : undefined));
      if (data.notifications?.anniversary) checkDate(data.startDate, "Kỷ Niệm Ngày Yêu", 'event');
      if (data.partner1Dob) checkDate(data.partner1Dob, `Sinh nhật ${data.partner1Name}`, 'event');
      if (data.partner2Dob) checkDate(data.partner2Dob, `Sinh nhật ${data.partner2Name}`, 'event');

      if (data.notifications?.onThisDay) {
          memories.forEach(mem => {
              const d = new Date(mem.date);
              if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() !== today.getFullYear()) {
                  const yearsAgo = today.getFullYear() - d.getFullYear();
                  reminders.push({ 
                      title: `Ngày này ${yearsAgo} năm trước: ${mem.title}`, 
                      date: mem.date, 
                      type: 'memory' 
                  });
              }
          });
      }

      const uniqueReminders = reminders.filter((v,i,a)=>a.findIndex(v2=>(v2.title===v.title))===i);
      setActiveReminders(uniqueReminders);
  }, [data, plans, memories]);

  const pinnedPlans = plans
      .filter(p => p.isPinned && !p.completed)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

  const getDaysUntilPlan = (targetDate: string) => {
    const d = new Date(targetDate);
    if (isNaN(d.getTime())) return 0;
    const diff = d.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  return (
    <div className={`flex flex-col items-center min-h-full pb-20 relative ${FONTS[data.fontStyle] || FONTS.sans}`}>
      {!data.globalBackground && (
          <div 
            className="fixed inset-0 -z-10 bg-cover bg-center transition-all duration-700"
            style={{ 
              backgroundImage: `url(${data.bgImage || "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=2070&auto=format&fit=crop"})`,
              opacity: data.bgOpacity
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-theme-50/20 via-white/10 to-theme-50/50 dark:from-slate-900/40 dark:via-slate-900/20 dark:to-slate-950/60"></div>
          </div>
      )}

      {showIOSPrompt && (
          <div className="fixed top-20 left-4 right-4 z-50 animate-fade-in-up">
              <div className="glass-card bg-white/95 dark:bg-slate-800/95 p-4 rounded-2xl shadow-2xl border border-theme-200 flex items-start gap-4 relative">
                   <button onClick={() => setShowIOSPrompt(false)} className="absolute top-2 right-2 text-slate-400"><X size={16}/></button>
                   <div className="p-3 bg-theme-100 rounded-xl">
                       <Share size={24} className="text-theme-500"/>
                   </div>
                   <div className="flex-1">
                       <h4 className="font-bold text-sm text-slate-800 dark:text-white">Cài đặt LoveJourney</h4>
                       <p className="text-xs text-slate-500 mt-1 mb-2">Để trải nghiệm Full màn hình, hãy thêm vào màn hình chính.</p>
                       <div className="text-xs font-bold text-theme-600 flex items-center gap-1">
                           Nhấn nút <Share size={12}/> bên dưới trình duyệt và chọn "Thêm vào MH chính"
                       </div>
                   </div>
              </div>
          </div>
      )}

      <div className="relative z-10 w-full flex flex-col items-center px-4 animate-fade-in-up mt-4">
        
        {/* Avatars */}
        <div className="flex items-center justify-between w-full max-w-xs mb-8">
            <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full border-[5px] border-white dark:border-slate-800 shadow-xl overflow-hidden relative bg-slate-200 transition-transform hover:scale-105">
                    {data.partner1Avatar ? <img src={data.partner1Avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Ảnh</div>}
                </div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-slate-800 dark:text-white drop-shadow-md shadow-white">{data.partner1Name}</span>
                    <span className="text-[10px] uppercase text-theme-600 font-bold tracking-wider">{getZodiacSign(data.partner1Dob)}</span>
                </div>
            </div>

            <Heart className="text-theme-500 fill-theme-500 animate-pulse mt-[-30px] drop-shadow-lg" size={48} strokeWidth={1.5} />

            <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full border-[5px] border-white dark:border-slate-800 shadow-xl overflow-hidden relative bg-slate-200 transition-transform hover:scale-105">
                     {data.partner2Avatar ? <img src={data.partner2Avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Ảnh</div>}
                </div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-slate-800 dark:text-white drop-shadow-md shadow-white">{data.partner2Name}</span>
                    <span className="text-[10px] uppercase text-theme-600 font-bold tracking-wider">{getZodiacSign(data.partner2Dob)}</span>
                </div>
            </div>
        </div>

        {activeReminders.length > 0 && (
            <div className="w-full max-w-sm mb-6 space-y-2">
                {activeReminders.map((r, i) => (
                     <div key={i} className={`backdrop-blur-md border p-3 rounded-2xl flex items-start gap-3 animate-pulse-slow ${
                         r.type === 'memory' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-red-500/10 border-red-500/30'
                     }`}>
                        <div className={`p-2 rounded-full text-white shadow-lg ${r.type === 'memory' ? 'bg-purple-500 shadow-purple-500/40' : 'bg-red-500 shadow-red-500/40'}`}>
                            {r.type === 'memory' ? <History size={20} /> : <BellRing size={20} />}
                        </div>
                        <div className="flex-1">
                            <h4 className={`font-bold text-sm ${r.type === 'memory' ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
                                {r.type === 'memory' ? 'Kỷ Niệm Năm Xưa' : 'Nhắc Nhở Hôm Nay'}
                            </h4>
                            <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">{r.title}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Main Counter */}
        <div className="mb-6 relative group cursor-pointer w-full max-w-sm">
          <div className="glass rounded-3xl p-6 border-2 border-white/60 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
             <div className="text-theme-500 font-bold uppercase tracking-widest text-xs mb-2">Bên Nhau</div>
             
             <h1 className="text-6xl md:text-7xl font-bold text-theme-600 dark:text-theme-400 drop-shadow-sm leading-none pb-2 font-cursive">
               {isNaN(time.totalDays) ? 0 : time.totalDays}
             </h1>
             <span className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-4">Ngày</span>

             <div className="grid grid-cols-4 gap-4 w-full pt-4 border-t border-slate-200 dark:border-slate-700">
                 <SafeDisplay value={time.years} label="Năm" />
                 <SafeDisplay value={time.months} label="Tháng" />
                 <SafeDisplay value={time.weeks} label="Tuần" />
                 <SafeDisplay value={time.days} label="Ngày" />
             </div>
             
             {data.showTimeDetails && (
                 <div className="flex gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 w-full justify-center bg-theme-50/50 dark:bg-slate-800/50 rounded-xl py-2">
                     <div className="text-center w-12"><span className="block font-bold text-lg">{isNaN(time.hours) ? 0 : time.hours}</span><span className="text-[8px] uppercase">Giờ</span></div>
                     <span className="text-xl font-bold">:</span>
                     <div className="text-center w-12"><span className="block font-bold text-lg">{isNaN(time.minutes) ? 0 : time.minutes}</span><span className="text-[8px] uppercase">Phút</span></div>
                     <span className="text-xl font-bold">:</span>
                     <div className="text-center w-12"><span className="block font-bold text-lg">{isNaN(time.seconds) ? 0 : time.seconds}</span><span className="text-[8px] uppercase">Giây</span></div>
                 </div>
             )}
          </div>
        </div>

        {/* Pinned Plans */}
        {pinnedPlans.length > 0 && (
          <div className="w-full max-w-sm mb-4 space-y-2">
             <div className="flex items-center gap-2 mb-1 pl-1">
                 <Pin size={12} className="text-theme-500"/>
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã ghim</span>
             </div>
             {pinnedPlans.map(plan => {
                 const daysLeft = getDaysUntilPlan(plan.targetDate);
                 return (
                    <div key={plan.id} className="glass-card p-3 rounded-2xl flex items-center justify-between transition-transform active:scale-[0.98]">
                        <div className="flex-1 pr-2">
                            <h4 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{plan.title}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{new Date(plan.targetDate).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div className={`text-center px-3 py-1 rounded-xl min-w-[60px] ${daysLeft < 0 ? 'bg-red-100 text-red-600' : 'bg-theme-100 text-theme-600'}`}>
                            <span className="block text-lg font-bold leading-none">
                                {isNaN(daysLeft) ? '-' : (daysLeft < 0 ? 'Xong' : daysLeft)}
                            </span>
                            <span className="text-[8px] font-bold opacity-80">Ngày</span>
                        </div>
                    </div>
                 )
             })}
          </div>
        )}

        <div className="w-full max-w-sm space-y-3">
          <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Cột mốc tiếp theo</p>
              <h3 className="text-lg font-bold text-theme-600 dark:text-theme-400">{milestone.label}</h3>
              <p className="text-xs text-slate-500 mt-1">{milestone.targetDate}</p>
            </div>
            <div className="text-center bg-theme-100 dark:bg-theme-900/30 p-2 rounded-xl min-w-[70px]">
              <span className="block text-xl font-bold text-theme-600 dark:text-theme-400">{isNaN(milestone.daysLeft) ? 0 : milestone.daysLeft}</span>
              <span className="text-[9px] text-theme-600/70">Ngày nữa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MÀN HÌNH KỶ NIỆM (MEMORIES) ---
const MemoriesView: React.FC<{ 
    fontStyle: string, 
    memories: Memory[], 
    onSaveMemory: (m: Memory) => void, 
    onDeleteMemory: (id: string) => void,
    onUpdateMemory: (m: Memory) => void,
    onOpenMedia: (images: string[], index: number) => void
}> = ({ fontStyle, memories, onSaveMemory, onDeleteMemory, onUpdateMemory, onOpenMedia }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'gallery'>('timeline');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'memory' | 'media', idOrUrl: string } | null>(null);
  
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      if (formImages.length + fileList.length > 9) {
          alert("Tối đa 9 tệp cho một kỷ niệm.");
          return;
      }
      
      const files = Array.from(fileList) as File[];
      const processed: string[] = [];
      
      for(const file of files) {
          try {
              if (file.type.startsWith('video/') && file.size > 50 * 1024 * 1024) {
                  alert(`Video "${file.name}" quá lớn (Max 50MB)`);
                  continue;
              }

              const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(file);
              });
              
              const finalData = await resizeImage(base64, 800, 0.7);
              processed.push(finalData);
          } catch(err) {
              console.error("Error reading file", err);
          }
      }
      setFormImages(prev => [...prev, ...processed]);
    }
  };

  const openEdit = (mem: Memory) => {
    setEditingId(mem.id);
    setFormTitle(mem.title);
    setFormContent(mem.content);
    const validDate = !isNaN(new Date(mem.date).getTime()) ? new Date(mem.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setFormDate(validDate);
    const currentImages = mem.images || [];
    const legacyImage = mem.mediaUrl ? [mem.mediaUrl] : [];
    setFormImages(Array.from(new Set([...currentImages, ...legacyImage])));
    setShowForm(true);
  };

  const openNew = () => {
      setEditingId(null);
      setFormTitle('');
      setFormContent('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormImages([]);
      setShowForm(true);
  }

  const handleSave = () => {
    if (!formTitle.trim()) { alert("Vui lòng nhập tiêu đề!"); return; }
    
    const newMem: Memory = {
      id: editingId || Date.now().toString(),
      date: new Date(formDate).toISOString(),
      title: formTitle,
      content: formContent,
      type: formImages.length > 0 ? 'mixed' : 'text',
      images: formImages,
      tags: [],
    };
    
    onSaveMemory(newMem);
    setShowForm(false);
  };

  const requestDeleteMemory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirm({ type: 'memory', idOrUrl: id });
  }

  const requestDeleteMedia = (mediaUrl: string) => {
    setDeleteConfirm({ type: 'media', idOrUrl: mediaUrl });
  }

  const performDelete = () => {
      if (!deleteConfirm) return;
      
      if (deleteConfirm.type === 'memory') {
          onDeleteMemory(deleteConfirm.idOrUrl);
      } else {
          // Find memory with this media
          const mediaUrl = deleteConfirm.idOrUrl;
          const parentMem = memories.find(m => (m.images || []).includes(mediaUrl) || m.mediaUrl === mediaUrl);
          if(parentMem) {
              const updatedImages = (parentMem.images || []).filter(img => img !== mediaUrl);
              const updatedMediaUrl = parentMem.mediaUrl === mediaUrl ? undefined : parentMem.mediaUrl;
              const updatedMem = { ...parentMem, images: updatedImages, mediaUrl: updatedMediaUrl };
              onUpdateMemory(updatedMem);
          }
      }
      setDeleteConfirm(null);
  }
  
  const handleShare = async (e: React.MouseEvent, mem: Memory) => {
      e.stopPropagation();
      if (!navigator.share) {
          alert("Trình duyệt không hỗ trợ chia sẻ.");
          return;
      }

      const shareData = {
          title: `Kỷ niệm: ${mem.title}`,
          text: `${mem.title} - ${formatDateVN(mem.date)}\n${mem.content}`,
          url: window.location.origin 
      };

      try {
          await navigator.share(shareData);
      } catch (err: any) {
          if (err.name === 'AbortError') return;
          try {
              const { url, ...textOnlyData } = shareData;
              await navigator.share(textOnlyData);
          } catch (retryErr: any) {}
      }
  }

  const allGalleryImages = useMemo(() => {
    return memories.flatMap(m => m.images || (m.mediaUrl ? [m.mediaUrl] : []));
  }, [memories]);

  return (
    <div className={`flex flex-col h-full pt-10 px-4 ${FONTS[fontStyle] || FONTS.sans}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Kỷ Niệm</h2>
        <button onClick={openNew} className="bg-theme-500 text-white p-2 rounded-full shadow-lg shadow-theme-500/30"><Plus size={24} /></button>
      </div>
      
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-6">
        <button onClick={() => setActiveTab('timeline')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm text-theme-500' : 'text-slate-500'}`}>Dòng Thời Gian</button>
        <button onClick={() => setActiveTab('gallery')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'gallery' ? 'bg-white dark:bg-slate-700 shadow-sm text-theme-500' : 'text-slate-500'}`}>Thư Viện</button>
      </div>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal 
          isOpen={!!deleteConfirm}
          title={deleteConfirm?.type === 'memory' ? "Xóa Kỷ Niệm?" : "Xóa Ảnh/Video?"}
          message={deleteConfirm?.type === 'memory' ? "Bạn có chắc muốn xóa vĩnh viễn kỷ niệm này không?" : "Bạn có chắc muốn xóa ảnh/video này khỏi kỷ niệm không?"}
          onConfirm={performDelete}
          onCancel={() => setDeleteConfirm(null)}
      />

      {/* FORM MODAL */}
      {showForm && (
        <Portal>
            <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl animate-scale-up h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingId ? 'Sửa Kỷ Niệm' : 'Thêm Kỷ Niệm'}</h3>
                        <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <input type="text" placeholder="Tiêu đề..." className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl outline-none text-sm font-bold dark:text-white" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
                        <input type="date" className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl outline-none text-sm dark:text-white h-[46px] appearance-none" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                        <textarea placeholder="Chi tiết..." className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl outline-none text-sm min-h-[100px] resize-none dark:text-white" value={formContent} onChange={(e) => setFormContent(e.target.value)} />
                        
                        <div className="grid grid-cols-3 gap-2">
                            {formImages.map((media, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group bg-black">
                                    {media.startsWith('data:video') ? (
                                        <video src={media} className="w-full h-full object-cover opacity-80" />
                                    ) : (
                                        <img src={media} className="w-full h-full object-cover" />
                                    )}
                                    <button onClick={() => setFormImages(formImages.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><X size={12}/></button>
                                    {media.startsWith('data:video') && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Play className="text-white fill-white" size={20}/></div>}
                                </div>
                            ))}
                            {formImages.length < 9 && (
                                <div onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-50">
                                    <Plus size={20} className="text-slate-400" />
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*, video/mp4, video/webm" multiple onChange={handleImageSelect}/>
                        <p className="text-[10px] text-slate-400 text-center">Hỗ trợ Ảnh & Video (Max 1 phút / 50MB)</p>
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                        <button onClick={handleSave} className="w-full bg-theme-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-theme-500/30">Lưu</button>
                    </div>
                </div>
            </div>
        </Portal>
      )}

      <div className="flex-1 overflow-y-auto pb-24 pr-1 relative">
        {activeTab === 'timeline' && (
            <div className="flex flex-col space-y-6">
                {memories.length === 0 && <div className="text-center text-slate-400 mt-10">Chưa có kỷ niệm nào. <br/>Hãy bấm nút + để thêm nhé!</div>}
                
                {memories.map((mem, index) => {
                     const d = new Date(mem.date);
                     if(isNaN(d.getTime())) return null;
                     const currentMonthKey = `${d.getMonth() + 1}/${d.getFullYear()}`;
                     const prevMemDate = index > 0 ? new Date(memories[index - 1].date) : null;
                     const prevMonthKey = prevMemDate && !isNaN(prevMemDate.getTime()) ? `${prevMemDate.getMonth() + 1}/${prevMemDate.getFullYear()}` : '';
                     const showHeader = index === 0 || currentMonthKey !== prevMonthKey;

                     const memImages = mem.images || (mem.mediaUrl ? [mem.mediaUrl] : []);

                     return (
                        <div key={mem.id} className="relative px-2">
                             {showHeader && (
                                <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-950/90 backdrop-blur py-2 mb-4 border-b border-theme-100 dark:border-slate-800">
                                    <h3 className="text-xl font-bold text-theme-500 pl-4">{`Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`}</h3>
                                </div>
                             )}

                            <div className="ml-4 pl-6 border-l-2 border-slate-200 dark:border-slate-700 relative pb-2">
                                <div className="absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-theme-500 border-4 border-white dark:border-slate-950"></div>
                                <span className="text-xs font-bold text-slate-400 mb-1 block uppercase">{formatDateVN(mem.date)}</span>
                                
                                <div className="glass-card bg-white/40 dark:bg-slate-800/40 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-2 text-lg">{mem.title}</h3>
                                        <div className="flex gap-2">
                                            <button onClick={(e) => handleShare(e, mem)} className="text-slate-300 hover:text-blue-500"><Share size={16}/></button>
                                            <button onClick={() => openEdit(mem)} className="text-slate-300 hover:text-theme-500"><Edit2 size={16}/></button>
                                            <button onClick={(e) => requestDeleteMemory(e, mem.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    
                                    {memImages.length > 0 && (
                                        <div className={`grid gap-1 mb-3 rounded-xl overflow-hidden ${memImages.length === 1 ? 'grid-cols-1' : memImages.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                            {memImages.slice(0, 9).map((media, i) => (
                                                <div key={i} className="aspect-square cursor-pointer relative bg-black" onClick={() => onOpenMedia(memImages, i)}>
                                                    {media.startsWith('data:video') ? (
                                                        <>
                                                            <video src={media} className="w-full h-full object-cover opacity-90" />
                                                            <div className="absolute inset-0 flex items-center justify-center"><Play className="text-white fill-white" size={24}/></div>
                                                        </>
                                                    ) : (
                                                        <img src={media} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {mem.content && <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{mem.content}</p>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
        {activeTab === 'gallery' && (
             <div className="grid grid-cols-3 gap-1">
             {allGalleryImages.map((media, i) => (
                 <div key={i} className="aspect-square overflow-hidden cursor-pointer relative bg-black" onClick={() => onOpenMedia(allGalleryImages, i)}>
                     {media.startsWith('data:video') ? (
                        <>
                            <video src={media} className="w-full h-full object-cover opacity-90" />
                            <div className="absolute inset-0 flex items-center justify-center"><Play className="text-white fill-white" size={16}/></div>
                            <span className="absolute bottom-1 right-1 text-[8px] text-white bg-black/50 px-1 rounded">VIDEO</span>
                        </>
                     ) : (
                        <img src={media} className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
                     )}
                     <button 
                        className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); requestDeleteMedia(media); }}
                    >
                        <Trash2 size={12}/>
                    </button>
                 </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- MÀN HÌNH DỰ ĐỊNH (PLANS) ---
interface PlansViewProps {
    fontStyle: string;
    plans: PlanItem[];
    onSavePlan: (p: PlanItem) => void;
    onDeletePlan: (id: string) => void;
    onAddMemory: (mem: Memory) => void;
}

const PlansView: React.FC<PlansViewProps> = ({ fontStyle, plans, onSavePlan, onDeletePlan, onAddMemory }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formTitle, setFormTitle] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const openNew = () => {
        setEditingId(null);
        setFormTitle(""); setFormDesc(""); setFormPriority("medium"); 
        const tmr = new Date();
        tmr.setDate(tmr.getDate() + 1);
        const tmrStr = tmr.toISOString().split('T')[0];
        setFormDate(tmrStr);
        const defRem = new Date(tmr);
        defRem.setDate(defRem.getDate() - 1);
        defRem.setHours(7, 0, 0, 0);
        const offset = defRem.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(defRem.getTime() - offset)).toISOString().slice(0, 16);
        setReminderTime(localISOTime);
        setReminderEnabled(false);
        setIsModalOpen(true);
    };

    const openEdit = (plan: PlanItem) => {
        setEditingId(plan.id);
        setFormTitle(plan.title);
        setFormDesc(plan.description || "");
        setFormPriority(plan.priority || "medium");
        setFormDate(plan.targetDate.split('T')[0]);
        setReminderEnabled(plan.reminderEnabled || false);
        setReminderTime(plan.reminderTime || "");
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if(!formTitle.trim()) return;
        const newPlan: PlanItem = {
            id: editingId || Date.now().toString(),
            title: formTitle,
            description: formDesc,
            priority: formPriority,
            targetDate: formDate,
            isPinned: editingId ? plans.find(p => p.id === editingId)?.isPinned || false : false,
            completed: editingId ? plans.find(p => p.id === editingId)?.completed || false : false,
            reminderEnabled,
            reminderTime
        };
        
        onSavePlan(newPlan);
        setIsModalOpen(false);
    };

    const requestDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const performDelete = () => {
        if (deleteId) onDeletePlan(deleteId);
        setDeleteId(null);
    }

    const handleComplete = (e: React.MouseEvent, plan: PlanItem) => {
        e.stopPropagation();
        const updated = { ...plan, completed: !plan.completed };
        onSavePlan(updated);
        
        if (!plan.completed && confirm("Hoàn thành! Bạn có muốn lưu thành Kỷ Niệm không?")) {
            const newMem: Memory = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                title: `Hoàn thành: ${plan.title}`,
                content: `Đã hoàn thành dự định này!\n${plan.description || ""}`,
                type: 'text',
                images: [],
                tags: ['achievement'],
            };
            onAddMemory(newMem);
        }
    };

    const togglePin = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const plan = plans.find(p => p.id === id);
        if(plan) {
            const updated = { ...plan, isPinned: !plan.isPinned };
            onSavePlan(updated);
        }
    }

    const getDaysLeft = (dateStr: string) => {
        const d = new Date(dateStr);
        if(isNaN(d.getTime())) return 0;
        return Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    }

    const filteredPlans = plans
        .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'priority') {
                const pMap = { high: 3, medium: 2, low: 1 };
                return (pMap[b.priority] || 2) - (pMap[a.priority] || 2);
            }
            return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
        });

    return (
        <div className={`flex flex-col h-full pt-10 px-6 ${FONTS[fontStyle] || FONTS.sans}`}>
            <div className="text-center mb-6">
                <span className="text-theme-500 font-bold uppercase tracking-wider text-xs">Tương Lai</span>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">Dự Định Của Chúng Ta</h2>
            </div>

            <div className="flex gap-2 mb-6">
                 <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center px-3">
                     <Search size={16} className="text-slate-400" />
                     <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        className="bg-transparent border-none outline-none text-sm p-2 w-full dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                     />
                 </div>
                 <button onClick={() => setSortBy(sortBy === 'date' ? 'priority' : 'date')} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
                     {sortBy === 'date' ? <Calendar size={18} /> : <AlertCircle size={18} />}
                 </button>
                 <button onClick={openNew} className="p-3 bg-theme-500 rounded-xl text-white shadow-lg shadow-theme-500/30">
                     <Plus size={20} />
                 </button>
            </div>

            <ConfirmModal 
                isOpen={!!deleteId}
                title="Xóa dự định?"
                message="Bạn có chắc chắn muốn xóa dự định này không?"
                onConfirm={performDelete}
                onCancel={() => setDeleteId(null)}
            />

            {isModalOpen && (
                <Portal>
                    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-xl animate-scale-up max-h-[85vh] overflow-y-auto">
                            <h3 className="text-lg font-bold mb-4 dark:text-white">{editingId ? 'Sửa Dự Định' : 'Thêm Dự Định'}</h3>
                            <input type="text" placeholder="Tên dự định..." className="w-full mb-3 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg outline-none font-bold dark:text-white" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                            
                            <div className="flex gap-2 mb-3">
                                {['low', 'medium', 'high'].map(p => (
                                    <button 
                                        key={p}
                                        onClick={() => setFormPriority(p as any)}
                                        className={`flex-1 py-1 rounded-lg text-xs font-bold uppercase border-2 ${formPriority === p ? 'border-theme-500 bg-theme-50 text-theme-600' : 'border-slate-100 text-slate-400'}`}
                                    >
                                        {p === 'low' ? 'Thấp' : p === 'medium' ? 'Vừa' : 'Cao'}
                                    </button>
                                ))}
                            </div>

                            <textarea placeholder="Chi tiết (tùy chọn)..." className="w-full mb-3 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg outline-none text-sm min-h-[80px] dark:text-white" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
                            <label className="text-xs text-slate-500 block mb-1">Ngày dự kiến</label>
                            <input type="date" className="w-full mb-4 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg outline-none dark:text-white h-[46px] appearance-none" value={formDate} onChange={e => setFormDate(e.target.value)} />
                            
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><BellRing size={12}/> Nhắc tôi</span>
                                    <input type="checkbox" checked={reminderEnabled} onChange={e => setReminderEnabled(e.target.checked)} className="accent-theme-500 w-4 h-4"/>
                                </div>
                                {reminderEnabled && (
                                    <input type="datetime-local" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="w-full bg-transparent border-b border-slate-200 text-sm outline-none dark:text-white"/>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-slate-200 rounded-lg font-bold text-slate-600">Hủy</button>
                                <button onClick={handleSave} className="flex-1 py-2 bg-theme-500 rounded-lg font-bold text-white">Lưu</button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            <div className="flex-1 overflow-y-auto pb-24 space-y-4">
                {filteredPlans.map(plan => {
                    const days = getDaysLeft(plan.targetDate);
                    return (
                        <div key={plan.id} className={`glass-card p-4 rounded-2xl border transition-all ${plan.completed ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200' : 'bg-white/40 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700 shadow-sm'}`}>
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {plan.priority === 'high' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                        {plan.priority === 'medium' && <span className="w-2 h-2 rounded-full bg-yellow-500"></span>}
                                        {plan.priority === 'low' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                        <h3 className={`font-bold text-lg ${plan.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>{plan.title}</h3>
                                    </div>
                                    {plan.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{plan.description}</p>}
                                </div>
                                <div className="flex gap-1 pl-2">
                                    <button 
                                        onClick={(e) => togglePin(e, plan.id)} 
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${plan.isPinned ? 'bg-theme-500 text-white' : 'bg-slate-100 text-slate-300 hover:text-theme-500'}`}
                                    >
                                        <Pin size={16} fill={plan.isPinned ? "currentColor" : "none"}/>
                                        <span className="text-[8px] font-bold mt-0.5">{plan.isPinned ? 'Đã ghim' : 'Ghim'}</span>
                                    </button>
                                    
                                    <div className="flex flex-col gap-1">
                                        <button onClick={() => openEdit(plan)} className="p-1.5 rounded-full text-slate-300 hover:text-theme-500 hover:bg-slate-100"><Edit2 size={16} /></button>
                                        <button onClick={(e) => requestDelete(e, plan.id)} className="p-1.5 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 border-t border-slate-50 dark:border-slate-700 pt-2">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Clock size={14} />
                                    <span>{new Date(plan.targetDate).toLocaleDateString('vi-VN')}</span>
                                    {!plan.completed && <span className={`font-bold ${isNaN(days) ? '' : (days < 0 ? 'text-red-500' : 'text-theme-500')}`}>({isNaN(days) ? '' : (days < 0 ? 'Đã quá' : 'Còn')} {isNaN(days) ? '' : Math.abs(days)} ngày)</span>}
                                    {plan.reminderEnabled && <Bell size={12} className="ml-1 text-theme-500" fill="currentColor"/>}
                                </div>
                                <button onClick={(e) => handleComplete(e, plan)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${plan.completed ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                    {plan.completed ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400"></div>}
                                    {plan.completed ? 'Đã xong' : 'Đánh dấu'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

// --- MÀN HÌNH ĐỊA ĐIỂM (PLACES) - UPDATED FREE MODE ---
const PlacesView: React.FC<{ fontStyle: string }> = ({ fontStyle }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');

  const openGoogleMaps = () => {
    if (!selectedCategory) return;
    if (!navigator.geolocation) { alert("Vui lòng bật định vị."); return; }

    navigator.geolocation.getCurrentPosition((position) => {
        const link = getGoogleMapsLink(position.coords.latitude, position.coords.longitude, selectedCategory);
        // Changed from window.open to window.location.href for better iOS PWA deep linking
        window.location.href = link; 
        setSelectedCategory(null);
    }, () => {
        alert("Không lấy được vị trí. Sẽ mở Google Maps mặc định.");
        window.location.href = `https://www.google.com/maps/search/${encodeURIComponent(selectedCategory)}`;
        setSelectedCategory(null);
    });
  };

  const handleCustomSearch = () => {
      if(!customQuery.trim()) return;
      setSelectedCategory(customQuery);
  }

  return (
    <div className={`flex flex-col h-full pt-10 px-6 ${FONTS[fontStyle] || FONTS.sans}`}>
       <div className="text-center mb-6">
          <span className="text-theme-500 font-bold uppercase tracking-wider text-xs">Google Maps</span>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">Hẹn Hò Ở Đâu?</h2>
          <p className="text-xs text-slate-500 mt-2">Chọn hoặc tìm kiếm địa điểm gần bạn</p>
       </div>

       <div className="flex gap-2 mb-6">
           <input 
              type="text" 
              placeholder="Nhập địa điểm muốn tìm..." 
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="flex-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none text-sm dark:text-white"
           />
           <button onClick={handleCustomSearch} className="bg-theme-500 text-white p-3 rounded-xl shadow-lg shadow-theme-500/30">
               <Search size={20} />
           </button>
       </div>

       <div className="grid grid-cols-3 gap-3 pb-24">
           {PLACE_CATEGORIES.map(c => (
               <button 
                key={c.id} 
                onClick={() => setSelectedCategory(c.id)}
                className="glass-card p-4 rounded-2xl flex flex-col items-center gap-2 bg-white/40 dark:bg-slate-800/40 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-theme-200 transition-all active:scale-95"
               >
                   <span className="text-2xl">{c.icon}</span>
                   <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 text-center">{c.label}</span>
               </button>
           ))}
       </div>

       {/* CONFIRMATION MODAL */}
       {selectedCategory && (
           <Portal>
               <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedCategory(null)}>
                   <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl w-full max-w-xs animate-scale-up shadow-2xl" onClick={e => e.stopPropagation()}>
                       <div className="text-center mb-6">
                           <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                               <Navigation size={32} />
                           </div>
                           <h3 className="font-bold text-lg text-slate-800 dark:text-white">Mở Google Maps?</h3>
                           <p className="text-sm text-slate-500 mt-2">
                               Chúng tôi sẽ chuyển bạn sang Google Maps để tìm <b>{selectedCategory}</b> gần vị trí hiện tại của bạn.
                           </p>
                       </div>
                       <div className="flex gap-3">
                           <button onClick={() => setSelectedCategory(null)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Hủy</button>
                           <button onClick={openGoogleMaps} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
                               Đi thôi <ExternalLink size={16}/>
                           </button>
                       </div>
                   </div>
               </div>
           </Portal>
       )}
    </div>
  );
};

// --- COMPONENT: PIN SETUP MODAL (PORTALED) ---
const PinSetupModal: React.FC<{ 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (pin: string) => void,
    mode?: 'setup' | 'verify', 
    expectedPin?: string 
}> = ({ isOpen, onClose, onSave, mode = 'setup', expectedPin }) => {
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [step, setStep] = useState(1); // 1: Enter, 2: Confirm

    useEffect(() => {
        if(isOpen) {
            setPin(""); setConfirmPin(""); setStep(1);
        }
    }, [isOpen]);

    if(!isOpen) return null;

    const handleInput = (num: number) => {
        if(step === 1 && pin.length < 4) setPin(prev => prev + num);
        if(step === 2 && confirmPin.length < 4) setConfirmPin(prev => prev + num);
    };

    const handleDelete = () => {
        if(step === 1) setPin(prev => prev.slice(0, -1));
        if(step === 2) setConfirmPin(prev => prev.slice(0, -1));
    };

    const handleSubmit = () => {
        if(mode === 'verify') {
             if(pin === expectedPin) {
                 onSave(pin);
                 onClose();
             } else {
                 alert("Mã PIN không đúng!");
                 setPin("");
             }
             return;
        }

        if(step === 1) {
            if(pin.length !== 4) return alert("PIN phải có 4 số");
            setStep(2);
        } else {
            if(confirmPin !== pin) {
                alert("Mã PIN không khớp! Hãy nhập lại.");
                setPin(""); setConfirmPin(""); setStep(1);
            } else {
                onSave(pin);
                onClose();
            }
        }
    }

    return (
        <Portal>
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl w-full max-w-xs animate-scale-up">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg dark:text-white">
                            {mode === 'verify' ? 'Nhập PIN xác nhận' : (step === 1 ? 'Tạo Mã PIN Mới' : 'Xác Nhận Mã PIN')}
                        </h3>
                        <button onClick={onClose}><X className="dark:text-white"/></button>
                    </div>
                    
                    <div className="flex justify-center gap-4 mb-8">
                        {Array(4).fill(0).map((_, i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border border-slate-400 ${i < (step === 1 ? pin.length : confirmPin.length) ? 'bg-theme-500 border-theme-500' : ''}`}></div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[1,2,3,4,5,6,7,8,9,0].map(n => (
                            <button key={n} onClick={() => handleInput(n)} className={`h-14 rounded-full bg-slate-100 dark:bg-slate-700 font-bold text-xl dark:text-white active:bg-theme-100 ${n===0 ? 'col-start-2' : ''}`}>{n}</button>
                        ))}
                        <button onClick={handleDelete} className="col-start-3 h-14 flex items-center justify-center"><Trash2 className="text-red-500"/></button>
                    </div>

                    <button onClick={handleSubmit} className="w-full py-3 bg-theme-500 text-white rounded-xl font-bold">
                        {mode === 'verify' ? 'Xác nhận' : (step === 1 ? 'Tiếp tục' : 'Hoàn tất')}
                    </button>
                </div>
            </div>
        </Portal>
    )
}

// --- MÀN HÌNH CÀI ĐẶT (SETTINGS) ---
const SettingsView: React.FC<{ 
  data: CoupleData, 
  memories: Memory[],
  onUpdate: (d: CoupleData) => void,
  toggleTheme: () => void,
  onReset: () => void 
}> = ({ data, memories, onUpdate, toggleTheme, onReset }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const avatar1Ref = useRef<HTMLInputElement>(null);
  const avatar2Ref = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'verify'>('setup');
  const [showBgOptions, setShowBgOptions] = useState(false);
  const [showMemoryPicker, setShowMemoryPicker] = useState(false);
  
  const COLORS = [
      { hex: '#fa3452', name: 'Đỏ' },
      { hex: '#ec4899', name: 'Hồng' },
      { hex: '#8b5cf6', name: 'Tím' },
      { hex: '#3b82f6', name: 'Xanh' },
      { hex: '#14b8a6', name: 'Ngọc' },
  ];

  const handleUpdate = (field: keyof CoupleData, val: any) => onUpdate({...data, [field]: val});
  const handleNestedUpdate = (parent: keyof CoupleData, child: string, val: any) => {
      const currentParent = data[parent as keyof CoupleData] as object || {};
      onUpdate({...data, [parent]: { ...currentParent, [child]: val }});
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof CoupleData) => {
      const f = e.target.files?.[0];
      if(f) { 
          const r = new FileReader(); 
          r.onloadend = () => {
              if(typeof r.result === 'string') {
                  resizeImage(r.result, 800, 0.7).then(compressed => {
                       handleUpdate(field, compressed);
                       setShowBgOptions(false);
                  });
              }
          }
          r.readAsDataURL(f); 
      }
  };

  const toggleReminderDay = (day: number) => {
      const current = data.reminderDays || [];
      if(current.includes(day)) handleUpdate('reminderDays', current.filter(d => d !== day));
      else handleUpdate('reminderDays', [...current, day].sort((a,b)=>a-b));
  };

  const handlePinAction = () => {
      if(data.securityPin) {
          setPinMode('verify');
          setShowPinModal(true);
      } else {
          setPinMode('setup');
          setShowPinModal(true);
      }
  }

  const onPinComplete = (pin: string) => {
      if (pinMode === 'setup') {
          handleUpdate('securityPin', pin);
          alert("Đã bật mã PIN bảo vệ!");
      } else {
          handleUpdate('securityPin', null);
          alert("Đã tắt mã PIN!");
      }
  }

  const allMemoryImages = useMemo(() => {
      return memories.flatMap(m => m.images || (m.mediaUrl ? [m.mediaUrl] : []));
  }, [memories]);

  // BACKUP FUNCTIONALITY
  const handleBackup = async () => {
      try {
          const exportData = await dbService.exportData();
          const jsonString = JSON.stringify(exportData, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = `lovejourney_backup_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (e) {
          alert("Có lỗi khi sao lưu dữ liệu.");
          console.error(e);
      }
  };

  // RESTORE FUNCTIONALITY
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;

      if(confirm("CẢNH BÁO: Dữ liệu hiện tại sẽ bị ghi đè hoàn toàn bởi bản sao lưu. Bạn có chắc chắn không?")) {
          const reader = new FileReader();
          reader.onload = async (event) => {
              try {
                  const json = JSON.parse(event.target?.result as string);
                  await dbService.importData(json);
                  alert("Khôi phục thành công! Ứng dụng sẽ tải lại.");
                  window.location.reload();
              } catch (err) {
                  alert("File sao lưu không hợp lệ.");
                  console.error(err);
              }
          };
          reader.readAsText(file);
      }
      // Reset input
      if(backupInputRef.current) backupInputRef.current.value = "";
  };

  return (
    <div className={`p-6 pt-10 max-w-md mx-auto space-y-8 ${FONTS[data.fontStyle] || FONTS.sans}`}>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Cài Đặt</h2>

      {/* Theme & Display */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2"><Palette size={12}/> Giao diện</h3>
        <div className="glass-card bg-white/50 dark:bg-slate-800/50 rounded-2xl p-4 shadow-sm space-y-4">
            {/* Dark Mode */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium dark:text-white">Chế độ tối</span>
                <button onClick={toggleTheme} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full"><Sun size={18} /></button>
            </div>
            {/* Color Picker */}
            <div>
                <span className="text-sm font-medium dark:text-white block mb-2">Màu chủ đạo</span>
                <div className="flex gap-3">
                    {COLORS.map(c => (
                        <button key={c.hex} onClick={() => handleUpdate('themeColor', c.hex)} className={`w-8 h-8 rounded-full border-2 ${data.themeColor === c.hex ? 'border-slate-600 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.hex }}></button>
                    ))}
                    <input type="color" value={data.themeColor || '#fa3452'} onChange={(e) => handleUpdate('themeColor', e.target.value)} className="w-8 h-8 rounded-full overflow-hidden border-none p-0"/>
                </div>
            </div>

            {/* Font Picker */}
            <div className="flex items-center justify-between">
                 <span className="text-sm font-medium dark:text-white">Phông chữ</span>
                 <div className="relative">
                    <select 
                        value={data.fontStyle} 
                        onChange={(e) => handleUpdate('fontStyle', e.target.value)}
                        className="bg-slate-100 dark:bg-slate-900 rounded-lg p-1 pr-6 text-sm outline-none appearance-none font-medium min-w-[100px] dark:text-white"
                    >
                        {FONT_OPTIONS.map(font => (
                            <option key={font.id} value={font.id}>{font.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-2 pointer-events-none text-slate-500"/>
                 </div>
            </div>

             {/* Effects */}
             <div className="flex items-center justify-between">
                <span className="text-sm font-medium dark:text-white">Hiệu ứng</span>
                <div className="relative">
                    <select value={data.themeEffect} onChange={(e) => handleUpdate('themeEffect', e.target.value)} className="bg-slate-100 dark:bg-slate-900 rounded-lg p-1 pr-6 text-sm outline-none appearance-none font-medium min-w-[100px] dark:text-white">
                        <option value="hearts">Tim bay</option>
                        <option value="snow">Tuyết rơi</option>
                        <option value="stars">Sao đêm</option>
                        <option value="fireflies">Đom đóm</option>
                        <option value="none">Tắt</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-2 pointer-events-none text-slate-500"/>
                </div>
            </div>
            
            {/* Background Image - Compact Row */}
             <div className="flex items-center justify-between">
                 <div className="flex flex-col">
                     <span className="text-sm font-medium dark:text-white">Hình nền</span>
                     <div className="flex items-center gap-2 mt-1">
                        <div onClick={() => handleUpdate('globalBackground', !data.globalBackground)} className={`w-6 h-3 rounded-full relative transition-colors cursor-pointer ${data.globalBackground ? 'bg-theme-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full transition-transform ${data.globalBackground ? 'translate-x-3' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="text-[10px] text-slate-400">Toàn app</span>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                     {data.bgImage ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 group cursor-pointer" onClick={() => setShowBgOptions(true)}>
                            <img src={data.bgImage} className="w-full h-full object-cover"/>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdate('bgImage', null); }}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                            >
                                <X size={14}/>
                            </button>
                        </div>
                     ) : (
                         <button onClick={() => setShowBgOptions(true)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-300">
                             Chọn ảnh
                         </button>
                     )}
                     
                     <div className="w-20 ml-2 flex flex-col items-end">
                        <span className="text-[8px] text-slate-400 mb-0.5">Mờ nền: {Math.round((data.bgOpacity || 0.6)*100)}%</span>
                        <input 
                            type="range" min="0.1" max="1" step="0.1" 
                            value={data.bgOpacity || 0.6} 
                            onChange={(e) => handleUpdate('bgOpacity', parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-theme-500"
                        />
                     </div>
                 </div>
             </div>

             {/* Card Opacity Control */}
             <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium dark:text-white">Độ mờ thẻ</span>
                    <span className="text-xs text-slate-500">{Math.round((data.cardOpacity ?? 0.6) * 100)}%</span>
                 </div>
                 <input 
                    type="range" min="0.1" max="1" step="0.05"
                    value={data.cardOpacity ?? 0.6}
                    onChange={(e) => handleUpdate('cardOpacity', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-theme-500"
                 />
             </div>
        </div>
      </section>

      {/* Background Options Modal */}
      {showBgOptions && (
          <Portal>
              <div className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center" onClick={() => setShowBgOptions(false)}>
                  <div className="bg-white dark:bg-slate-800 w-full rounded-t-3xl p-6 animate-scale-up" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-lg dark:text-white">Chọn Hình Nền</h3>
                          <button onClick={() => setShowBgOptions(false)}><X className="dark:text-white"/></button>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl active:scale-95 transition-transform">
                              <div className="p-3 bg-blue-100 text-blue-500 rounded-full"><ImageIcon/></div>
                              <span className="text-xs font-bold dark:text-white">Thư viện</span>
                          </button>
                          <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl active:scale-95 transition-transform">
                              <div className="p-3 bg-green-100 text-green-500 rounded-full"><Camera/></div>
                              <span className="text-xs font-bold dark:text-white">Chụp ảnh</span>
                          </button>
                          <button onClick={() => { setShowBgOptions(false); setShowMemoryPicker(true); }} className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl active:scale-95 transition-transform">
                              <div className="p-3 bg-purple-100 text-purple-500 rounded-full"><History/></div>
                              <span className="text-xs font-bold dark:text-white">Kỷ niệm</span>
                          </button>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bgImage')} />
                      <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'bgImage')} />
                  </div>
              </div>
          </Portal>
      )}

      {/* Memory Picker Modal */}
      {showMemoryPicker && (
          <Portal>
              <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col p-4 animate-scale-up">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold dark:text-white">Chọn từ Kỷ Niệm</h3>
                          <button onClick={() => setShowMemoryPicker(false)}><X className="dark:text-white"/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2">
                          {allMemoryImages.map((img, i) => (
                              <div key={i} className="aspect-square rounded-lg overflow-hidden cursor-pointer bg-black" onClick={() => {
                                  if(!img.startsWith('data:video')) {
                                      handleUpdate('bgImage', img);
                                      setShowMemoryPicker(false);
                                  } else {
                                      alert("Không thể dùng Video làm hình nền");
                                  }
                              }}>
                                  {img.startsWith('data:video') ? <video src={img} className="w-full h-full object-cover opacity-60"/> : <img src={img} className="w-full h-full object-cover"/>}
                              </div>
                          ))}
                          {allMemoryImages.length === 0 && <p className="col-span-3 text-center text-slate-400 text-xs py-10">Chưa có ảnh trong kỷ niệm</p>}
                      </div>
                  </div>
              </div>
          </Portal>
      )}

      {/* Couple Info */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2"><LayoutTemplate size={12}/> Thông tin cặp đôi</h3>
        <div className="glass-card bg-white/50 dark:bg-slate-800/50 rounded-2xl p-4 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                 <span className="text-sm font-medium dark:text-white">Chi tiết Giờ/Phút/Giây</span>
                 <div onClick={() => handleUpdate('showTimeDetails', !data.showTimeDetails)} className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${data.showTimeDetails ? 'bg-theme-500' : 'bg-slate-300'}`}>
                     <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${data.showTimeDetails ? 'translate-x-5' : 'translate-x-0'}`}></div>
                 </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
              <label className="text-xs text-slate-500 block mb-1 font-bold">Ngày bắt đầu yêu</label>
              <input type="date" value={!isNaN(new Date(data.startDate).getTime()) ? data.startDate.split('T')[0] : new Date().toISOString().split('T')[0]} onChange={(e) => handleUpdate('startDate', new Date(e.target.value).toISOString())} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 pb-1 mb-3 text-sm outline-none dark:text-white h-[46px] appearance-none" />
              
              <div className="flex items-center justify-between">
                   <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Đếm từ ngày số 1</span>
                   <div onClick={() => handleUpdate('countFromDayOne', !data.countFromDayOne)} className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${data.countFromDayOne ? 'bg-theme-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${data.countFromDayOne ? 'translate-x-4' : 'translate-x-0'}`}></div>
                   </div>
              </div>
            </div>

            {/* Partners */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="relative w-16 h-16 mx-auto rounded-full bg-slate-200 overflow-hidden group cursor-pointer" onClick={() => avatar1Ref.current?.click()}>
                        {data.partner1Avatar ? <img src={data.partner1Avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Camera size={16}/></div>}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white"><Edit2 size={12}/></div>
                    </div>
                    <input type="file" ref={avatar1Ref} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'partner1Avatar')}/>
                    <input type="text" value={data.partner1Name} onChange={(e) => handleUpdate('partner1Name', e.target.value)} className="w-full text-center text-sm font-bold bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none pb-1 dark:text-white" placeholder="Tên bạn"/>
                     <input type="date" value={data.partner1Dob} onChange={(e) => handleUpdate('partner1Dob', e.target.value)} className="w-full text-center text-[10px] bg-transparent outline-none text-slate-500 h-[30px] appearance-none"/>
                </div>
                 <div className="space-y-2">
                    <div className="relative w-16 h-16 mx-auto rounded-full bg-slate-200 overflow-hidden group cursor-pointer" onClick={() => avatar2Ref.current?.click()}>
                        {data.partner2Avatar ? <img src={data.partner2Avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Camera size={16}/></div>}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white"><Edit2 size={12}/></div>
                    </div>
                    <input type="file" ref={avatar2Ref} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'partner2Avatar')}/>
                    <input type="text" value={data.partner2Name} onChange={(e) => handleUpdate('partner2Name', e.target.value)} className="w-full text-center text-sm font-bold bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none pb-1 dark:text-white" placeholder="Tên người ấy"/>
                    <input type="date" value={data.partner2Dob} onChange={(e) => handleUpdate('partner2Dob', e.target.value)} className="w-full text-center text-[10px] bg-transparent outline-none text-slate-500 h-[30px] appearance-none"/>
                </div>
            </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2"><BellRing size={12}/> Nhắc nhở</h3>
         <div className="glass-card bg-white/50 dark:bg-slate-800/50 rounded-2xl p-4 shadow-sm space-y-4">
             <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                 {['anniversary', 'valentine', 'holidays', 'onThisDay'].map(k => (
                     <div key={k} className="flex items-center justify-between">
                        <span className="text-sm font-medium dark:text-white capitalize">
                            {k === 'anniversary' ? 'Kỷ niệm' : k === 'valentine' ? 'Valentine' : k === 'holidays' ? 'Ngày lễ VN' : 'Ngày này năm xưa'}
                        </span>
                        <input type="checkbox" checked={data.notifications?.[k as keyof typeof data.notifications] ?? true} onChange={(e) => handleNestedUpdate('notifications', k, e.target.checked)} className="accent-theme-500 w-4 h-4"/>
                     </div>
                 ))}
             </div>
             
             <div>
                 <span className="text-xs font-bold text-slate-500 block mb-2">Nhắc trước (ngày):</span>
                 <div className="flex flex-wrap gap-2">
                     {[0, 1, 3, 7, 30].map(d => {
                         const isSelected = (data.reminderDays || []).includes(d);
                         return (
                             <button 
                                key={d}
                                onClick={() => toggleReminderDay(d)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${isSelected ? 'bg-theme-500 text-white border-theme-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                             >
                                 {d === 0 ? 'Trong ngày' : `${d} ngày`}
                             </button>
                         )
                     })}
                 </div>
             </div>
             
             {Notification.permission === 'default' && (
                 <button onClick={() => Notification.requestPermission()} className="w-full py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg mt-2">
                     Bật thông báo đẩy
                 </button>
             )}
         </div>
      </section>
      
      <button 
          onClick={handlePinAction}
          className="flex items-center justify-between w-full p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm"
       >
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-100 text-slate-600 rounded-full"><Shield size={18} /></div>
             <span className="text-sm font-medium dark:text-white">Bảo mật (Mã PIN)</span>
          </div>
          <span className="text-xs font-bold text-slate-400">{data.securityPin ? "Đang bật" : "Đang tắt"}</span>
      </button>

      <PinSetupModal 
        isOpen={showPinModal} 
        onClose={() => setShowPinModal(false)}
        onSave={onPinComplete}
        mode={pinMode}
        expectedPin={data.securityPin || undefined}
      />
      
      {/* Backup & Restore */}
      <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2"><Download size={12}/> Dữ liệu</h3>
          <div className="flex gap-3">
              <button onClick={handleBackup} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-300 text-sm flex items-center justify-center gap-2">
                  <Download size={16}/> Sao lưu
              </button>
              <button onClick={() => backupInputRef.current?.click()} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-300 text-sm flex items-center justify-center gap-2">
                  <Upload size={16}/> Khôi phục
              </button>
              <input type="file" ref={backupInputRef} onChange={handleRestore} className="hidden" accept=".json"/>
          </div>
      </section>

      {/* Feedback Button - Updated to open Google Forms */}
      <button 
        onClick={() => window.open("https://forms.gle/wT55A8TRhxq6ukdi6", "_blank")}
        className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <MessageSquare size={18}/> Gửi Góp Ý / Báo Lỗi
      </button>

      <button 
        onClick={onReset}
        className="w-full py-3 text-red-500 font-bold bg-red-50 dark:bg-red-900/20 rounded-2xl"
      >
        <LogOut size={16} className="inline mr-2"/> Xóa dữ liệu & Reset
      </button>
      
      <div className="h-20"></div>
    </div>
  );
};

// --- APP ROOT ---
const App: React.FC = () => {
  const [data, setData] = useState<CoupleData>(DEFAULT_DATA);
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [showResetAuth, setShowResetAuth] = useState(false);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  
  // LIGHTBOX STATE
  const [lightboxData, setLightboxData] = useState<{images: string[], index: number} | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    const loadData = async () => {
        try {
            const dbSettings = await dbService.getSettings();
            
            if (dbSettings) {
                setData(dbSettings);
                const dbPlans = await dbService.getAll<PlanItem>('plans');
                const dbMemories = await dbService.getAll<Memory>('memories');
                setPlans(dbPlans);
                setMemories(dbMemories);
                if (dbSettings.securityPin) setIsLocked(true);
            } else {
                const lsData = localStorage.getItem('lovesync_data');
                if (lsData) {
                    const parsedData = JSON.parse(lsData);
                    const parsedPlans = JSON.parse(localStorage.getItem('lovesync_plans') || '[]');
                    const parsedMemories = JSON.parse(localStorage.getItem('lovesync_memories') || '[]');
                    const mergedData = { ...DEFAULT_DATA, ...parsedData };
                    
                    await dbService.saveSettings(mergedData);
                    for (const p of parsedPlans) await dbService.savePlan(p);
                    for (const m of parsedMemories) await dbService.saveMemory(m);
                    
                    setData(mergedData);
                    setPlans(parsedPlans);
                    setMemories(parsedMemories);
                    if (mergedData.securityPin) setIsLocked(true);
                } else {
                    await dbService.saveSettings(DEFAULT_DATA);
                }
            }
        } catch (e) {
            console.error("Data Load Error:", e);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  useEffect(() => {
    if(!loading) {
        dbService.saveSettings(data).then(() => {
             const rgb = hexToRgb(data.themeColor || '#fa3452');
             document.documentElement.style.setProperty('--theme-rgb', rgb);
             // Sync Card Opacity to CSS Variable
             document.documentElement.style.setProperty('--card-opacity', String(data.cardOpacity || 0.6));
        });
    }
  }, [data, loading]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
  };

  const handleSaveMemory = async (mem: Memory) => {
      // Optimistic update
      setMemories(prev => {
          const exists = prev.find(m => m.id === mem.id);
          const newList = exists ? prev.map(m => m.id === mem.id ? mem : m) : [mem, ...prev];
          return newList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      await dbService.saveMemory(mem);
  }

  const handleDeleteMemory = async (id: string) => {
      setMemories(prev => prev.filter(m => m.id !== id));
      await dbService.deleteMemory(id);
  }

  const handleUpdateMemory = async (mem: Memory) => {
       setMemories(prev => prev.map(m => m.id === mem.id ? mem : m));
       await dbService.saveMemory(mem);
  }

  const handleSavePlan = async (p: PlanItem) => {
       setPlans(prev => {
           const exists = prev.find(item => item.id === p.id);
           return exists ? prev.map(item => item.id === p.id ? p : item) : [...prev, p];
       });
       await dbService.savePlan(p);
  }

  const handleDeletePlan = async (id: string) => {
       setPlans(prev => prev.filter(p => p.id !== id));
       await dbService.deletePlan(id);
  }

  const performReset = async () => {
      if(confirm("Cảnh báo lần cuối: Toàn bộ dữ liệu (ảnh, kỷ niệm, kế hoạch) sẽ bị xóa vĩnh viễn và không thể khôi phục. Bạn chắc chắn chứ?")) {
          await dbService.clearAll();
          localStorage.clear();
          window.location.reload();
      }
  };

  const handleResetRequest = () => {
      if(data.securityPin) {
          setShowResetAuth(true);
      } else {
          performReset();
      }
  }

  // Lightbox Handlers
  const openLightbox = (images: string[], index: number) => {
      setLightboxData({ images, index });
  }

  const closeLightbox = () => setLightboxData(null);

  const nextImage = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if(lightboxData && lightboxData.index < lightboxData.images.length - 1) {
          setLightboxData({ ...lightboxData, index: lightboxData.index + 1 });
      }
  }

  const prevImage = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if(lightboxData && lightboxData.index > 0) {
          setLightboxData({ ...lightboxData, index: lightboxData.index - 1 });
      }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.targetTouches[0].clientX;
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
      touchEndX.current = e.changedTouches[0].clientX;
      const diff = touchStartX.current - touchEndX.current;
      if (Math.abs(diff) > 50) { // Threshold
          if (diff > 0) nextImage();
          else prevImage();
      }
  }

  if (loading) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-950">
              <Loader2 className="animate-spin text-theme-500 mb-4" size={48} />
              <p className="text-slate-500 font-medium animate-pulse">Đang tải dữ liệu tình yêu...</p>
          </div>
      )
  }

  if (isLocked) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-theme-500 text-white p-6 space-y-6">
        <Lock size={64} className="mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold">Nhập Mã PIN</h2>
        <div className="flex gap-4">
            {Array(4).fill(0).map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full ${i < pinInput.length ? 'bg-white' : 'bg-white/30'}`}></div>
            ))}
        </div>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs mt-8">
            {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} onClick={() => {
                    const next = pinInput + n;
                    setPinInput(next);
                    if(next === data.securityPin) setIsLocked(false);
                    if(next.length >= 4 && next !== data.securityPin) {
                        setTimeout(() => setPinInput(""), 300);
                        alert("Sai mã PIN!");
                    }
                }} className="h-16 rounded-full bg-white/20 text-2xl font-bold backdrop-blur-sm active:bg-white/40">{n}</button>
            ))}
            <div/>
            <button onClick={() => {
                    const next = pinInput + 0;
                    setPinInput(next);
                    if(next === data.securityPin) setIsLocked(false);
                    if(next.length >= 4 && next !== data.securityPin) {
                         setTimeout(() => setPinInput(""), 300);
                        alert("Sai mã PIN!");
                    }
            }} className="h-16 rounded-full bg-white/20 text-2xl font-bold backdrop-blur-sm active:bg-white/40">0</button>
            <button onClick={() => setPinInput(pinInput.slice(0,-1))} className="h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm active:bg-white/40"><Trash2/></button>
        </div>
        
        <button 
            onClick={() => {
                if(confirm("Quên mã PIN? Để bảo mật, bạn cần Reset toàn bộ dữ liệu ứng dụng để sử dụng lại. Bạn có chắc không?")) {
                    dbService.clearAll();
                    localStorage.clear();
                    window.location.reload();
                }
            }}
            className="mt-8 text-sm text-white/70 underline"
        >
            Quên mã PIN?
        </button>
      </div>
    );
  }

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      <HeartCanvas active={true} type={data.themeEffect} />
      
      {data.globalBackground && data.bgImage && (
          <div 
            className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none transition-all duration-700"
            style={{ 
                backgroundImage: `url(${data.bgImage})`,
                opacity: data.bgOpacity
            }}
          />
      )}

      <div className="relative z-10 h-full">
          {currentView === AppView.HOME && <HomeView data={data} plans={plans} memories={memories} />}
          {currentView === AppView.MEMORIES && (
            <MemoriesView 
                fontStyle={data.fontStyle} 
                memories={memories} 
                onSaveMemory={handleSaveMemory}
                onDeleteMemory={handleDeleteMemory}
                onUpdateMemory={handleUpdateMemory}
                onOpenMedia={openLightbox}
            />
          )}
          {currentView === AppView.PLANS && (
            <PlansView 
                fontStyle={data.fontStyle} 
                plans={plans} 
                onSavePlan={handleSavePlan}
                onDeletePlan={handleDeletePlan}
                onAddMemory={handleSaveMemory}
            />
          )}
          {currentView === AppView.PLACES && <PlacesView fontStyle={data.fontStyle} />}
          {currentView === AppView.SETTINGS && <SettingsView data={data} memories={memories} onUpdate={setData} toggleTheme={toggleTheme} onReset={handleResetRequest} />}
      </div>

      <PinSetupModal 
          isOpen={showResetAuth}
          onClose={() => setShowResetAuth(false)}
          mode="verify"
          expectedPin={data.securityPin || undefined}
          onSave={(pin) => {
              setShowResetAuth(false);
              performReset();
          }}
      />

       {/* Media Lightbox */}
       {lightboxData && (
          <Portal>
            <div 
                className="fixed inset-0 z-[100] bg-black flex items-center justify-center touch-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div 
                    className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-[110] bg-gradient-to-b from-black/80 via-black/40 to-transparent"
                    style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
                >
                    <button className="text-white p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 active:scale-95 transition-all" onClick={closeLightbox}><X size={24}/></button>
                    <span className="text-white font-bold bg-black/40 px-3 py-1 rounded-full text-sm">
                        {lightboxData.index + 1} / {lightboxData.images.length}
                    </span>
                    <button 
                        className="text-white bg-red-500/80 hover:bg-red-500 p-3 rounded-full backdrop-blur-md shadow-lg active:scale-95 transition-all"
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if(confirm("Xóa ảnh này?")) {
                                const currentUrl = lightboxData.images[lightboxData.index];
                                // Find which memory has this image
                                const mem = memories.find(m => (m.images || []).includes(currentUrl) || m.mediaUrl === currentUrl);
                                if(mem) {
                                    const updatedImages = (mem.images || []).filter(img => img !== currentUrl);
                                    const updatedMediaUrl = mem.mediaUrl === currentUrl ? undefined : mem.mediaUrl;
                                    handleUpdateMemory({ ...mem, images: updatedImages, mediaUrl: updatedMediaUrl });
                                    closeLightbox();
                                }
                            }
                        }}
                    >
                        <Trash2 size={24}/>
                    </button>
                </div>

                <div className="relative w-full h-full flex items-center justify-center" onClick={closeLightbox}>
                    {lightboxData.images[lightboxData.index].startsWith('data:video') ? (
                         <video src={lightboxData.images[lightboxData.index]} controls className="max-w-full max-h-full" onClick={e => e.stopPropagation()} />
                    ) : (
                         <img src={lightboxData.images[lightboxData.index]} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()}/>
                    )}
                </div>

                {lightboxData.index > 0 && (
                    <button 
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 hidden md:block"
                    >
                        <ChevronLeft size={32}/>
                    </button>
                )}

                {lightboxData.index < lightboxData.images.length - 1 && (
                    <button 
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 hidden md:block"
                    >
                        <ChevronRight size={32}/>
                    </button>
                )}
            </div>
          </Portal>
      )}
    </Layout>
  );
};

export default App;
