
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk } from './services/geminiService';

/**
 * WAY - جامعتك الرقمية
 * المطور: ربيع (Rabie)
 * نسخة البروتوتايب المستقلة (بدون قاعدة بيانات خارجية)
 */

const App: React.FC = () => {
  // --- States ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'login' | 'dashboard' | 'channel-view'>('landing');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'my-channels' | 'messages' | 'wallet' | 'profile'>('home');
  
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');

  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string, sources?: any[]}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');

  const [personalChats, setPersonalChats] = useState<Record<string, ChatMessage[]>>({}); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newChannelData, setNewChannelData] = useState({ name: '', department: '', description: '', price: 200 });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' | 'image' });

  // --- Mock Database Logic ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // تحميل البيانات من LocalStorage
      const storedUsers = localStorage.getItem('way_users');
      const storedChannels = localStorage.getItem('way_channels');
      const sessionUser = localStorage.getItem('way_session');

      if (storedUsers) setUsers(JSON.parse(storedUsers));
      if (storedChannels) setChannels(JSON.parse(storedChannels));
      if (sessionUser) {
        setCurrentUser(JSON.parse(sessionUser));
        setView('dashboard');
      }
      
      setTimeout(() => setLoading(false), 800);
    };
    init();
  }, []);

  useEffect(() => {
    localStorage.setItem('way_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('way_channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('way_session', JSON.stringify(currentUser));
      // تحديث المستخدم في قائمة المستخدمين أيضاً
      if (!users.find(u => u.id === currentUser.id)) {
        setUsers(prev => [...prev, currentUser]);
      } else {
        setUsers(prev => prev.map(u => u.id === currentUser.id ? currentUser : u));
      }
    } else {
      localStorage.removeItem('way_session');
    }
  }, [currentUser]);

  useEffect(() => { 
    document.documentElement.classList.toggle('dark', isDarkMode); 
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // --- Auth Actions ---
  const handleRegister = async (role: UserRole, data: any) => {
    setLoading(true);
    setTimeout(() => {
      const newUser: User = {
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role,
        university: data.university || '',
        faculty: data.faculty || '',
        walletBalance: role === 'student' ? 1000 : 0,
        isApproved: true,
        avatar: '',
        studentCount: 0
      };

      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      setView('dashboard');
      setLoading(false);
    }, 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const email = target.email.value;
    
    setLoading(true);
    setTimeout(() => {
      const user = users.find(u => u.email === email);
      if (user) {
        setCurrentUser(user);
        setView('dashboard');
      } else {
        alert("المستخدم غير موجود. يرجى إنشاء حساب أولاً.");
      }
      setLoading(false);
    }, 500);
  };

  const handleQuickLogin = (role: 'student' | 'professor') => {
    setLoading(true);
    setTimeout(() => {
      let quickUser: User;
      if (role === 'student') {
        quickUser = {
          id: 'q_student_rabie',
          firstName: 'حمر العين',
          lastName: 'ربيع',
          email: 'rabie@way.dz',
          role: 'student',
          university: 'USTHB',
          faculty: 'التكنولوجيا',
          walletBalance: 2500,
          isApproved: true,
          avatar: '',
          studentCount: 0
        };
      } else {
        quickUser = {
          id: 'q_prof_bakhta',
          firstName: 'بن الطاهر',
          lastName: 'بختة',
          email: 'bakhta@way.dz',
          role: 'professor',
          university: 'جامعة الجزائر 1',
          faculty: 'الآداب واللغات',
          walletBalance: 12000,
          isApproved: true,
          avatar: '',
          studentCount: 45
        };
      }
      setCurrentUser(quickUser);
      setView('dashboard');
      setLoading(false);
    }, 600);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('landing');
  };

  // --- Content Actions ---
  const handleCreateChannel = () => {
    if (!currentUser) return;
    const newChan: Channel = {
      id: 'ch_' + Math.random().toString(36).substr(2, 9),
      professorId: currentUser.id,
      name: newChannelData.name,
      department: newChannelData.department,
      description: newChannelData.description,
      price: newChannelData.price,
      subscribers: [],
      content: []
    };

    setChannels(prev => [...prev, newChan]);
    setShowCreateChannel(false);
    setNewChannelData({ name: '', department: '', description: '', price: 200 });
  };

  const handleAddContent = () => {
    if (!selectedFile || !selectedChannel) return;
    const newItem: ContentItem = {
      id: 'i' + Date.now(),
      type: newContentData.type,
      title: newContentData.title || selectedFile.name,
      url: URL.createObjectURL(selectedFile),
      createdAt: new Date()
    };
    
    const updatedChannels = channels.map(c => {
      if (c.id === selectedChannel.id) {
        return { ...c, content: [...(c.content || []), newItem] };
      }
      return c;
    });

    setChannels(updatedChannels);
    setSelectedChannel(updatedChannels.find(c => c.id === selectedChannel.id) || null);
    setShowAddContent(false);
    setSelectedFile(null);
  };

  const handleSubscribe = (channelId: string) => {
    if (!currentUser) return;
    const chan = channels.find(c => c.id === channelId);
    if (!chan) return;
    if (currentUser.walletBalance < chan.price) return alert("الرصيد غير كافٍ");

    const updatedChannels = channels.map(c => {
      if (c.id === channelId) {
        return { ...c, subscribers: [...(c.subscribers || []), currentUser.id] };
      }
      return c;
    });

    setChannels(updatedChannels);
    setCurrentUser({ ...currentUser, walletBalance: currentUser.walletBalance - chan.price });
    alert("تم الاشتراك بنجاح في القناة!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // --- Jarvis Actions ---
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

  const handleJarvisSumm = async (item: ContentItem) => {
    setIsJarvisThinking(true);
    setIsJarvisOpen(true);
    setJarvisChat(prev => [...prev, { role: 'user', text: `لخصلي الدرس: ${item.title}` }]);
    const sum = await summarizeContent(item.title, item.type);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: sum || '' }]);
    setIsJarvisThinking(false);
  };

  // --- View Renders ---

  const renderJarvis = () => {
    if (!isJarvisOpen) return null;
    return (
      <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-[80vh] md:h-[700px] rounded-t-[3rem] md:rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500">
          <header className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-emerald-600 text-white">
            <div className="text-right">
              <h3 className="text-2xl font-black flex items-center justify-end gap-2">✨ جارفيس <span className="text-xs font-normal opacity-75">بواسطة ربيع</span></h3>
              <p className="text-xs opacity-80 font-bold">مساعدك الأكاديمي الجزائري</p>
            </div>
            <button onClick={() => setIsJarvisOpen(false)} className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl hover:bg-white/30 transition-all">✕</button>
          </header>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar flex flex-col">
            {jarvisChat.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 space-y-4">
                <span className="text-8xl">🤖</span>
                <p className="font-black text-xl text-right">واش خويا الطالب؟ كيفاش نقدر نعاونك اليوم في قرايتك؟</p>
              </div>
            )}
            {jarvisChat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-6 rounded-[2rem] font-bold text-sm leading-relaxed shadow-sm text-right ${msg.role === 'user' ? 'bg-gray-100 dark:bg-gray-800 dark:text-white rounded-br-none' : 'bg-emerald-600 text-white rounded-bl-none'}`}>
                  {msg.text}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/20 space-y-2 text-[10px] text-right">
                      <p className="font-black opacity-80">📚 المصادر الأكاديمية:</p>
                      {msg.sources.map((s: any, idx: number) => (
                        <a key={idx} href={s.web?.uri} target="_blank" rel="noopener noreferrer" className="block underline opacity-90 hover:opacity-100 transition-opacity truncate">
                          {s.web?.title || s.web?.uri}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isJarvisThinking && (
              <div className="flex justify-end">
                <div className="bg-emerald-600/20 text-emerald-600 p-6 rounded-[2rem] rounded-bl-none flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-xs font-black uppercase">Jarvis is thinking...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
            <div className="relative flex items-center gap-3">
              <input
                value={jarvisInput}
                onChange={e => setJarvisInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()}
                placeholder="اسأل جارفيس... (مثال: كيفاش نكتب خطة بحث؟)"
                className="w-full bg-white dark:bg-gray-900 p-5 pr-6 rounded-[2rem] outline-none dark:text-white font-bold shadow-lg border-2 border-transparent focus:border-emerald-500 transition-all text-right"
              />
              <button
                onClick={handleJarvisAsk}
                disabled={!jarvisInput.trim() || isJarvisThinking}
                className="bg-emerald-600 text-white p-5 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
              >
                <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const isProf = currentUser?.role === 'professor';
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right">
        <aside className="hidden md:flex w-72 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-8 flex-col gap-10 shadow-xl">
          <h2 className="text-4xl font-black text-emerald-600 text-center tracking-tighter">WAY</h2>
          <nav className="flex flex-col gap-3">
            {['home', 'my-channels', 'messages', 'wallet', 'profile'].filter(id => !isProf || id !== 'my-channels').map(id => (
              <button key={id} onClick={() => setActiveTab(id as any)} className={`p-5 rounded-2xl font-black flex items-center gap-4 transition-all ${activeTab === id ? 'bg-emerald-600 text-white shadow-lg translate-x-1' : 'text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-800'}`}>
                {id === 'home' ? '🏠 الرئيسية' : id === 'my-channels' ? '📡 قنواتي' : id === 'messages' ? '💬 الرسائل' : id === 'wallet' ? '💰 المحفظة' : '👤 الملف'}
              </button>
            ))}
          </nav>
        </aside>

        <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[100] w-16 h-16 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce border-4 border-white dark:border-gray-800">
          <span className="text-3xl">✨</span>
        </button>

        <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32 no-scrollbar">
          {activeTab === 'home' && (
            <div className="space-y-8 max-w-5xl mx-auto">
              <h1 className="text-4xl font-black dark:text-white">مرحباً، {currentUser?.firstName} 👋</h1>
              {!isProf && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm">
                   <select value={filterUniv} onChange={e => setFilterUniv(e.target.value)} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white border-none outline-none focus:ring-2 ring-emerald-500 font-bold">
                     <option value="">كل الجامعات</option>
                     {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                   </select>
                   <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white border-none outline-none focus:ring-2 ring-emerald-500 font-bold">
                     <option value="">كل الكليات</option>
                     {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                   </select>
                </div>
              )}
              
              {isProf ? (
                <div className="space-y-6">
                  <button onClick={() => setShowCreateChannel(true)} className="w-full bg-emerald-600 text-white p-10 rounded-[2.5rem] font-black text-2xl shadow-xl hover:scale-[1.01] transition-transform">➕ إنشاء مادة تعليمية</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {channels.filter(c => c.professorId === currentUser?.id).map(c => (
                      <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm border-r-8 border-r-emerald-600">
                        <h4 className="font-black text-2xl dark:text-white">{c.name}</h4>
                        <p className="text-xs text-emerald-600 font-bold mt-1 uppercase tracking-widest">{c.department}</p>
                        <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="w-full mt-6 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 py-4 rounded-2xl font-black hover:bg-emerald-600 hover:text-white transition-all">إدارة المحتوى</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {users.filter(u => u.role === 'professor' && (!filterUniv || u.university === filterUniv)).map(prof => (
                    <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 text-center space-y-4 shadow-sm hover:border-emerald-500 transition-all group">
                      <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="md" />
                      <h4 className="font-black text-xl dark:text-white">{prof.firstName} {prof.lastName}</h4>
                      <button onClick={() => {
                        const chan = channels.find(c => c.professorId === prof.id);
                        if (chan) { setSelectedChannel(chan); setView('channel-view'); }
                        else alert("هذا الأستاذ لم يرفع أي دروس بعد.");
                      }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl text-xs font-black shadow-lg group-hover:scale-105 transition-transform">استعراض القناة</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border dark:border-gray-800 shadow-sm text-center">
                 <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="lg" />
                 <h2 className="text-4xl font-black dark:text-white mt-6">{currentUser?.firstName} {currentUser?.lastName}</h2>
                 <p className="text-emerald-600 font-bold mt-2">{currentUser?.email}</p>
                 <div className="mt-10 pt-10 border-t dark:border-gray-800">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl font-black dark:text-white mb-4">
                      {isDarkMode ? '☀️ الوضع النهاري' : '🌙 الوضع الليلي'}
                    </button>
                    <button onClick={handleLogout} className="w-full bg-red-50 text-red-500 py-6 rounded-[2.5rem] font-black border border-red-100">تسجيل الخروج</button>
                 </div>
              </div>
            </div>
          )}
          
          {activeTab === 'wallet' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in zoom-in duration-300">
               <div className="bg-emerald-600 text-white p-16 rounded-[4rem] text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10 text-9xl">💰</div>
                  <h3 className="text-2xl font-bold opacity-80 mb-4">رصيدك الحالي</h3>
                  <p className="text-7xl font-black">{currentUser?.walletBalance} <span className="text-2xl">دج</span></p>
               </div>
               <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-sm space-y-6">
                  <h4 className="font-black text-2xl dark:text-white">طرق الشحن / السحب</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <button className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl text-right font-bold dark:text-white border-b-4 border-emerald-500">بطاقة ذهبية 💳</button>
                     <button className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl text-right font-bold dark:text-white border-b-4 border-blue-500">بريدي موب 🏦</button>
                  </div>
               </div>
            </div>
          )}
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex justify-around p-4 z-[100] pb-safe shadow-lg">
          {['home', 'messages', 'wallet', 'profile'].map(id => (
            <button key={id} onClick={() => setActiveTab(id as any)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === id ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}>
              <span className="text-2xl">{id === 'home' ? '🏠' : id === 'messages' ? '💬' : id === 'wallet' ? '💰' : '👤'}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  };

  const renderView = () => {
    if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-24 h-24 border-8 border-emerald-100 border-t-emerald-600 rounded-full animate-spin shadow-2xl mb-6"></div>
        <p className="font-black text-emerald-600 animate-pulse uppercase tracking-[0.3em]">WAY Loading</p>
      </div>
    );

    if (view === 'landing') return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="animate-float mb-12">
          <h1 className="text-9xl font-black tracking-tighter mb-2 drop-shadow-2xl">WAY</h1>
          <p className="text-xl opacity-80 font-bold uppercase tracking-widest">جامعتك الرقمية</p>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button onClick={() => setView('register-prof')} className="bg-white text-emerald-600 py-6 rounded-3xl font-black text-xl shadow-2xl hover:scale-105 transition-all">أنا أستاذ</button>
          <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white py-6 rounded-3xl font-black text-xl border-2 border-emerald-400 shadow-2xl hover:scale-105 transition-all">أنا طالب</button>
          <button onClick={() => setView('login')} className="mt-10 font-bold underline text-lg opacity-80">لديك حساب؟ سجل دخول</button>
        </div>
        <footer className="absolute bottom-10 opacity-60 text-xs font-bold">بواسطة ربيع • Rabie - 2025</footer>
      </div>
    );

    if (view === 'login' || view.startsWith('register')) return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in duration-300">
          <h2 className="text-4xl font-black text-emerald-600 text-center">{view === 'login' ? 'مرحباً بعودتك' : 'انضم لـ WAY'}</h2>
          
          {view === 'login' && (
            <div className="space-y-4">
               <p className="text-xs font-black text-gray-400 text-center uppercase tracking-widest">دخول سريع للتجربة</p>
               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleQuickLogin('student')}
                    className="flex flex-col items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-800 rounded-2xl hover:bg-emerald-100 transition-all group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">🎓</span>
                    <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400">حمر العين ربيع</span>
                  </button>
                  <button 
                    onClick={() => handleQuickLogin('professor')}
                    className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-100 dark:border-blue-800 rounded-2xl hover:bg-blue-100 transition-all group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">👩‍🏫</span>
                    <span className="text-[10px] font-black text-blue-800 dark:text-blue-400">بن الطاهر بختة</span>
                  </button>
               </div>
               <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-black text-gray-300">أو عبر النموذج</span>
                  <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
               </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={view === 'login' ? handleLogin : (e:any) => {
            e.preventDefault();
            const d = {
              firstName: e.target.fname?.value,
              lastName: e.target.lname?.value,
              email: e.target.email.value,
              password: e.target.password.value,
              university: e.target.univ?.value,
              faculty: e.target.faculty?.value
            };
            handleRegister(view === 'register-prof' ? 'professor' : 'student', d);
          }}>
            {view !== 'login' && (
              <div className="grid grid-cols-2 gap-3">
                <input name="fname" placeholder="الاسم" required className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white font-bold focus:ring-2 ring-emerald-500" />
                <input name="lname" placeholder="اللقب" required className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white font-bold focus:ring-2 ring-emerald-500" />
              </div>
            )}
            <input name="email" type="email" placeholder="البريد الإلكتروني" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white font-bold focus:ring-2 ring-emerald-500" />
            <input name="password" type="password" placeholder="كلمة المرور" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white font-bold focus:ring-2 ring-emerald-500" />
            {view === 'register-prof' && (
               <select name="univ" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 dark:text-white font-bold focus:ring-2 ring-emerald-500">
                 <option value="">اختر الجامعة...</option>
                 {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
               </select>
            )}
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl hover:bg-emerald-700 transition-all">
              {view === 'login' ? 'دخول' : 'بدء الرحلة'}
            </button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 font-bold">رجوع للرئيسية</button>
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
             <button onClick={() => setView('dashboard')} className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-6 py-3 rounded-2xl font-black shadow-sm">✕ رجوع</button>
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
                 <h3 className="text-4xl font-black dark:text-white">هذا المحتوى مغلق حالياً</h3>
                 <p className="text-gray-400 font-bold text-lg">بصفتك طالباً، يجب عليك الاشتراك في هذه المادة للوصول إلى الدروس والملخصات الذكية.</p>
                 <button onClick={() => handleSubscribe(selectedChannel.id)} className="bg-emerald-600 text-white px-20 py-8 rounded-[2.5rem] font-black text-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:scale-105 transition-all">
                   اشترك الآن بـ {selectedChannel.price} دج
                 </button>
               </div>
             ) : (
               <div className="space-y-6">
                 {isOwner && (
                   <button onClick={() => setShowAddContent(true)} className="w-full border-4 border-dashed border-emerald-200 dark:border-emerald-800 p-16 rounded-[3rem] text-emerald-600 font-black text-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all flex flex-col items-center gap-4">
                     <span className="text-6xl">➕</span> رفع مطلب أو درس جديد
                   </button>
                 )}
                 <div className="grid grid-cols-1 gap-6">
                  {selectedChannel.content?.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-2xl transition-all border-r-8 border-r-emerald-500">
                        <div className="flex gap-4 w-full md:w-auto">
                          <button onClick={() => handleJarvisSumm(item)} className="flex-1 bg-emerald-600 text-white px-10 py-5 rounded-[1.5rem] font-black shadow-lg hover:bg-emerald-700 transition-colors">✨ تلخيص Jarvis</button>
                          <a href={item.url} target="_blank" rel="noreferrer" className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-10 py-5 rounded-[1.5rem] font-black text-center shadow-inner">📂 فتح الملف</a>
                        </div>
                        <div className="text-right flex-1 flex items-center gap-6">
                          <div className="flex-1">
                            <p className="font-black dark:text-white text-2xl">{item.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-widest">{new Date(item.createdAt).toLocaleDateString('ar-DZ')}</p>
                          </div>
                          <div className="p-6 bg-emerald-50 dark:bg-gray-800 rounded-3xl text-4xl shadow-sm">
                            {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : '🖼️'}
                          </div>
                        </div>
                    </div>
                  ))}
                  {(!selectedChannel.content || selectedChannel.content.length === 0) && (
                    <div className="py-40 text-center opacity-10 flex flex-col items-center gap-6">
                      <span className="text-[12rem]">📚</span>
                      <p className="text-4xl font-black">لا يوجد محتوى دراسي حتى الآن</p>
                    </div>
                  )}
                 </div>
               </div>
             )}
           </main>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen">
      {renderView()}
      
      {/* Jarvis AI Overlay */}
      {renderJarvis()}
      
      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
           <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-12 rounded-[3.5rem] shadow-2xl space-y-8 animate-in zoom-in">
              <h3 className="text-3xl font-black text-emerald-600 text-center">إنشاء قناة مادة جديدة</h3>
              <div className="space-y-4">
                <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="اسم المادة (مثلاً: رياضيات)..." className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-[1.5rem] outline-none dark:text-white font-bold border-2 border-transparent focus:border-emerald-500" />
                <input value={newChannelData.department} onChange={e => setNewChannelData({...newChannelData, department: e.target.value})} placeholder="القسم / السنة الدراسية..." className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-[1.5rem] outline-none dark:text-white font-bold border-2 border-transparent focus:border-emerald-500" />
                <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-950/20 p-5 rounded-[1.5rem]">
                    <span className="font-black text-emerald-600">السعر:</span>
                    <input type="number" value={newChannelData.price} onChange={e => setNewChannelData({...newChannelData, price: Number(e.target.value)})} className="flex-1 bg-white dark:bg-gray-800 p-2 rounded-xl font-black text-center dark:text-white" />
                    <span className="font-black text-emerald-600">دج</span>
                </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-6 rounded-[1.5rem] font-black text-xl shadow-xl hover:bg-emerald-700 transition-all">تأكيد الإنشاء</button>
                 <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 p-6 rounded-[1.5rem] font-black dark:text-white transition-all">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {/* Add Content Modal */}
      {showAddContent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-12 rounded-[3.5rem] shadow-2xl space-y-8 animate-in zoom-in">
             <h3 className="text-3xl font-black text-emerald-600 text-center">رفع درس جديد</h3>
             <div className="space-y-4">
               <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder="عنوان الدرس أو المطلب..." className="w-full bg-gray-100 dark:bg-gray-800 p-5 rounded-[1.5rem] outline-none dark:text-white font-bold border-2 border-transparent focus:border-emerald-500" />
               <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
               <button onClick={() => fileInputRef.current?.click()} className="w-full p-16 border-4 border-dashed border-emerald-100 dark:border-emerald-800 rounded-[2.5rem] text-emerald-600 font-black flex flex-col items-center gap-4 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all">
                 <span className="text-5xl">📂</span>
                 {selectedFile ? selectedFile.name : 'اضغط لاختيار ملف من جهازك'}
               </button>
             </div>
             <div className="flex gap-4">
                <button onClick={handleAddContent} className="flex-1 bg-emerald-600 text-white py-6 rounded-[1.5rem] font-black text-xl shadow-xl hover:bg-emerald-700 transition-all">نشر المحتوى</button>
                <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 p-6 rounded-[1.5rem] font-black dark:text-white transition-all">إلغاء</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
