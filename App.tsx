
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk } from './services/geminiService';

/**
 * WAY - جامعتك الرقمية
 * المطور: ربيع (Rabie)
 */

const App: React.FC = () => {
  // --- States ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'login' | 'dashboard' | 'channel-view' | 'chat-view'>('landing');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'my-channels' | 'messages' | 'wallet' | 'profile'>('home');
  
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activeChatProf, setActiveChatProf] = useState<User | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [language, setLanguage] = useState<'ar' | 'fr' | 'en'>('ar');
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');

  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string, sources?: any[]}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');

  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' | 'image' });

  // --- Initial Data & Mock Sync ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const storedUsers = localStorage.getItem('way_users');
      const storedChannels = localStorage.getItem('way_channels');
      const sessionUser = localStorage.getItem('way_session');

      let initialUsers = storedUsers ? JSON.parse(storedUsers) : [];
      
      const starUsers: User[] = [
        {
          id: 'q_student_rabie',
          firstName: 'حمر العين',
          lastName: 'ربيع',
          email: 'rabie@way.dz',
          role: 'student',
          university: 'USTHB',
          faculty: 'كلية التكنولوجيا',
          walletBalance: 5000,
          isApproved: true,
          avatar: '',
          studentCount: 0,
          phoneNumber: '0550123456'
        },
        {
          id: 'q_prof_bakhta',
          firstName: 'بن الطاهر',
          lastName: 'بختة',
          email: 'bakhta@way.dz',
          role: 'professor',
          university: 'جامعة الجزائر 1 - بن يوسف بن خدة',
          faculty: 'كلية الآداب واللغات',
          walletBalance: 15000,
          isApproved: true,
          avatar: '',
          studentCount: 88
        },
        {
          id: 'q_prof_aitissa',
          firstName: 'آيت عيسى',
          lastName: '',
          email: 'aitissa@way.dz',
          role: 'professor',
          university: 'جامعة ابن خلدون ملحقة قصر الشلالة',
          faculty: 'كلية العلوم الاقتصادية',
          walletBalance: 20000,
          isApproved: true,
          avatar: '',
          studentCount: 120
        }
      ];

      starUsers.forEach(star => {
        if (!initialUsers.find((u: User) => u.id === star.id)) initialUsers.push(star);
      });

      setUsers(initialUsers);
      
      let initialChannels = storedChannels ? JSON.parse(storedChannels) : [];
      if (initialChannels.length === 0) {
        initialChannels = [
          {
            id: 'ch_math',
            professorId: 'q_prof_aitissa',
            name: 'رياضيات اقتصادية',
            department: 'جذع مشترك',
            description: 'دروس وتمارين شاملة في الاقتصاد القياسي',
            price: 500,
            subscribers: ['q_student_rabie'],
            content: []
          },
          {
            id: 'ch_lit',
            professorId: 'q_prof_bakhta',
            name: 'أدب جزائري حديث',
            department: 'لغة عربية',
            description: 'دراسة نقدية للرواية الجزائرية المعاصرة',
            price: 300,
            subscribers: [],
            content: []
          }
        ];
      }
      setChannels(initialChannels);
      
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        const freshUser = initialUsers.find((u: User) => u.id === parsed.id) || parsed;
        setCurrentUser(freshUser);
        setView('dashboard');
      }
      
      setTimeout(() => setLoading(false), 800);
    };
    init();
  }, []);

  useEffect(() => { localStorage.setItem('way_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('way_channels', JSON.stringify(channels)); }, [channels]);
  useEffect(() => { if (currentUser) localStorage.setItem('way_session', JSON.stringify(currentUser)); }, [currentUser]);

  useEffect(() => { 
    document.documentElement.classList.toggle('dark', isDarkMode); 
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // --- Handlers ---
  const handleQuickLogin = (role: 'student' | 'prof_bakhta' | 'prof_aitissa') => {
    setLoading(true);
    setTimeout(() => {
      const ids = { student: 'q_student_rabie', prof_bakhta: 'q_prof_bakhta', prof_aitissa: 'q_prof_aitissa' };
      const quickUser = users.find(u => u.id === ids[role]);
      if (quickUser) {
        setCurrentUser(quickUser);
        setView('dashboard');
        setActiveTab('home');
      }
      setLoading(false);
    }, 600);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const emailInput = form.elements.namedItem('email') as HTMLInputElement;
    const user = users.find(u => u.email === emailInput.value);
    if (user) {
      setCurrentUser(user);
      setView('dashboard');
    } else {
      alert("البريد الإلكتروني غير مسجل");
    }
  };

  const handleRegister = (role: UserRole, data: any) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: role,
      university: data.university,
      walletBalance: role === 'professor' ? 0 : 500,
      avatar: '',
      isApproved: true,
      studentCount: 0,
      phoneNumber: ''
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('way_session');
    setView('landing');
  };

  const handleSubscribe = (channelId: string) => {
    if (!currentUser) return;
    const chan = channels.find(c => c.id === channelId);
    if (!chan) return;
    if (currentUser.walletBalance < chan.price) return alert("الرصيد غير كافٍ، اشحن محفظتك.");
    
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, subscribers: [...c.subscribers, currentUser.id] } : c));
    const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance - chan.price };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    alert("تم الاشتراك بنجاح! يمكنك الآن متابعة الدروس والدردشة.");
  };

  const handleJarvisAsk = async () => {
    if (!jarvisInput.trim()) return;
    const q = jarvisInput;
    setJarvisInput('');
    setJarvisChat(prev => [...prev, { role: 'user', text: q }]);
    setIsJarvisThinking(true);
    const res = await jarvisAsk(q);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: res.text || '', sources: res.sources }]);
    setIsJarvisThinking(false);
  };

  const handleSummarize = async (item: ContentItem) => {
    setIsJarvisOpen(true);
    setJarvisChat(prev => [...prev, { role: 'user', text: `يا جارفيس، لخصلي هاد المحتوى: ${item.title}` }]);
    setIsJarvisThinking(true);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: summary || "سمحلي يا خويا، جارفيس شوية ثقيل دوكا." }]);
    setIsJarvisThinking(false);
  };

  const handlePhoneRecharge = (provider: string, amount: number) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance + amount };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setShowRechargeModal(false);
    alert(`تم شحن ${amount} دج عبر ${provider} بنجاح!`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const isImage = file.type.startsWith('image/');
      setNewContentData({ ...newContentData, title: file.name, type: isImage ? 'image' : 'pdf' });
    }
  };

  const handleAddContentSubmit = () => {
    if (!selectedFile || !selectedChannel) return;
    const newItem: ContentItem = {
      id: 'item_' + Date.now(),
      type: newContentData.type,
      title: newContentData.title,
      url: URL.createObjectURL(selectedFile),
      createdAt: new Date()
    };
    
    const updatedChannels = channels.map(c => 
      c.id === selectedChannel.id ? { ...c, content: [...c.content, newItem] } : c
    );
    setChannels(updatedChannels);
    setSelectedChannel(updatedChannels.find(c => c.id === selectedChannel.id) || null);
    setShowAddContent(false);
    setSelectedFile(null);
    alert("تم رفع الملف بنجاح!");
  };

  const openGoogleMeet = () => {
    window.open("https://meet.google.com/new", "_blank");
  };

  // --- Render Functions ---

  const renderDashboard = () => {
    const isProf = currentUser?.role === 'professor';
    const subscribedChannels = channels.filter(c => c.subscribers.includes(currentUser?.id || ''));
    const followedProfs = users.filter(u => u.role === 'professor' && channels.some(c => c.professorId === u.id && c.subscribers.includes(currentUser?.id || '')));

    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right overflow-hidden transition-colors duration-300">
        {/* Sidebar */}
        <aside className="hidden md:flex w-72 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-8 flex-col gap-10 shadow-xl z-20">
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-5xl font-black text-emerald-600 tracking-tighter">WAY</h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Digital University</span>
          </div>
          <nav className="flex flex-col gap-3">
            {[
              { id: 'home', label: 'الرئيسية', icon: '🏠' },
              { id: 'my-channels', label: 'قنواتي', icon: '📡' },
              { id: 'messages', label: 'الدردشة', icon: '💬' },
              { id: 'wallet', label: 'المحفظة', icon: '💰' },
              { id: 'profile', label: 'الملف الشخصي', icon: '👤' }
            ].filter(tab => !isProf || tab.id !== 'my-channels').map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`p-5 rounded-2xl font-black flex items-center gap-4 transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg translate-x-1' : 'text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-800'}`}
              >
                <span className="text-xl">{tab.icon}</span> {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Jarvis Button */}
        <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[100] w-16 h-16 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce border-4 border-white dark:border-gray-800 hover:scale-110 active:scale-90 transition-transform">
          <span className="text-3xl">✨</span>
        </button>

        {/* Main Area */}
        <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32 no-scrollbar">
          
          {activeTab === 'home' && (
            <div className="space-y-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-black dark:text-white">مرحباً، {currentUser?.firstName} 👋</h1>
                  <p className="text-gray-400 font-bold mt-1">تصفح أفضل المحتويات التعليمية لجامعتك</p>
                </div>
                {!isProf && (
                  <div className="hidden md:flex bg-emerald-100 dark:bg-emerald-900/30 px-6 py-3 rounded-2xl items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400">{currentUser?.walletBalance} دج</span>
                  </div>
                )}
              </header>

              {/* Professor Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {users.filter(u => u.role === 'professor').map(prof => (
                  <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border-2 border-transparent dark:border-gray-800 text-center space-y-5 shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all group relative overflow-hidden">
                    <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="md" />
                    <div>
                      <h4 className="font-black text-xl dark:text-white group-hover:text-emerald-600 transition-colors">{prof.firstName} {prof.lastName}</h4>
                      <p className="text-[10px] text-gray-400 font-bold mt-1 line-clamp-1">{prof.university}</p>
                    </div>
                    <button onClick={() => {
                      const chan = channels.find(c => c.professorId === prof.id);
                      if (chan) { setSelectedChannel(chan); setView('channel-view'); }
                      else alert("هذا الأستاذ لم ينشر قنوات بعد.");
                    }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl text-xs font-black shadow-lg hover:shadow-emerald-500/20 group-hover:scale-105 transition-all">دخول القناة</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border dark:border-gray-800 shadow-sm text-center relative overflow-hidden">
                 <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="lg" />
                 <h2 className="text-4xl font-black dark:text-white mt-8">{currentUser?.firstName} {currentUser?.lastName}</h2>
                 <p className="text-emerald-600 font-bold mt-2 text-lg">{currentUser?.email}</p>
                 <div className="mt-12 space-y-4">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full p-8 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] font-black dark:text-white flex items-center justify-between group transition-all">
                       <span className="text-lg">{isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
                       <span className="text-3xl">{isDarkMode ? '☀️' : '🌙'}</span>
                    </button>
                    <button onClick={handleLogout} className="w-full bg-red-50 text-red-500 py-8 rounded-[3rem] font-black text-xl border-2 border-red-100 mt-10 shadow-lg active:scale-95">تسجيل الخروج</button>
                 </div>
              </div>
            </div>
          )}
          {/* Messages & Wallet Tabs would go here similar to previous version */}
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t dark:border-gray-800 flex justify-around p-5 z-[100] pb-safe shadow-2xl">
          {['home', 'messages', 'wallet', 'profile'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex flex-col items-center p-3 rounded-[1.5rem] transition-all ${activeTab === tab ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>
              <span className="text-2xl">{tab === 'home' ? '🏠' : tab === 'messages' ? '💬' : tab === 'wallet' ? '💰' : '👤'}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  };

  const renderView = () => {
    if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-24 h-24 border-8 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );

    if (view === 'landing') return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-8 text-center relative overflow-hidden">
        <div className="animate-float mb-16 z-10">
          <h1 className="text-[12rem] font-black tracking-tighter leading-none">WAY</h1>
          <p className="text-3xl opacity-90 font-bold">الجامعة الرقمية</p>
        </div>
        <div className="flex flex-col gap-5 w-full max-w-md z-10">
          <button onClick={() => handleQuickLogin('prof_bakhta')} className="bg-white text-emerald-600 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 active:translate-y-2">
            👩‍🏫 دخول الأستاذة بختة
          </button>
          <button onClick={() => handleQuickLogin('student')} className="bg-yellow-400 text-emerald-900 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:scale-105 transition-all">
            🚀 دخول سريع ربيع
          </button>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setView('register-prof')} className="bg-emerald-500/50 backdrop-blur-md text-white py-5 rounded-[2rem] font-black border-2 border-emerald-400/50">أنا أستاذ</button>
            <button onClick={() => setView('register-student')} className="bg-emerald-500/50 backdrop-blur-md text-white py-5 rounded-[2rem] font-black border-2 border-emerald-400/50">أنا طالب</button>
          </div>
        </div>
      </div>
    );

    if (view === 'dashboard') return renderDashboard();

    if (view === 'channel-view' && selectedChannel && currentUser) {
      const isOwner = selectedChannel.professorId === currentUser.id;
      const isSub = selectedChannel.subscribers?.includes(currentUser.id);
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-right">
           <header className="bg-white dark:bg-gray-900 p-8 shadow-xl flex justify-between items-center sticky top-0 z-50">
             <button onClick={() => setView('dashboard')} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 px-8 py-4 rounded-2xl font-black">✕ رجوع</button>
             <div className="text-center">
                <h2 className="font-black text-3xl dark:text-white">{selectedChannel.name}</h2>
                <p className="text-xs text-emerald-600 font-bold uppercase mt-1">{selectedChannel.department}</p>
             </div>
             <div className="w-24 flex items-center justify-center">
               <button onClick={openGoogleMeet} className="bg-blue-600 text-white p-3 rounded-full shadow-lg group relative">
                 🎥
                 <span className="absolute -bottom-10 right-0 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Google Meet</span>
               </button>
             </div>
           </header>
           
           <main className="flex-1 p-6 md:p-12 overflow-y-auto space-y-10 max-w-5xl mx-auto w-full no-scrollbar">
             {!isOwner && !isSub ? (
               <div className="bg-white dark:bg-gray-900 p-24 rounded-[5rem] text-center space-y-10 shadow-2xl border-4 border-emerald-50">
                 <span className="text-[16rem] block mb-6">🔒</span>
                 <h3 className="text-5xl font-black dark:text-white">قناة مقفلة</h3>
                 <button onClick={() => handleSubscribe(selectedChannel.id)} className="bg-emerald-600 text-white px-24 py-8 rounded-[3rem] font-black text-3xl shadow-xl">اشترك الآن بـ {selectedChannel.price} دج</button>
               </div>
             ) : (
               <div className="space-y-8">
                 <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-sm">
                    <h3 className="text-3xl font-black dark:text-white">المحتوى الدراسي</h3>
                    {isOwner && (
                      <div className="flex gap-4">
                        <button onClick={() => setShowAddContent(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2">
                          <span>➕</span> رفع بيدي اف أو صور
                        </button>
                        <button onClick={openGoogleMeet} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2">
                          <span>🎥</span> بدء بث مباشر (Meet)
                        </button>
                      </div>
                    )}
                 </div>
                 
                 <div className="grid grid-cols-1 gap-6">
                  {selectedChannel.content?.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-900 p-10 rounded-[4rem] border dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 hover:shadow-2xl transition-all border-r-8 border-r-emerald-500">
                        <div className="flex gap-4 w-full md:w-auto">
                          <button onClick={() => handleSummarize(item)} className="flex-1 bg-emerald-600 text-white px-12 py-6 rounded-[2rem] font-black shadow-lg">✨ تلخيص Jarvis</button>
                          <a href={item.url} target="_blank" rel="noreferrer" className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-12 py-6 rounded-[2rem] font-black text-center">📂 فتح الملف</a>
                        </div>
                        <div className="text-right flex-1 flex items-center gap-8">
                          <div className="flex-1">
                            <p className="font-black dark:text-white text-3xl">{item.title}</p>
                            <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString('ar-DZ')}</p>
                          </div>
                          <div className="p-8 bg-emerald-50 dark:bg-gray-800 rounded-[2.5rem] text-5xl shadow-sm">
                            {item.type === 'pdf' ? '📄' : item.type === 'image' ? '🖼️' : '🎥'}
                          </div>
                        </div>
                    </div>
                  ))}
                 </div>
               </div>
             )}
           </main>
        </div>
      );
    }

    if (view === 'chat-view' && activeChatProf) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-right">
          <header className="bg-white dark:bg-gray-900 p-8 shadow-xl flex justify-between items-center border-b dark:border-gray-800">
            <button onClick={() => setView('dashboard')} className="bg-emerald-50 text-emerald-600 px-8 py-4 rounded-2xl font-black">✕ رجوع</button>
            <div className="flex items-center gap-5">
               <div>
                 <h2 className="font-black text-2xl dark:text-white">{activeChatProf.firstName} {activeChatProf.lastName}</h2>
                 <p className="text-xs text-emerald-600 font-black">متصل الآن</p>
               </div>
               <ProfessorRank avatar={activeChatProf.avatar} studentCount={activeChatProf.studentCount || 0} size="sm" />
            </div>
            <button onClick={openGoogleMeet} className="bg-blue-600 text-white p-4 rounded-full shadow-lg">🎥</button>
          </header>
          <div className="flex-1 p-8 space-y-6 overflow-y-auto no-scrollbar">
             <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] rounded-br-none shadow-sm font-bold text-lg text-right max-w-[80%] border dark:border-gray-700">
                   أهلاً بك يا {currentUser?.firstName}. هل تود بدء مكالمة فيديو لمناقشة الدرس؟
                </div>
             </div>
          </div>
          <div className="p-8 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
             <div className="flex gap-5 max-w-5xl mx-auto">
                <button onClick={openGoogleMeet} className="bg-blue-50 text-blue-600 p-5 rounded-full text-3xl shadow-sm">📹</button>
                <input placeholder="اكتب استفسارك هنا..." className="flex-1 bg-gray-50 dark:bg-gray-800 p-6 rounded-[2rem] outline-none font-bold text-lg dark:text-white text-right" />
                <button className="bg-emerald-600 text-white p-5 rounded-full shadow-lg">🚀</button>
             </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderJarvis = () => {
    if (!isJarvisOpen) return null;
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 w-full max-w-3xl h-[85vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden relative border-8 border-emerald-500/10">
          <div className="p-10 border-b dark:border-gray-800 flex justify-between items-center bg-emerald-600 text-white">
            <h3 className="font-black text-3xl tracking-tight">✨ جارفيس (Jarvis)</h3>
            <button onClick={() => setIsJarvisOpen(false)} className="p-4 bg-white/10 rounded-full transition-all">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
            {jarvisChat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-8 rounded-[3rem] font-bold text-lg shadow-sm ${msg.role === 'user' ? 'bg-gray-100 text-right' : 'bg-emerald-600 text-white text-right'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-10 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
            <div className="flex gap-5">
               <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()} placeholder="اسأل جارفيس..." className="flex-1 bg-gray-50 dark:bg-gray-800 p-6 rounded-[2rem] outline-none font-bold text-xl dark:text-white text-right" />
               <button onClick={handleJarvisAsk} className="bg-emerald-600 text-white p-6 rounded-[2rem] shadow-xl">🚀</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen selection:bg-emerald-200">
      {renderView()}
      {renderJarvis()}
      
      {/* Modal: Add Content (For Professors) */}
      {showAddContent && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-12 rounded-[4rem] shadow-2xl space-y-8 text-right">
            <h3 className="text-3xl font-black text-emerald-600">رفع درس جديد</h3>
            <p className="text-gray-400 font-bold">يمكنك رفع ملفات PDF أو صور توضيحية لطلابك.</p>
            
            <div className="space-y-6">
              <input 
                type="text" 
                placeholder="عنوان الدرس..." 
                value={newContentData.title}
                onChange={e => setNewContentData({ ...newContentData, title: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500"
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-16 border-4 border-dashed border-emerald-100 dark:border-emerald-800 rounded-[3rem] text-center cursor-pointer hover:bg-emerald-50 transition-all flex flex-col items-center gap-4"
              >
                <span className="text-6xl">{selectedFile ? (selectedFile.type.startsWith('image/') ? '🖼️' : '📄') : '📁'}</span>
                <p className="font-black text-emerald-600">{selectedFile ? selectedFile.name : 'اضغط لاختيار ملف (PDF أو صورة)'}</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
              </div>
            </div>
            
            <div className="flex gap-4">
              <button onClick={handleAddContentSubmit} disabled={!selectedFile} className="flex-1 bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl shadow-lg disabled:opacity-50">تأكيد الرفع</button>
              <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 py-6 rounded-3xl font-black text-xl dark:text-white">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal would go here */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md p-12 rounded-[4rem] shadow-2xl space-y-10 text-right">
            <h3 className="text-3xl font-black text-emerald-600 text-center">شحن الرصيد بالهاتف</h3>
            <div className="grid grid-cols-3 gap-2">
               {[200, 500, 1000].map(amt => (
                 <button key={amt} onClick={() => handlePhoneRecharge('Mobilis', amt)} className="bg-emerald-600 text-white p-5 rounded-2xl font-black shadow-md">{amt} دج</button>
               ))}
            </div>
            <button onClick={() => setShowRechargeModal(false)} className="w-full text-gray-400 font-bold">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
