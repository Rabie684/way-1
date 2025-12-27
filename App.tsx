
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

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newChannelData, setNewChannelData] = useState({ name: '', department: '', description: '', price: 200 });
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
      if (storedChannels) setChannels(JSON.parse(storedChannels));
      
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        // Sync session user with database
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
      }
      setLoading(false);
    }, 600);
  };

  // Fix: Added missing handleLogin function
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const user = users.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
      setView('dashboard');
    } else {
      alert("البريد الإلكتروني غير مسجل في WAY");
    }
  };

  // Fix: Added missing handleRegister function
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
    alert("تم الاشتراك بنجاح! يمكنك الآن الدردشة مع الأستاذ.");
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

  // Fix: Added missing handleSummarize function to use the imported summarizeContent service
  const handleSummarize = async (item: ContentItem) => {
    setIsJarvisOpen(true);
    setJarvisChat(prev => [...prev, { role: 'user', text: `يا جارفيس، لخصلي هاد المحتوى: ${item.title}` }]);
    setIsJarvisThinking(true);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: summary || "سمحلي يا خويا الطالب، ماقدرتش نلخص هاد الملف حالياً." }]);
    setIsJarvisThinking(false);
  };

  // --- View Renders ---

  const renderDashboard = () => {
    const isProf = currentUser?.role === 'professor';
    const subscribedChannels = channels.filter(c => c.subscribers.includes(currentUser?.id || ''));

    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-72 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-8 flex-col gap-10 shadow-xl z-20">
          <h2 className="text-4xl font-black text-emerald-600 text-center tracking-tighter">WAY</h2>
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
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Jarvis Button */}
        <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[100] w-16 h-16 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce border-4 border-white dark:border-gray-800 transition-transform active:scale-90">
          <span className="text-3xl">✨</span>
        </button>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32 no-scrollbar">
          
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="space-y-10 max-w-5xl mx-auto">
              <header className="space-y-2">
                <h1 className="text-4xl font-black dark:text-white">مرحباً، {currentUser?.firstName} 👋</h1>
                <p className="text-gray-400 font-bold">استكشف أفضل الأساتذة والدروس في الجزائر</p>
              </header>

              {/* Filters */}
              {!isProf && (
                <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row gap-4 border dark:border-gray-800">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">تصفية حسب الجامعة</label>
                    <select value={filterUniv} onChange={e => setFilterUniv(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white border-none outline-none ring-2 ring-transparent focus:ring-emerald-500 font-bold transition-all">
                      <option value="">كل الجامعات الجزائريـة</option>
                      {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">تصفية حسب الكلية</label>
                    <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white border-none outline-none ring-2 ring-transparent focus:ring-emerald-500 font-bold transition-all">
                      <option value="">كل الكليـات</option>
                      {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Professor Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {users.filter(u => 
                  u.role === 'professor' && 
                  (!filterUniv || u.university === filterUniv) &&
                  (!filterFaculty || u.faculty === filterFaculty)
                ).map(prof => (
                  <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 text-center space-y-4 shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all group relative overflow-hidden">
                    <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="md" />
                    <div>
                      <h4 className="font-black text-xl dark:text-white">{prof.firstName} {prof.lastName}</h4>
                      <p className="text-[10px] text-emerald-600 font-bold mt-1 line-clamp-1">{prof.university}</p>
                    </div>
                    <button onClick={() => {
                      const chan = channels.find(c => c.professorId === prof.id);
                      if (chan) { setSelectedChannel(chan); setView('channel-view'); }
                      else alert("هذا الأستاذ لم ينشر محتوى بعد.");
                    }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl text-xs font-black shadow-lg group-hover:scale-105 transition-transform active:scale-95">استعراض المادة</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MY CHANNELS TAB */}
          {activeTab === 'my-channels' && (
            <div className="max-w-5xl mx-auto space-y-8">
               <h2 className="text-3xl font-black dark:text-white">قنواتي المتابعة 📡</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {subscribedChannels.map(chan => (
                    <div key={chan.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 flex justify-between items-center shadow-sm hover:shadow-md transition-all border-r-8 border-r-emerald-500">
                      <div className="text-right">
                        <h4 className="font-black text-2xl dark:text-white">{chan.name}</h4>
                        <p className="text-xs text-gray-400 font-bold">{chan.department || 'عام'}</p>
                      </div>
                      <button onClick={() => { setSelectedChannel(chan); setView('channel-view'); }} className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-6 py-3 rounded-2xl font-black hover:bg-emerald-600 hover:text-white transition-all">دخول</button>
                    </div>
                  ))}
                  {subscribedChannels.length === 0 && (
                    <div className="col-span-full py-20 text-center opacity-20">
                      <span className="text-8xl block mb-4">📺</span>
                      <p className="text-2xl font-black">لم تشترك في أي قناة بعد</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* MESSAGES TAB */}
          {activeTab === 'messages' && (
            <div className="max-w-5xl mx-auto space-y-8">
               <h2 className="text-3xl font-black dark:text-white">دردشات مع الأساتذة 💬</h2>
               <div className="grid grid-cols-1 gap-4">
                  {users.filter(u => u.role === 'professor' && channels.some(c => c.professorId === u.id && c.subscribers.includes(currentUser?.id || ''))).map(prof => (
                    <button key={prof.id} onClick={() => { setActiveChatProf(prof); setView('chat-view'); }} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 flex items-center gap-6 text-right hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                      <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="sm" />
                      <div className="flex-1">
                         <h4 className="font-black text-xl dark:text-white">{prof.firstName} {prof.lastName}</h4>
                         <p className="text-xs text-gray-400 font-bold">أستاذ المادة المتابعة</p>
                      </div>
                      <span className="text-emerald-600 font-black">دردشة الآن ←</span>
                    </button>
                  ))}
                  {subscribedChannels.length === 0 && (
                    <p className="text-center text-gray-400 font-bold py-10">اشترك في قنوات الأساتذة لتتمكن من مراسلتهم.</p>
                  )}
               </div>
            </div>
          )}

          {/* WALLET TAB */}
          {activeTab === 'wallet' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in zoom-in duration-300">
               <div className="bg-emerald-600 text-white p-12 rounded-[3.5rem] text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl">💰</div>
                  <h3 className="text-xl font-bold opacity-80 mb-2">رصيدك الحالي</h3>
                  <p className="text-6xl font-black tracking-tight">{currentUser?.walletBalance} <span className="text-xl">دج</span></p>
               </div>
               
               <div className="space-y-4">
                  <h4 className="font-black text-xl dark:text-white pr-2">شحن الرصيد الفوري</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button className="p-8 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl text-right font-black dark:text-white shadow-sm hover:scale-[1.02] transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <span className="text-4xl">📱</span>
                          <div>
                            <p>شحن رصيد الهاتف</p>
                            <p className="text-[10px] text-gray-400">Mobilis / Djezzy / Ooredoo</p>
                          </div>
                        </div>
                        <span className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">إختر ←</span>
                     </button>
                     <button className="p-8 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl text-right font-black dark:text-white shadow-sm hover:scale-[1.02] transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <span className="text-4xl">🏦</span>
                          <div>
                            <p>بريدي موب / كارد</p>
                            <p className="text-[10px] text-gray-400">BaridiMob / Edahabia</p>
                          </div>
                        </div>
                        <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">إختر ←</span>
                     </button>
                  </div>
               </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] border dark:border-gray-800 shadow-sm text-center relative overflow-hidden">
                 <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="lg" />
                 <h2 className="text-4xl font-black dark:text-white mt-6">{currentUser?.firstName} {currentUser?.lastName}</h2>
                 <p className="text-emerald-600 font-bold mt-2">{currentUser?.email}</p>
                 
                 <div className="mt-10 grid grid-cols-1 gap-4 text-right">
                    <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-between">
                       <input 
                         type="tel" 
                         value={currentUser?.phoneNumber || ''} 
                         onChange={(e) => {
                           const updated = { ...currentUser!, phoneNumber: e.target.value };
                           setCurrentUser(updated);
                         }}
                         placeholder="أضف رقم هاتفك..." 
                         className="bg-transparent border-none outline-none font-bold dark:text-white w-full"
                       />
                       <span className="text-xs text-gray-400 font-black">رقم الهاتف</span>
                    </div>

                    <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-between">
                        <div className="flex gap-2">
                           {['ar', 'fr', 'en'].map(l => (
                             <button key={l} onClick={() => setLanguage(l as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${language === l ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-400'}`}>{l}</button>
                           ))}
                        </div>
                        <span className="text-xs text-gray-400 font-black">اللغـة</span>
                    </div>

                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl font-black dark:text-white flex items-center justify-between">
                       <span>{isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
                       <span>{isDarkMode ? '☀️' : '🌙'}</span>
                    </button>
                    
                    <button onClick={handleLogout} className="w-full bg-red-50 text-red-500 py-6 rounded-[2.5rem] font-black border border-red-100 mt-6 active:scale-95 transition-transform">تسجيل الخروج</button>
                 </div>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex justify-around p-4 z-[100] pb-safe shadow-2xl">
          {[
            { id: 'home', icon: '🏠' },
            { id: 'my-channels', icon: '📡' },
            { id: 'messages', icon: '💬' },
            { id: 'wallet', icon: '💰' },
            { id: 'profile', icon: '👤' }
          ].filter(tab => !isProf || tab.id !== 'my-channels').map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 scale-110' : 'text-gray-400'}`}>
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
        <div className="w-20 h-20 border-8 border-emerald-100 border-t-emerald-600 rounded-full animate-spin shadow-2xl mb-6"></div>
        <p className="font-black text-emerald-600 animate-pulse tracking-widest">WAY ... جاري التحميل</p>
      </div>
    );

    if (view === 'landing') return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="animate-float mb-12">
          <h1 className="text-9xl font-black tracking-tighter mb-2 drop-shadow-2xl">WAY</h1>
          <p className="text-xl opacity-90 font-bold uppercase">الجامعة الجزائرية الرقمية</p>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button onClick={() => handleQuickLogin('student')} className="bg-yellow-400 text-emerald-900 py-6 rounded-3xl font-black text-xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 border-b-4 border-yellow-600">
            🚀 دخول مباشر (تجربة ربيع)
          </button>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <button onClick={() => setView('register-prof')} className="bg-white text-emerald-600 py-5 rounded-3xl font-black text-lg shadow-xl hover:scale-105 transition-all">أنا أستاذ</button>
            <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white py-5 rounded-3xl font-black text-lg border-2 border-emerald-400 shadow-xl hover:scale-105 transition-all">أنا طالب</button>
          </div>
          <button onClick={() => setView('login')} className="mt-10 font-bold underline text-lg opacity-80">لديك حساب؟ سجل دخول</button>
        </div>
      </div>
    );

    if (view === 'login' || view.startsWith('register')) return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in duration-300">
          <h2 className="text-4xl font-black text-emerald-600 text-center">{view === 'login' ? 'مرحباً بعودتك' : 'انضم لـ WAY'}</h2>
          
          {view === 'login' && (
            <div className="space-y-4">
               <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  <div className="flex-1 h-px bg-gray-100"></div>
                  <span>الدخول السريع</span>
                  <div className="flex-1 h-px bg-gray-100"></div>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleQuickLogin('student')} className="flex flex-col items-center gap-2 p-3 bg-emerald-50 rounded-2xl border-2 border-emerald-100 hover:bg-emerald-100 transition-all group">
                    <span className="text-2xl group-hover:scale-110">👦</span>
                    <span className="text-[8px] font-black">ربيع</span>
                  </button>
                  <button onClick={() => handleQuickLogin('prof_bakhta')} className="flex flex-col items-center gap-2 p-3 bg-blue-50 rounded-2xl border-2 border-blue-100 hover:bg-blue-100 transition-all group">
                    <span className="text-2xl group-hover:scale-110">👩‍🏫</span>
                    <span className="text-[8px] font-black">بختة</span>
                  </button>
                  <button onClick={() => handleQuickLogin('prof_aitissa')} className="flex flex-col items-center gap-2 p-3 bg-purple-50 rounded-2xl border-2 border-purple-100 hover:bg-purple-100 transition-all group">
                    <span className="text-2xl group-hover:scale-110">👨‍🏫</span>
                    <span className="text-[8px] font-black">آيت عيسى</span>
                  </button>
               </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={view === 'login' ? handleLogin : (e:any) => {
            e.preventDefault();
            const d = { firstName: e.target.fname?.value, lastName: e.target.lname?.value, email: e.target.email.value, university: e.target.univ?.value };
            handleRegister(view === 'register-prof' ? 'professor' : 'student', d);
          }}>
            {view !== 'login' && (
              <div className="grid grid-cols-2 gap-3">
                <input name="fname" placeholder="الاسم" required className="bg-gray-50 dark:bg-gray-800 dark:text-white p-4 rounded-2xl border outline-none font-bold focus:ring-2 ring-emerald-500" />
                <input name="lname" placeholder="اللقب" required className="bg-gray-50 dark:bg-gray-800 dark:text-white p-4 rounded-2xl border outline-none font-bold focus:ring-2 ring-emerald-500" />
              </div>
            )}
            <input name="email" type="email" placeholder="البريد الإلكتروني" required className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white p-4 rounded-2xl border outline-none font-bold focus:ring-2 ring-emerald-500" />
            <input name="password" type="password" placeholder="كلمة المرور" required className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white p-4 rounded-2xl border outline-none font-bold focus:ring-2 ring-emerald-500" />
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl hover:bg-emerald-700 transition-all transform active:scale-95">دخول</button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 font-bold hover:text-emerald-600">رجوع</button>
          </form>
        </div>
      </div>
    );

    if (view === 'dashboard') return renderDashboard();

    if (view === 'channel-view' && selectedChannel && currentUser) {
      const isOwner = selectedChannel.professorId === currentUser.id;
      const isSub = selectedChannel.subscribers?.includes(currentUser.id);
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-right">
           <header className="bg-white dark:bg-gray-900 p-6 shadow-xl flex justify-between items-center sticky top-0 z-50 border-b dark:border-gray-800">
             <button onClick={() => setView('dashboard')} className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black active:scale-90 transition-transform">✕ رجوع</button>
             <div className="text-center">
                <h2 className="font-black text-2xl dark:text-white">{selectedChannel.name}</h2>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{selectedChannel.department}</p>
             </div>
             <div className="w-20"></div>
           </header>
           <main className="flex-1 p-6 md:p-12 overflow-y-auto space-y-8 max-w-5xl mx-auto w-full no-scrollbar pb-32">
             {!isOwner && !isSub ? (
               <div className="bg-white dark:bg-gray-900 p-20 rounded-[4rem] text-center space-y-8 shadow-2xl border-4 border-emerald-50 dark:border-emerald-900/10">
                 <span className="text-[14rem] block mb-4">🔒</span>
                 <h3 className="text-4xl font-black dark:text-white">المحتوى مغلق</h3>
                 <p className="text-gray-400 font-bold text-lg">اشترك في هذه المادة للوصول إلى الدروس والدردشة المباشرة مع الأستاذ.</p>
                 <button onClick={() => handleSubscribe(selectedChannel.id)} className="bg-emerald-600 text-white px-20 py-8 rounded-[2.5rem] font-black text-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:scale-105 transition-all">
                   اشترك الآن بـ {selectedChannel.price} دج
                 </button>
               </div>
             ) : (
               <div className="space-y-6">
                 <div className="grid grid-cols-1 gap-6">
                  {selectedChannel.content?.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-2xl transition-all border-r-8 border-r-emerald-500">
                        <div className="flex gap-4 w-full md:w-auto">
                          {/* Updated: Added onClick handler for Summarize button */}
                          <button onClick={() => handleSummarize(item)} className="flex-1 bg-emerald-600 text-white px-10 py-5 rounded-[1.5rem] font-black shadow-lg">✨ تلخيص Jarvis</button>
                          <a href={item.url} target="_blank" rel="noreferrer" className="flex-1 bg-emerald-50 text-emerald-600 px-10 py-5 rounded-[1.5rem] font-black text-center">📂 فتح الملف</a>
                        </div>
                        <div className="text-right flex-1 flex items-center gap-6">
                          <div className="flex-1">
                            <p className="font-black dark:text-white text-2xl">{item.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-widest">{new Date(item.createdAt).toLocaleDateString('ar-DZ')}</p>
                          </div>
                          <div className="p-6 bg-emerald-50 rounded-3xl text-4xl shadow-sm">
                            {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : '🖼️'}
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
          <header className="bg-white dark:bg-gray-900 p-6 shadow-xl flex justify-between items-center border-b dark:border-gray-800">
            <button onClick={() => setView('dashboard')} className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black">✕ رجوع</button>
            <div className="flex items-center gap-4">
               <div>
                 <h2 className="font-black text-xl dark:text-white">{activeChatProf.firstName} {activeChatProf.lastName}</h2>
                 <p className="text-[10px] text-emerald-600 font-black">متصل الآن</p>
               </div>
               <ProfessorRank avatar={activeChatProf.avatar} studentCount={activeChatProf.studentCount || 0} size="sm" />
            </div>
            <div className="w-10"></div>
          </header>
          <div className="flex-1 p-6 space-y-4 overflow-y-auto no-scrollbar">
             <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] rounded-br-none shadow-sm font-bold text-sm text-right max-w-[80%]">
                   أهلاً بك يا {currentUser?.firstName}. كيف يمكنني مساعدتك في هذه المادة؟
                </div>
             </div>
          </div>
          <div className="p-6 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
             <div className="flex gap-4">
                <button className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full text-2xl">📎</button>
                <input placeholder="اكتب رسالتك هنا..." className="flex-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl outline-none font-bold dark:text-white text-right" />
                <button className="bg-emerald-600 text-white p-4 rounded-full shadow-lg">🚀</button>
             </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Fix: Added missing renderJarvis function to display the AI assistant interface
  const renderJarvis = () => {
    if (!isJarvisOpen) return null;

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-[80vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative border-4 border-emerald-500/20">
          {/* Header */}
          <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center bg-emerald-600 text-white">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✨</span>
              <div>
                <h3 className="font-black text-xl">جارفيس (Jarvis)</h3>
                <p className="text-[10px] opacity-80 font-bold uppercase">المساعد الذكي لمنصة WAY</p>
              </div>
            </div>
            <button onClick={() => setIsJarvisOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800 text-right">
               <p className="text-emerald-700 dark:text-emerald-400 font-black text-sm">أهلاً بيك خويا {currentUser?.firstName}! أنا جارفيس المساعد تاعك هنا في WAY. واش نقدر نعاونك اليوم؟</p>
            </div>
            
            {jarvisChat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] font-bold text-sm shadow-sm ${
                  msg.role === 'user' 
                  ? 'bg-gray-100 dark:bg-gray-800 text-right rounded-bl-none' 
                  : 'bg-emerald-600 text-white text-right rounded-br-none'
                }`}>
                  {msg.text}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <p className="text-[10px] opacity-80 mb-2 font-black uppercase">المصادر (Sources):</p>
                      <ul className="space-y-1">
                        {msg.sources.map((s: any, j: number) => (
                          s.web && (
                            <li key={j}>
                              <a href={s.web.uri} target="_blank" rel="noreferrer" className="text-[10px] hover:underline flex items-center gap-2">
                                🔗 {s.web.title || s.web.uri}
                              </a>
                            </li>
                          )
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isJarvisThinking && (
              <div className="flex justify-end">
                <div className="bg-emerald-600/50 text-white p-4 rounded-3xl animate-pulse">
                  جاري التفكير... 🧠
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800">
            <div className="flex gap-4">
               <input 
                 value={jarvisInput}
                 onChange={e => setJarvisInput(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()}
                 placeholder="اسأل جارفيس أي حاجة..." 
                 className="flex-1 bg-white dark:bg-gray-900 p-4 rounded-2xl outline-none font-bold dark:text-white text-right border dark:border-gray-700 shadow-inner" 
               />
               <button 
                 onClick={handleJarvisAsk}
                 disabled={isJarvisThinking}
                 className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
               >
                 <svg className="w-6 h-6 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen selection:bg-emerald-100">
      {renderView()}
      {renderJarvis()}
    </div>
  );
};

export default App;
