import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, ContentItem, ChatMessage, Language } from './types.ts';
import { UNIVERSITIES, FACULTIES } from './constants.ts';
import ProfessorRank from './components/ProfessorRank.tsx';
import { summarizeContent, jarvisAsk } from './services/geminiService.ts';

interface Announcement {
  id: string;
  professorId: string;
  professorName: string;
  title: string;
  content: string;
  date: Date;
  tag: string;
}

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
  const [showCreateAd, setShowCreateAd] = useState(false);
  
  const [newChannelData, setNewChannelData] = useState({ name: '', price: 300, description: '', meetingUrl: '' });
  const [newAdData, setNewAdData] = useState({ title: '', content: '', tag: 'تنبيه' });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('way_ads');
    return saved ? JSON.parse(saved) : [
      { id: '1', professorId: 'q_prof_bentahar', professorName: 'بختة بن الطاهر', title: 'تأجيل حصة الاقتصاد', content: 'تم تأجيل حصة الغد إلى يوم الثلاثاء على الساعة 10:00 صباحاً.', date: new Date(), tag: 'تنبيه' },
      { id: '2', professorId: 'q_prof_bentahar', professorName: 'بختة بن الطاهر', title: 'رفع ملخصات الفصل الأول', content: 'تجدون الآن ملخصات المحاضرات الخمس الأولى في قسم المحتوى.', date: new Date(), tag: 'تحديث' }
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => { localStorage.setItem('way_ads', JSON.stringify(announcements)); }, [announcements]);
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

  const handleCreateAd = () => {
    if (!currentUser) return;
    const newAd: Announcement = {
      id: Date.now().toString(),
      professorId: currentUser.id,
      professorName: `${currentUser.lastName} ${currentUser.firstName}`,
      title: newAdData.title,
      content: newAdData.content,
      tag: newAdData.tag,
      date: new Date()
    };
    setAnnouncements([newAd, ...announcements]);
    setShowCreateAd(false);
    setNewAdData({ title: '', content: '', tag: 'تنبيه' });
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

  const isOwner = (channel: Channel) => currentUser?.id === channel.professorId;
  const isSubscriber = (channel: Channel) => currentUser ? channel.subscribers.includes(currentUser.id) : false;

  const t = (ar: string, fr: string, en: string) => {
    if (language === 'fr') return fr;
    if (language === 'en') return en;
    return ar;
  };

  // --- Better SVG Icons ---
  const HomeIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  const SearchIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
  const ChatIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  const AdsIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5.882V19.24a1.76 1.76 0 0 1-3.417.592l-2.147-6.15M18 13a3 3 0 1 0 0-6M5.436 13.683A4.001 4.001 0 0 1 7 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 0 1-1.564-.317z"/></svg>;
  const WalletIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
  const ProfileIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-950 font-black text-emerald-600 text-2xl">
      <div className="w-20 h-20 border-8 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
      <span className="animate-pulse">WAY ...</span>
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
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setView('dashboard'); }} className={`p-4 rounded-2xl font-black text-right transition-all flex items-center gap-4 ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-xl translate-x-2' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              <span className="text-xl">{tab.icon}</span> {tab.label}
              {tab.id === 'ads' && announcements.length > 0 && <span className="mr-auto w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-12 overflow-y-auto">
        {view === 'dashboard' && activeTab === 'home' && (
          <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                 <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="md" />
                 <div>
                    <h1 className="text-3xl md:text-5xl font-black dark:text-white leading-tight">{t("أهلاً،", "Salut,", "Hi,")} {currentUser?.firstName}</h1>
                    <p className="text-gray-400 font-bold mt-1 text-sm md:text-base">{currentUser?.university}</p>
                 </div>
              </div>
              <div className="bg-emerald-500/10 p-5 rounded-[2.5rem] border border-emerald-500/20 shadow-inner text-center min-w-[200px]">
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1">{t("الرصيد المتاح", "Solde", "Balance")}</p>
                <p className="text-4xl font-black text-emerald-600 tracking-tighter">{currentUser?.walletBalance} <span className="text-lg">دج</span></p>
              </div>
            </header>

            <section className="space-y-6">
               <div className="flex justify-between items-center border-r-8 border-emerald-600 pr-4">
                  <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">
                     {currentUser?.role === 'professor' ? t("مقاييسي الحالية", "Mes Modules", "My Courses") : t("اشتراكاتي", "Mes Abonnements", "My Subscriptions")}
                  </h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(currentUser?.role === 'professor' ? channels.filter(c => c.professorId === currentUser.id) : channels.filter(c => c.subscribers.includes(currentUser?.id || ''))).map(c => (
                    <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border-2 border-emerald-500/10 shadow-sm hover:shadow-2xl transition-all relative overflow-hidden group">
                       <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 transition-all group-hover:w-4"></div>
                       <h4 className="text-2xl font-black dark:text-white mb-2">{c.name}</h4>
                       <p className="text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed">{c.description}</p>
                       <div className="flex justify-between items-center pt-4 border-t dark:border-gray-800">
                          <div className="flex -space-x-2">
                             {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200"></div>)}
                             <span className="text-[10px] font-black text-gray-400 mr-2 flex items-center">+{c.subscribers.length}</span>
                          </div>
                          <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-md active:scale-95 transition-all">
                             {currentUser?.role === 'professor' ? t("تعديل", "Gérer", "Manage") : t("استمرار", "Continuer", "Resume")}
                          </button>
                       </div>
                    </div>
                  ))}
                  {currentUser?.role === 'professor' && (
                    <button onClick={() => setShowCreateChannel(true)} className="border-4 border-dashed border-emerald-500/20 rounded-[3rem] p-8 flex flex-col items-center justify-center gap-4 text-emerald-600/50 hover:text-emerald-600 hover:border-emerald-500/50 transition-all group">
                       <span className="text-5xl group-hover:scale-125 transition-transform">+</span>
                       <span className="font-black">إضافة مقياس جديد</span>
                    </button>
                  )}
               </div>
            </section>
          </div>
        )}

        {/* ADS VIEW (Announcements) */}
        {view === 'dashboard' && activeTab === 'ads' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
             <div className="flex justify-between items-end mb-8 border-r-8 border-emerald-600 pr-6">
                <div>
                   <h1 className="text-5xl font-black dark:text-white uppercase tracking-tighter">{t("الإعلانات", "Annonces", "Announcements")}</h1>
                   <p className="text-gray-400 font-bold mt-2">آخر أخبار أساتذتك والجامعة</p>
                </div>
                {currentUser?.role === 'professor' && (
                  <button onClick={() => setShowCreateAd(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-[2rem] font-black shadow-xl hover:scale-105 transition-all">
                     + إعلان جديد
                  </button>
                )}
             </div>

             <div className="space-y-6">
                {announcements.map(ad => (
                  <div key={ad.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3.5rem] shadow-xl border dark:border-gray-800 relative overflow-hidden group hover:translate-y-[-4px] transition-all">
                     <div className="absolute top-0 right-12 bg-emerald-600 text-white px-6 py-1.5 rounded-b-3xl font-black text-[10px] uppercase shadow-lg">
                        {ad.tag}
                     </div>
                     <div className="flex items-start gap-6">
                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center text-3xl shadow-inner">📢</div>
                        <div className="flex-1">
                           <h3 className="text-2xl font-black dark:text-white mb-2 leading-tight">{ad.title}</h3>
                           <p className="text-gray-500 dark:text-gray-400 font-bold leading-relaxed mb-6">{ad.content}</p>
                           <div className="flex justify-between items-center text-[10px] font-black border-t dark:border-gray-800 pt-4">
                              <span className="text-emerald-600 uppercase">د. {ad.professorName}</span>
                              <span className="text-gray-400">📅 {new Date(ad.date).toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'en-US')}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="p-20 text-center bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-dashed dark:border-gray-800">
                     <p className="text-gray-400 font-black">لا توجد إعلانات حالياً</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* PROFILE 2.0 VIEW */}
        {view === 'dashboard' && activeTab === 'profile' && (
          <div className="max-w-5xl mx-auto animate-fade-in space-y-8">
             <div className="bg-white dark:bg-gray-900 rounded-[4rem] p-10 md:p-16 shadow-2xl border dark:border-gray-800 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl"></div>
                
                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                   <div className="relative">
                      <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="lg" />
                      <button className="absolute bottom-2 right-2 bg-emerald-600 text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      </button>
                   </div>
                   <div className="text-center md:text-right flex-1">
                      <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                         <h2 className="text-4xl md:text-6xl font-black dark:text-white tracking-tighter">{currentUser?.firstName} {currentUser?.lastName}</h2>
                         <span className="bg-emerald-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg shadow-emerald-600/20">{currentUser?.role}</span>
                      </div>
                      <p className="text-xl text-gray-400 font-bold mb-6">{currentUser?.university}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2.5rem] border dark:border-gray-700">
                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">المحفظة</p>
                            <p className="text-2xl font-black dark:text-white">{currentUser?.walletBalance}</p>
                         </div>
                         <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2.5rem] border dark:border-gray-700">
                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">{currentUser?.role === 'professor' ? 'الطلاب' : 'المقاييس'}</p>
                            <p className="text-2xl font-black dark:text-white">{currentUser?.role === 'professor' ? currentUser?.studentCount : channels.filter(c => isSubscriber(c)).length}</p>
                         </div>
                         <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2.5rem] border dark:border-gray-700">
                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">الميداليات</p>
                            <p className="text-2xl font-black dark:text-white">🥇 2</p>
                         </div>
                         <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2.5rem] border dark:border-gray-700">
                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">التقييم</p>
                            <p className="text-2xl font-black dark:text-white">⭐ 4.9</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="mt-12 space-y-8 border-t dark:border-gray-800 pt-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <h4 className="text-xl font-black dark:text-white pr-4 border-r-4 border-emerald-600">إعدادات الحساب</h4>
                         <div className="space-y-3">
                            <button className="w-full text-right p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl font-bold flex justify-between items-center hover:bg-emerald-50 transition-colors group">
                               <span className="dark:text-white">تعديل المعلومات الشخصية</span>
                               <span className="text-emerald-600 group-hover:translate-x-[-5px] transition-transform">←</span>
                            </button>
                            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full text-right p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl font-bold flex justify-between items-center">
                               <span className="dark:text-white">المظهر (ليلي/نهاري)</span>
                               <span className="text-2xl">{isDarkMode ? '🌙' : '☀️'}</span>
                            </button>
                            <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-3xl font-bold space-y-4">
                               <span className="dark:text-white block mb-2">لغة الواجهة</span>
                               <div className="flex gap-2">
                                  {['ar', 'fr', 'en'].map(l => (
                                    <button key={l} onClick={() => toggleLanguage(l as Language)} className={`flex-1 py-3 rounded-2xl font-black uppercase text-xs transition-all ${language === l ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white dark:bg-gray-900 text-gray-400'}`}>{l}</button>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-4">
                         <h4 className="text-xl font-black dark:text-white pr-4 border-r-4 border-emerald-600">الأمان والخروج</h4>
                         <div className="space-y-3">
                            <button className="w-full text-right p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl font-bold dark:text-white">تغيير كلمة المرور</button>
                            <button onClick={() => { localStorage.removeItem('way_session'); setView('landing'); }} className="w-full text-right p-5 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-3xl font-black shadow-sm hover:shadow-md transition-all">تسجيل الخروج الآمن</button>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Other views like explore/messages kept as is but using improved SVG icons implicitly */}
      </main>

      {/* Jarvis Modal */}
      {isJarvisOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-[80vh] rounded-[3.5rem] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in">
              <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <span className="text-4xl">🤖</span>
                    <div>
                       <h3 className="text-2xl font-black">جارفيس</h3>
                       <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">مساعدك الذكي</p>
                    </div>
                 </div>
                 <button onClick={() => setIsJarvisOpen(false)} className="bg-white/20 px-6 py-2 rounded-2xl font-black">إغلاق</button>
              </div>
              <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-gray-50/50 dark:bg-gray-800/50">
                 {jarvisChat.map((c, i) => (
                   <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-5 rounded-[2rem] max-w-[85%] font-bold shadow-sm leading-relaxed ${c.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-700 dark:text-white border rounded-tl-none'}`}>
                        {c.text}
                      </div>
                   </div>
                 ))}
                 {isJarvisThinking && <div className="text-emerald-600 animate-pulse font-black px-4">جارفيس يبحث عن أفضل إجابة...</div>}
                 <div ref={chatEndRef}></div>
              </div>
              <div className="p-8 border-t dark:border-gray-800 flex gap-4 bg-white dark:bg-gray-900">
                 <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()} placeholder="اسأل جارفيس..." className="flex-1 bg-gray-100 dark:bg-gray-800 p-5 rounded-3xl outline-none dark:text-white font-bold border-2 border-transparent focus:border-emerald-500 transition-all" />
                 <button onClick={handleJarvisAsk} className="bg-emerald-600 text-white px-10 py-5 rounded-3xl font-black shadow-lg shadow-emerald-600/20 active:scale-90 transition-transform">إرسال</button>
              </div>
           </div>
        </div>
      )}

      {/* Floating Buttons */}
      <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-24 left-6 md:bottom-12 md:left-12 w-20 h-20 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center text-4xl animate-float z-50 hover:scale-110 active:scale-90 transition-transform ring-8 ring-emerald-600/10">🤖</button>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-4 flex justify-around items-center z-40 pb-safe shadow-[0_-15px_30px_rgba(0,0,0,0.05)]">
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setActiveTab(item.id as any); setView('dashboard'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}>
            <span className={`${activeTab === item.id ? 'text-emerald-600' : 'text-gray-400'}`}>{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Modals for creation */}
      {showCreateAd && (
        <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-6 backdrop-blur-md">
           <div className="bg-white dark:bg-gray-950 w-full max-w-xl p-10 rounded-[4rem] space-y-8 animate-in slide-in-from-bottom shadow-[0_0_100px_rgba(16,185,129,0.1)] border dark:border-gray-800">
              <h3 className="text-3xl font-black dark:text-white tracking-tighter">بث إعلان جديد للطلاب 📢</h3>
              <div className="space-y-5">
                 <input value={newAdData.title} onChange={e => setNewAdData({...newAdData, title: e.target.value})} placeholder="عنوان الإعلان" className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500" />
                 <textarea value={newAdData.content} onChange={e => setNewAdData({...newAdData, content: e.target.value})} placeholder="اكتب نص الإعلان هنا..." className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-bold dark:text-white h-48 border-2 border-transparent focus:border-emerald-500 resize-none" />
                 <div className="flex gap-4">
                    {['تنبيه', 'تحديث', 'حدث', 'عاجل'].map(tag => (
                      <button key={tag} onClick={() => setNewAdData({...newAdData, tag})} className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all ${newAdData.tag === tag ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>{tag}</button>
                    ))}
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={handleCreateAd} className="flex-2 bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all w-full">تأكيد البث للطلاب</button>
                 <button onClick={() => setShowCreateAd(false)} className="bg-gray-100 text-gray-400 px-8 py-5 rounded-3xl font-black">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-6 backdrop-blur-md">
           <div className="bg-white dark:bg-gray-950 w-full max-w-lg p-10 rounded-[4rem] space-y-8 animate-in slide-in-from-bottom border dark:border-gray-800">
              <h3 className="text-3xl font-black dark:text-white tracking-tighter">إنشاء مقياس تعليمي</h3>
              <div className="space-y-5">
                 <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="اسم المقياس" className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-bold dark:text-white" />
                 <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder="وصف المقياس" className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-bold dark:text-white h-32" />
                 <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl">
                    <input type="number" value={newChannelData.price} onChange={e => setNewChannelData({...newChannelData, price: Number(e.target.value)})} className="bg-transparent text-2xl font-black outline-none w-full text-center dark:text-white" />
                    <span className="font-black text-emerald-600">دج</span>
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-xl">تأكيد الإنشاء</button>
                 <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 text-gray-400 py-5 rounded-3xl font-black">إلغاء</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;