
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
      
      // Inject some initial channels if none exist
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

  // --- Render Functions ---

  const renderDashboard = () => {
    const isProf = currentUser?.role === 'professor';
    // القنوات التي اشترك فيها الطالب
    const subscribedChannels = channels.filter(c => c.subscribers.includes(currentUser?.id || ''));
    // الأساتذة المتابعون (الذين يملك الطالب اشتراكاً في قنواتهم)
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

              {/* Filters */}
              {!isProf && (
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row gap-6 border dark:border-gray-800">
                  <div className="flex-1 space-y-3">
                    <label className="text-xs font-black text-gray-500 mr-2">اختيار الجامعة</label>
                    <select value={filterUniv} onChange={e => setFilterUniv(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white border-2 border-transparent outline-none focus:border-emerald-500 font-bold transition-all appearance-none">
                      <option value="">كل الجامعات</option>
                      {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 space-y-3">
                    <label className="text-xs font-black text-gray-500 mr-2">اختيار الكلية</label>
                    <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white border-2 border-transparent outline-none focus:border-emerald-500 font-bold transition-all appearance-none">
                      <option value="">كل الكليات</option>
                      {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Professors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {users.filter(u => 
                  u.role === 'professor' && 
                  (!filterUniv || u.university === filterUniv) &&
                  (!filterFaculty || u.faculty === filterFaculty)
                ).map(prof => (
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

          {activeTab === 'my-channels' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <h2 className="text-3xl font-black dark:text-white">قنواتي المتابعة 📡</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {subscribedChannels.map(chan => {
                    const prof = users.find(u => u.id === chan.professorId);
                    return (
                      <div key={chan.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border-2 border-emerald-50 dark:border-emerald-900/20 flex justify-between items-center shadow-sm hover:shadow-lg transition-all border-r-8 border-r-emerald-500 group">
                        <div className="text-right">
                          <h4 className="font-black text-2xl dark:text-white">{chan.name}</h4>
                          <p className="text-xs text-emerald-600 font-bold mt-1">الأستاذ: {prof?.firstName} {prof?.lastName}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{chan.department || 'عام'}</p>
                        </div>
                        <button onClick={() => { setSelectedChannel(chan); setView('channel-view'); }} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black hover:scale-105 transition-all shadow-md">دخول</button>
                      </div>
                    );
                  })}
                  {subscribedChannels.length === 0 && (
                    <div className="col-span-full py-32 text-center opacity-30 flex flex-col items-center">
                      <span className="text-9xl mb-4">📺</span>
                      <p className="text-2xl font-black">لم تشترك في أي قناة حتى الآن</p>
                      <button onClick={() => setActiveTab('home')} className="mt-4 text-emerald-600 font-black underline">استكشف الأساتذة</button>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
               <h2 className="text-3xl font-black dark:text-white">الدردشة مع الأساتذة المتابعين 💬</h2>
               <div className="grid grid-cols-1 gap-4">
                  {followedProfs.map(prof => (
                    <button key={prof.id} onClick={() => { setActiveChatProf(prof); setView('chat-view'); }} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border dark:border-gray-800 flex items-center gap-6 text-right hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all group shadow-sm">
                      <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="sm" />
                      <div className="flex-1">
                         <h4 className="font-black text-xl dark:text-white">{prof.firstName} {prof.lastName}</h4>
                         <p className="text-xs text-gray-400 font-bold">{prof.university}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">💬</div>
                    </button>
                  ))}
                  {followedProfs.length === 0 && (
                    <div className="text-center py-20 opacity-40">
                      <p className="text-lg font-black">يجب أن تشترك في مادة أستاذ لتتمكن من مراسلته.</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="max-w-3xl mx-auto space-y-10 animate-in zoom-in duration-500">
               <div className="bg-emerald-600 text-white p-16 rounded-[4rem] text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10 text-[12rem] rotate-12">💰</div>
                  <h3 className="text-2xl font-bold opacity-80 mb-4">رصيدك الحالي</h3>
                  <p className="text-8xl font-black tracking-tighter">{currentUser?.walletBalance} <span className="text-3xl">دج</span></p>
               </div>
               
               <div className="space-y-6">
                  <h4 className="font-black text-2xl dark:text-white pr-2">خيارات الشحن السريع</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <button 
                       onClick={() => setShowRechargeModal(true)}
                       className="p-10 bg-white dark:bg-gray-900 border-2 border-transparent dark:border-gray-800 rounded-[3rem] text-right font-black dark:text-white shadow-md hover:border-emerald-500 hover:scale-[1.03] transition-all flex items-center justify-between group"
                     >
                        <div className="flex items-center gap-5">
                          <span className="text-5xl">📱</span>
                          <div>
                            <p className="text-xl">شحن رصيد الهاتف</p>
                            <p className="text-xs text-gray-400 font-bold">Mobilis / Djezzy / Ooredoo</p>
                          </div>
                        </div>
                        <span className="text-3xl text-emerald-600 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">←</span>
                     </button>
                     <button className="p-10 bg-white dark:bg-gray-900 border-2 border-transparent dark:border-gray-800 rounded-[3rem] text-right font-black dark:text-white shadow-md hover:border-blue-500 hover:scale-[1.03] transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                          <span className="text-5xl">🏦</span>
                          <div>
                            <p className="text-xl">بريدي موب / ذهبية</p>
                            <p className="text-xs text-gray-400 font-bold">بطاقة الدفع الإلكتروني</p>
                          </div>
                        </div>
                        <span className="text-3xl text-blue-600 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">←</span>
                     </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border dark:border-gray-800 shadow-sm text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
                 <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="lg" />
                 <h2 className="text-4xl font-black dark:text-white mt-8">{currentUser?.firstName} {currentUser?.lastName}</h2>
                 <p className="text-emerald-600 font-bold mt-2 text-lg">{currentUser?.email}</p>
                 
                 <div className="mt-12 space-y-4 text-right">
                    {/* Phone Number Section */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-between border-2 border-transparent focus-within:border-emerald-500 transition-all">
                       <input 
                         type="tel" 
                         value={currentUser?.phoneNumber || ''} 
                         onChange={(e) => {
                           const updated = { ...currentUser!, phoneNumber: e.target.value };
                           setCurrentUser(updated);
                         }}
                         placeholder="أدخل رقم هاتفك..." 
                         className="bg-transparent border-none outline-none font-black text-lg dark:text-white w-full"
                       />
                       <span className="text-xs text-gray-400 font-black whitespace-nowrap mr-4">رقم الهاتف</span>
                    </div>

                    {/* Language Switcher */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-between">
                        <div className="flex gap-3">
                           {['ar', 'fr', 'en'].map(l => (
                             <button 
                               key={l} 
                               onClick={() => setLanguage(l as any)} 
                               className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${language === l ? 'bg-emerald-600 text-white shadow-md' : 'bg-white dark:bg-gray-700 text-gray-400 hover:bg-gray-100'}`}
                             >
                               {l === 'ar' ? 'العربية' : l.toUpperCase()}
                             </button>
                           ))}
                        </div>
                        <span className="text-xs text-gray-400 font-black">اللغة المفضلة</span>
                    </div>

                    {/* Dark Mode Toggle */}
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)} 
                      className="w-full p-8 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] font-black dark:text-white flex items-center justify-between group hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
                    >
                       <div className="flex items-center gap-4">
                         <span className="text-3xl">{isDarkMode ? '☀️' : '🌙'}</span>
                         <span className="text-lg">{isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
                       </div>
                       <div className={`w-14 h-8 rounded-full p-1 transition-all ${isDarkMode ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                          <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all transform ${isDarkMode ? '-translate-x-6' : 'translate-x-0'}`}></div>
                       </div>
                    </button>
                    
                    <button onClick={handleLogout} className="w-full bg-red-50 text-red-500 py-8 rounded-[3rem] font-black text-xl border-2 border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all mt-10 shadow-lg active:scale-95">تسجيل الخروج</button>
                 </div>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t dark:border-gray-800 flex justify-around p-5 z-[100] pb-safe shadow-2xl">
          {[
            { id: 'home', icon: '🏠' },
            { id: 'my-channels', icon: '📡' },
            { id: 'messages', icon: '💬' },
            { id: 'wallet', icon: '💰' },
            { id: 'profile', icon: '👤' }
          ].filter(tab => !isProf || tab.id !== 'my-channels').map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center p-3 rounded-[1.5rem] transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-xl scale-110 -translate-y-2' : 'text-gray-400 hover:text-emerald-500'}`}>
              <span className="text-2xl">{tab.icon}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  };

  const renderView = () => {
    if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-emerald-100 dark:border-emerald-900/20 border-t-emerald-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-emerald-600 font-black">W</div>
        </div>
        <p className="font-black text-emerald-600 animate-pulse mt-8 tracking-[0.5em] uppercase">WAY Digital</p>
      </div>
    );

    if (view === 'landing') return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="grid grid-cols-4 gap-4 rotate-12 scale-150">
            {Array.from({length: 16}).map((_, i) => <div key={i} className="h-40 border-2 border-white rounded-[2rem]"></div>)}
          </div>
        </div>
        
        <div className="animate-float mb-16 z-10">
          <h1 className="text-[12rem] font-black tracking-tighter mb-4 drop-shadow-2xl leading-none">WAY</h1>
          <p className="text-3xl opacity-90 font-bold uppercase tracking-[0.3em]">الجامعة الرقمية</p>
        </div>

        <div className="flex flex-col gap-5 w-full max-w-md z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => handleQuickLogin('student')} className="bg-yellow-400 text-emerald-900 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 border-b-8 border-yellow-600 active:translate-y-2 active:border-b-0">
              🚀 دخول ربيع
            </button>
            <button onClick={() => handleQuickLogin('prof_bakhta')} className="bg-white text-emerald-600 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 border-b-8 border-gray-200 active:translate-y-2 active:border-b-0">
              👩‍🏫 دخول بختة
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setView('register-prof')} className="bg-emerald-500/50 backdrop-blur-md text-white py-5 rounded-[2rem] font-black text-lg border-2 border-emerald-400/50 hover:bg-emerald-500 transition-all">أنا أستاذ</button>
            <button onClick={() => setView('register-student')} className="bg-emerald-500/50 backdrop-blur-md text-white py-5 rounded-[2rem] font-black text-lg border-2 border-emerald-400/50 hover:bg-emerald-500 transition-all">أنا طالب</button>
          </div>
          
          <button onClick={() => setView('login')} className="mt-8 font-bold underline text-xl opacity-80 hover:opacity-100 transition-opacity">سجلت من قبل؟ دخول</button>
        </div>
        
        <footer className="absolute bottom-10 opacity-50 text-[10px] font-black uppercase tracking-widest">Powered by Rabie AI Engines © 2025</footer>
      </div>
    );

    if (view === 'login' || view.startsWith('register')) return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[4rem] shadow-2xl p-12 space-y-10 animate-in zoom-in duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-bl-[100%]"></div>
          
          <h2 className="text-5xl font-black text-emerald-600 text-center">{view === 'login' ? 'عودة ميمونة' : 'انضم إلينا'}</h2>
          
          <form className="space-y-5" onSubmit={view === 'login' ? handleLogin : (e:any) => {
            e.preventDefault();
            const d = { firstName: e.target.fname?.value, lastName: e.target.lname?.value, email: e.target.email.value, university: e.target.univ?.value };
            handleRegister(view === 'register-prof' ? 'professor' : 'student', d);
          }}>
            {view !== 'login' && (
              <div className="grid grid-cols-2 gap-4">
                <input name="fname" placeholder="الاسم" required className="bg-gray-50 dark:bg-gray-800 dark:text-white p-5 rounded-[1.5rem] border-2 border-transparent outline-none font-bold focus:border-emerald-500 transition-all" />
                <input name="lname" placeholder="اللقب" required className="bg-gray-50 dark:bg-gray-800 dark:text-white p-5 rounded-[1.5rem] border-2 border-transparent outline-none font-bold focus:border-emerald-500 transition-all" />
              </div>
            )}
            <input name="email" type="email" placeholder="البريد الإلكتروني" required className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white p-5 rounded-[1.5rem] border-2 border-transparent outline-none font-bold focus:border-emerald-500 transition-all" />
            <input name="password" type="password" placeholder="كلمة المرور" required className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white p-5 rounded-[1.5rem] border-2 border-transparent outline-none font-bold focus:border-emerald-500 transition-all" />
            
            <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-xl hover:bg-emerald-700 transition-all transform active:scale-95 shadow-emerald-500/20">تأكيد</button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 font-bold hover:text-emerald-600 transition-colors">رجوع للقائمة</button>
          </form>
        </div>
      </div>
    );

    if (view === 'dashboard') return renderDashboard();

    if (view === 'channel-view' && selectedChannel && currentUser) {
      const isOwner = selectedChannel.professorId === currentUser.id;
      const isSub = selectedChannel.subscribers?.includes(currentUser.id);
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-right animate-in fade-in duration-300">
           <header className="bg-white dark:bg-gray-900 p-8 shadow-xl flex justify-between items-center sticky top-0 z-50 border-b dark:border-gray-800">
             <button onClick={() => setView('dashboard')} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-8 py-4 rounded-2xl font-black shadow-sm transition-all hover:bg-emerald-100">✕ رجوع</button>
             <div className="text-center">
                <h2 className="font-black text-3xl dark:text-white">{selectedChannel.name}</h2>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-[0.2em] mt-1">{selectedChannel.department}</p>
             </div>
             <div className="w-24"></div>
           </header>
           
           <main className="flex-1 p-6 md:p-12 overflow-y-auto space-y-10 max-w-5xl mx-auto w-full no-scrollbar pb-40">
             {!isOwner && !isSub ? (
               <div className="bg-white dark:bg-gray-900 p-24 rounded-[5rem] text-center space-y-10 shadow-2xl border-4 border-emerald-50 dark:border-emerald-900/10">
                 <span className="text-[16rem] block mb-6 animate-pulse">🔒</span>
                 <h3 className="text-5xl font-black dark:text-white">قناة مقفلة</h3>
                 <p className="text-gray-400 font-bold text-xl max-w-md mx-auto">هذا المحتوى حصري للمشتركين فقط. اشترك الآن بـ {selectedChannel.price} دج لتصلك كل الدروس.</p>
                 <button onClick={() => handleSubscribe(selectedChannel.id)} className="bg-emerald-600 text-white px-24 py-8 rounded-[3rem] font-black text-3xl shadow-[0_25px_60px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all">
                   اشترك الآن
                 </button>
               </div>
             ) : (
               <div className="space-y-8">
                 <div className="flex justify-between items-end">
                    <h3 className="text-3xl font-black dark:text-white">قائمة الدروس والمحتوى</h3>
                    {isOwner && <button className="bg-emerald-600 text-white p-4 rounded-2xl font-black">+ درس جديد</button>}
                 </div>
                 <div className="grid grid-cols-1 gap-6">
                  {selectedChannel.content?.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-900 p-10 rounded-[4rem] border dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 hover:shadow-2xl transition-all border-r-8 border-r-emerald-500">
                        <div className="flex gap-4 w-full md:w-auto">
                          <button onClick={() => handleSummarize(item)} className="flex-1 bg-emerald-600 text-white px-12 py-6 rounded-[2rem] font-black shadow-lg hover:bg-emerald-700 transition-all active:scale-95">✨ تلخيص Jarvis</button>
                          <a href={item.url} target="_blank" rel="noreferrer" className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-12 py-6 rounded-[2rem] font-black text-center shadow-inner hover:bg-emerald-100 transition-all">📂 فتح الملف</a>
                        </div>
                        <div className="text-right flex-1 flex items-center gap-8">
                          <div className="flex-1">
                            <p className="font-black dark:text-white text-3xl">{item.title}</p>
                            <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString('ar-DZ')}</p>
                          </div>
                          <div className="p-8 bg-emerald-50 dark:bg-gray-800 rounded-[2.5rem] text-5xl shadow-sm">
                            {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : '🖼️'}
                          </div>
                        </div>
                    </div>
                  ))}
                  {(!selectedChannel.content || selectedChannel.content.length === 0) && (
                    <div className="py-40 text-center opacity-10 flex flex-col items-center">
                      <span className="text-[14rem]">📚</span>
                      <p className="text-4xl font-black mt-4">لا يوجد محتوى حالياً</p>
                    </div>
                  )}
                 </div>
               </div>
             )}
           </main>
        </div>
      );
    }

    if (view === 'chat-view' && activeChatProf) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-right animate-in slide-in-from-left-4 duration-300">
          <header className="bg-white dark:bg-gray-900 p-8 shadow-xl flex justify-between items-center border-b dark:border-gray-800">
            <button onClick={() => setView('dashboard')} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-8 py-4 rounded-2xl font-black transition-all hover:bg-emerald-100">✕ رجوع</button>
            <div className="flex items-center gap-5">
               <div>
                 <h2 className="font-black text-2xl dark:text-white">{activeChatProf.firstName} {activeChatProf.lastName}</h2>
                 <p className="text-xs text-emerald-600 font-black tracking-widest uppercase">أستاذ المادة المتابعة</p>
               </div>
               <ProfessorRank avatar={activeChatProf.avatar} studentCount={activeChatProf.studentCount || 0} size="sm" />
            </div>
            <div className="w-16"></div>
          </header>
          
          <div className="flex-1 p-8 space-y-6 overflow-y-auto no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
             <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] rounded-br-none shadow-sm font-bold text-lg text-right max-w-[80%] border dark:border-gray-700">
                   أهلاً بك يا {currentUser?.firstName}. كيف يمكنني مساعدتك في هذه المادة؟ هل لديك أي استفسار حول الدروس الأخيرة؟
                </div>
             </div>
             <div className="text-center opacity-20 text-xs font-black uppercase tracking-widest py-4">الرسائل محمية ومؤمنة</div>
          </div>
          
          <div className="p-8 bg-white dark:bg-gray-900 border-t dark:border-gray-800 shadow-inner">
             <div className="flex gap-5 max-w-5xl mx-auto">
                <button className="bg-gray-100 dark:bg-gray-800 p-5 rounded-full text-3xl shadow-sm hover:scale-110 transition-transform">📎</button>
                <input placeholder="اكتب استفسارك هنا للأستاذ..." className="flex-1 bg-gray-50 dark:bg-gray-800 p-6 rounded-[2rem] outline-none font-bold text-lg dark:text-white text-right border-2 border-transparent focus:border-emerald-500 transition-all shadow-inner" />
                <button className="bg-emerald-600 text-white p-5 rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:scale-110 active:scale-95 transition-all">
                  <svg className="w-8 h-8 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
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
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-900 w-full max-w-3xl h-[85vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden relative border-8 border-emerald-500/10">
          {/* Header */}
          <div className="p-10 border-b dark:border-gray-800 flex justify-between items-center bg-emerald-600 text-white relative">
            <div className="absolute top-0 right-0 w-40 h-full bg-white/5 skew-x-12"></div>
            <div className="flex items-center gap-5 z-10">
              <span className="text-5xl animate-pulse">✨</span>
              <div>
                <h3 className="font-black text-3xl tracking-tight">جارفيس (Jarvis)</h3>
                <p className="text-xs opacity-80 font-bold uppercase tracking-[0.2em]">الذكاء الاصطناعي الخاص بمنصة WAY</p>
              </div>
            </div>
            <button onClick={() => setIsJarvisOpen(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all z-10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar bg-gray-50/50 dark:bg-gray-950/20">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-8 rounded-[2.5rem] border-2 border-emerald-100 dark:border-emerald-800 text-right shadow-sm">
               <p className="text-emerald-700 dark:text-emerald-400 font-black text-lg leading-relaxed">أهلاً بيك خويا {currentUser?.firstName}! أنا جارفيس، صممني ربيع باش نكون يدك اليمنى في الجامعة. كيفاش نقدر نعاونك اليوم؟ اسألني على أي حاجة في قرايتك.</p>
            </div>
            
            {jarvisChat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-8 rounded-[3rem] font-bold text-lg shadow-sm leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-white dark:bg-gray-800 text-right rounded-br-none border dark:border-gray-700' 
                  : 'bg-emerald-600 text-white text-right rounded-bl-none shadow-emerald-500/20'
                }`}>
                  {msg.text}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/20 space-y-3">
                      <p className="text-xs opacity-80 font-black uppercase tracking-widest">📚 مراجع مقترحة:</p>
                      {msg.sources.map((s: any, j: number) => (
                        s.web && (
                          <a key={j} href={s.web.uri} target="_blank" rel="noreferrer" className="block text-xs hover:underline flex items-center gap-3 bg-white/10 p-3 rounded-xl transition-all">
                            🔗 {s.web.title || s.web.uri}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isJarvisThinking && (
              <div className="flex justify-end">
                <div className="bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 p-6 rounded-[2rem] rounded-bl-none animate-pulse flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="font-black">جاري التفكير...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-10 bg-white dark:bg-gray-900 border-t dark:border-gray-800 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
            <div className="flex gap-5 max-w-2xl mx-auto">
               <input 
                 value={jarvisInput}
                 onChange={e => setJarvisInput(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()}
                 placeholder="اكتب استفسارك لجارفيس..." 
                 className="flex-1 bg-gray-50 dark:bg-gray-800 p-6 rounded-[2rem] outline-none font-black text-xl dark:text-white text-right border-2 border-transparent focus:border-emerald-500 transition-all shadow-inner" 
               />
               <button 
                 onClick={handleJarvisAsk}
                 disabled={isJarvisThinking}
                 className="bg-emerald-600 text-white p-6 rounded-[2rem] shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50 hover:scale-105 active:scale-90"
               >
                 <svg className="w-8 h-8 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
               </button>
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
      
      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md p-12 rounded-[4rem] shadow-2xl space-y-10 text-right">
            <h3 className="text-3xl font-black text-emerald-600">شحن رصيد الهاتف</h3>
            <p className="text-gray-400 font-bold">أدخل رقم الهاتف والمبلغ المراد شحنه لمحفظة WAY الخاصة بك.</p>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <button onClick={() => {}} className="flex-1 p-4 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500 rounded-2xl font-black">Mobilis</button>
                <button onClick={() => {}} className="flex-1 p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black opacity-50">Djezzy</button>
                <button onClick={() => {}} className="flex-1 p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black opacity-50">Ooredoo</button>
              </div>
              <input placeholder="رقم الهاتف (05/06/07...)" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white text-center border-2 border-transparent focus:border-emerald-500" />
              <div className="grid grid-cols-3 gap-2">
                {[200, 500, 1000].map(amt => (
                  <button key={amt} onClick={() => handlePhoneRecharge('Mobilis', amt)} className="bg-emerald-600 text-white p-4 rounded-xl font-black shadow-md hover:scale-105 transition-transform">{amt} دج</button>
                ))}
              </div>
            </div>
            
            <button onClick={() => setShowRechargeModal(false)} className="w-full text-gray-400 font-bold hover:text-emerald-600 transition-colors">إلغاء العملية</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
