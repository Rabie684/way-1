
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
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'messages' | 'profile'>('home');
  
  // UI Preferences
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');

  // Search Filters
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);

  // Jarvis AI States
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisResponse, setJarvisResponse] = useState<string | null>(null);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string}[]>([]);
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
      { id: 'p5', firstName: 'بختة', lastName: 'بن الطاهر', specialty: 'الاقتصاد الجزئي', email: 'bentahar@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 1250, avatar: 'https://i.pravatar.cc/150?u=p5', isApproved: true, studentCount: 120, paymentMethod: 'bentahar.ccp@algeriepost.dz' },
      { id: 'p6', firstName: 'الأستاذ', lastName: 'ايت عيسى', specialty: 'الاقتصاد الكلي', email: 'aitissa@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 850, avatar: 'https://i.pravatar.cc/150?u=p6', isApproved: true, studentCount: 105 },
    ];

    const mockStudent: User = { id: 's1', firstName: 'أمين', lastName: 'دزيري', email: 'student@mail.dz', role: 'student', walletBalance: 2500, avatar: 'https://i.pravatar.cc/150?u=stud1', isApproved: true, phoneNumber: '0661223344' };

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

  // Handle Chat Auto-Scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [personalChats, broadcastMessages, jarvisChat, activeChatUserId, channelTab]);

  // Translation Helper
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  // Actions
  const handleRegister = (role: UserRole, data: any) => {
    const newUser: User = {
      id: 'u' + Date.now(),
      ...data,
      role,
      walletBalance: role === 'student' ? 500 : 0,
      avatar: `https://i.pravatar.cc/150?u=${data.email}`,
      isApproved: role === 'student'
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    if (role === 'student') setView('dashboard');
    else alert(t('تم إرسال طلبك للإدارة، سيتم تفعيل حسابك قريباً.', 'Your request has been sent, account activation pending.'));
  };

  const updateProfile = (data: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    alert(t('تم تحديث الملف الشخصي!', 'Profile updated!'));
  };

  const subscribe = (chanId: string) => {
    if (!currentUser) return;
    const chan = channels.find(c => c.id === chanId);
    if (!chan) return;
    
    if (currentUser.walletBalance < chan.price) {
      alert(t('الرصيد غير كافٍ!', 'Insufficient balance!'));
      return;
    }

    const professorEarnings = chan.price * (1 - APP_COMMISSION); 
    const updatedStudent = { ...currentUser, walletBalance: currentUser.walletBalance - chan.price };
    
    setCurrentUser(updatedStudent);
    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) return updatedStudent;
      if (u.id === chan.professorId) return { ...u, walletBalance: u.walletBalance + professorEarnings };
      return u;
    }));
    setChannels(prev => prev.map(c => c.id === chanId ? { ...c, subscribers: [...c.subscribers, currentUser.id] } : c));
    alert(t('تم الاشتراك بنجاح!', 'Subscribed successfully!'));
  };

  const handlePhoneRecharge = () => {
    const amount = prompt(t("أدخل قيمة الشحن (دج):", "Enter recharge amount (DZD):"), "200");
    if (amount && !isNaN(Number(amount)) && currentUser) {
      const confirmed = confirm(t(`تحويل ${amount} دج من رصيدك الهاتفي؟`, `Transfer ${amount} DZD from your phone balance?`));
      if (confirmed) {
        const updated = { ...currentUser, walletBalance: currentUser.walletBalance + Number(amount) };
        setCurrentUser(updated);
        setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
        alert(t('تم الشحن!', 'Recharged!'));
      }
    }
  };

  // Chat Helpers
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-[3.5rem] p-12 shadow-2xl space-y-8 animate-in fade-in zoom-in duration-300">
        <h3 className="text-3xl font-black text-emerald-900 dark:text-emerald-400 text-center">{title}</h3>
        {body}
        <div className="flex gap-4">
          <button onClick={onConfirm} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl">{t('تأكيد', 'Confirm')}</button>
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-400 py-4 rounded-2xl font-black text-lg">{t('إلغاء', 'Cancel')}</button>
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
    const response = await jarvisAsk(userMsg);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: response || '' }]);
    setIsJarvisThinking(false);
  };

  const handleJarvisSummarize = async (item: ContentItem) => {
    setJarvisResponse(null);
    setIsJarvisThinking(true);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisResponse(summary || "Error");
    setIsJarvisThinking(false);
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-green-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="animate-float mb-12">
          <h1 className="text-9xl font-black tracking-tighter mb-2">WAY</h1>
          <p className="text-2xl font-light opacity-80">{t('جامعتك الرقمية أينما كنت', 'Your digital university everywhere')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button onClick={() => setView('register-prof')} className="bg-white text-emerald-900 p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl font-black text-2xl">{t('أنا أستاذ', "I'm a Professor")}</button>
          <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl border-2 border-emerald-400 font-black text-2xl">{t('أنا طالب', "I'm a Student")}</button>
        </div>
        <div className="mt-12 flex gap-4">
          <button onClick={() => { setCurrentUser(users.find(u => u.role === 'student') || null); setView('dashboard'); }} className="text-emerald-200 opacity-70 hover:opacity-100 transition text-sm underline">{t('دخول سريع كطالب', 'Quick Student Login')}</button>
          <button onClick={() => { setCurrentUser(users.find(u => u.role === 'professor') || null); setView('dashboard'); }} className="text-emerald-200 opacity-70 hover:opacity-100 transition text-sm underline">{t('دخول سريع كأستاذ', 'Quick Professor Login')}</button>
        </div>
      </div>
    );
  }

  if (view === 'register-student' || view === 'register-prof') {
    const isProf = view === 'register-prof';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6 text-right">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[3rem] shadow-2xl p-12 space-y-8">
          <h2 className="text-4xl font-black text-emerald-900 dark:text-emerald-400 text-center">{t(`حساب ${isProf ? 'أستاذ' : 'طالب'} جديد`, `New ${isProf ? 'Prof' : 'Student'}`)}</h2>
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
            <div className="grid grid-cols-2 gap-4">
              <input name="fname" placeholder={t("الاسم", "Name")} required className="bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none focus:border-emerald-500" />
              <input name="lname" placeholder={t("اللقب", "Surname")} required className="bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none focus:border-emerald-500" />
            </div>
            <input name="email" type="email" placeholder={t("البريد", "Email")} required className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none focus:border-emerald-500" />
            {isProf && (
              <>
                <select name="univ" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none">
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select name="fac" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none">
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input name="spec" placeholder={t("التخصص", "Specialty")} required className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none focus:border-emerald-500" />
              </>
            )}
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl">{t("إنشاء الحساب", "Create")}</button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 font-bold">{t("رجوع", "Back")}</button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'dashboard' && currentUser) {
    const isProf = currentUser.role === 'professor';
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right">
        {showCreateChannel && renderModal(t("مادة جديدة", "New Course"), (
          <div className="space-y-4">
            <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder={t("اسم المادة", "Course Name")} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700"/>
            <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder={t("وصف المادة", "Description")} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white h-32 border dark:border-gray-700"/>
          </div>
        ), handleCreateChannel, () => setShowCreateChannel(false))}

        <aside className="w-full md:w-80 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-10 flex flex-col gap-8 shadow-sm">
          <h2 className="text-3xl font-black text-emerald-900 dark:text-emerald-400 text-center">WAY</h2>
          <nav className="flex flex-col gap-3">
            {[ 
              {id:'home', l:t('الرئيسية', 'Home')}, {id:'messages', l:t('الدردشة', 'Chat')}, 
              {id:'wallet', l:t('المحفظة', 'Wallet')}, {id:'profile', l:t('الملف الشخصي', 'Profile')} 
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`p-5 rounded-2xl font-black text-right transition ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{tab.l}</button>
            ))}
          </nav>
          <div className="mt-auto p-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2.5rem] flex flex-col items-center gap-4 text-center">
             <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="md" />
             <p className="font-black text-emerald-900 dark:text-emerald-100 text-xl">{currentUser.firstName}</p>
             <button onClick={() => setView('landing')} className="text-red-500 text-xs font-black hover:underline">{t('تسجيل الخروج', 'Logout')}</button>
          </div>
        </aside>

        <main className="flex-1 p-12 overflow-y-auto transition-colors duration-300">
          {activeTab === 'home' && (
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
              {!isProf ? (
                <>
                  <h1 className="text-5xl font-black text-gray-900 dark:text-white">{t(`أهلاً، ${currentUser.firstName}`, `Hello, ${currentUser.firstName}`)}</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 shadow-sm">
                    <div className="space-y-2">
                       <label className="text-sm font-black dark:text-emerald-400 mr-2">{t('الجامعة', 'University')}</label>
                       <select value={filterUniv} onChange={e => {setFilterUniv(e.target.value); setSelectedProfId(null);}} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none">
                          <option value="">{t('اختر الجامعة...', 'Select...')}</option>
                          {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-black dark:text-emerald-400 mr-2">{t('الكلية', 'Faculty')}</label>
                       <select value={filterFaculty} onChange={e => {setFilterFaculty(e.target.value); setSelectedProfId(null);}} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700 outline-none">
                          <option value="">{t('اختر الكلية...', 'Select...')}</option>
                          {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                       </select>
                    </div>
                  </div>

                  {filterUniv && filterFaculty && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {users.filter(u => u.role === 'professor' && u.university === filterUniv && u.faculty === filterFaculty).map(prof => (
                        <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 shadow-sm text-center group hover:shadow-2xl transition duration-300">
                          <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="lg" />
                          <h4 className="font-black text-2xl text-gray-800 dark:text-white mt-6 group-hover:text-emerald-600 transition">{prof.firstName} {prof.lastName}</h4>
                          <p className="text-emerald-600 font-bold text-sm">{prof.specialty}</p>
                          <div className="flex gap-3 mt-8">
                            <button onClick={() => setSelectedProfId(prof.id)} className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-black shadow-lg active:scale-95 transition">{t('عرض المواد', 'Courses')}</button>
                            <button onClick={() => { setActiveChatUserId(prof.id); setActiveTab('messages'); }} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20">💬</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedProfId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 animate-in slide-in-from-bottom-8">
                      {channels.filter(c => c.professorId === selectedProfId).map(channel => {
                        const isSub = channel.subscribers.includes(currentUser.id);
                        return (
                          <div key={channel.id} className="bg-white dark:bg-gray-900 rounded-[3.5rem] p-10 border dark:border-gray-800 shadow-sm relative overflow-hidden">
                            <h4 className="font-black text-3xl text-emerald-900 dark:text-emerald-400 mb-6">{channel.name}</h4>
                            <button onClick={() => isSub ? (setSelectedChannel(channel), setView('channel-view')) : subscribe(channel.id)} className={`w-full py-5 rounded-3xl font-black shadow-xl transition active:scale-95 ${isSub ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700'}`}>
                              {isSub ? t('دخول القناة', 'Enter Channel') : `${t('اشتراك', 'Subscribe')} (${channel.price} دج)`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-12">
                  <div className="flex justify-between items-center">
                    <button onClick={() => setShowCreateChannel(true)} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black shadow-2xl active:scale-95 transition">{t('إنشاء مادة جديدة +', 'New Course +')}</button>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white">{t('موادك التعليمية', 'Your Courses')}</h1>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {channels.filter(c => c.professorId === currentUser.id).map(channel => (
                      <div key={channel.id} className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border dark:border-gray-800 shadow-sm hover:shadow-xl transition">
                         <h4 className="font-black text-3xl text-emerald-900 dark:text-emerald-400 mb-6">{channel.name}</h4>
                         <button onClick={() => { setSelectedChannel(channel); setView('channel-view'); }} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg">{t('إدارة المحتوى', 'Manage')}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="max-w-6xl mx-auto h-[75vh] flex bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-xl border dark:border-gray-800 overflow-hidden animate-in fade-in">
               {/* Sidebar Contacts */}
               <div className="w-80 border-l dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 flex flex-col">
                  <div className="p-8 border-b dark:border-gray-800 font-black text-emerald-900 dark:text-emerald-400">{t('المحادثات', 'Chats')}</div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                     {users.filter(u => u.id !== currentUser.id).map(user => (
                       <button key={user.id} onClick={() => setActiveChatUserId(user.id)} className={`w-full flex items-center gap-4 p-4 rounded-3xl transition ${activeChatUserId === user.id ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-white dark:hover:bg-gray-800 dark:text-gray-300'}`}>
                          <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-white/20" />
                          <div className="text-right">
                             <p className="font-black text-sm">{user.firstName}</p>
                             <p className="text-[10px] opacity-70">{user.role === 'professor' ? t('أستاذ', 'Professor') : t('طالب', 'Student')}</p>
                          </div>
                       </button>
                     ))}
                  </div>
               </div>

               {/* Chat Main Window */}
               <div className="flex-1 flex flex-col relative bg-white dark:bg-gray-900">
                  {activeChatUserId ? (
                    <>
                      <div className="p-8 border-b dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between z-10">
                         <div className="flex items-center gap-4">
                            <img src={users.find(u => u.id === activeChatUserId)?.avatar} className="w-10 h-10 rounded-full" />
                            <p className="font-black text-xl text-gray-900 dark:text-white">{users.find(u => u.id === activeChatUserId)?.firstName}</p>
                         </div>
                         <button onClick={() => setActiveChatUserId(null)} className="p-2 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">✕</button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-gray-50/20 dark:bg-gray-950/20">
                        {(personalChats[getChatKey(currentUser.id, activeChatUserId)] || []).map(msg => (
                          <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                            <div className={`p-5 rounded-[2rem] max-w-[75%] font-bold text-lg shadow-sm ${msg.senderId === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 dark:text-white border dark:border-gray-700 rounded-tl-none'}`}>
                              {msg.text}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 px-2">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="p-8 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex gap-4">
                         <button onClick={handleSendPersonal} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg active:scale-95 transition">{t('إرسال', 'Send')}</button>
                         <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendPersonal()} placeholder={t("اكتب رسالة...", "Write message...")} className="flex-1 bg-gray-50 dark:bg-gray-800 px-8 py-4 rounded-2xl dark:text-white border dark:border-gray-700 outline-none focus:border-emerald-500" />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 gap-6">
                       <div className="text-9xl animate-pulse">💬</div>
                       <p className="font-black text-2xl">{t('اختر شخصاً لبدء المحادثة', 'Select someone to chat')}</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
               <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] p-12 shadow-sm border dark:border-gray-800 space-y-12">
                  <div className="flex items-center gap-8">
                     <div className="relative group">
                        <img src={currentUser.avatar} className="w-32 h-32 rounded-full border-4 border-emerald-500 shadow-xl" />
                        <button onClick={() => { const u = prompt(t("رابط الصورة:", "URL:"), currentUser.avatar); if(u) updateProfile({avatar:u}); }} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition font-black text-sm">{t('تغيير', 'Edit')}</button>
                     </div>
                     <div>
                        <h2 className="text-4xl font-black text-gray-900 dark:text-white">{currentUser.firstName} {currentUser.lastName}</h2>
                        <p className="text-emerald-600 font-bold">{currentUser.email}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t dark:border-gray-800 pt-12">
                    <div className="space-y-6">
                      <h3 className="text-2xl font-black text-gray-800 dark:text-emerald-400">{t('الإعدادات', 'Settings')}</h3>
                      <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl">
                        <span className="font-bold dark:text-white">{t('الوضع الليلي', 'Dark Mode')}</span>
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-14 h-8 rounded-full transition relative ${isDarkMode ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                           <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isDarkMode ? (language === 'ar' ? 'right-7' : 'left-7') : (language === 'ar' ? 'right-1' : 'left-1')}`}></div>
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl">
                        <span className="font-bold dark:text-white">{t('اللغة', 'Language')}</span>
                        <select value={language} onChange={e => setLanguage(e.target.value as any)} className="bg-transparent font-black dark:text-white outline-none">
                           <option value="ar">العربية</option>
                           <option value="en">English</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-2xl font-black text-gray-800 dark:text-emerald-400">{t('المعلومات المالية', 'Finance Info')}</h3>
                      {isProf ? (
                        <div className="space-y-4">
                           <label className="block font-bold dark:text-white text-sm opacity-70">{t('بريد تحويل الأرباح (Email/CCP)', 'Payout Mail')}</label>
                           <input defaultValue={currentUser.paymentMethod} onBlur={(e) => updateProfile({ paymentMethod: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700" />
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <label className="block font-bold dark:text-white text-sm opacity-70">{t('رقم الهاتف للشحن', 'Phone for Recharge')}</label>
                           <input defaultValue={currentUser.phoneNumber} onBlur={(e) => updateProfile({ phoneNumber: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700" />
                        </div>
                      )}
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'wallet' && (
             <div className="max-w-2xl mx-auto py-12 animate-in slide-in-from-bottom-12 duration-500">
               <div className="bg-gradient-to-br from-emerald-700 to-green-900 p-16 rounded-[4rem] text-white shadow-2xl text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mt-16"></div>
                  <p className="opacity-70 font-black text-xl mb-4">{t('رصيد المحفظة', 'Wallet Balance')}</p>
                  <h2 className="text-8xl font-black mb-8">{currentUser.walletBalance.toFixed(0)} <span className="text-3xl font-light opacity-50">{t('دج', 'DZD')}</span></h2>
                  {!isProf ? (
                    <button onClick={handlePhoneRecharge} className="w-full bg-white text-emerald-800 py-6 rounded-3xl font-black text-xl hover:bg-emerald-50 transition shadow-2xl active:scale-95">{t('شحن عبر رصيد الهاتف', 'Recharge via Phone')}</button>
                  ) : (
                    <div className="bg-white/10 p-8 rounded-3xl border border-white/20 text-sm leading-relaxed">
                      {t('يتم تحويل أرباحك تلقائياً عند وصولها لـ 5000 دج.', 'Your earnings are transferred automatically at 5000 DZD.')}
                      <br/>{t('أنت تتقاضى 70% من قيمة كل اشتراك.', 'You receive 70% of each subscription.')}
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
        {showAddContent && renderModal(t("إضافة درس", "Add Lesson"), (
          <div className="space-y-4">
            <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder={t("عنوان الدرس", "Title")} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700"/>
            <select value={newContentData.type} onChange={e => setNewContentData({...newContentData, type: e.target.value as any})} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl dark:text-white border dark:border-gray-700">
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
            </select>
          </div>
        ), handleAddContent, () => setShowAddContent(false))}

        <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-8 flex items-center justify-between sticky top-0 z-50">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-3xl">
            {[ {id:'pdf', l:t('المكتبة', 'Library')}, {id:'broadcast', l:t('الإعلانات', 'Broadcast')}, {id:'jarvis', l:'Jarvis AI'} ].map(tab => (
              <button key={tab.id} onClick={() => setChannelTab(tab.id as any)} className={`px-10 py-3 rounded-[1.2rem] text-sm font-black transition ${channelTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400'}`}>{tab.l}</button>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <h2 className="font-black text-3xl text-emerald-900 dark:text-emerald-400">{selectedChannel.name}</h2>
            <button onClick={() => setView('dashboard')} className="p-4 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">✕</button>
          </div>
        </header>

        <main className="flex-1 p-12 overflow-y-auto">
          {channelTab === 'pdf' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              {isProf && <button onClick={() => setShowAddContent(true)} className="w-full bg-white dark:bg-gray-900 border-4 border-dashed border-emerald-200 dark:border-emerald-900/50 p-12 rounded-[4rem] text-emerald-600 font-black text-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition">{t('إضافة درس +', 'Add Lesson +')}</button>}
              <div className="grid grid-cols-1 gap-4">
                {selectedChannel.content.length > 0 ? selectedChannel.content.map(item => (
                  <div key={item.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 shadow-sm flex items-center justify-between group hover:shadow-xl transition">
                    <button onClick={() => { setChannelTab('jarvis'); handleJarvisSummarize(item); }} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-6 py-3 rounded-2xl font-black text-xs hover:bg-emerald-600 hover:text-white transition">✨ {t('لخص', 'Summary')}</button>
                    <div className="flex items-center gap-6">
                       <p className="font-black text-2xl text-gray-800 dark:text-white">{item.title}</p>
                       <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-emerald-600">
                          {item.type === 'pdf' ? '📄' : '🎥'}
                       </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-20 text-gray-300 dark:text-gray-700 font-black text-3xl">{t('لا يوجد محتوى بعد', 'No content yet')}</div>
                )}
              </div>
            </div>
          )}

          {channelTab === 'broadcast' && (
            <div className="max-w-4xl mx-auto h-[70vh] flex flex-col bg-white dark:bg-gray-900 rounded-[4rem] border dark:border-gray-800 overflow-hidden shadow-2xl animate-in zoom-in duration-500">
               <div className="bg-emerald-600 text-white p-6 text-center font-black text-xl shadow-lg z-10">{t('قناة الإعلانات والتنبيهات', 'Announcements Channel')}</div>
               <div className="flex-1 overflow-y-auto p-12 space-y-8 bg-gray-50/30 dark:bg-gray-950/30">
                  {(broadcastMessages[selectedChannel.id] || []).length > 0 ? (broadcastMessages[selectedChannel.id] || []).map(msg => (
                    <div key={msg.id} className="bg-white dark:bg-gray-800 border-r-[8px] border-emerald-500 p-10 rounded-[2.5rem] shadow-sm transform hover:scale-[1.01] transition">
                       <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] text-gray-400 font-bold">{new Date(msg.timestamp).toLocaleString()}</span>
                          <p className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-widest">{msg.senderName}</p>
                       </div>
                       <p className="font-bold text-2xl text-gray-800 dark:text-gray-200 leading-relaxed">{msg.text}</p>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-700 gap-4 opacity-50">
                       <span className="text-8xl">📢</span>
                       <p className="font-black text-2xl">{t('لا توجد إعلانات حالياً', 'No announcements yet')}</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
               </div>
               {isProf ? (
                 <div className="p-10 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex gap-4 shadow-2xl">
                    <button onClick={handleSendBroadcast} className="bg-emerald-600 text-white px-12 py-5 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition">{t('نشر', 'Post')}</button>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendBroadcast()} placeholder={t("اكتب تنبيهاً للطلاب...", "Write a notification...")} className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-3xl px-10 py-5 dark:text-white border dark:border-gray-700 outline-none focus:border-emerald-500 text-xl font-bold" />
                 </div>
               ) : (
                 <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 text-center font-black border-t dark:border-gray-800">{t('هذه القناة للقراءة فقط، الأستاذ فقط من يمكنه النشر.', 'Read-only channel. Only professors can post.')}</div>
               )}
            </div>
          )}

          {channelTab === 'jarvis' && (
            <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
               <div className="bg-emerald-900 p-16 rounded-[4.5rem] text-white shadow-2xl text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32"></div>
                  <h3 className="text-6xl font-black mb-4">Jarvis AI</h3>
                  <p className="opacity-70 text-2xl">{t('مساعدك الذكي للتفوق الدراسي.', 'Your smart academic assistant.')}</p>
               </div>
               {isJarvisThinking && <div className="text-center text-emerald-700 dark:text-emerald-400 font-black animate-pulse text-2xl py-12 flex items-center justify-center gap-4">
                  <div className="w-4 h-4 bg-emerald-600 rounded-full animate-bounce"></div>
                  <div className="w-4 h-4 bg-emerald-600 rounded-full animate-bounce delay-100"></div>
                  <div className="w-4 h-4 bg-emerald-600 rounded-full animate-bounce delay-200"></div>
                  {t('جارفيس يحلل الأنظمة...', 'Jarvis is processing...')}
               </div>}
               {jarvisResponse && (
                 <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border-t-[16px] border-emerald-600 shadow-2xl text-right animate-in slide-in-from-top-8">
                    <h4 className="text-emerald-900 dark:text-emerald-400 font-black text-3xl mb-8 flex items-center gap-4">
                       <span>{t('نتيجة تحليل جارفيس', 'Jarvis Analysis Result')}</span>
                       <span className="text-4xl">✨</span>
                    </h4>
                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed font-bold text-2xl whitespace-pre-line">{jarvisResponse}</div>
                 </div>
               )}
               <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-900 p-10 rounded-[3.5rem] min-h-[400px] flex flex-col gap-6 shadow-xl border dark:border-gray-800">
                     {jarvisChat.map((msg, i) => (
                       <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-8 rounded-[3rem] max-w-[85%] text-xl font-black shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border dark:border-gray-700'}`}>{msg.text}</div>
                       </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-4">
                     <button onClick={handleJarvisChat} className="bg-emerald-600 text-white p-6 rounded-3xl shadow-2xl text-4xl active:scale-95 transition">🚀</button>
                     <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleJarvisChat()} placeholder={t("اسأل جارفيس أي شيء عن الدرس...", "Ask Jarvis anything about the lesson...")} className="flex-1 bg-white dark:bg-gray-900 border-4 border-transparent focus:border-emerald-500 rounded-[2.5rem] px-12 py-8 font-black text-2xl outline-none text-right dark:text-white shadow-2xl" />
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
