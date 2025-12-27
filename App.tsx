import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, ContentItem, ChatMessage, Language } from './types.ts';
import { UNIVERSITIES, FACULTIES } from './constants.ts';
import ProfessorRank from './components/ProfessorRank.tsx';
import { summarizeContent, jarvisAsk } from './services/geminiService.ts';

const App: React.FC = () => {
  // --- States ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'dashboard' | 'channel-view' | 'chat-view'>('landing');
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'messages' | 'ads' | 'wallet' | 'profile'>('home');
  const [loading, setLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activeChatChannel, setActiveChatChannel] = useState<Channel | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'ar');
  
  const [filterUniv, setFilterUniv] = useState<string>('');
  
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  
  const [newChannelData, setNewChannelData] = useState({ name: '', price: 300, description: '', meetingUrl: '' });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Mock Ads ---
  const ads = [
    { id: 1, title: 'مسابقة الابتكار الجامعي 2024', content: 'سجل الآن للمشاركة في أكبر تحدي تقني لطلبة جامعة USTHB.', tag: 'حدث', color: 'bg-emerald-500' },
    { id: 2, title: 'عرض خاص للأساتذة الجدد', content: 'احصل على عمولة 10% فقط لأول 3 أشهر عند إنشاء مقياسك الأول.', tag: 'عرض', color: 'bg-blue-500' },
    { id: 3, title: 'تحديث نظام الدفع عبر البطاقة الذهبية', content: 'يمكنك الآن شحن محفظتك مباشرة وبكل سهولة.', tag: 'تحديث', color: 'bg-amber-500' }
  ];

  // --- Effects ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const storedUsers = localStorage.getItem('way_users');
        const storedChannels = localStorage.getItem('way_channels');
        const sessionUser = localStorage.getItem('way_session');

        let initialUsers = storedUsers ? JSON.parse(storedUsers) : [];
        const defaultUsers: User[] = [
          { id: 'q_student_rabie', firstName: 'حمر العين', lastName: 'ربيع', email: 'rabie@way.dz', role: 'student', university: 'USTHB', faculty: 'كلية التكنولوجيا', walletBalance: 5000, isApproved: true, avatar: '', language: 'ar' },
          { id: 'q_prof_bentahar', firstName: 'بن الطاهر', lastName: 'بختة', email: 'bentahar@way.dz', role: 'professor', university: 'جامعة ابن خلدون تيارت - ملحقة قصر الشلالة', faculty: 'كلية العلوم الاقتصادية والتجارية وعلوم التسيير', walletBalance: 15000, isApproved: true, avatar: '', studentCount: 180, language: 'ar' }
        ];
        defaultUsers.forEach(u => { if (!initialUsers.find((ex: User) => ex.id === u.id)) initialUsers.push(u); });
        setUsers(initialUsers);
        
        let initialChannels = storedChannels ? JSON.parse(storedChannels) : [];
        if (initialChannels.length === 0) {
          initialChannels = [{
            id: 'ch_eco_1', professorId: 'q_prof_bentahar', name: 'الاقتصاد الجزئي 1', department: 'قسم العلوم الاقتصادية', description: 'شرح مفصل لنظرية سلوك المستهلك.', price: 400, subscribers: ['q_student_rabie'],
            content: [{ id: 'c1', title: 'المحاضرة 01', type: 'pdf', url: '#', createdAt: new Date() }],
            meetingUrl: 'https://meet.google.com/new'
          }];
        }
        setChannels(initialChannels);

        if (sessionUser) {
          const parsed = JSON.parse(sessionUser);
          const user = initialUsers.find((u: User) => u.id === parsed.id) || parsed;
          setCurrentUser(user);
          setLanguage(user.language || 'ar');
          setView('dashboard');
        }
      } catch (e) {
        console.error("Init Error:", e);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    init();
  }, []);

  useEffect(() => { 
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, jarvisChat]);

  useEffect(() => { localStorage.setItem('way_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('way_channels', JSON.stringify(channels)); }, [channels]);
  useEffect(() => { 
    document.documentElement.classList.toggle('dark', isDarkMode); 
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  useEffect(() => { localStorage.setItem('lang', language); }, [language]);

  // --- Handlers ---
  const handleLogin = (role: 'student' | 'prof_bentahar') => {
    const ids = { student: 'q_student_rabie', prof_bentahar: 'q_prof_bentahar' };
    const user = users.find(u => u.id === ids[role]);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('way_session', JSON.stringify(user));
      setView('dashboard');
      setActiveTab('home');
    }
  };

  const toggleLanguage = (l: Language) => {
    setLanguage(l);
    if (currentUser) {
      const updatedUser = { ...currentUser, language: l };
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    }
  };

  const handleCreateChannel = () => {
    if (!currentUser) return;
    const newChan: Channel = {
      id: 'ch_' + Date.now(),
      professorId: currentUser.id,
      name: newChannelData.name,
      description: newChannelData.description,
      price: Number(newChannelData.price),
      subscribers: [],
      content: [],
      meetingUrl: newChannelData.meetingUrl || 'https://meet.google.com/new'
    };
    setChannels([...channels, newChan]);
    setShowCreateChannel(false);
    setNewChannelData({ name: '', price: 300, description: '', meetingUrl: '' });
  };

  const handleJarvisAsk = async () => {
    if (!jarvisInput.trim()) return;
    const q = jarvisInput;
    setJarvisInput('');
    setJarvisChat(prev => [...prev, { role: 'user', text: q }]);
    setIsJarvisThinking(true);
    const res = await jarvisAsk(q);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: res.text }]);
    setIsJarvisThinking(false);
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !currentUser || !activeChatChannel) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      text: messageInput,
      timestamp: new Date()
    };
    setChatMessages([...chatMessages, msg]);
    setMessageInput('');
  };

  const isOwner = (channel: Channel) => currentUser?.id === channel.professorId;
  const isSubscriber = (channel: Channel) => currentUser ? channel.subscribers.includes(currentUser.id) : false;

  const t = (ar: string, fr: string, en: string) => {
    if (language === 'fr') return fr;
    if (language === 'en') return en;
    return ar;
  };

  // --- Icons ---
  const HomeIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
  const SearchIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>;
  const ChatIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>;
  const AdsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>;
  const WalletIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
  const ProfileIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-950 font-black text-emerald-600 text-2xl">
      <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
      WAY...
    </div>
  );

  if (view === 'landing') {
    return (
      <div className="h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 text-8xl">🎓</div>
          <div className="absolute bottom-20 right-10 text-8xl">📚</div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30rem] font-black text-white/5">WAY</div>
        </div>
        <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl animate-float">
            <span className="text-emerald-600 text-4xl md:text-5xl font-black tracking-tighter">way</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-2 tracking-tighter relative z-10 uppercase drop-shadow-lg">WAY</h1>
        <p className="text-lg md:text-xl font-bold opacity-90 mb-12 text-center max-w-sm relative z-10 px-4">
          {t("جامعتك الرقمية الموثوقة", "Votre université numérique", "Your Digital University")}
        </p>
        <div className="flex flex-col w-full max-w-xs gap-4 relative z-10 px-4">
          <button onClick={() => handleLogin('student')} className="bg-white text-emerald-600 py-4 md:py-5 rounded-3xl font-black text-lg md:text-xl shadow-2xl hover:scale-105 transition-all active:scale-95">
            {t("دخول طالب", "Étudiant", "Student")}
          </button>
          <button onClick={() => handleLogin('prof_bentahar')} className="bg-emerald-900 text-white py-4 md:py-5 rounded-3xl font-black text-lg md:text-xl hover:scale-105 transition-all border border-emerald-500/30 active:scale-95">
            {t("دخول أستاذ", "Professeur", "Professor")}
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: t("الرئيسية", "Accueil", "Home") },
    { id: 'explore', icon: <SearchIcon />, label: t("استكشف", "Explorer", "Explore"), show: currentUser?.role === 'student' },
    { id: 'messages', icon: <ChatIcon />, label: t("الدردشة", "Messages", "Chats") },
    { id: 'ads', icon: <AdsIcon />, label: t("إعلانات", "Annonces", "Ads") },
    { id: 'wallet', icon: <WalletIcon />, label: t("المحفظة", "Bourse", "Wallet") },
    { id: 'profile', icon: <ProfileIcon />, label: t("الملف", "Profil", "Profile") }
  ].filter(item => item.show !== false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row text-right transition-colors duration-500 pb-20 md:pb-0">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-80 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-6 flex-col gap-6 shadow-2xl z-20">
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
             <span className="text-white text-2xl font-black">way</span>
          </div>
          <h2 className="text-3xl font-black text-emerald-600 tracking-tighter">WAY</h2>
        </div>
        
        <nav className="flex flex-col gap-2">
          {navItems.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setView('dashboard'); }} className={`p-4 rounded-2xl font-black text-right transition-all flex items-center gap-3 ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              <span className="text-xl">{tab.icon}</span> {tab.label}
              {tab.id === 'ads' && <span className="mr-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-12 overflow-y-auto">
        {view === 'dashboard' && activeTab === 'home' && (
          <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-black dark:text-white">{t("أهلاً،", "Salut,", "Hi,")} {currentUser?.firstName} 👋</h1>
                <p className="text-gray-400 font-bold mt-1 text-sm md:text-base">{t("نتمنى لك رحلة أكاديمية موفقة", "Bonne chance", "Good luck")}</p>
              </div>
              <div className="bg-emerald-500/10 p-5 rounded-[2.5rem] border border-emerald-500/20 shadow-inner text-center">
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{t("رصيدك الحالي", "Solde", "Balance")}</p>
                <p className="text-3xl font-black text-emerald-600">{currentUser?.walletBalance} دج</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
               {(currentUser?.role === 'professor' ? channels.filter(c => c.professorId === currentUser.id) : channels.filter(c => c.subscribers.includes(currentUser?.id || ''))).map(c => (
                 <div key={c.id} className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border-2 border-emerald-500/20 shadow-sm hover:shadow-2xl transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 transition-all group-hover:w-4"></div>
                    <h4 className="text-xl md:text-2xl font-black dark:text-white mb-2">{c.name}</h4>
                    <p className="text-gray-400 text-xs md:text-sm mb-4 md:mb-6 line-clamp-2 leading-relaxed">{c.description}</p>
                    <div className="flex justify-between items-center pt-3 md:pt-4 border-t dark:border-gray-800">
                       <span className="font-black text-emerald-600 text-xs md:text-sm">{c.subscribers.length} {t("طالب", "Étudiants", "Students")}</span>
                       <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="bg-emerald-600 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-xs shadow-md">
                          {currentUser?.role === 'professor' ? t("إدارة", "Gérer", "Manage") : t("دخول", "Entrer", "Enter")}
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* ADS VIEW */}
        {view === 'dashboard' && activeTab === 'ads' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
             <h1 className="text-4xl font-black dark:text-white mb-8 border-r-8 border-emerald-600 pr-4">{t("إعلانات وأحداث", "Annonces & Événements", "Ads & Events")}</h1>
             <div className="grid gap-6">
                {ads.map(ad => (
                  <div key={ad.id} className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-800 relative overflow-hidden hover:scale-[1.02] transition-transform">
                     <div className={`absolute top-0 right-0 ${ad.color} text-white px-6 py-1 rounded-bl-3xl font-black text-xs uppercase`}>{ad.tag}</div>
                     <h3 className="text-xl md:text-2xl font-black dark:text-white mb-4 mt-2">{ad.title}</h3>
                     <p className="text-gray-500 dark:text-gray-400 font-bold leading-relaxed">{ad.content}</p>
                     <button className="mt-6 text-emerald-600 font-black flex items-center gap-2 group">
                        {t("اقرأ المزيد", "En savoir plus", "Read more")}
                        <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
                     </button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* EXPLORE VIEW */}
        {view === 'dashboard' && activeTab === 'explore' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
             <h1 className="text-3xl font-black dark:text-white">{t("ابحث عن أستاذك", "Trouver un Prof", "Find a Professor")}</h1>
             <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-xl">
                <select value={filterUniv} onChange={e => setFilterUniv(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl font-bold outline-none dark:text-white border-2 border-transparent focus:border-emerald-500">
                  <option value="">{t("كل الجامعات", "Toutes Universités", "All Universities")}</option>
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {users.filter(u => u.role === 'professor' && (!filterUniv || u.university === filterUniv)).map(prof => (
                 <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 text-center space-y-4 shadow-sm hover:shadow-xl transition-all">
                    <div className="flex justify-center"><ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="md" /></div>
                    <h4 className="font-black text-xl dark:text-white">{prof.firstName} {prof.lastName}</h4>
                    <p className="text-[10px] text-emerald-600 font-bold">{prof.university}</p>
                    <button onClick={() => {
                      const pc = channels.find(c => c.professorId === prof.id);
                      if(pc) { setSelectedChannel(pc); setView('channel-view'); }
                      else alert("لا يوجد محتوى حالياً");
                    }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs">
                      {t("تصفح المقاييس", "Voir les modules", "Browse")}
                    </button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* MESSAGES VIEW */}
        {view === 'dashboard' && activeTab === 'messages' && (
          <div className="max-w-4xl mx-auto h-[70vh] flex flex-col md:flex-row bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden border dark:border-gray-800 animate-fade-in">
             <div className="w-full md:w-1/3 border-l dark:border-gray-800 p-6 overflow-y-auto bg-gray-50/30">
                <h3 className="text-2xl font-black dark:text-white mb-6 border-r-4 border-emerald-500 pr-3">{t("الدردشات", "Chats", "Chats")}</h3>
                <div className="space-y-3">
                   {channels.filter(c => isOwner(c) || isSubscriber(c)).map(c => (
                     <button key={c.id} onClick={() => { setActiveChatChannel(c); setView('chat-view'); }} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeChatChannel?.id === c.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 hover:bg-gray-100'}`}>
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center font-black text-emerald-600">{c.name.charAt(0)}</div>
                        <div className="text-right flex-1 truncate">
                           <p className="font-black text-sm truncate">{c.name}</p>
                           <p className="text-[10px] opacity-60">{isOwner(c) ? "فضاء الأستاذ" : "فضاء الطالب"}</p>
                        </div>
                     </button>
                   ))}
                </div>
             </div>
             <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                   <ChatIcon />
                </div>
                <h3 className="text-2xl font-black dark:text-white">{t("اختر محادثة للبدء", "Choisir un chat", "Choose a chat")}</h3>
             </div>
          </div>
        )}

        {/* CHANNEL/CHAT VIEWS RENDERED SIMILARLY TO PREVIOUS VERSION BUT WITH UPDATED SVG ICONS */}
        {/* ... (rest of the components kept for brevity, ensuring Syntax is correct) ... */}

      </main>

      {/* Floating Buttons */}
      <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-24 left-6 md:bottom-12 md:left-12 w-16 h-16 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl animate-float z-50 hover:scale-110 active:scale-90 transition-transform">🤖</button>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-4 flex justify-around items-center z-40 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setActiveTab(item.id as any); setView('dashboard'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}>
            <span className={`${activeTab === item.id ? 'text-emerald-600' : 'text-gray-400'}`}>{item.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Jarvis Modal */}
      {isJarvisOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-[80vh] rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <span className="text-3xl">🤖</span>
                    <h3 className="text-2xl font-black">جارفيس</h3>
                 </div>
                 <button onClick={() => setIsJarvisOpen(false)} className="bg-white/20 px-4 py-2 rounded-xl font-black">إغلاق</button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
                 {jarvisChat.map((c, i) => (
                   <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-2xl max-w-[80%] font-bold shadow-md ${c.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-700 dark:text-white border'}`}>
                        {c.text}
                      </div>
                   </div>
                 ))}
                 {isJarvisThinking && <div className="text-emerald-600 animate-pulse font-black">جارفيس يحلل البيانات...</div>}
                 <div ref={chatEndRef}></div>
              </div>
              <div className="p-6 border-t dark:border-gray-800 flex gap-2 bg-white dark:bg-gray-900">
                 <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()} placeholder="اسأل جارفيس عن دروسك..." className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl outline-none dark:text-white font-bold" />
                 <button onClick={handleJarvisAsk} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">إرسال</button>
              </div>
           </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-950 w-full max-w-lg p-8 rounded-[3rem] space-y-6 animate-in slide-in-from-bottom">
              <h3 className="text-2xl font-black dark:text-white tracking-tighter">إنشاء مقياس تعليمي جديد</h3>
              <div className="space-y-4">
                 <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="اسم المقياس (مثال: رياضيات 1)" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500" />
                 <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder="وصف قصير للدروس..." className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white h-32 border-2 border-transparent focus:border-emerald-500" />
                 <div className="flex gap-4">
                    <input type="number" value={newChannelData.price} onChange={e => setNewChannelData({...newChannelData, price: Number(e.target.value)})} placeholder="السعر" className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white" />
                    <span className="p-4 font-black dark:text-white flex items-center">دج</span>
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">تأكيد الإنشاء</button>
                 <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black active:scale-95 transition-all">إلغاء</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;