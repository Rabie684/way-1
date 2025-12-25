
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES, APP_COMMISSION } from './constants';
import { getMedal, getMedalPrice } from './utils';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk } from './services/geminiService';

const App: React.FC = () => {
  // Core State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'dashboard' | 'channel-view'>('landing');
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelTab, setChannelTab] = useState<'pdf' | 'broadcast' | 'jarvis'>('pdf');
  const [activeTab, setActiveTab] = useState<'home' | 'my-channels' | 'wallet' | 'messages' | 'profile'>('home');
  
  // UI Preferences
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search Filters
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);

  // Jarvis AI States
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisResponse, setJarvisResponse] = useState<string | null>(null);
  const [jarvisSources, setJarvisSources] = useState<any[]>([]);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string, sources?: any[]}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');

  // Chat States
  const [personalChats, setPersonalChats] = useState<Record<string, ChatMessage[]>>({}); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [broadcastMessages, setBroadcastMessages] = useState<Record<string, ChatMessage[]>>({}); 
  const [chatInput, setChatInput] = useState('');

  // Modals
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '' });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' });

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Mock Data
  useEffect(() => {
    const targetUniv = "جامعة ابن خلدون ملحقة قصر الشلالة";
    const targetFaculty = "كلية العلوم الاقتصادية";

    const mockProfs: User[] = [
      { id: 'p5', firstName: 'بختة', lastName: 'بن الطاهر', specialty: 'الاقتصاد الجزئي', email: 'bentahar@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 1250, avatar: '', isApproved: true, studentCount: 120, paymentMethod: 'bentahar.ccp@algeriepost.dz' },
      { id: 'p6', firstName: 'الأستاذ', lastName: 'ايت عيسى', specialty: 'الاقتصاد الكلي', email: 'aitissa@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 850, avatar: '', isApproved: true, studentCount: 105 },
    ];

    const mockStudent: User = { 
      id: 's1', 
      firstName: 'ربيع', 
      lastName: 'حمر العين', 
      email: 'rabieriri665@gmail.com', 
      role: 'student', 
      walletBalance: 2500, 
      avatar: '', 
      isApproved: true, 
      phoneNumber: '0781723461' 
    };

    setUsers([...mockProfs, mockStudent]);
    setChannels([
      { id: 'c_b1', professorId: 'p5', name: 'الاقتصاد الجزئي', description: 'أساسيات الاقتصاد الجزئي للسنة الأولى.', price: 200, subscribers: [], content: [] },
      { id: 'c_a1', professorId: 'p6', name: 'الاقتصاد الكلي', description: 'تحليل المتغيرات الكلية.', price: 150, subscribers: [], content: [] }
    ]);
  }, []);

  // UI Updates Effects
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [personalChats, broadcastMessages, jarvisChat, activeChatUserId, channelTab, activeTab]);

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const handleRegister = (role: UserRole, data: any) => {
    const newUser: User = {
      id: 'u' + Date.now(),
      ...data,
      role,
      walletBalance: role === 'student' ? 500 : 0,
      avatar: '', 
      isApproved: role === 'student'
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    if (role === 'student') setView('dashboard');
    else alert(t('تم إرسال طلبك للإدارة، سيتم تفعيل حسابك قريباً.', 'Registration sent for approval.'));
  };

  const updateProfile = (data: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    alert(t('تم تحديث ملفك بنجاح!', 'Profile updated successfully!'));
  };

  const subscribe = (chanId: string) => {
    if (!currentUser) return;
    const chan = channels.find(c => c.id === chanId);
    if (!chan) return;
    
    if (currentUser.walletBalance < chan.price) {
      alert(t('رصيدك لا يكفي! قم بالشحن أولاً.', 'Insufficient balance! Please recharge.'));
      return;
    }

    const professorEarnings = chan.price * (1 - APP_COMMISSION); 
    const updatedStudent = { ...currentUser, walletBalance: currentUser.walletBalance - chan.price };
    
    setCurrentUser(updatedStudent);
    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) return updatedStudent;
      if (u.id === chan.professorId) return { ...u, walletBalance: u.walletBalance + professorEarnings, studentCount: (u.studentCount || 0) + 1 };
      return u;
    }));
    setChannels(prev => prev.map(c => c.id === chanId ? { ...c, subscribers: [...c.subscribers, currentUser.id] } : c));
    alert(t('مبروك! تم الاشتراك في القناة.', 'Subscription successful!'));
  };

  const handlePhoneRecharge = () => {
    const amount = prompt(t("مبلغ الشحن (دج):", "Amount (DZD):"), "500");
    if (amount && !isNaN(Number(amount)) && currentUser) {
      const confirmed = confirm(t(`سيتم خصم ${amount} دج من رصيدك الهاتفي، هل توافق؟`, `Deduct ${amount} DZD from your phone?`));
      if (confirmed) {
        const updated = { ...currentUser, walletBalance: currentUser.walletBalance + Number(amount) };
        setCurrentUser(updated);
        setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
        alert(t('تم الشحن بنجاح!', 'Recharged successfully!'));
      }
    }
  };

  const startVideoCall = () => {
    const meetId = Math.random().toString(36).substring(7);
    const url = `https://meet.google.com/new?way-call=${meetId}`;
    window.open(url, '_blank');
  };

  const getChatKey = (id1: string, id2: string) => [id1, id2].sort().join('_');

  const handleSendPersonal = () => {
    if (!chatInput.trim() || !currentUser || !activeChatUserId) return;
    const key = getChatKey(currentUser.id, activeChatUserId);
    const msg: ChatMessage = { id: Date.now().toString(), senderId: currentUser.id, senderName: currentUser.firstName, text: chatInput, timestamp: new Date() };
    setPersonalChats(prev => ({ ...prev, [key]: [...(prev[key] || []), msg] }));
    setChatInput('');
  };

  const handleSendBroadcast = () => {
    if (!chatInput.trim() || !currentUser || !selectedChannel) return;
    const msg: ChatMessage = { id: Date.now().toString(), senderId: currentUser.id, senderName: `${currentUser.firstName} ${currentUser.lastName}`, text: chatInput, timestamp: new Date() };
    setBroadcastMessages(prev => ({ ...prev, [selectedChannel.id]: [...(prev[selectedChannel.id] || []), msg] }));
    setChatInput('');
  };

  const handleCreateChannel = () => {
    if (!newChannelData.name.trim() || !currentUser) return;
    const newChan: Channel = {
      id: 'c' + Date.now(),
      professorId: currentUser.id,
      name: newChannelData.name,
      description: newChannelData.description,
      price: 200, 
      subscribers: [],
      content: []
    };
    setChannels(prev => [...prev, newChan]);
    setNewChannelData({ name: '', description: '' });
    setShowCreateChannel(false);
  };

  const handleAddContent = () => {
    if (!newContentData.title.trim() || !selectedChannel) return;
    const newItem: ContentItem = {
      id: 'i' + Date.now(),
      type: newContentData.type as 'pdf' | 'video' | 'image' | 'text',
      title: newContentData.title,
      url: '#', 
      createdAt: new Date()
    };
    const updatedChannels = channels.map(c => c.id === selectedChannel.id ? { ...c, content: [...c.content, newItem] } : c);
    setChannels(updatedChannels);
    setSelectedChannel(updatedChannels.find(c => c.id === selectedChannel.id) || null);
    setNewContentData({ title: '', type: 'pdf' });
    setShowAddContent(false);
  };

  const renderModal = (title: string, body: React.ReactNode, onConfirm: () => void, onClose: () => void) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in zoom-in duration-300">
        <h3 className="text-2xl md:text-3xl font-black text-emerald-900 dark:text-emerald-400 text-center">{title}</h3>
        {body}
        <div className="flex gap-4 pt-4">
          <button onClick={onConfirm} className="flex-1 bg-emerald-600 text-white py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl shadow-xl active:scale-95 transition">{t('حفظ', 'Save')}</button>
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-500 py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl">{t('إلغاء', 'Cancel')}</button>
        </div>
      </div>
    </div>
  );

  const handleJarvisChat = async () => {
    if (!jarvisInput.trim()) return;
    const userMsg = jarvisInput;
    setJarvisInput('');
    setJarvisChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsJarvisThinking(true);
    const { text, sources } = await jarvisAsk(userMsg);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: text || '', sources: sources || [] }]);
    setIsJarvisThinking(false);
  };

  const handleJarvisSummarize = async (item: ContentItem) => {
    setJarvisResponse(null);
    setJarvisSources([]);
    setIsJarvisThinking(true);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisResponse(summary || "Error");
    setIsJarvisThinking(false);
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-green-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="animate-float mb-12">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-2">WAY</h1>
          <p className="text-xl md:text-2xl font-light opacity-80">{t('جامعتك الرقمية أينما كنت', 'Your digital university everywhere')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button onClick={() => setView('register-prof')} className="bg-white text-emerald-900 p-6 md:p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl font-black text-xl md:text-2xl">{t('أنا أستاذ', "I'm a Professor")}</button>
          <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white p-6 md:p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl border-2 border-emerald-400 font-black text-xl md:text-2xl">{t('أنا طالب', "I'm a Student")}</button>
        </div>
        <div className="mt-12 flex flex-col md:flex-row gap-4">
          <button onClick={() => { 
            const rabie = users.find(u => u.email === 'rabieriri665@gmail.com');
            setCurrentUser(rabie || null); 
            setView('dashboard'); 
          }} className="text-emerald-200 opacity-70 hover:opacity-100 transition text-sm underline font-bold">{t('دخول سريع: حمر العين ربيع', 'Quick Login: Rabie Hamr El Ain')}</button>
          <button onClick={() => { setCurrentUser(users.find(u => u.role === 'professor') || null); setView('dashboard'); }} className="text-emerald-200 opacity-70 hover:opacity-100 transition text-sm underline font-bold">{t('دخول سريع (أستاذ)', 'Quick Professor Login')}</button>
        </div>
      </div>
    );
  }

  if (view === 'register-student' || view === 'register-prof') {
    const isProf = view === 'register-prof';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 md:p-6 text-right">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] md:rounded-[3rem] shadow-2xl p-8 md:p-12 space-y-8 animate-in slide-in-from-top-12 duration-500">
          <h2 className="text-3xl md:text-4xl font-black text-emerald-900 dark:text-emerald-400 text-center">{t(`حساب ${isProf ? 'أستاذ' : 'طالب'} جديد`, `New ${isProf ? 'Prof' : 'Student'}`)}</h2>
          <form className="space-y-4" onSubmit={(e: any) => {
            e.preventDefault();
            handleRegister(isProf ? 'professor' : 'student', {
              firstName: e.target.fname.value,
              lastName: e.target.lname.value,
              email: e.target.email.value,
              university: isProf ? e.target.univ.value : '',
              faculty: isProf ? e.target.fac.value : '',
              specialty: isProf ? e.target.spec.value : ''
            });
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="fname" placeholder={t("الاسم", "Name")} required className="bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 transition" />
              <input name="lname" placeholder={t("اللقب", "Surname")} required className="bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 transition" />
            </div>
            <input name="email" type="email" placeholder={t("البريد", "Email")} required className="w-full bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 transition" />
            {isProf && (
              <>
                <select name="univ" className="w-full bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-2xl dark:text-white border dark:border-gray-700">
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select name="fac" className="w-full bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-2xl dark:text-white border dark:border-gray-700">
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input name="spec" placeholder={t("التخصص", "Specialty")} required className="w-full bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 transition" />
              </>
            )}
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 md:py-6 rounded-2xl font-black text-xl md:text-2xl shadow-xl hover:bg-emerald-700 transition active:scale-95">{t("بدء الاستخدام", "Get Started")}</button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 font-bold hover:text-gray-600 transition">{t("رجوع", "Back")}</button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'dashboard' && currentUser) {
    const isProf = currentUser.role === 'professor';
    
    const studentTabs = [
      {id:'home', l:t('الرئيسية', 'Home'), i: '🏠'},
      {id:'my-channels', l:t('قنواتي', 'My Channels'), i: '📡'},
      {id:'messages', l:t('الدردشة', 'Chat'), i: '💬'}, 
      {id:'wallet', l:t('المحفظة', 'Wallet'), i: '💰'},
      {id:'profile', l:t('الملف الشخصي', 'Profile'), i: '👤'}
    ];

    const profTabs = [
      {id:'home', l:t('الرئيسية', 'Home'), i: '🏠'},
      {id:'messages', l:t('الدردشة', 'Chat'), i: '💬'}, 
      {id:'wallet', l:t('المحفظة', 'Wallet'), i: '💰'},
      {id:'profile', l:t('الملف الشخصي', 'Profile'), i: '👤'}
    ];

    const currentTabs = isProf ? profTabs : studentTabs;

    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right animate-in fade-in duration-700">
        {showCreateChannel && renderModal(t("مادة جديدة", "New Course"), (
          <div className="space-y-4">
            <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder={t("اسم المادة (مثلاً: اقتصاد جزئي)", "Name")} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none"/>
            <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder={t("وصف بسيط للطلاب", "Description")} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white h-32 border dark:border-gray-700 outline-none"/>
          </div>
        ), handleCreateChannel, () => setShowCreateChannel(false))}

        <div className="md:hidden bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex items-center justify-between sticky top-0 z-[60] shadow-sm">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-emerald-600 text-2xl">☰</button>
           <h2 className="text-2xl font-black text-emerald-900 dark:text-emerald-400 tracking-tighter">WAY</h2>
           <div className="w-8"></div>
        </div>

        <aside className={`${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} fixed md:static inset-y-0 right-0 w-80 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-10 flex flex-col gap-8 shadow-xl z-50 transition-transform duration-300`}>
          <div className="flex items-center justify-between md:justify-center">
            <h2 className="text-4xl font-black text-emerald-900 dark:text-emerald-400 text-center tracking-tighter">WAY</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400">✕</button>
          </div>
          <nav className="flex flex-col gap-4">
            {currentTabs.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setIsSidebarOpen(false); }} className={`p-5 rounded-3xl font-black text-right transition flex items-center gap-4 ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <span className="text-xl">{tab.i}</span>
                {tab.l}
              </button>
            ))}
          </nav>
          <div className="mt-auto p-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-[3rem] flex flex-col items-center gap-4 text-center">
             <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="md" />
             <div className="space-y-1">
                <p className="font-black text-emerald-900 dark:text-emerald-100 text-xl">{currentUser.firstName}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter opacity-70">{isProf ? t('أستاذ معتمد', 'Certified Prof') : t('طالب مجتهد', 'Student')}</p>
             </div>
             <button onClick={() => setView('landing')} className="text-red-500 text-xs font-black hover:underline">{t('خروج', 'Logout')}</button>
          </div>
        </aside>

        {isSidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-[40]" onClick={() => setIsSidebarOpen(false)}></div>}

        <main className="flex-1 p-4 md:p-12 overflow-y-auto transition-colors duration-300">
          {activeTab === 'home' && (
            <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-700">
              {!isProf ? (
                <>
                  <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight">{t(`أهلاً بك، ${currentUser.firstName} ✨`, `Welcome, ${currentUser.firstName} ✨`)}</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 bg-white dark:bg-gray-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border dark:border-gray-800 shadow-sm">
                    <div className="space-y-3">
                       <label className="text-sm font-black dark:text-emerald-400 mr-2">{t('الجامعة', 'University')}</label>
                       <select value={filterUniv} onChange={e => {setFilterUniv(e.target.value); setSelectedProfId(null);}} className="w-full bg-gray-50 dark:bg-gray-800 p-4 md:p-6 rounded-3xl dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 transition">
                          <option value="">{t('اختر جامعتك...', 'Select University...')}</option>
                          {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-sm font-black dark:text-emerald-400 mr-2">{t('الكلية', 'Faculty')}</label>
                       <select value={filterFaculty} onChange={e => {setFilterFaculty(e.target.value); setSelectedProfId(null);}} className="w-full bg-gray-50 dark:bg-gray-800 p-4 md:p-6 rounded-3xl dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 transition">
                          <option value="">{t('اختر الكلية...', 'Select Faculty...')}</option>
                          {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                       </select>
                    </div>
                  </div>

                  {filterUniv && filterFaculty && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                      {users.filter(u => u.role === 'professor' && u.university === filterUniv && u.faculty === filterFaculty).map(prof => (
                        <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border dark:border-gray-800 shadow-sm text-center group hover:shadow-2xl transition duration-500 transform hover:-translate-y-2 relative overflow-hidden">
                          <div className="absolute top-4 left-6 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                             <span>👤</span> {prof.studentCount || 0}
                          </div>
                          <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="lg" />
                          <h4 className="font-black text-xl md:text-2xl text-gray-800 dark:text-white mt-8 group-hover:text-emerald-600 transition">{prof.firstName} {prof.lastName}</h4>
                          <p className="text-emerald-600 font-bold text-sm mt-1">{prof.specialty}</p>
                          <div className="flex gap-4 mt-8 md:mt-10">
                            <button onClick={() => setSelectedProfId(prof.id)} className="flex-1 bg-emerald-600 text-white py-3 md:py-4 rounded-2xl font-black shadow-lg active:scale-95 transition hover:bg-emerald-700">{t('المواد', 'Courses')}</button>
                            <button onClick={() => { setActiveChatUserId(prof.id); setActiveTab('messages'); }} className="p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition">💬</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedProfId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mt-8 md:mt-12 animate-in slide-in-from-bottom-12">
                      {channels.filter(c => c.professorId === selectedProfId).map(channel => {
                        const isSub = channel.subscribers.includes(currentUser.id);
                        return (
                          <div key={channel.id} className="bg-white dark:bg-gray-900 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 border dark:border-gray-800 shadow-sm relative group overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="flex justify-between items-start relative z-10 mb-8">
                               <h4 className="font-black text-2xl md:text-3xl text-emerald-900 dark:text-emerald-400">{channel.name}</h4>
                               <div className="bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full text-[10px] font-black text-gray-500 flex items-center gap-2">
                                  <span>👥</span> {channel.subscribers.length} {t('طالب', 'Students')}
                               </div>
                            </div>
                            <button onClick={() => isSub ? (setSelectedChannel(channel), setView('channel-view')) : subscribe(channel.id)} className={`w-full py-5 md:py-6 rounded-3xl font-black shadow-xl transition active:scale-95 text-lg md:text-xl relative z-10 ${isSub ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 hover:bg-emerald-100'}`}>
                              {isSub ? t('دخول المحاضرة', 'Enter') : `${t('اشتراك الآن', 'Subscribe')} (${channel.price} دج)`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-12">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <button onClick={() => setShowCreateChannel(true)} className="w-full md:w-auto bg-emerald-600 text-white px-12 py-5 rounded-3xl font-black shadow-2xl active:scale-95 transition text-xl hover:bg-emerald-700">{t('إنشاء مادة جديدة +', 'New Course +')}</button>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">{t('قائمة موادك التعليمية', 'My Courses')}</h1>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {channels.filter(c => c.professorId === currentUser.id).map(channel => (
                      <div key={channel.id} className="bg-white dark:bg-gray-900 rounded-[2.5rem] md:rounded-[3.5rem] p-10 md:p-12 border dark:border-gray-800 shadow-sm hover:shadow-xl transition transform hover:scale-[1.02] relative overflow-hidden">
                         <div className="absolute top-4 left-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black">
                            👥 {channel.subscribers.length}
                         </div>
                         <h4 className="font-black text-2xl md:text-3xl text-emerald-900 dark:text-emerald-400 mb-8 mt-4">{channel.name}</h4>
                         <button onClick={() => { setSelectedChannel(channel); setView('channel-view'); }} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-emerald-700">{t('إدارة الدروس', 'Manage')}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'my-channels' && (
            <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-700">
               <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight">{t('القنوات المشترك فيها 📡', 'My Subscribed Channels 📡')}</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  {channels.filter(c => c.subscribers.includes(currentUser.id)).length > 0 ? (
                    channels.filter(c => c.subscribers.includes(currentUser.id)).map(channel => {
                      const prof = users.find(u => u.id === channel.professorId);
                      return (
                        <div key={channel.id} className="bg-white dark:bg-gray-900 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 border dark:border-gray-800 shadow-sm relative group overflow-hidden hover:shadow-2xl transition duration-500">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                           <div className="flex justify-between items-start mb-6 relative z-10">
                              <div>
                                 <h4 className="font-black text-2xl md:text-3xl text-emerald-900 dark:text-emerald-400">{channel.name}</h4>
                                 <p className="text-emerald-600 font-bold text-xs mt-1">{t('الأستاذ:', 'Prof:') || 'Prof:'} {prof?.firstName} {prof?.lastName}</p>
                              </div>
                              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{t('مشترك', 'Subscribed')}</span>
                           </div>
                           <p className="text-gray-500 dark:text-gray-400 font-bold mb-8 line-clamp-2 relative z-10">{channel.description || t('لا يوجد وصف متاح.', 'No description available.')}</p>
                           <button onClick={() => { setSelectedChannel(channel); setView('channel-view'); }} className="w-full bg-emerald-600 text-white py-5 md:py-6 rounded-3xl font-black shadow-xl transition active:scale-95 text-lg md:text-xl hover:bg-emerald-700 relative z-10">
                              {t('دخول القناة', 'Enter Channel')}
                           </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-32 text-center text-gray-200 dark:text-gray-800 opacity-30 italic font-black text-2xl md:text-4xl">
                       {t('لم تشترك في أي قناة بعد، ابحث عن أستاذك وابدأ التعلم!', 'You haven\'t subscribed to any channels yet.')}
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="max-w-6xl mx-auto h-[80vh] flex flex-col md:flex-row bg-white dark:bg-gray-900 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border dark:border-gray-800 overflow-hidden animate-in fade-in duration-700">
               <div className={`w-full md:w-80 border-l dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 flex flex-col ${activeChatUserId ? 'hidden md:flex' : 'flex'}`}>
                  <div className="p-6 md:p-8 border-b dark:border-gray-800 font-black text-xl md:text-2xl text-emerald-900 dark:text-emerald-400">{t('المحادثات', 'Messages')}</div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {users.filter(u => u.id !== currentUser.id).map(user => (
                       <button key={user.id} onClick={() => setActiveChatUserId(user.id)} className={`w-full flex items-center gap-4 p-4 md:p-5 rounded-[2rem] transition group ${activeChatUserId === user.id ? 'bg-emerald-600 text-white shadow-xl' : 'hover:bg-white dark:hover:bg-gray-800 dark:text-gray-300'}`}>
                          <ProfessorRank avatar={user.avatar} studentCount={user.studentCount || 0} size="sm" />
                          <div className="text-right flex-1 min-w-0">
                             <p className="font-black text-sm truncate">{user.firstName} {user.lastName}</p>
                             <p className={`text-[10px] font-bold uppercase ${activeChatUserId === user.id ? 'text-emerald-200' : 'text-emerald-600 opacity-60'}`}>{user.role === 'professor' ? t('أستاذ', 'Professor') : t('طالب', 'Student')}</p>
                          </div>
                       </button>
                     ))}
                  </div>
               </div>

               <div className={`flex-1 flex flex-col relative bg-white dark:bg-gray-900 ${activeChatUserId ? 'flex' : 'hidden md:flex'}`}>
                  {activeChatUserId ? (
                    <>
                      <div className="p-6 md:p-8 border-b dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between z-10 shadow-sm">
                         <div className="flex items-center gap-4">
                            <button onClick={() => setActiveChatUserId(null)} className="md:hidden p-2 text-emerald-600">◀</button>
                            <ProfessorRank avatar={users.find(u => u.id === activeChatUserId)?.avatar || ''} studentCount={users.find(u => u.id === activeChatUserId)?.studentCount || 0} size="sm" />
                            <div>
                               <p className="font-black text-lg md:text-2xl text-gray-900 dark:text-white truncate max-w-[120px] md:max-w-none">{users.find(u => u.id === activeChatUserId)?.firstName}</p>
                               <span className="text-[10px] text-emerald-500 font-bold">{t('نشط الآن', 'Online')}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <button onClick={startVideoCall} title={t("بدء اتصال مرئي غوغل", "Start Google Meet Call")} className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full hover:scale-110 transition">🎥</button>
                           <button onClick={() => setActiveChatUserId(null)} className="hidden md:block p-3 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">✕</button>
                         </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-6 bg-gray-50/20 dark:bg-gray-950/20 scroll-smooth">
                        {(personalChats[getChatKey(currentUser.id, activeChatUserId)] || []).map(msg => (
                          <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                            <div className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] max-w-[85%] md:max-w-[70%] font-bold text-lg md:text-xl shadow-md ${msg.senderId === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 dark:text-white border dark:border-gray-700 rounded-tl-none'}`}>
                              {msg.text}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-2 px-3 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="p-4 md:p-10 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex flex-col md:flex-row gap-4">
                         <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendPersonal()} placeholder={t("اكتب رسالة محترمة...", "Write a message...")} className="flex-1 bg-gray-50 dark:bg-gray-800 px-6 md:px-10 py-4 md:py-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 text-lg transition" />
                         <button onClick={handleSendPersonal} className="bg-emerald-600 text-white px-10 py-4 md:py-5 rounded-2xl font-black shadow-xl active:scale-95 transition text-lg hover:bg-emerald-700">{t('إرسال', 'Send')}</button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-200 dark:text-gray-800 gap-8">
                       <span className="text-[6rem] md:text-[10rem] animate-pulse">💬</span>
                       <p className="font-black text-xl md:text-3xl text-gray-300 dark:text-gray-700 text-center px-6">{t('ابدأ محادثة تعليمية الآن', 'Select a contact to start chatting')}</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
               <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-16 shadow-xl border dark:border-gray-800 space-y-12 md:space-y-16">
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                     <div className="relative group">
                        <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="lg" />
                        <button onClick={() => { const u = prompt(t("رابط الصورة الشخصية:", "Avatar URL:"), currentUser.avatar); if(u) updateProfile({avatar:u}); }} className="absolute inset-0 bg-black/60 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition duration-300 font-black text-lg">{t('تغيير 📷', 'Edit')}</button>
                     </div>
                     <div className="space-y-2 text-center md:text-right">
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white">{currentUser.firstName} {currentUser.lastName}</h2>
                        <p className="text-emerald-600 font-black text-lg md:text-xl opacity-80">{currentUser.email}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 border-t dark:border-gray-800 pt-12 md:pt-16 text-right">
                    <div className="space-y-8">
                      <h3 className="text-2xl md:text-3xl font-black text-emerald-900 dark:text-emerald-400">{t('تخصيص الواجهة', 'UI Settings')}</h3>
                      <div className="flex items-center justify-between p-6 md:p-8 bg-gray-50 dark:bg-gray-800 rounded-[2rem] border dark:border-gray-700">
                        <span className="font-black text-lg md:text-xl dark:text-white">{t('الوضع الليلي', 'Dark Mode')}</span>
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-14 h-8 md:w-16 md:h-10 rounded-full transition relative ${isDarkMode ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                           <div className={`absolute top-1 w-6 h-6 md:w-8 md:h-8 bg-white rounded-full transition-all ${isDarkMode ? (language === 'ar' ? 'right-7' : 'left-7') : (language === 'ar' ? 'right-1' : 'left-1')}`}></div>
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-6 md:p-8 bg-gray-50 dark:bg-gray-800 rounded-[2rem] border dark:border-gray-700">
                        <span className="font-black text-lg md:text-xl dark:text-white">{t('لغة التطبيق', 'Language')}</span>
                        <select value={language} onChange={e => setLanguage(e.target.value as any)} className="bg-transparent font-black text-lg dark:text-white outline-none cursor-pointer">
                           <option value="ar">العربية (Algeria)</option>
                           <option value="en">English (Global)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <h3 className="text-2xl md:text-3xl font-black text-emerald-900 dark:text-emerald-400">{t('بيانات الاتصال والمال', 'Finance & Contact')}</h3>
                      {isProf ? (
                        <div className="space-y-4">
                           <label className="block font-black dark:text-white text-sm opacity-70 px-2">{t('بريد تحويل الأرباح (Email/CCP)', 'Payout Details')}</label>
                           <input defaultValue={currentUser.paymentMethod} onBlur={(e) => updateProfile({ paymentMethod: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800 p-5 md:p-6 rounded-2xl md:rounded-3xl dark:text-white border dark:border-gray-700 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="example@email.com" />
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <label className="block font-black dark:text-white text-sm opacity-70 px-2">{t('رقم الهاتف لشحن المحفظة', 'Phone for Recharge')}</label>
                           <input defaultValue={currentUser.phoneNumber} onBlur={(e) => updateProfile({ phoneNumber: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800 p-5 md:p-6 rounded-2xl md:rounded-3xl dark:text-white border dark:border-gray-700 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition" placeholder="0661223344" />
                        </div>
                      )}
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'wallet' && (
             <div className="max-w-3xl mx-auto py-8 md:py-12 animate-in slide-in-from-bottom-20 duration-700">
               <div className="bg-gradient-to-br from-emerald-800 to-green-950 p-12 md:p-20 rounded-[3rem] md:rounded-[5rem] text-white shadow-2xl text-center relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
                  <p className="opacity-60 font-black text-xl md:text-2xl mb-6">{t('رصيدك المتاح حالياً', 'Available Balance')}</p>
                  <h2 className="text-6xl md:text-9xl font-black mb-12 tracking-tight">{currentUser.walletBalance.toFixed(0)} <span className="text-2xl md:text-3xl font-light opacity-40">{t('دج', 'DZD')}</span></h2>
                  {!isProf ? (
                    <div className="space-y-6">
                      <button onClick={handlePhoneRecharge} className="w-full bg-white text-emerald-900 py-5 md:py-7 rounded-[2rem] md:rounded-[2.5rem] font-black text-xl md:text-2xl hover:bg-emerald-50 transition shadow-2xl active:scale-95">{t('شحن الرصيد (فليكسي)', 'Recharge Wallet')}</button>
                      <p className="text-xs opacity-50 font-bold">{t('يتم خصم المبلغ من رصيد رقمك المسجل في الملف الشخصي.', 'Amount is deducted from your registered mobile credit.')}</p>
                    </div>
                  ) : (
                    <div className="bg-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/20 text-md md:text-lg leading-relaxed font-bold">
                      {t('أرباحك تحول تلقائياً كل يوم خميس إلى بريدك:', 'Profits are sent every Thursday to:')}
                      <div className="mt-2 text-emerald-300 underline font-black">{currentUser.paymentMethod || t('لم يحدد بعد', 'Not specified')}</div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (view === 'channel-view' && selectedChannel && currentUser) {
    const isProf = selectedChannel.professorId === currentUser.id;
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-right">
        {showAddContent && renderModal(t("إضافة مادة علمية", "Add Content"), (
          <div className="space-y-4">
            <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder={t("عنوان الدرس (مثلاً: المحاضرة الأولى)", "Title")} className="w-full bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl dark:text-white border dark:border-gray-700 outline-none font-bold focus:ring-2 focus:ring-emerald-500 transition"/>
            <select value={newContentData.type} onChange={e => setNewContentData({...newContentData, type: e.target.value as any})} className="w-full bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl dark:text-white border dark:border-gray-700 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition">
              <option value="pdf">📄 ملف PDF / درس</option>
              <option value="video">🎥 فيديو توضيحي</option>
            </select>
          </div>
        ), handleAddContent, () => setShowAddContent(false))}

        <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 md:p-8 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 shadow-sm gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 md:p-2 rounded-[1.5rem] md:rounded-[2rem] border dark:border-gray-700 overflow-x-auto w-full md:w-auto">
            {[ {id:'pdf', l:t('الدروس', 'Lessons'), i:'📄'}, {id:'broadcast', l:t('الإعلانات', 'News'), i:'📢'}, {id:'jarvis', l:'Jarvis AI', i:'✨'} ].map(tab => (
              <button key={tab.id} onClick={() => setChannelTab(tab.id as any)} className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-4 rounded-[1.2rem] md:rounded-[1.5rem] text-[10px] md:text-sm font-black transition flex items-center justify-center gap-2 md:gap-3 whitespace-nowrap ${channelTab === tab.id ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-500 dark:text-gray-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-gray-700'}`}>
                <span>{tab.i}</span>
                {tab.l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-6 justify-between w-full md:w-auto">
            <h2 className="font-black text-xl md:text-3xl text-emerald-900 dark:text-emerald-400 truncate max-w-[200px]">{selectedChannel.name}</h2>
            <button onClick={() => setView('dashboard')} className="p-3 md:p-4 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">✕</button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-12 overflow-y-auto">
          {channelTab === 'pdf' && (
            <div className="max-w-5xl mx-auto space-y-8 md:space-y-10 animate-in fade-in duration-500">
              {isProf && <button onClick={() => setShowAddContent(true)} className="w-full bg-white dark:bg-gray-900 border-4 md:border-8 border-dashed border-emerald-500/10 dark:border-emerald-500/5 p-8 md:p-16 rounded-[2.5rem] md:rounded-[4.5rem] text-emerald-600 font-black text-xl md:text-3xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition shadow-sm group">
                <span className="block mb-2 group-hover:scale-125 transition-transform text-4xl">➕</span>
                {t('رفع درس جديد للطلاب', 'Add Lesson +')}
              </button>}
              <div className="grid grid-cols-1 gap-4 md:gap-6">
                {selectedChannel.content.length > 0 ? selectedChannel.content.map(item => (
                  <div key={item.id} className="bg-white dark:bg-gray-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 group hover:shadow-2xl transition duration-500">
                    <button onClick={() => { setChannelTab('jarvis'); handleJarvisSummarize(item); }} className="w-full md:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition shadow-lg flex items-center justify-center gap-3 hover:bg-emerald-700 order-2 md:order-1">
                       <span>✨</span>
                       {t('لخص مع جارفيس', 'Summarize')}
                    </button>
                    <div className="flex items-center gap-6 md:gap-8 order-1 md:order-2 w-full md:w-auto justify-end">
                       <div className="text-right">
                          <p className="font-black text-lg md:text-2xl text-gray-800 dark:text-white">{item.title}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString()}</p>
                       </div>
                       <div className="p-4 md:p-6 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl md:rounded-3xl text-2xl md:text-3xl text-emerald-600 shadow-sm">
                          {item.type === 'pdf' ? '📄' : '🎥'}
                       </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-32 text-gray-200 dark:text-gray-800 font-black text-2xl md:text-4xl opacity-30 italic">{t('لا يوجد محتوى دراسي حتى الآن', 'No lessons yet')}</div>
                )}
              </div>
            </div>
          )}

          {channelTab === 'broadcast' && (
            <div className="max-w-4xl mx-auto h-[70vh] flex flex-col bg-white dark:bg-gray-900 rounded-[2.5rem] md:rounded-[4rem] border dark:border-gray-800 overflow-hidden shadow-2xl animate-in zoom-in duration-700">
               <div className="bg-emerald-600 text-white p-6 md:p-8 text-center font-black text-lg md:text-2xl shadow-xl z-10 flex items-center justify-center gap-4">
                  <span>📢</span>
                  {t('قناة التنبيهات الرسمية للمادة', 'Announcements Channel')}
               </div>
               <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-6 md:space-y-8 bg-gray-50/20 dark:bg-gray-950/20 scroll-smooth">
                  {(broadcastMessages[selectedChannel.id] || []).length > 0 ? (broadcastMessages[selectedChannel.id] || []).map(msg => (
                    <div key={msg.id} className="bg-white dark:bg-gray-800 border-r-[8px] md:border-r-[12px] border-emerald-500 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-md transform hover:scale-[1.01] transition duration-300">
                       <div className="flex justify-between items-center mb-6">
                          <span className="text-[10px] text-gray-400 font-black opacity-80">{new Date(msg.timestamp).toLocaleString('ar-DZ')}</span>
                          <div className="flex items-center gap-2">
                             <p className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] md:text-xs uppercase">{msg.senderName}</p>
                             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                          </div>
                       </div>
                       <p className="font-bold text-lg md:text-2xl text-gray-800 dark:text-gray-100 leading-relaxed">{msg.text}</p>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-200 dark:text-gray-800 gap-8 opacity-40">
                       <span className="text-[8rem] md:text-[12rem]">📢</span>
                       <p className="font-black text-2xl md:text-3xl">{t('قائمة الإعلانات فارغة', 'No updates yet')}</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
               </div>
               {isProf ? (
                 <div className="p-6 md:p-10 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex flex-col md:flex-row gap-4 md:gap-6 shadow-inner">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendBroadcast()} placeholder={t("أعلن عن موعد امتحان، تغيير قاعة، إلخ...", "Write an announcement...")} className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl md:rounded-3xl px-6 md:px-12 py-4 md:py-5 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none text-lg md:text-xl font-bold transition shadow-sm" />
                    <button onClick={handleSendBroadcast} className="bg-emerald-600 text-white px-12 py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-lg md:text-2xl shadow-2xl active:scale-95 transition hover:bg-emerald-700">{t('نشر الآن', 'Post')}</button>
                 </div>
               ) : (
                 <div className="p-6 md:p-8 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 text-center font-black border-t dark:border-gray-800 text-md md:text-lg">
                    {t('الأستاذ وحده مخول بنشر الإعلانات الرسمية هنا.', 'View-only mode. Only professors can post.')}
                 </div>
               )}
            </div>
          )}

          {channelTab === 'jarvis' && (
            <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-500">
               <div className="bg-emerald-900 p-10 md:p-20 rounded-[3rem] md:rounded-[5rem] text-white shadow-2xl text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-40 h-40 md:w-80 md:h-80 bg-emerald-500/5 rounded-full -ml-20 md:-ml-40 -mt-20 md:-mt-40 animate-pulse"></div>
                  <h3 className="text-4xl md:text-7xl font-black mb-4 md:mb-6 tracking-tighter italic">Jarvis AI</h3>
                  <p className="opacity-70 text-lg md:text-2xl font-bold">{t('مساعدك الأكاديمي للبحث والتوثيق.', 'Your academic research assistant.')}</p>
                  <div className="mt-4 text-emerald-300 font-bold text-sm bg-emerald-500/20 inline-block px-4 py-1 rounded-full">{t('نظام استخراج مراجع: ASJP & Google Scholar', 'References: ASJP & Google Scholar')}</div>
               </div>
               
               {isJarvisThinking && <div className="text-center text-emerald-700 dark:text-emerald-400 font-black animate-pulse text-xl md:text-3xl py-12 flex items-center justify-center gap-4 md:gap-6">
                  <div className="w-3 h-3 md:w-5 md:h-5 bg-emerald-600 rounded-full animate-bounce shadow-lg"></div>
                  <div className="w-3 h-3 md:w-5 md:h-5 bg-emerald-600 rounded-full animate-bounce delay-150 shadow-lg"></div>
                  <div className="w-3 h-3 md:w-5 md:h-5 bg-emerald-600 rounded-full animate-bounce delay-300 shadow-lg"></div>
                  {t('جارفيس يراجع المصادر الأكاديمية المعتمدة...', 'Jarvis is reviewing verified academic sources...')}
               </div>}

               {(jarvisResponse || jarvisChat.some(m => m.role === 'jarvis')) && (
                 <div className="bg-white dark:bg-gray-900 p-8 md:p-16 rounded-[2.5rem] md:rounded-[4.5rem] border-t-[10px] md:border-t-[20px] border-emerald-600 shadow-2xl text-right animate-in slide-in-from-top-12 duration-700 space-y-12">
                    
                    <div className="space-y-10">
                      {jarvisResponse && (
                        <div className="p-8 md:p-10 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-[2rem] border dark:border-gray-700 whitespace-pre-line leading-relaxed text-lg md:text-2xl font-medium">
                           {jarvisResponse}
                        </div>
                      )}

                      {jarvisChat.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-4`}>
                           <div className={`p-6 md:p-8 rounded-[2rem] md:rounded-[3.5rem] max-w-[95%] md:max-w-[85%] text-lg md:text-2xl font-medium shadow-lg relative whitespace-pre-line leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border dark:border-gray-700'}`}>
                              {msg.text}
                           </div>
                           
                           {msg.role === 'jarvis' && msg.sources && msg.sources.length > 0 && (
                             <div className="w-full bg-emerald-50 dark:bg-emerald-950/30 p-6 rounded-3xl mt-4 space-y-4">
                               <p className="font-black text-emerald-800 dark:text-emerald-400 text-sm flex items-center gap-2">📑 {t('المراجع الأكاديمية المستخرجة:', 'Extracted Academic References:')}</p>
                               <div className="flex flex-wrap gap-3">
                                 {msg.sources.map((src: any, idx: number) => (
                                   <a key={idx} href={src.web?.uri || src.maps?.uri} target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-gray-800 px-4 py-2 rounded-xl text-xs font-bold text-emerald-600 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-500 hover:text-white transition shadow-sm truncate max-w-[200px]">
                                     🔗 {src.web?.title || t('رابط المرجع', 'Reference Link')}
                                   </a>
                                 ))}
                               </div>
                             </div>
                           )}
                        </div>
                      ))}
                    </div>

                    <div ref={chatEndRef} />
                 </div>
               )}

               <div className="space-y-8 sticky bottom-4">
                  <div className="flex gap-4 md:gap-6 items-center">
                     <button onClick={handleJarvisChat} className="bg-emerald-600 text-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl text-3xl md:text-5xl active:scale-90 transition transform hover:rotate-12 hover:bg-emerald-700">🚀</button>
                     <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleJarvisChat()} placeholder={t("استخرج مراجع، لخص نصاً، أو ابحث في المصادر الجامعية...", "Extract references, summarize text, or search university sources...")} className="flex-1 bg-white dark:bg-gray-900 border-4 border-transparent focus:border-emerald-500 rounded-[2rem] md:rounded-[3rem] px-8 md:px-12 py-6 md:py-10 font-bold text-lg md:text-2xl outline-none text-right dark:text-white shadow-2xl transition" />
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
};

export default App;
