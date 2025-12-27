import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, ContentItem, ChatMessage, Language } from './types.ts';
import { UNIVERSITIES, FACULTIES } from './constants.ts';
import ProfessorRank from './components/ProfessorRank.tsx';
import { summarizeContent, jarvisAsk } from './services/geminiService.ts';

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
      جاري التحميل...
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
    { id: 'home', icon: '🏠', label: t("الرئيسية", "Accueil", "Home") },
    { id: 'explore', icon: '🔍', label: t("استكشف", "Explorer", "Explore"), show: currentUser?.role === 'student' },
    { id: 'messages', icon: '💬', label: t("الدردشة", "Messages", "Chats") },
    { id: 'wallet', icon: '💰', label: t("المحفظة", "Bourse", "Wallet") },
    { id: 'profile', icon: '👤', label: t("الملف", "Profil", "Profile") }
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
            
            {currentUser?.role === 'professor' && (
              <button onClick={() => setShowCreateChannel(true)} className="w-full md:w-auto bg-emerald-600 text-white px-8 py-4 rounded-3xl font-black text-sm shadow-xl">+ {t("إنشاء مقياس جديد", "Créer un Module", "Create Module")}</button>
            )}
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

        {/* PROFILE VIEW */}
        {view === 'dashboard' && activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
             <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-8 md:p-12 shadow-2xl border dark:border-gray-800 text-center">
                <div className="flex justify-center mb-6">
                   <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="lg" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black dark:text-white mb-2">{currentUser?.firstName} {currentUser?.lastName}</h2>
                <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase mb-8 inline-block">{currentUser?.role}</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                   <div className="space-y-2">
                      <p className="font-black dark:text-gray-300">{t("اللغة", "Langue", "Language")}</p>
                      <div className="flex gap-2">
                         {['ar', 'fr', 'en'].map(l => (
                           <button key={l} onClick={() => toggleLanguage(l as Language)} className={`flex-1 py-3 rounded-xl font-black uppercase ${language === l ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>{l}</button>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-2">
                      <p className="font-black dark:text-gray-300">{t("المظهر", "Apparence", "Theme")}</p>
                      <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full py-3 rounded-xl font-black bg-gray-100 dark:bg-gray-800 dark:text-white">
                         {isDarkMode ? '🌙 ليلي' : '☀️ نهاري'}
                      </button>
                   </div>
                </div>

                <button onClick={() => { localStorage.removeItem('way_session'); setView('landing'); }} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black mt-12">
                   {t("تسجيل الخروج", "Déconnexion", "Logout")}
                </button>
             </div>
          </div>
        )}

        {/* CHANNEL VIEW */}
        {view === 'channel-view' && selectedChannel && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
             <button onClick={() => setView('dashboard')} className="text-emerald-600 font-black">← {t("العودة", "Retour", "Back")}</button>
             <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <h2 className="text-3xl md:text-5xl font-black dark:text-white mb-4">{selectedChannel.name}</h2>
                <p className="text-gray-400 font-bold mb-8">{selectedChannel.description}</p>
                <div className="flex gap-4">
                   {isOwner(selectedChannel) || isSubscriber(selectedChannel) ? (
                      <button onClick={() => window.open(selectedChannel.meetingUrl, '_blank')} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black">🎥 {t("محاضرة مباشرة", "Direct", "Live")}</button>
                   ) : (
                      <button onClick={() => alert("شحن رصيد")} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black text-xl shadow-xl">
                        {t("اشتراك بـ", "S'abonner", "Subscribe")} {selectedChannel.price} دج
                      </button>
                   )}
                </div>
             </div>
             <div className="space-y-4">
                <h3 className="text-2xl font-black dark:text-white border-r-4 border-emerald-500 pr-4">{t("المحتوى", "Contenu", "Content")}</h3>
                <div className="grid gap-4">
                   {(isOwner(selectedChannel) || isSubscriber(selectedChannel)) ? (
                      selectedChannel.content.map(item => (
                        <div key={item.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl flex justify-between items-center shadow-sm">
                           <div className="flex items-center gap-4">
                              <span className="text-3xl">{item.type === 'pdf' ? '📄' : '🎥'}</span>
                              <h4 className="font-black dark:text-white">{item.title}</h4>
                           </div>
                           <button onClick={async () => {
                              const sum = await summarizeContent(item.title, item.type);
                              alert(sum);
                           }} className="text-emerald-600 font-black text-xs">{t("ملخص AI ✨", "Résumé AI ✨", "Sum ✨")}</button>
                        </div>
                      ))
                   ) : <div className="p-20 text-center bg-gray-100 dark:bg-gray-800 rounded-3xl text-gray-400">🔒 محتوى محمي</div>}
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Jarvis Modal */}
      {isJarvisOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-[80vh] rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black">جارفيس 🤖</h3>
                 <button onClick={() => setIsJarvisOpen(false)} className="bg-white/20 px-4 py-2 rounded-xl">إغلاق</button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
                 {jarvisChat.map((c, i) => (
                   <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-2xl max-w-[80%] font-bold ${c.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-700 dark:text-white border'}`}>
                        {c.text}
                      </div>
                   </div>
                 ))}
                 {isJarvisThinking && <div className="text-emerald-600 animate-pulse">جارفيس يفكر...</div>}
                 <div ref={chatEndRef}></div>
              </div>
              <div className="p-6 border-t dark:border-gray-800 flex gap-2">
                 <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()} placeholder="اسأل جارفيس..." className="flex-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl outline-none dark:text-white font-bold" />
                 <button onClick={handleJarvisAsk} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black">إرسال</button>
              </div>
           </div>
        </div>
      )}

      {/* Floating Buttons */}
      <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-24 left-6 md:bottom-12 md:left-12 w-16 h-16 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl animate-float z-50">🤖</button>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-4 flex justify-around items-center z-40 pb-safe">
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setActiveTab(item.id as any); setView('dashboard'); }} className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span className="text-xl">{item.icon}</span>
            <span className="text-[8px] font-black">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Create Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-950 w-full max-w-lg p-8 rounded-[3rem] space-y-6">
              <h3 className="text-2xl font-black dark:text-white">إنشاء مقياس جديد</h3>
              <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="اسم المقياس" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white" />
              <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder="وصف قصير" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white h-32" />
              <div className="flex gap-4">
                 <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black">تأكيد</button>
                 <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;