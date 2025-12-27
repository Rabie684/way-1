
import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, ContentItem, ChatMessage, Language } from './types';
import { UNIVERSITIES, FACULTIES, DEPARTMENTS } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk } from './services/geminiService';

const App: React.FC = () => {
  // --- States ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'dashboard' | 'channel-view' | 'chat-view'>('landing');
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'messages' | 'wallet' | 'profile'>('home');
  const [loading, setLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activeChatChannel, setActiveChatChannel] = useState<Channel | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'ar');
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');

  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  
  const [newChannelData, setNewChannelData] = useState({ name: '', price: 300, description: '', meetingUrl: '' });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as any });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
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
      setTimeout(() => setLoading(false), 800);
    };
    init();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
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

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
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

  const handleAddContent = () => {
    if (!selectedChannel) return;
    const newItem: ContentItem = {
      id: 'item_' + Date.now(),
      title: newContentData.title,
      type: newContentData.type,
      url: '#',
      createdAt: new Date()
    };
    const updated = channels.map(c => c.id === selectedChannel.id ? { ...c, content: [...c.content, newItem] } : c);
    setChannels(updated);
    setSelectedChannel({ ...selectedChannel, content: [...selectedChannel.content, newItem] });
    setShowAddContent(false);
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30rem] font-black">WAY</div>
        </div>
        <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl animate-float">
            <span className="text-emerald-600 text-4xl md:text-5xl font-black tracking-tighter">way</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-2 tracking-tighter relative z-10 uppercase">WAY</h1>
        <p className="text-lg md:text-xl font-bold opacity-80 mb-12 text-center max-w-sm relative z-10 px-4">
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
    { id: 'home', icon: '🏠', label: t("الرئيسية", "Accueil", "Home") },
    { id: 'explore', icon: '🔍', label: t("استكشف", "Explorer", "Explore"), show: currentUser?.role === 'student' },
    { id: 'messages', icon: '💬', label: t("الدردشة", "Messages", "Chats") },
    { id: 'wallet', icon: '💰', label: t("المحفظة", "Bourse", "Wallet") },
    { id: 'profile', icon: '👤', label: t("الملف", "Profil", "Profile") }
  ].filter(item => item.show !== false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row text-right transition-colors duration-500 pb-20 md:pb-0">
      
      {/* Sidebar (Desktop Only) */}
      <aside className="hidden md:flex w-80 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-6 flex-col gap-6 shadow-2xl z-20 transition-all">
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
             <span className="text-white text-2xl font-black">way</span>
          </div>
          <h2 className="text-3xl font-black text-emerald-600 tracking-tighter">WAY</h2>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {currentUser?.role === 'professor' ? t("فضاء الأستاذ", "Espace Prof", "Professor Space") : t("فضاء الطالب", "Espace Étudiant", "Student Space")}
          </span>
        </div>
        
        <nav className="flex flex-col gap-2">
          {navItems.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setView('dashboard'); }} className={`p-4 rounded-2xl font-black text-right transition-all flex items-center gap-3 ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              <span className="text-xl">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>

        {deferredPrompt && (
          <button onClick={handleInstallApp} className="mt-4 bg-blue-600 text-white p-4 rounded-2xl font-black text-xs shadow-lg animate-pulse">
            📲 {t("تثبيت التطبيق", "Installer l'app", "Install App")}
          </button>
        )}

        {currentUser?.role === 'professor' && (
          <div className="mt-auto border-t dark:border-gray-800 pt-6">
            <button onClick={() => setShowCreateChannel(true)} className="w-full bg-emerald-50 text-emerald-700 py-5 rounded-2xl font-black text-sm border-2 border-emerald-100 hover:scale-105 transition-all">
              + {t("إنشاء مقياس جديد", "Créer un Module", "Create Module")}
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex justify-between items-center z-40 backdrop-blur-lg bg-opacity-80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
             <span className="text-white text-sm font-black">way</span>
          </div>
          <h2 className="text-xl font-black text-emerald-600 tracking-tighter">WAY</h2>
        </div>
        {currentUser && (
           <div className="bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
             <span className="text-emerald-600 font-black text-xs">{currentUser.walletBalance} دج</span>
           </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-12 overflow-y-auto">
        {view === 'dashboard' && activeTab === 'home' && (
          <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-black dark:text-white">{t("أهلاً،", "Salut,", "Hi,")} {currentUser?.firstName} 👋</h1>
                <p className="text-gray-400 font-bold mt-1 text-sm md:text-base">{t("نتمنى لك رحلة أكاديمية موفقة", "Bonne chance", "Good luck")}</p>
              </div>
              <div className="hidden md:block bg-emerald-500/10 p-5 rounded-[2.5rem] border border-emerald-500/20 shadow-inner">
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{t("رصيدك الحالي", "Solde", "Balance")}</p>
                <p className="text-3xl font-black text-emerald-600">{currentUser?.walletBalance} دج</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
               {(currentUser?.role === 'professor' ? channels.filter(c => c.professorId === currentUser.id) : channels.filter(c => c.subscribers.includes(currentUser?.id || ''))).map(c => (
                 <div key={c.id} className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border-2 border-emerald-500/20 shadow-sm hover:shadow-2xl transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-emerald-600 transition-all group-hover:w-4"></div>
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
               {(currentUser?.role === 'student' && channels.filter(c => c.subscribers.includes(currentUser?.id || '')).length === 0) && (
                  <div className="col-span-full py-12 md:py-20 bg-gray-100 dark:bg-gray-900/50 rounded-[3rem] md:rounded-[4rem] text-center border-4 border-dashed border-gray-200 dark:border-gray-800 animate-pulse">
                    <p className="text-gray-400 font-black mb-4 text-lg md:text-xl">{t("لم تشترك في أي مقياس بعد", "Aucune inscription", "No subscriptions yet")}</p>
                    <button onClick={() => setActiveTab('explore')} className="bg-emerald-600 text-white px-8 md:px-10 py-3 md:py-4 rounded-3xl font-black shadow-xl text-sm md:text-base">
                        {t("استكشف الأساتذة", "Explorer", "Explore")}
                    </button>
                  </div>
               )}
            </div>
            
            {currentUser?.role === 'professor' && (
               <div className="md:hidden pt-4">
                  <button onClick={() => setShowCreateChannel(true)} className="w-full bg-emerald-600 text-white py-4 rounded-3xl font-black text-sm shadow-xl">+ {t("إنشاء مقياس جديد", "Créer un Module", "Create Module")}</button>
               </div>
            )}
          </div>
        )}

        {/* EXPLORE VIEW (Responsive Grid) */}
        {view === 'dashboard' && activeTab === 'explore' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
             <h1 className="text-3xl font-black dark:text-white">{t("ابحث عن أستاذك", "Trouver un Prof", "Find a Professor")}</h1>
             <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-6 bg-white dark:bg-gray-900 p-4 md:p-6 rounded-[2rem] shadow-xl border dark:border-gray-800">
                <select value={filterUniv} onChange={e => setFilterUniv(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-2xl font-bold outline-none dark:text-white border-2 border-transparent text-sm md:text-base">
                  <option value="">{t("كل الجامعات", "Toutes Universités", "All Universities")}</option>
                  {UNIVERSITIES.map(u => <option key={u}>{u}</option>)}
                </select>
                <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-2xl font-bold outline-none dark:text-white border-2 border-transparent text-sm md:text-base">
                  <option value="">{t("كل الكليات", "Toutes Facultés", "All Faculties")}</option>
                  {FACULTIES.map(f => <option key={f}>{f}</option>)}
                </select>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
               {users.filter(u => u.role === 'professor' && (!filterUniv || u.university === filterUniv) && (!filterFaculty || u.faculty === filterFaculty)).map(prof => (
                 <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 text-center space-y-4 shadow-sm hover:shadow-xl transition-all">
                    <div className="flex justify-center"><ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="md" /></div>
                    <div>
                      <h4 className="font-black text-xl dark:text-white">{prof.firstName} {prof.lastName}</h4>
                      <p className="text-[10px] text-emerald-600 font-bold mt-1 line-clamp-1">{prof.university}</p>
                    </div>
                    <button onClick={() => {
                      const pc = channels.find(c => c.professorId === prof.id);
                      if(pc) { setSelectedChannel(pc); setView('channel-view'); }
                      else alert(t("لا توجد مقاييس حالياً", "Pas de modules", "No modules"));
                    }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs">
                      {t("تصفح المقاييس", "Voir les modules", "Browse")}
                    </button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* MESSAGES VIEW (Personalized Mobile UI) */}
        {view === 'dashboard' && activeTab === 'messages' && (
          <div className="max-w-4xl mx-auto md:h-[75vh] flex flex-col md:flex-row bg-white dark:bg-gray-900 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl overflow-hidden border dark:border-gray-800">
             <div className="w-full md:w-1/3 border-l dark:border-gray-800 p-6 md:p-8 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="text-xl md:text-2xl font-black dark:text-white mb-6 pr-2 border-r-4 border-emerald-500">{t("المحادثات", "Chats", "Chats")}</h3>
                <div className="grid gap-3">
                   {channels.filter(c => isOwner(c) || isSubscriber(c)).map(c => (
                     <button key={c.id} onClick={() => { setActiveChatChannel(c); setView('chat-view'); }} className={`w-full p-4 rounded-[1.5rem] flex items-center gap-4 transition-all border ${activeChatChannel?.id === c.id ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 dark:border-gray-700'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${activeChatChannel?.id === c.id ? 'bg-white text-emerald-600' : 'bg-emerald-100 text-emerald-700'}`}>
                           {c.name.charAt(0)}
                        </div>
                        <div className="text-right flex-1 truncate">
                           <p className="font-black text-sm truncate">{c.name}</p>
                           <p className="text-[9px] opacity-60 uppercase font-black">{isOwner(c) ? "Prof" : "Student"}</p>
                        </div>
                     </button>
                   ))}
                   {channels.filter(c => isOwner(c) || isSubscriber(c)).length === 0 && (
                      <p className="text-center text-gray-400 py-10 font-bold text-xs">{t("اشترك في مقياس لبدء الدردشة", "Abonnez-vous", "Subscribe to chat")}</p>
                   )}
                </div>
             </div>
             <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-950">
                <span className="text-6xl mb-4">💬</span>
                <h3 className="text-2xl font-black dark:text-white">{t("اختر محادثة للبدء", "Choisir un chat", "Choose a chat")}</h3>
             </div>
          </div>
        )}

        {/* PROFILE VIEW (Optimized Mobile) */}
        {view === 'dashboard' && activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto animate-in zoom-in">
             <div className="bg-white dark:bg-gray-900 rounded-[3rem] md:rounded-[5rem] shadow-2xl overflow-hidden border dark:border-gray-800">
                <div className="h-32 md:h-48 bg-emerald-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                </div>
                
                <div className="px-6 md:px-12 pb-8 md:pb-12 -mt-16 md:-mt-20 relative text-center md:text-right">
                   <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 mb-8">
                      <div className="bg-white dark:bg-gray-900 p-1.5 rounded-full md:rounded-[3.5rem] shadow-2xl">
                         <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="md" />
                      </div>
                      <div className="flex-1">
                         <h2 className="text-2xl md:text-4xl font-black dark:text-white">{currentUser?.firstName} {currentUser?.lastName}</h2>
                         <div className="flex flex-wrap gap-2 mt-1 justify-center md:justify-start">
                            <span className="bg-emerald-500 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase">{currentUser?.role}</span>
                            <span className="text-[10px] font-black text-gray-400">{currentUser?.university}</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 text-right">
                      <div className="space-y-3">
                         <h4 className="text-lg font-black dark:text-white pr-3 border-r-4 border-emerald-500">{t("اللغات", "Langues", "Lang")}</h4>
                         <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-[2rem] flex gap-2">
                            {['ar', 'fr', 'en'].map(l => (
                              <button key={l} onClick={() => toggleLanguage(l as Language)} className={`flex-1 py-3 rounded-xl font-black uppercase transition-all text-xs ${language === l ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 bg-white dark:bg-gray-900'}`}>
                                 {l}
                              </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-3">
                         <h4 className="text-lg font-black dark:text-white pr-3 border-r-4 border-emerald-500">{t("المظهر", "Apparence", "Theme")}</h4>
                         <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full bg-gray-50 dark:bg-gray-800/50 p-4 rounded-[2rem] flex items-center justify-between border dark:border-gray-800 shadow-inner group">
                            <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${isDarkMode ? 'bg-indigo-500' : 'bg-yellow-400'} text-white shadow-lg`}>
                                  {isDarkMode ? '🌙' : '☀️'}
                               </div>
                               <p className="font-black text-sm dark:text-white">{isDarkMode ? t("ليلي", "Nuit", "Night") : t("نهاري", "Jour", "Day")}</p>
                            </div>
                            <div className={`w-12 h-7 rounded-full p-1 transition-colors relative ${isDarkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                               <div className={`w-5 h-5 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-0' : '-translate-x-5'}`}></div>
                            </div>
                         </button>
                      </div>
                   </div>

                   <button onClick={() => { localStorage.removeItem('way_session'); setView('landing'); }} className="w-full bg-red-50 dark:bg-red-900/20 text-red-500 py-5 rounded-[2rem] font-black text-sm mt-8 active:bg-red-500 active:text-white transition-colors">
                     {t("تسجيل الخروج", "Déconnexion", "Logout")}
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* CHANNEL/CHAT VIEWS (Responsive Adjustments) */}
        {view === 'chat-view' && activeChatChannel && (
           <div className="fixed inset-0 md:inset-auto md:relative md:h-[80vh] md:max-w-5xl md:mx-auto flex flex-col bg-white dark:bg-gray-950 md:rounded-[4rem] shadow-2xl overflow-hidden z-[60] md:z-0 animate-in slide-in-from-bottom">
              <div className="p-5 md:p-8 bg-emerald-600 text-white flex items-center justify-between">
                 <button onClick={() => setView('dashboard')} className="font-black bg-white/20 px-4 md:px-6 py-2 md:py-3 rounded-2xl text-xs md:text-sm">← {t("رجوع", "Retour", "Back")}</button>
                 <div className="text-center flex-1 mx-4">
                    <h3 className="font-black text-sm md:text-2xl truncate">{activeChatChannel.name}</h3>
                    <p className="text-[8px] md:text-[10px] font-black uppercase opacity-80">{t("دردشة حية", "Live Chat", "Live Chat")}</p>
                 </div>
                 <div className="w-12 md:w-20"></div>
              </div>
              <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-4 md:space-y-6 no-scrollbar bg-gray-50 dark:bg-gray-900/30">
                 {chatMessages.map(m => (
                   <div key={m.id} className={`flex ${m.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-lg relative ${m.senderId === currentUser?.id ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 dark:text-white rounded-bl-none border dark:border-gray-700'}`}>
                        <p className={`text-[8px] md:text-[10px] font-black uppercase mb-1 opacity-70`}>{m.senderName}</p>
                        <p className="font-bold leading-relaxed text-sm md:text-lg break-words">{m.text}</p>
                     </div>
                   </div>
                 ))}
                 <div ref={chatEndRef}></div>
              </div>
              <div className="p-4 md:p-8 bg-white dark:bg-gray-950 border-t dark:border-gray-800 flex gap-2 md:gap-4 pb-12 md:pb-8">
                 <input value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={t("اكتب هنا...", "Écrire...", "Type...")} className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] outline-none font-bold text-sm md:text-lg dark:text-white border-2 border-transparent focus:border-emerald-500 transition-all shadow-inner" />
                 <button onClick={sendMessage} className="bg-emerald-600 text-white px-6 md:px-12 rounded-2xl md:rounded-[2.5rem] font-black text-xs md:text-xl shadow-xl active:scale-95 transition-all">
                    {t("إرسال", "Envoyer", "Send")}
                 </button>
              </div>
           </div>
        )}

        {view === 'channel-view' && selectedChannel && (
          <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in slide-in-from-bottom">
             <button onClick={() => setView('dashboard')} className="text-emerald-600 font-black flex items-center gap-2 mb-2 text-sm md:text-base">← {t("العودة", "Retour", "Back")}</button>
             
             <div className="bg-white dark:bg-gray-900 p-6 md:p-12 rounded-[2.5rem] md:rounded-[5rem] border dark:border-gray-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 md:w-48 h-32 md:h-48 bg-emerald-600/10 rounded-bl-full"></div>
                <h2 className="text-2xl md:text-5xl font-black dark:text-white mb-2">{selectedChannel.name}</h2>
                <p className="text-gray-400 font-bold text-sm md:text-lg mb-6 md:mb-10 leading-relaxed">{selectedChannel.description}</p>
                
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-6 md:pt-10 border-t dark:border-gray-800">
                   {isOwner(selectedChannel) ? (
                     <>
                        <button onClick={() => window.open(selectedChannel.meetingUrl, '_blank')} className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] md:rounded-[2rem] font-black shadow-xl text-xs md:text-base">🎥 {t("محاضرة مباشرة", "Live", "Live")}</button>
                        <button onClick={() => setShowAddContent(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-[1.5rem] md:rounded-[2rem] font-black shadow-xl text-xs md:text-base">📤 {t("رفع ملف", "Uploader", "Upload")}</button>
                     </>
                   ) : (
                     isSubscriber(selectedChannel) ? (
                        <>
                           <button onClick={() => window.open(selectedChannel.meetingUrl, '_blank')} className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] md:rounded-[2rem] font-black shadow-xl text-xs md:text-base">🎥 {t("انضمام للمباشر", "Rejoindre", "Join Live")}</button>
                           <button onClick={() => { setActiveChatChannel(selectedChannel); setView('chat-view'); }} className="bg-emerald-100 text-emerald-700 px-8 py-4 rounded-[1.5rem] md:rounded-[2rem] font-black text-xs md:text-base">💬 {t("دردشة", "Chat", "Chat")}</button>
                        </>
                     ) : (
                        <div className="flex flex-col gap-2 w-full max-w-sm">
                           <button onClick={() => alert("شحن الرصيد أولاً")} className="bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg md:text-2xl shadow-2xl active:scale-95 transition-all">
                             {t("اشتراك بـ", "S'abonner", "Subscribe")} {selectedChannel.price} دج
                           </button>
                        </div>
                     )
                   )}
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="text-xl md:text-3xl font-black dark:text-white border-r-4 border-emerald-500 pr-3 md:pr-4">{t("المحتوى التعليمي", "Cours", "Courses")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {(isOwner(selectedChannel) || isSubscriber(selectedChannel)) ? (
                     selectedChannel.content.length > 0 ? selectedChannel.content.map(item => (
                       <div key={item.id} className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border dark:border-gray-800 flex justify-between items-center group shadow-sm">
                          <div className="flex items-center gap-4 md:gap-6">
                             <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-xl md:text-3xl">
                               {item.type === 'pdf' ? '📄' : '🎥'}
                             </div>
                             <div>
                                <h4 className="font-black dark:text-white text-sm md:text-lg">{item.title}</h4>
                             </div>
                          </div>
                          <button onClick={async () => {
                            const sum = await summarizeContent(item.title, item.type);
                            alert(sum);
                          }} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl font-black text-[9px] md:text-xs text-emerald-600">
                            {t("ملخص ✨", "Résumé ✨", "Sum ✨")}
                          </button>
                       </div>
                     )) : <p className="text-center text-gray-400 py-10 w-full col-span-full italic text-sm">{t("لا توجد دروس", "Aucun cours", "No courses")}</p>
                   ) : (
                     <div className="col-span-full bg-gray-100 dark:bg-gray-900/50 p-12 md:p-24 rounded-[3rem] md:rounded-[4rem] text-center border-4 border-dashed border-gray-200 dark:border-gray-800">
                        <p className="text-gray-400 font-black mb-2">🔒 {t("محتوى محمي", "Privé", "Private")}</p>
                        <p className="text-[10px] text-gray-400">{t("اشترك للوصول للمحتوى وجارفيس", "Abonnez-vous", "Subscribe to access")}</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Floating Jarvis Button (Mobile Optimized Position) */}
      <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-24 left-6 md:bottom-12 md:left-12 w-16 h-16 md:w-24 md:h-24 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl md:text-5xl border-4 md:border-8 border-white dark:border-gray-900 animate-float z-50 hover:scale-110 active:scale-90 transition-transform">
        🤖
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 px-6 py-3 flex justify-between items-center z-40 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setActiveTab(item.id as any); setView('dashboard'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span className="text-xl md:text-2xl">{item.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
      
      {/* Jarvis Modal (Full Screen on Mobile) */}
      {isJarvisOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1000] flex items-center justify-center p-0 md:p-6 transition-all duration-300">
           <div className="bg-white dark:bg-gray-950 w-full h-full md:max-w-4xl md:h-[85vh] md:rounded-[4.5rem] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in">
              <div className="p-8 md:p-12 bg-emerald-600 text-white flex justify-between items-center relative">
                 <div className="flex items-center gap-4 md:gap-8 relative z-10">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center text-4xl md:text-6xl shadow-2xl text-emerald-600 font-black">🤖</div>
                    <div>
                       <h3 className="text-2xl md:text-4xl font-black">جارفيس</h3>
                       <p className="text-[9px] md:text-sm opacity-80 font-black uppercase tracking-widest mt-1">Assistant IA</p>
                    </div>
                 </div>
                 <button onClick={() => setIsJarvisOpen(false)} className="bg-white/20 p-4 rounded-2xl font-black text-xs md:text-sm hover:bg-white/40 transition-all">{t("إغلاق", "Fermer", "Close")}</button>
              </div>
              
              <div className="flex-1 p-6 md:p-12 overflow-y-auto space-y-6 md:space-y-10 no-scrollbar bg-gray-50/50 dark:bg-gray-900/50">
                 {jarvisChat.length === 0 && (
                   <div className="text-center py-10 md:py-20 space-y-6 max-w-lg mx-auto">
                      <p className="text-5xl md:text-7xl">💡</p>
                      <h4 className="text-xl md:text-3xl font-black dark:text-white leading-relaxed">
                        {t("«مرحبًا 👋 أنا جارفيس، مساعدك الذكي.»", "Salut 👋 je suis Jarvis.", "Hi 👋 I'm Jarvis.")}
                      </h4>
                      <p className="text-gray-400 font-bold text-sm md:text-lg">
                        {t("كيف يمكنني مساعدتك اليوم في دراستك؟", "Comment puis-je vous aider ?", "How can I help you today?")}
                      </p>
                   </div>
                 )}
                 {jarvisChat.map((c, i) => (
                   <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                      <div className={`p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] max-w-[90%] md:max-w-[85%] font-bold leading-relaxed shadow-lg text-sm md:text-xl ${c.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 dark:text-white rounded-bl-none border dark:border-gray-700'}`}>
                        {c.text}
                      </div>
                   </div>
                 ))}
                 {isJarvisThinking && (
                   <div className="flex justify-start">
                     <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] flex gap-2 md:gap-3 shadow-lg">
                        {[0, 100, 200].map(delay => (
                           <div key={delay} className="w-3 h-3 md:w-4 md:h-4 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }}></div>
                        ))}
                     </div>
                   </div>
                 )}
                 <div ref={chatEndRef}></div>
              </div>
              
              <div className="p-6 md:p-10 border-t dark:border-gray-800 flex gap-2 md:gap-4 bg-white dark:bg-gray-950 pb-12 md:pb-10">
                 <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()} placeholder={t("اسألني أي شيء...", "Demander...", "Ask...")} className="flex-1 bg-gray-50 dark:bg-gray-900 p-5 md:p-7 rounded-2xl md:rounded-[2.5rem] outline-none dark:text-white font-bold text-sm md:text-lg border-2 border-transparent focus:border-emerald-500 shadow-inner" />
                 <button onClick={handleJarvisAsk} className="bg-emerald-600 text-white px-8 md:px-14 rounded-2xl md:rounded-[2.5rem] font-black text-sm md:text-2xl shadow-xl active:scale-95 transition-all">{t("إرسال", "Envoyer", "Send")}</button>
              </div>
           </div>
        </div>
      )}

      {/* CREATE MODULE MODAL (Responsive Sizing) */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/70 z-[2000] flex items-end md:items-center justify-center p-0 md:p-6 backdrop-blur-md">
           <div className="bg-white dark:bg-gray-950 w-full md:max-w-2xl p-8 md:p-14 rounded-t-[3rem] md:rounded-[5rem] space-y-6 md:space-y-10 shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-300">
              <h3 className="text-3xl md:text-5xl font-black dark:text-white tracking-tighter">{t("إنشاء مقياس تعليمي", "Créer un module", "Create Module")}</h3>
              <div className="space-y-4 md:space-y-6">
                 <div className="space-y-2">
                    <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder={t("اسم المقياس", "Nom", "Name")} className="w-full p-5 md:p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl md:rounded-3xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500 text-sm md:text-base" />
                 </div>
                 <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder={t("وصف المقياس...", "Description", "Description")} className="w-full p-5 md:p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl md:rounded-3xl outline-none font-bold dark:text-white h-24 md:h-40 border-2 border-transparent focus:border-emerald-500 text-sm md:text-base" />
                 <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <input type="number" value={newChannelData.price} onChange={e => setNewChannelData({...newChannelData, price: Number(e.target.value)})} placeholder={t("السعر (دج)", "Prix", "Price")} className="w-full p-5 md:p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl md:rounded-3xl outline-none font-bold dark:text-white text-sm md:text-base" />
                    <input value={newChannelData.meetingUrl} onChange={e => setNewChannelData({...newChannelData, meetingUrl: e.target.value})} placeholder="Google Meet" className="w-full p-5 md:p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl md:rounded-3xl outline-none font-bold dark:text-white text-sm md:text-base" />
                 </div>
              </div>
              <div className="flex gap-4 pb-10 md:pb-0">
                 <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-5 md:py-7 rounded-2xl md:rounded-[2.5rem] font-black text-lg md:text-2xl shadow-xl active:scale-95 transition-all">{t("تأكيد", "Valider", "Confirm")}</button>
                 <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 text-gray-400 py-5 md:py-7 rounded-2xl md:rounded-[2.5rem] font-black text-lg md:text-2xl active:bg-gray-200 transition-all">{t("إلغاء", "Annuler", "Cancel")}</button>
              </div>
           </div>
        </div>
      )}

      {showAddContent && (
        <div className="fixed inset-0 bg-black/70 z-[2000] flex items-end md:items-center justify-center p-0 md:p-6 backdrop-blur-md">
           <div className="bg-white dark:bg-gray-950 w-full md:max-w-lg p-8 md:p-12 rounded-t-[3rem] md:rounded-[4rem] space-y-6 md:space-y-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <h3 className="text-2xl md:text-3xl font-black dark:text-white">📤 {t("رفع ملف", "Upload", "Upload")}</h3>
              <div className="space-y-4">
                 <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder={t("عنوان الملف", "Titre", "Title")} className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl md:rounded-3xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500 text-sm" />
                 <select value={newContentData.type} onChange={e => setNewContentData({...newContentData, type: e.target.value as any})} className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl md:rounded-3xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500 text-sm">
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                 </select>
              </div>
              <div className="flex gap-4 pb-10 md:pb-0">
                 <button onClick={handleAddContent} className="flex-1 bg-emerald-600 text-white py-5 md:py-6 rounded-2xl md:rounded-3xl font-black text-sm md:text-xl shadow-xl active:scale-95">{t("رفع الآن", "Uploader", "Upload")}</button>
                 <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 text-gray-400 py-5 md:py-6 rounded-2xl md:rounded-3xl font-black text-sm md:text-xl">{t("إلغاء", "Annuler", "Cancel")}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
