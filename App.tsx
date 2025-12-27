
import React, { useState, useEffect } from 'react';
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

  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  
  const [newChannelData, setNewChannelData] = useState({ name: '', price: 300, description: '', meetingUrl: '' });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as any });

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
      setTimeout(() => setLoading(false), 1000);
    };
    init();

    // PWA Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

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

  // --- Helpers ---
  // Added isOwner and isSubscriber helper functions to resolve reference errors in the view logic
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
        <h1 className="text-9xl font-black mb-2 tracking-tighter animate-float relative z-10">WAY</h1>
        <p className="text-xl font-bold opacity-80 mb-12 text-center max-w-sm relative z-10">
          {t("جامعتك الرقمية الموثوقة", "Votre université numérique de confiance", "Your Trusted Digital University")}
        </p>
        <div className="flex flex-col w-full max-w-xs gap-4 relative z-10">
          <button onClick={() => handleLogin('student')} className="bg-white text-emerald-600 py-5 rounded-3xl font-black text-xl shadow-2xl hover:scale-105 transition-all">
            {t("دخول طالب", "Connexion Étudiant", "Student Login")}
          </button>
          <button onClick={() => handleLogin('prof_bentahar')} className="bg-emerald-900 text-white py-5 rounded-3xl font-black text-xl hover:scale-105 transition-all border border-emerald-500/30">
            {t("دخول أستاذ", "Connexion Professeur", "Professor Login")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row text-right">
      {/* Sidebar - Enhanced Separation */}
      <aside className="w-full md:w-80 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-6 flex flex-col gap-8 shadow-2xl z-20">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-5xl font-black text-emerald-600 tracking-tighter">WAY</h2>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {currentUser?.role === 'professor' ? t("فضاء الأستاذ", "Espace Prof", "Professor Space") : t("فضاء الطالب", "Espace Étudiant", "Student Space")}
          </span>
        </div>
        
        <nav className="flex flex-col gap-2">
          <button onClick={() => { setActiveTab('home'); setView('dashboard'); }} className={`p-4 rounded-2xl font-black text-right transition-all flex items-center gap-3 ${activeTab === 'home' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <span className="text-xl">🏠</span> {t("الرئيسية", "Accueil", "Home")}
          </button>
          {currentUser?.role === 'student' && (
            <button onClick={() => { setActiveTab('explore'); setView('dashboard'); }} className={`p-4 rounded-2xl font-black text-right transition-all flex items-center gap-3 ${activeTab === 'explore' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              <span className="text-xl">🔍</span> {t("استكشف", "Explorer", "Explore")}
            </button>
          )}
          <button onClick={() => { setActiveTab('messages'); setView('dashboard'); }} className={`p-4 rounded-2xl font-black text-right transition-all flex items-center gap-3 ${activeTab === 'messages' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <span className="text-xl">💬</span> {t("الدردشة", "Messages", "Chats")}
          </button>
          <button onClick={() => { setActiveTab('wallet'); setView('dashboard'); }} className={`p-4 rounded-2xl font-black text-right transition-all flex items-center gap-3 ${activeTab === 'wallet' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <span className="text-xl">💰</span> {t("المحفظة", "Portefeuille", "Wallet")}
          </button>
          <button onClick={() => { setActiveTab('profile'); setView('dashboard'); }} className={`p-4 rounded-2xl font-black text-right transition-all flex items-center gap-3 ${activeTab === 'profile' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <span className="text-xl">👤</span> {t("الملف الشخصي", "Profil", "Profile")}
          </button>
        </nav>

        {deferredPrompt && (
          <button onClick={handleInstallApp} className="mt-4 bg-blue-600 text-white p-4 rounded-2xl font-black text-xs animate-pulse">
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

      {/* Main Container */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32">
        
        {/* DASHBOARD HOME - ROLE SPECIFIC */}
        {view === 'dashboard' && activeTab === 'home' && (
          <div className="max-w-6xl mx-auto space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black dark:text-white">{t("أهلاً،", "Salut,", "Hi,")} {currentUser?.firstName} 👋</h1>
                <p className="text-gray-400 font-bold mt-2">{t("نتمنى لك رحلة أكاديمية موفقة", "Bonne chance dans votre parcours", "Have a great academic journey")}</p>
              </div>
              <div className="bg-emerald-500/10 p-4 rounded-[2rem] border border-emerald-500/20">
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{t("رصيدك الحالي", "Solde Actuel", "Current Balance")}</p>
                <p className="text-2xl font-black text-emerald-600">{currentUser?.walletBalance} دج</p>
              </div>
            </header>

            {currentUser?.role === 'professor' ? (
              <div className="space-y-8">
                <h3 className="text-2xl font-black dark:text-white border-r-4 border-emerald-500 pr-4">{t("إدارة مقاييسك التعليمية", "Gérer mes modules", "Manage my modules")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {channels.filter(c => c.professorId === currentUser.id).map(c => (
                    <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border-2 border-emerald-500/30 shadow-sm hover:shadow-2xl transition-all relative overflow-hidden group">
                       <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 transition-all group-hover:w-4"></div>
                       <h4 className="text-2xl font-black dark:text-white mb-2">{c.name}</h4>
                       <p className="text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed">{c.description}</p>
                       <div className="flex justify-between items-center pt-4 border-t dark:border-gray-800">
                          <span className="font-black text-emerald-600 text-sm">{c.subscribers.length} {t("مشترك", "Étudiants", "Students")}</span>
                          <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs">{t("إدارة المحتوى", "Gérer", "Manage")}</button>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                <h3 className="text-2xl font-black dark:text-white border-r-4 border-emerald-500 pr-4">{t("مقاييس اشتركت فيها", "Mes inscriptions", "My subscriptions")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {channels.filter(c => c.subscribers.includes(currentUser?.id || '')).map(c => (
                     <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 shadow-sm hover:scale-105 transition-all">
                        <h4 className="text-2xl font-black dark:text-white mb-2">{c.name}</h4>
                        <p className="text-xs text-emerald-600 font-black mb-4">{t("بواسطة الأستاذ:", "Par le prof:", "By professor:")} {users.find(u => u.id === c.professorId)?.lastName}</p>
                        <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs">{t("دخول الدروس", "Accéder", "Access")}</button>
                     </div>
                   ))}
                   {channels.filter(c => c.subscribers.includes(currentUser?.id || '')).length === 0 && (
                     <div className="col-span-full py-20 bg-gray-100 dark:bg-gray-900/50 rounded-[3rem] text-center border-4 border-dashed border-gray-200 dark:border-gray-800">
                        <p className="text-gray-400 font-black mb-4">{t("لم تشترك في أي مقياس بعد", "Aucune inscription pour le moment", "No subscriptions yet")}</p>
                        <button onClick={() => setActiveTab('explore')} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black">{t("استكشف المقاييس", "Explorer", "Explore")}</button>
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXPLORE VIEW - FOR STUDENTS */}
        {view === 'dashboard' && activeTab === 'explore' && (
          <div className="max-w-6xl mx-auto space-y-10">
            <h1 className="text-4xl font-black dark:text-white">{t("البحث الذكي عن الأساتذة", "Recherche Intelligente", "Smart Search")}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-xl">
               <div className="space-y-2">
                 <label className="text-xs font-black text-gray-400 mr-2 uppercase">{t("الجامعة", "Université", "University")}</label>
                 <select value={filterUniv} onChange={e => setFilterUniv(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl font-bold outline-none dark:text-white border-2 border-transparent focus:border-emerald-500">
                    <option value="">{t("كل الجامعات", "Toutes les Univ", "All Universities")}</option>
                    {UNIVERSITIES.map(u => <option key={u}>{u}</option>)}
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-gray-400 mr-2 uppercase">{t("الكلية", "Faculté", "Faculty")}</label>
                 <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl font-bold outline-none dark:text-white border-2 border-transparent focus:border-emerald-500">
                    <option value="">{t("كل الكليات", "Toutes les Facultés", "All Faculties")}</option>
                    {FACULTIES.map(f => <option key={f}>{f}</option>)}
                 </select>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
              {users.filter(u => u.role === 'professor' && (!filterUniv || u.university === filterUniv) && (!filterFaculty || u.faculty === filterFaculty)).map(prof => (
                <div key={prof.id} className="bg-white dark:bg-gray-900 p-10 rounded-[4rem] border dark:border-gray-800 text-center space-y-6 shadow-sm hover:shadow-2xl transition-all relative">
                   <div className="flex justify-center"><ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="lg" /></div>
                   <div>
                     <h4 className="font-black text-2xl dark:text-white">{prof.firstName} {prof.lastName}</h4>
                     <p className="text-xs text-emerald-600 font-bold mt-1">{prof.university}</p>
                   </div>
                   <button onClick={() => {
                     const pc = channels.find(c => c.professorId === prof.id);
                     if(pc) { setSelectedChannel(pc); setView('channel-view'); }
                     else alert(t("الأستاذ لم يفتح أي مقياس حالياً", "Pas de modules ouverts", "No modules open"));
                   }} className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black shadow-lg">
                    {t("تصفح المقاييس", "Voir les modules", "Browse Modules")}
                   </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MESSAGES VIEW - PERSONAL CHATS */}
        {view === 'dashboard' && activeTab === 'messages' && (
          <div className="max-w-4xl mx-auto h-[75vh] flex bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden border dark:border-gray-800">
             <div className="w-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="text-8xl">💬</div>
                <h3 className="text-3xl font-black dark:text-white">{t("الدردشة الشخصية", "Messagerie", "Messages")}</h3>
                <p className="text-gray-400 max-w-sm">{t("يمكنك الدردشة مع الأساتذة في مجموعات المقاييس الخاصة بهم بمجرد الاشتراك.", "Discutez avec les profs dans les groupes de modules après inscription.", "Chat with professors in course groups after subscribing.")}</p>
                <div className="grid gap-2 w-full pt-10">
                   {channels.filter(c => isOwner(c) || isSubscriber(c)).map(c => (
                     <button key={c.id} onClick={() => { setActiveChatChannel(c); setView('chat-view'); }} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-between hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all border dark:border-gray-700">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-black">
                             {c.name.charAt(0)}
                           </div>
                           <div className="text-right">
                              <p className="font-black dark:text-white">{c.name}</p>
                              <p className="text-[10px] text-gray-400">{t("مجموعة المشتركين", "Groupe abonnés", "Subscribers Group")}</p>
                           </div>
                        </div>
                        <span className="text-emerald-600 text-xl">←</span>
                     </button>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* PROFILE VIEW - LANGUAGE & THEME */}
        {view === 'dashboard' && activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in duration-300">
             <div className="bg-white dark:bg-gray-900 p-12 rounded-[5rem] shadow-xl border dark:border-gray-800 text-center">
                <div className="flex justify-center">
                  <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="lg" />
                </div>
                <h2 className="text-4xl font-black dark:text-white mt-8">{currentUser?.firstName} {currentUser?.lastName}</h2>
                <p className="text-emerald-600 font-black mt-2">{currentUser?.role === 'professor' ? t("أستاذ محاضر", "Professeur", "Lecturer") : t("طالب جامعي", "Étudiant", "Student")}</p>

                <div className="mt-12 space-y-6">
                   {/* Language Switch */}
                   <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2.5rem] flex flex-col gap-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("اختيار اللغة", "Choisir la langue", "Choose Language")}</p>
                      <div className="flex gap-2">
                         {['ar', 'fr', 'en'].map((l) => (
                           <button key={l} onClick={() => toggleLanguage(l as Language)} className={`flex-1 py-3 rounded-2xl font-black uppercase transition-all ${language === l ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white dark:bg-gray-900 text-gray-400'}`}>
                              {l}
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* Dark Mode Toggle */}
                   <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full p-8 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] font-black dark:text-white flex items-center justify-between border-2 border-transparent hover:border-emerald-500/20 transition-all">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{isDarkMode ? '🌙' : '☀️'}</span>
                        <div className="text-right">
                          <p className="font-black leading-none">{t("الوضع الليلي", "Mode Sombre", "Dark Mode")}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{isDarkMode ? t("مفعل", "Activé", "Enabled") : t("معطل", "Désactivé", "Disabled")}</p>
                        </div>
                      </div>
                      <div className={`w-14 h-8 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                         <div className={`w-6 h-6 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-0' : '-translate-x-6'}`}></div>
                      </div>
                   </button>

                   <button onClick={() => { localStorage.removeItem('way_session'); setView('landing'); }} className="w-full bg-red-50 dark:bg-red-900/10 text-red-500 py-8 rounded-[3rem] font-black mt-10 hover:bg-red-100 transition-colors">
                     {t("تسجيل الخروج", "Déconnexion", "Logout")}
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* CHAT VIEW - CHANNEL CHAT */}
        {view === 'chat-view' && activeChatChannel && (
          <div className="h-full max-w-4xl mx-auto flex flex-col bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden border dark:border-gray-800 animate-in slide-in-from-bottom">
             <div className="p-6 bg-emerald-600 text-white flex items-center justify-between">
                <button onClick={() => setView('dashboard')} className="font-black px-4 py-2 hover:bg-white/10 rounded-xl">← {t("إغلاق", "Fermer", "Close")}</button>
                <div className="text-center">
                   <h3 className="font-black text-xl">{activeChatChannel.name}</h3>
                   <p className="text-[10px] opacity-80 uppercase tracking-widest">{t("دردشة المقياس", "Chat du Module", "Course Chat")}</p>
                </div>
                <div className="w-16"></div>
             </div>
             <div className="flex-1 p-8 overflow-y-auto space-y-4 no-scrollbar">
                {chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-5 rounded-[2rem] shadow-sm relative ${m.senderId === currentUser?.id ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-800 dark:text-white rounded-bl-none'}`}>
                       <p className={`text-[9px] font-black uppercase mb-1 ${m.senderId === currentUser?.id ? 'text-white/60' : 'text-emerald-600'}`}>{m.senderName}</p>
                       <p className="font-bold leading-relaxed">{m.text}</p>
                       <span className="text-[8px] opacity-40 absolute bottom-2 left-4">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ))}
             </div>
             <div className="p-6 bg-gray-50 dark:bg-gray-950 border-t dark:border-gray-800 flex gap-3">
                <input value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={t("اكتب رسالتك...", "Écrire...", "Type a message...")} className="flex-1 bg-white dark:bg-gray-900 p-5 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500" />
                <button onClick={sendMessage} className="bg-emerald-600 text-white px-10 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">{t("إرسال", "Envoyer", "Send")}</button>
             </div>
          </div>
        )}

        {/* CHANNEL CONTENT VIEW */}
        {view === 'channel-view' && selectedChannel && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
             <button onClick={() => setView('dashboard')} className="text-emerald-600 font-black flex items-center gap-2 mb-4">← {t("العودة", "Retour", "Back")}</button>
             
             <div className="bg-white dark:bg-gray-900 p-12 rounded-[5rem] border dark:border-gray-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/10 rounded-bl-full"></div>
                <h2 className="text-5xl font-black dark:text-white mb-3">{selectedChannel.name}</h2>
                <p className="text-gray-400 font-bold text-lg mb-10 leading-relaxed max-w-2xl">{selectedChannel.description}</p>
                
                <div className="flex flex-wrap gap-4 pt-10 border-t dark:border-gray-800">
                   {isOwner(selectedChannel) ? (
                     <>
                        <button onClick={() => window.open(selectedChannel.meetingUrl, '_blank')} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-xl hover:scale-105 transition-all flex items-center gap-3">
                          <span className="text-2xl">🎥</span> {t("محاضرة Google Meet", "Réunion Google Meet", "Google Meet Session")}
                        </button>
                        <button onClick={() => setShowAddContent(true)} className="bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-xl hover:scale-105 transition-all flex items-center gap-3">
                          <span className="text-2xl">📤</span> {t("رفع ملف جديد", "Uploader un fichier", "Upload New File")}
                        </button>
                     </>
                   ) : (
                     isSubscriber(selectedChannel) ? (
                        <>
                           <button onClick={() => window.open(selectedChannel.meetingUrl, '_blank')} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-xl hover:scale-105 transition-all">
                             🎥 {t("انضمام للمحاضرة", "Rejoindre", "Join Session")}
                           </button>
                           <button onClick={() => { setActiveChatChannel(selectedChannel); setView('chat-view'); }} className="bg-emerald-100 text-emerald-700 px-10 py-5 rounded-[2rem] font-black">
                             💬 {t("دردشة المقياس", "Chat", "Chat")}
                           </button>
                        </>
                     ) : (
                        <div className="flex flex-col gap-2 w-full max-w-sm">
                           <button onClick={() => alert("يرجى شحن المحفظة أولاً")} className="bg-emerald-600 text-white px-14 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 transition-all">
                            {t("اشتراك بـ", "S'abonner pour", "Subscribe for")} {selectedChannel.price} {t("دج", "DA", "DA")}
                           </button>
                           <p className="text-[10px] text-gray-400 text-center font-bold">{t("الوصول لجميع الدروس والمحاضرات المباشرة", "Accès illimité aux cours et directs", "Unlimited access to courses and live sessions")}</p>
                        </div>
                     )
                   )}
                </div>
             </div>

             <div className="space-y-6">
                <h3 className="text-3xl font-black dark:text-white border-r-4 border-emerald-500 pr-4">{t("المحتوى التعليمي", "Contenu Éducatif", "Educational Content")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {(isOwner(selectedChannel) || isSubscriber(selectedChannel)) ? (
                     selectedChannel.content.length > 0 ? selectedChannel.content.map(item => (
                       <div key={item.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 flex justify-between items-center group hover:border-emerald-500 transition-all shadow-sm">
                          <div className="flex items-center gap-6">
                             <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-3xl">
                               {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : '🖼️'}
                             </div>
                             <div>
                                <h4 className="font-black dark:text-white text-lg">{item.title}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.type}</p>
                             </div>
                          </div>
                          <button onClick={async () => {
                            const sum = await summarizeContent(item.title, item.type);
                            alert(sum);
                          }} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl font-black text-xs text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
                            {t("ملخص جارفيس ✨", "Résumé Jarvis ✨", "Jarvis Summary ✨")}
                          </button>
                       </div>
                     )) : <p className="text-center text-gray-400 py-10 w-full col-span-full font-black italic">{t("لا توجد دروس مرفوعة بعد", "Aucun cours disponible", "No courses available yet")}</p>
                   ) : (
                     <div className="col-span-full bg-gray-100 dark:bg-gray-900/50 p-24 rounded-[4rem] text-center border-4 border-dashed border-gray-200 dark:border-gray-800">
                        <p className="text-gray-400 font-black text-xl mb-4">🔒 {t("هذا المحتوى محمي للمشتركين فقط", "Contenu protégé pour les abonnés", "Protected content for subscribers only")}</p>
                        <p className="text-sm text-gray-400 max-w-xs mx-auto">{t("اشترك الآن لتتمكن من تحميل الملفات ومشاهدة الفيديوهات وتلخيصها عبر جارفيس.", "Abonnez-vous pour télécharger les fichiers et résumer avec Jarvis.", "Subscribe to download files and summarize with Jarvis.")}</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </main>

      {/* JARVIS AI - FLOATING */}
      <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-12 left-12 w-24 h-24 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center text-5xl border-8 border-white dark:border-gray-900 animate-float z-50 hover:scale-110 transition-transform">
        <div className="relative">
          🤖
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-4 border-white dark:border-gray-900 rounded-full animate-ping"></span>
        </div>
      </button>
      
      {isJarvisOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1000] flex items-center justify-center p-6">
           <div className="bg-white dark:bg-gray-950 w-full max-w-3xl h-[85vh] rounded-[4rem] flex flex-col overflow-hidden shadow-2xl border dark:border-gray-800 animate-in zoom-in duration-300">
              <div className="p-10 bg-emerald-600 text-white flex justify-between items-center relative overflow-hidden">
                 <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full"></div>
                 <div className="flex items-center gap-6 relative z-10">
                    <span className="text-6xl">🤖</span>
                    <div>
                       <h3 className="text-3xl font-black">جارفيس (Jarvis)</h3>
                       <p className="text-xs opacity-80 font-bold uppercase tracking-widest">{t("مساعدك الأكاديمي الذكي", "Votre assistant académique", "Your Smart Academic Assistant")}</p>
                    </div>
                 </div>
                 <button onClick={() => setIsJarvisOpen(false)} className="bg-white/20 p-4 rounded-3xl font-black hover:bg-white/40 transition-all relative z-10">{t("إغلاق", "Fermer", "Close")}</button>
              </div>
              
              <div className="flex-1 p-10 overflow-y-auto space-y-8 no-scrollbar">
                 {jarvisChat.length === 0 && (
                   <div className="text-center py-20 space-y-6 max-w-md mx-auto">
                      <p className="text-5xl">🎓</p>
                      <h4 className="text-2xl font-black dark:text-white leading-relaxed">
                        {t("«مرحبًا 👋 أنا جارفيس، مساعد ذكي مصمم لمساعدة الطلبة والأساتذة في الجامعة.»", "Salut 👋 je suis Jarvis, votre assistant académique intelligent.", "Hi 👋 I'm Jarvis, your smart academic assistant.")}
                      </h4>
                      <p className="text-gray-400 font-bold">
                        {t("«أهلاً بك، أنا جارفيس. هدفي تبسيط المعرفة وتنظيم التواصل الأكاديمي.»", "Mon but est de simplifier le savoir et l'organisation.", "My goal is to simplify knowledge and organization.")}
                      </p>
                      <div className="pt-6 grid gap-2">
                         <button onClick={() => setJarvisInput("ماذا تفعل؟")} className="p-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-2xl text-xs font-black">{t("ماذا تفعل؟", "Que fais-tu ?", "What do you do?")}</button>
                         <button onClick={() => setJarvisInput("كيف يمكنني كتابة بحث؟")} className="p-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-2xl text-xs font-black">{t("كيف يمكنني كتابة بحث؟", "Comment faire une recherche ?", "How to write a research?")}</button>
                      </div>
                   </div>
                 )}
                 {jarvisChat.map((c, i) => (
                   <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-8 rounded-[2.5rem] max-w-[85%] font-bold leading-loose shadow-sm text-lg ${c.role === 'user' ? 'bg-emerald-100 text-emerald-900 rounded-br-none' : 'bg-gray-100 dark:bg-gray-900 dark:text-white rounded-bl-none border dark:border-gray-800'}`}>
                        {c.text}
                      </div>
                   </div>
                 ))}
                 {isJarvisThinking && (
                   <div className="flex justify-start">
                     <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-[2.5rem] flex gap-2">
                        <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce delay-100"></div>
                        <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce delay-200"></div>
                     </div>
                   </div>
                 )}
              </div>
              
              <div className="p-10 border-t dark:border-gray-800 flex gap-4 bg-gray-50 dark:bg-gray-950">
                 <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()} placeholder={t("سقسي جارفيس أي حاجة...", "Demander à Jarvis...", "Ask Jarvis anything...")} className="flex-1 bg-white dark:bg-gray-900 p-6 rounded-3xl outline-none dark:text-white font-bold border-4 border-transparent focus:border-emerald-500 shadow-sm" />
                 <button onClick={handleJarvisAsk} className="bg-emerald-600 text-white px-12 rounded-3xl font-black text-xl shadow-xl hover:scale-105 transition-all">{t("إرسال", "Envoyer", "Send")}</button>
              </div>
           </div>
        </div>
      )}

      {/* MODALS: CREATE CHANNEL / ADD CONTENT */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-950 w-full max-w-xl p-12 rounded-[4rem] space-y-8 shadow-2xl animate-in zoom-in">
              <h3 className="text-4xl font-black dark:text-white">{t("إنشاء مقياس تعليمي", "Créer un module", "Create Module")}</h3>
              <div className="space-y-4">
                 <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder={t("اسم المقياس (مثلاً: اقتصاد كلي)", "Nom du module", "Module Name")} className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white" />
                 <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder={t("وصف محتوى المقياس...", "Description du module", "Module description")} className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white h-32" />
                 <div className="grid grid-cols-2 gap-4">
                    <input type="number" value={newChannelData.price} onChange={e => setNewChannelData({...newChannelData, price: Number(e.target.value)})} placeholder={t("سعر الاشتراك (دج)", "Prix (DA)", "Price (DA)")} className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white" />
                    <input value={newChannelData.meetingUrl} onChange={e => setNewChannelData({...newChannelData, meetingUrl: e.target.value})} placeholder={t("رابط Google Meet", "Lien Google Meet", "Google Meet Link")} className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white" />
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl shadow-xl hover:scale-105 transition-all">{t("تأكيد الإنشاء", "Confirmer", "Confirm")}</button>
                 <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 text-gray-400 py-6 rounded-3xl font-black text-xl">{t("إلغاء", "Annuler", "Cancel")}</button>
              </div>
           </div>
        </div>
      )}

      {showAddContent && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-950 w-full max-w-lg p-12 rounded-[4rem] space-y-8 shadow-2xl animate-in zoom-in">
              <h3 className="text-3xl font-black dark:text-white">📤 {t("رفع ملف أكاديمي", "Uploader un fichier", "Upload File")}</h3>
              <div className="space-y-4">
                 <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder={t("عنوان الملف (مثلاً: محاضرة 1)", "Titre du fichier", "File Title")} className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white" />
                 <select value={newContentData.type} onChange={e => setNewContentData({...newContentData, type: e.target.value as any})} className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white">
                    <option value="pdf">{t("ملف PDF", "Fichier PDF", "PDF File")}</option>
                    <option value="video">{t("فيديو محاضرة", "Vidéo", "Video")}</option>
                    <option value="image">{t("صورة / مخطط", "Image", "Image")}</option>
                 </select>
              </div>
              <div className="flex gap-4 pt-4">
                 <button onClick={handleAddContent} className="flex-1 bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl shadow-xl">{t("رفع الآن", "Uploader", "Upload")}</button>
                 <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 text-gray-400 py-6 rounded-3xl font-black text-xl">{t("إلغاء", "Annuler", "Cancel")}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
