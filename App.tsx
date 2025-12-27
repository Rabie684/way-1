
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
        <div className="w-40 h-40 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl animate-float">
            <span className="text-emerald-600 text-5xl font-black tracking-tighter">way</span>
        </div>
        <h1 className="text-7xl font-black mb-2 tracking-tighter relative z-10">WAY</h1>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row text-right transition-colors duration-500">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-6 flex flex-col gap-6 shadow-2xl z-20 transition-all">
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
          {[
            { id: 'home', icon: '🏠', label: t("الرئيسية", "Accueil", "Home") },
            { id: 'explore', icon: '🔍', label: t("استكشف", "Explorer", "Explore"), show: currentUser?.role === 'student' },
            { id: 'messages', icon: '💬', label: t("الدردشة", "Messages", "Chats") },
            { id: 'wallet', icon: '💰', label: t("المحفظة", "Portefeuille", "Wallet") },
            { id: 'profile', icon: '👤', label: t("الملف الشخصي", "Profil", "Profile") }
          ].map(tab => (tab.show !== false) && (
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

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32">
        {view === 'dashboard' && activeTab === 'home' && (
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black dark:text-white">{t("أهلاً،", "Salut,", "Hi,")} {currentUser?.firstName} 👋</h1>
                <p className="text-gray-400 font-bold mt-2">{t("نتمنى لك رحلة أكاديمية موفقة", "Bonne chance dans votre parcours", "Have a great academic journey")}</p>
              </div>
              <div className="bg-emerald-500/10 p-5 rounded-[2.5rem] border border-emerald-500/20 shadow-inner">
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{t("رصيدك الحالي", "Solde Actuel", "Current Balance")}</p>
                <p className="text-3xl font-black text-emerald-600">{currentUser?.walletBalance} دج</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {(currentUser?.role === 'professor' ? channels.filter(c => c.professorId === currentUser.id) : channels.filter(c => c.subscribers.includes(currentUser?.id || ''))).map(c => (
                 <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border-2 border-emerald-500/20 shadow-sm hover:shadow-2xl transition-all relative overflow-hidden group hover:-translate-y-2">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 transition-all group-hover:w-4"></div>
                    <h4 className="text-2xl font-black dark:text-white mb-2">{c.name}</h4>
                    <p className="text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed">{c.description}</p>
                    <div className="flex justify-between items-center pt-4 border-t dark:border-gray-800">
                       <span className="font-black text-emerald-600 text-sm">{c.subscribers.length} {t("طالب", "Étudiants", "Students")}</span>
                       <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-md group-hover:bg-emerald-700 transition-colors">
                          {currentUser?.role === 'professor' ? t("إدارة", "Gérer", "Manage") : t("دخول", "Entrer", "Enter")}
                       </button>
                    </div>
                 </div>
               ))}
               {(currentUser?.role === 'student' && channels.filter(c => c.subscribers.includes(currentUser?.id || '')).length === 0) && (
                  <div className="col-span-full py-20 bg-gray-100 dark:bg-gray-900/50 rounded-[4rem] text-center border-4 border-dashed border-gray-200 dark:border-gray-800 animate-pulse">
                    <p className="text-gray-400 font-black mb-4 text-xl">{t("لم تشترك في أي مقياس بعد", "Aucune inscription", "No subscriptions yet")}</p>
                    <button onClick={() => setActiveTab('explore')} className="bg-emerald-600 text-white px-10 py-4 rounded-3xl font-black shadow-xl">
                        {t("استكشف الأساتذة", "Explorer", "Explore")}
                    </button>
                  </div>
               )}
            </div>
          </div>
        )}

        {/* MESSAGES VIEW - PERSONALIZED CHAT UI */}
        {view === 'dashboard' && activeTab === 'messages' && (
          <div className="max-w-6xl mx-auto h-[75vh] flex bg-white dark:bg-gray-900 rounded-[4rem] shadow-2xl overflow-hidden border dark:border-gray-800 animate-in slide-in-from-bottom duration-500">
             {/* Chat List Sidebar */}
             <div className="hidden md:flex flex-col w-1/3 border-l dark:border-gray-800 p-8 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="text-2xl font-black dark:text-white mb-8 pr-2 border-r-4 border-emerald-500">{t("محادثاتك", "Mes Chats", "My Chats")}</h3>
                <div className="space-y-4">
                   {channels.filter(c => isOwner(c) || isSubscriber(c)).map(c => (
                     <button key={c.id} onClick={() => { setActiveChatChannel(c); setView('chat-view'); }} className={`w-full p-5 rounded-3xl flex items-center gap-4 transition-all border ${activeChatChannel?.id === c.id ? 'bg-emerald-600 text-white shadow-xl border-transparent' : 'bg-white dark:bg-gray-800 text-gray-400 hover:border-emerald-500 dark:border-gray-700'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${activeChatChannel?.id === c.id ? 'bg-white text-emerald-600' : 'bg-emerald-100 text-emerald-700'}`}>
                           {c.name.charAt(0)}
                        </div>
                        <div className="text-right overflow-hidden">
                           <p className={`font-black truncate ${activeChatChannel?.id === c.id ? 'text-white' : 'dark:text-white'}`}>{c.name}</p>
                           <p className={`text-[10px] uppercase font-black opacity-60`}>{isOwner(c) ? t("أستاذ", "Prof", "Prof") : t("طالب", "Étudiant", "Student")}</p>
                        </div>
                     </button>
                   ))}
                </div>
             </div>

             {/* Placeholder for no active selection */}
             <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-950">
                <div className="w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-full flex items-center justify-center text-7xl mb-6 shadow-inner">💬</div>
                <h3 className="text-3xl font-black dark:text-white">{t("تواصل مع مجتمعك الجامعي", "Messagerie", "Messages")}</h3>
                <p className="text-gray-400 max-w-sm mt-4 leading-relaxed">{t("اختر قناة من القائمة لبدء المحادثة مع الطلاب والأساتذة المشتركين.", "Sélectionnez une discussion pour commencer.", "Select a discussion to start chatting.")}</p>
                
                <div className="grid gap-3 w-full max-w-md mt-12 md:hidden">
                   {channels.filter(c => isOwner(c) || isSubscriber(c)).map(c => (
                     <button key={c.id} onClick={() => { setActiveChatChannel(c); setView('chat-view'); }} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-between border dark:border-gray-700 hover:border-emerald-500">
                        <span className="font-black dark:text-white">{c.name}</span>
                        <span className="text-emerald-600 font-black">←</span>
                     </button>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* PROFILE VIEW - ENHANCED CARD UI */}
        {view === 'dashboard' && activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-500">
             <div className="bg-white dark:bg-gray-900 rounded-[5rem] shadow-2xl overflow-hidden border dark:border-gray-800">
                <div className="h-48 bg-emerald-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-white/10 rounded-full"></div>
                </div>
                
                <div className="px-12 pb-12 -mt-20 relative">
                   <div className="flex flex-col md:flex-row items-end gap-8 mb-10">
                      <div className="bg-white dark:bg-gray-900 p-2 rounded-[3.5rem] shadow-2xl">
                         <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="lg" />
                      </div>
                      <div className="flex-1 text-center md:text-right">
                         <h2 className="text-4xl font-black dark:text-white">{currentUser?.firstName} {currentUser?.lastName}</h2>
                         <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                            <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-black">{currentUser?.role === 'professor' ? t("أستاذ", "Prof", "Prof") : t("طالب", "Étudiant", "Student")}</span>
                            <span className="bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-4 py-1 rounded-full text-xs font-black">{currentUser?.university}</span>
                         </div>
                      </div>
                      <button onClick={() => { localStorage.removeItem('way_session'); setView('landing'); }} className="bg-red-50 dark:bg-red-900/20 text-red-500 px-8 py-3 rounded-2xl font-black text-sm hover:bg-red-500 hover:text-white transition-all shadow-md">
                         {t("خروج", "Quitter", "Exit")}
                      </button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Language Section */}
                      <div className="space-y-4">
                         <h4 className="text-xl font-black dark:text-white pr-4 border-r-4 border-emerald-500">{t("اللغات", "Langues", "Languages")}</h4>
                         <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[3rem] flex gap-2 border dark:border-gray-800 shadow-inner">
                            {['ar', 'fr', 'en'].map(l => (
                              <button key={l} onClick={() => toggleLanguage(l as Language)} className={`flex-1 py-4 rounded-2xl font-black uppercase transition-all ${language === l ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                 {l}
                              </button>
                            ))}
                         </div>
                      </div>

                      {/* Theme Section */}
                      <div className="space-y-4">
                         <h4 className="text-xl font-black dark:text-white pr-4 border-r-4 border-emerald-500">{t("المظهر", "Apparence", "Appearance")}</h4>
                         <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[3rem] flex items-center justify-between border dark:border-gray-800 shadow-inner group">
                            <div className="flex items-center gap-4">
                               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${isDarkMode ? 'bg-indigo-500 text-white shadow-indigo-500/50' : 'bg-yellow-400 text-white shadow-yellow-400/50'} shadow-lg group-hover:scale-110`}>
                                  {isDarkMode ? '🌙' : '☀️'}
                               </div>
                               <div className="text-right">
                                  <p className="font-black dark:text-white leading-none">{isDarkMode ? t("الوضع الليلي", "Nuit", "Night") : t("الوضع النهاري", "Jour", "Day")}</p>
                                  <p className="text-[10px] text-gray-400 mt-1 font-black">{t("اضغط للتبديل", "Changer", "Toggle")}</p>
                               </div>
                            </div>
                            <div className={`w-16 h-9 rounded-full p-1.5 transition-colors relative ${isDarkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                               <div className={`w-6 h-6 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-0' : '-translate-x-7'}`}></div>
                            </div>
                         </button>
                      </div>
                   </div>

                   {/* Stats Section */}
                   <div className="mt-12 grid grid-cols-3 gap-6">
                      {[
                        { label: t("الرصيد", "Solde", "Balance"), val: currentUser?.walletBalance + " دج", color: 'text-emerald-600' },
                        { label: t("المقاييس", "Modules", "Modules"), val: channels.filter(c => isOwner(c) || isSubscriber(c)).length, color: 'text-blue-500' },
                        { label: t("الرسائل", "Messages", "Messages"), val: "24+", color: 'text-purple-500' }
                      ].map((stat, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2.5rem] text-center border dark:border-gray-800 shadow-sm">
                           <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                           <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* CHAT VIEW - DETAILED CHAT UI */}
        {view === 'chat-view' && activeChatChannel && (
          <div className="h-[80vh] max-w-5xl mx-auto flex flex-col bg-white dark:bg-gray-950 rounded-[4rem] shadow-2xl overflow-hidden border dark:border-gray-800 animate-in slide-in-from-bottom duration-500">
             <div className="p-8 bg-emerald-600 text-white flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-10 -translate-y-10"></div>
                <button onClick={() => setView('dashboard')} className="font-black bg-white/20 px-6 py-3 rounded-2xl hover:bg-white/30 transition-all shadow-md relative z-10">← {t("رجوع", "Retour", "Back")}</button>
                <div className="text-center relative z-10">
                   <h3 className="font-black text-2xl">{activeChatChannel.name}</h3>
                   <div className="flex items-center gap-2 justify-center mt-1">
                      <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
                      <p className="text-[10px] font-black uppercase tracking-tighter opacity-80">{t("مجموعة المشتركين المباشرة", "Live Groupe", "Live Group")}</p>
                   </div>
                </div>
                <div className="w-20 hidden md:block"></div>
             </div>

             <div className="flex-1 p-8 overflow-y-auto space-y-6 no-scrollbar bg-gray-50 dark:bg-gray-900/30">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 select-none">
                     <span className="text-8xl">🏜️</span>
                     <p className="font-black text-xl">{t("ابدأ النقاش الآن!", "Commencez !", "Start chatting!")}</p>
                  </div>
                )}
                {chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.senderId === currentUser?.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[80%] p-6 rounded-[2.5rem] shadow-xl relative group ${m.senderId === currentUser?.id ? 'bg-emerald-600 text-white rounded-br-none shadow-emerald-500/20' : 'bg-white dark:bg-gray-800 dark:text-white rounded-bl-none border dark:border-gray-700 shadow-gray-200/50 dark:shadow-none'}`}>
                       <div className="flex justify-between items-center gap-10 mb-2">
                          <p className={`text-[10px] font-black uppercase ${m.senderId === currentUser?.id ? 'text-white/70' : 'text-emerald-600'}`}>{m.senderName}</p>
                          <span className={`text-[8px] opacity-40 font-bold`}>{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       </div>
                       <p className="font-bold leading-relaxed text-lg break-words">{m.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef}></div>
             </div>

             <div className="p-8 bg-white dark:bg-gray-950 border-t dark:border-gray-800 flex gap-4">
                <input value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={t("رسالتك هنا...", "Message...", "Message...")} className="flex-1 bg-gray-50 dark:bg-gray-900 p-6 rounded-3xl outline-none font-bold dark:text-white border-4 border-transparent focus:border-emerald-500 transition-all shadow-inner" />
                <button onClick={sendMessage} className="bg-emerald-600 text-white px-12 rounded-3xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all">
                    {t("إرسال", "Envoyer", "Send")}
                </button>
             </div>
          </div>
        )}
      </main>

      {/* Floating Jarvis Button */}
      <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-12 left-12 w-24 h-24 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center text-5xl border-8 border-white dark:border-gray-900 animate-float z-50 hover:scale-110 transition-transform">
        <div className="relative">
          🤖
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-4 border-white dark:border-gray-900 rounded-full animate-ping"></span>
        </div>
      </button>
      
      {/* Jarvis Modal */}
      {isJarvisOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[1000] flex items-center justify-center p-6 transition-all duration-300">
           <div className="bg-white dark:bg-gray-950 w-full max-w-4xl h-[85vh] rounded-[4.5rem] flex flex-col overflow-hidden shadow-2xl border dark:border-gray-800 animate-in zoom-in duration-300">
              <div className="p-12 bg-emerald-600 text-white flex justify-between items-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-x-10 -translate-y-10"></div>
                 <div className="flex items-center gap-8 relative z-10">
                    <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center text-6xl shadow-2xl border-4 border-emerald-500">🤖</div>
                    <div>
                       <h3 className="text-4xl font-black">جارفيس (Jarvis)</h3>
                       <p className="text-sm opacity-80 font-black uppercase tracking-widest mt-1">{t("مساعدك الأكاديمي الذكي", "Assistant IA", "IA Assistant")}</p>
                    </div>
                 </div>
                 <button onClick={() => setIsJarvisOpen(false)} className="bg-white/20 p-5 rounded-[2rem] font-black hover:bg-white/40 transition-all relative z-10 shadow-lg">{t("إغلاق", "Fermer", "Close")}</button>
              </div>
              
              <div className="flex-1 p-12 overflow-y-auto space-y-10 no-scrollbar bg-gray-50/50 dark:bg-gray-900/50">
                 {jarvisChat.length === 0 && (
                   <div className="text-center py-20 space-y-8 max-w-lg mx-auto animate-in fade-in duration-700">
                      <p className="text-7xl">💡</p>
                      <h4 className="text-3xl font-black dark:text-white leading-relaxed">
                        {t("«مرحبًا 👋 أنا جارفيس، مساعد ذكي مصمم لمساعدة الطلبة والأساتذة في الجامعة.»", "Salut 👋 je suis Jarvis, votre assistant intelligent.", "Hi 👋 I'm Jarvis, your smart assistant.")}
                      </h4>
                      <p className="text-gray-400 font-bold text-lg">
                        {t("«أهلاً بك، أنا جارفيس. هدفي تبسيط المعرفة وتنظيم التواصل الأكاديمي.»", "Mon but est de simplifier le savoir.", "My goal is to simplify knowledge.")}
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        {[t("ماذا تفعل؟", "Rôle?", "Role?"), t("كيف تكتب بحث؟", "Recherche?", "Research?"), t("لخص درساً", "Résumé?", "Summary?")].map((btn, i) => (
                          <button key={i} onClick={() => setJarvisInput(btn)} className="bg-white dark:bg-gray-800 px-6 py-3 rounded-2xl text-xs font-black text-emerald-600 shadow-sm border dark:border-gray-700 hover:scale-105 transition-all">{btn}</button>
                        ))}
                      </div>
                   </div>
                 )}
                 {jarvisChat.map((c, i) => (
                   <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300`}>
                      <div className={`p-10 rounded-[3.5rem] max-w-[85%] font-bold leading-relaxed shadow-xl text-xl ${c.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none shadow-emerald-500/20' : 'bg-white dark:bg-gray-800 dark:text-white rounded-bl-none border dark:border-gray-700 shadow-gray-200/20'}`}>
                        {c.text}
                      </div>
                   </div>
                 ))}
                 {isJarvisThinking && (
                   <div className="flex justify-start">
                     <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] flex gap-3 shadow-lg">
                        {[0, 100, 200].map(delay => (
                           <div key={delay} className="w-4 h-4 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }}></div>
                        ))}
                     </div>
                   </div>
                 )}
                 <div ref={chatEndRef}></div>
              </div>
              
              <div className="p-10 border-t dark:border-gray-800 flex gap-4 bg-white dark:bg-gray-950">
                 <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()} placeholder={t("سقسي جارفيس أي حاجة...", "Demander à Jarvis...", "Ask Jarvis anything...")} className="flex-1 bg-gray-50 dark:bg-gray-900 p-7 rounded-[2.5rem] outline-none dark:text-white font-bold text-lg border-4 border-transparent focus:border-emerald-500 transition-all shadow-inner" />
                 <button onClick={handleJarvisAsk} className="bg-emerald-600 text-white px-14 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">{t("إرسال", "Envoyer", "Send")}</button>
              </div>
           </div>
        </div>
      )}

      {/* CREATE MODULE MODAL */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-6 backdrop-blur-md transition-all">
           <div className="bg-white dark:bg-gray-950 w-full max-w-2xl p-14 rounded-[5rem] space-y-10 shadow-2xl animate-in zoom-in duration-300">
              <h3 className="text-5xl font-black dark:text-white tracking-tighter">{t("إنشاء مقياس تعليمي", "Créer un module", "Create Module")}</h3>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 mr-4 uppercase">{t("اسم المقياس", "Nom", "Name")}</label>
                    <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="مثلاً: الاقتصاد الكلي 1" className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 mr-4 uppercase">{t("وصف شامل", "Description", "Description")}</label>
                    <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder="شرح مبسط لما سيجده الطالب في هذه القناة..." className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-bold dark:text-white h-40 border-2 border-transparent focus:border-emerald-500" />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 mr-4 uppercase">{t("سعر الاشتراك (دج)", "Prix", "Price")}</label>
                       <input type="number" value={newChannelData.price} onChange={e => setNewChannelData({...newChannelData, price: Number(e.target.value)})} className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 mr-4 uppercase">{t("رابط Google Meet", "Meet", "Meet")}</label>
                       <input value={newChannelData.meetingUrl} onChange={e => setNewChannelData({...newChannelData, meetingUrl: e.target.value})} placeholder="https://meet.google.com/..." className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500" />
                    </div>
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-7 rounded-[2.5rem] font-black text-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">{t("تأكيد", "Valider", "Confirm")}</button>
                 <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 text-gray-400 py-7 rounded-[2.5rem] font-black text-2xl hover:bg-gray-200 transition-all">{t("إلغاء", "Annuler", "Cancel")}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
