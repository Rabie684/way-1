
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk, JARVIS_SYSTEM_INSTRUCTION, getJarvisAI } from './services/geminiService';
import { Modality } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = 'https://xvcqkdytqbqkdxyiwmzx.supabase.co';
const supabaseKey = process.env.API_KEY || ''; // استخدام مفتاح البيئة
const supabase = createClient(supabaseUrl, supabaseKey);

const App: React.FC = () => {
  // Core State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'login' | 'dashboard' | 'channel-view'>('landing');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelTab, setChannelTab] = useState<'pdf' | 'broadcast'>('pdf');
  const [activeTab, setActiveTab] = useState<'home' | 'my-channels' | 'messages' | 'wallet' | 'profile'>('home');
  
  // UI Preferences
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  // Filtering for Student
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');

  // Jarvis State
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string, sources?: any[]}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat State
  const [personalChats, setPersonalChats] = useState<Record<string, ChatMessage[]>>({}); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Forms State
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', department: '', description: '', price: 200 });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' | 'image' });

  // Initial Data & Auth Sync
  useEffect(() => {
    const syncAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) fetchProfile(session.user.id);
        else setCurrentUser(null);
      });
    };

    const fetchAllData = async () => {
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) setUsers(usersData);
      
      const { data: channelsData } = await supabase.from('channels').select('*');
      if (channelsData) setChannels(channelsData || []);
    };

    syncAuth();
    fetchAllData();
  }, []);

  const fetchProfile = async (id: string) => {
    const { data: profile } = await supabase.from('users').select('*').eq('id', id).single();
    if (profile) {
      setCurrentUser(profile);
      setView('dashboard');
    }
  };

  useEffect(() => { 
    document.documentElement.classList.toggle('dark', isDarkMode); 
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Auth Handlers
  const handleRegister = async (role: UserRole, data: any) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });
      if (authError) throw authError;

      const newUserProfile = {
        id: authData.user?.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: role,
        university: data.university || '',
        faculty: data.faculty || '',
        walletBalance: role === 'student' ? 1000 : 0,
        isApproved: true,
        avatar: '',
        studentCount: 0
      };

      const { error: dbError } = await supabase.from('users').insert([newUserProfile]);
      if (dbError) throw dbError;

      setCurrentUser(newUserProfile as User);
      setView('dashboard');
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: target.email.value,
        password: target.password.value
      });
      if (error) throw error;
      fetchProfile(data.user.id);
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Channel & Content Handlers
  const handleCreateChannel = async () => {
    if (!currentUser || !newChannelData.name.trim()) return;
    setLoading(true);
    const newChan: Partial<Channel> = {
      professorId: currentUser.id,
      name: newChannelData.name,
      description: newChannelData.description,
      department: newChannelData.department,
      price: newChannelData.price,
      subscribers: [],
      content: []
    };
    
    const { data, error } = await supabase.from('channels').insert([newChan]).select().single();
    if (error) alert(error.message);
    else {
      setChannels([...channels, data]);
      setShowCreateChannel(false);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const ext = file.name.split('.').pop()?.toLowerCase();
      let type: any = 'pdf';
      if (['png','jpg','jpeg','webp'].includes(ext!)) type = 'image';
      else if (['mp4','mov','avi','webm'].includes(ext!)) type = 'video';
      setNewContentData({ ...newContentData, title: file.name, type });
    }
  };

  const handleAddContent = async () => {
    if (!selectedFile || !selectedChannel) return;
    setLoading(true);
    // محاكاة رفع الرابط (في الواقع نستخدم supabase.storage)
    const mockUrl = URL.createObjectURL(selectedFile);
    const newItem: ContentItem = {
      id: 'i' + Date.now(),
      type: newContentData.type,
      title: newContentData.title,
      url: mockUrl,
      createdAt: new Date()
    };
    
    const updatedContent = [...(selectedChannel.content || []), newItem];
    const { error } = await supabase.from('channels').update({ content: updatedContent }).eq('id', selectedChannel.id);
    
    if (error) alert(error.message);
    else {
      const updatedChannels = channels.map(c => c.id === selectedChannel.id ? { ...c, content: updatedContent } : c);
      setChannels(updatedChannels);
      setSelectedChannel({ ...selectedChannel, content: updatedContent });
      setShowAddContent(false);
      setSelectedFile(null);
    }
    setLoading(false);
  };

  // Student specific logic
  const getSubscribedProfessors = () => {
    if (!currentUser) return [];
    const subscribedProfIds = channels
      .filter(c => c.subscribers?.includes(currentUser.id))
      .map(c => c.professorId);
    return users.filter(u => u.role === 'professor' && subscribedProfIds.includes(u.id));
  };

  const handleSubscribe = async (channelId: string) => {
    if (!currentUser) return;
    const chan = channels.find(c => c.id === channelId);
    if (!chan) return;

    if (currentUser.walletBalance < chan.price) {
      alert("رصيدك لا يكفي للاشتراك.");
      return;
    }

    setLoading(true);
    const updatedSubscribers = [...(chan.subscribers || []), currentUser.id];
    const newBalance = currentUser.walletBalance - chan.price;

    const { error: chanErr } = await supabase.from('channels').update({ subscribers: updatedSubscribers }).eq('id', channelId);
    const { error: userErr } = await supabase.from('users').update({ walletBalance: newBalance }).eq('id', currentUser.id);

    if (!chanErr && !userErr) {
      setChannels(channels.map(c => c.id === channelId ? { ...c, subscribers: updatedSubscribers } : c));
      setCurrentUser({ ...currentUser, walletBalance: newBalance });
      alert("تم الاشتراك بنجاح!");
    }
    setLoading(false);
  };

  // Chat & Jarvis
  const handleSendPersonal = () => {
    if (!chatInput.trim() || !currentUser || !activeChatUserId) return;
    const key = [currentUser.id, activeChatUserId].sort().join('_');
    const msg: ChatMessage = { 
      id: Date.now().toString(), 
      senderId: currentUser.id, 
      senderName: currentUser.firstName, 
      text: chatInput, 
      timestamp: new Date() 
    };
    setPersonalChats({ ...personalChats, [key]: [...(personalChats[key] || []), msg] });
    setChatInput('');
  };

  const handleJarvisChat = async () => {
    if (!jarvisInput.trim()) return;
    const userText = jarvisInput;
    setJarvisInput('');
    setJarvisChat(prev => [...prev, { role: 'user', text: userText }]);
    setIsJarvisThinking(true);
    const res = await jarvisAsk(userText);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: res.text || '', sources: res.sources }]);
    setIsJarvisThinking(false);
  };

  const renderJarvis = () => (
    <div className={`fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-500 ${isJarvisOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsJarvisOpen(false)}></div>
      <div className="relative bg-white dark:bg-gray-900 w-full md:max-w-2xl h-[85vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
        <div className="p-5 bg-emerald-600 text-white flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
             <span className="text-2xl">✨</span>
             <h3 className="font-black text-lg">Jarvis الأكاديمي</h3>
          </div>
          <button onClick={() => setIsJarvisOpen(false)} className="bg-white/10 p-2 rounded-full">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 dark:bg-gray-950 no-scrollbar">
          {jarvisChat.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in`}>
              <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 dark:text-white border dark:border-gray-700 shadow-sm'}`}>
                {m.text}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-[10px] opacity-70">
                    <p className="font-black mb-1">المصادر الموثوقة:</p>
                    <ul className="space-y-1">
                      {m.sources.map((s, idx) => s.web && <li key={idx}><a href={s.web.uri} target="_blank" rel="noreferrer" className="underline hover:text-emerald-500">{s.web.title}</a></li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isJarvisThinking && <div className="text-xs text-emerald-600 animate-pulse font-black px-4">جارفيس يقوم بالبحث الأكاديمي...</div>}
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex gap-2">
          <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleJarvisChat()} placeholder="اسأل عن بحث، مذكرة، أو معلومة..." className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl dark:text-white outline-none focus:ring-2 ring-emerald-500 transition-all" />
          <button onClick={handleJarvisChat} className="bg-emerald-600 text-white px-6 rounded-2xl font-black shadow-lg">🚀</button>
        </div>
      </div>
    </div>
  );

  // Main UI Components
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="animate-float mb-12">
          <h1 className="text-9xl font-black tracking-tighter mb-2">WAY</h1>
          <p className="text-xl opacity-80 font-bold">جامعتك الرقمية أينما كنت</p>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button onClick={() => setView('register-prof')} className="bg-white text-emerald-600 py-5 rounded-3xl font-black text-lg shadow-2xl hover:scale-105 transition-all">أنا أستاذ</button>
          <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white py-5 rounded-3xl font-black text-lg border-2 border-emerald-400 shadow-2xl hover:scale-105 transition-all">أنا طالب</button>
          <button onClick={() => setView('login')} className="mt-6 text-emerald-100 font-bold hover:underline">لديك حساب؟ سجل دخولك</button>
        </div>
      </div>
    );
  }

  if (view.startsWith('register') || view === 'login') {
    const isReg = view.startsWith('register');
    const isProf = view === 'register-prof';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in">
          <h2 className="text-3xl font-black text-emerald-600 text-center">{view === 'login' ? 'عودة حميدة' : 'حساب جديد'}</h2>
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
            handleRegister(isProf ? 'professor' : 'student', d);
          }}>
            {isReg && (
              <div className="grid grid-cols-2 gap-3">
                <input name="fname" placeholder="الاسم" required className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 focus:border-emerald-500 outline-none dark:text-white font-bold" />
                <input name="lname" placeholder="اللقب" required className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 focus:border-emerald-500 outline-none dark:text-white font-bold" />
              </div>
            )}
            <input name="email" type="email" placeholder="البريد الإلكتروني" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 focus:border-emerald-500 outline-none dark:text-white font-bold" />
            <input name="password" type="password" placeholder="كلمة المرور" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 focus:border-emerald-500 outline-none dark:text-white font-bold" />
            {isProf && (
              <>
                <select name="univ" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:text-white font-bold">
                  <option value="">اختر الجامعة...</option>
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select name="faculty" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:text-white font-bold">
                  <option value="">اختر الكلية...</option>
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </>
            )}
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition">
              {loading ? 'جاري التحميل...' : (view === 'login' ? 'دخول' : 'بدء الرحلة')}
            </button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 font-bold text-sm">رجوع</button>
          </form>
        </div>
      </div>
    );
  }

  if (currentUser && view === 'dashboard') {
    const isProf = currentUser.role === 'professor';
    const tabs = isProf ? [
      {id:'home', l:'الرئيسية', i:'🏠'},
      {id:'messages', l:'الرسائل', i:'💬'},
      {id:'wallet', l:'المحفظة', i:'💰'},
      {id:'profile', l:'الملف', i:'👤'}
    ] : [
      {id:'home', l:'اكتشاف', i:'🔍'},
      {id:'my-channels', l:'قنواتي', i:'📡'},
      {id:'messages', l:'الرسائل', i:'💬'},
      {id:'wallet', l:'المحفظة', i:'💰'},
      {id:'profile', l:'الملف', i:'👤'}
    ];

    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right font-sans">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-72 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-8 flex-col gap-10 shadow-2xl z-50">
          <h2 className="text-4xl font-black text-emerald-600 text-center tracking-tighter">WAY</h2>
          <nav className="flex flex-col gap-3">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`p-5 rounded-2xl font-black flex items-center gap-4 transition-all ${activeTab === t.id ? 'bg-emerald-600 text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-800'}`}>
                <span className="text-2xl">{t.i}</span> {t.l}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Navbar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex justify-around p-3 z-[100] pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === t.id ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}>
              <span className="text-2xl">{t.i}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{t.l}</span>
            </button>
          ))}
        </nav>

        {/* Jarvis FAB */}
        <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-28 right-6 md:bottom-10 md:right-10 z-[110] w-16 h-16 md:w-20 md:h-20 bg-emerald-600 text-white rounded-full shadow-[0_10px_40px_rgba(16,185,129,0.4)] flex items-center justify-center animate-bounce border-4 border-white dark:border-gray-800">
          <span className="text-3xl md:text-4xl">✨</span>
        </button>
        {renderJarvis()}

        <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32 no-scrollbar">
          {activeTab === 'home' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              <header className="flex flex-col gap-1">
                 <h1 className="text-4xl font-black dark:text-white">مرحباً، {currentUser.firstName} 👋</h1>
                 <p className="text-emerald-600 font-bold uppercase tracking-widest text-xs">نظام إدارة المحتوى الأكاديمي</p>
              </header>
              
              {!isProf && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border dark:border-gray-800">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 px-1">اختر الجامعة</label>
                    <select value={filterUniv} onChange={e => setFilterUniv(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white border dark:border-gray-700 outline-none focus:border-emerald-500 font-bold">
                      <option value="">كل الجامعات</option>
                      {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 px-1">اختر الكلية</label>
                    <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white border dark:border-gray-700 outline-none focus:border-emerald-500 font-bold">
                      <option value="">كل الكليات</option>
                      {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {isProf ? (
                <div className="space-y-6">
                  <button onClick={() => setShowCreateChannel(true)} className="w-full bg-emerald-600 text-white p-8 rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-4 group">
                    <span className="text-4xl group-hover:rotate-90 transition-transform">➕</span> إنشاء قناة مادة جديدة
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {channels.filter(c => c.professorId === currentUser.id).map(c => (
                      <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border dark:border-gray-800 shadow-sm hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-6">
                           <div>
                              <h4 className="font-black text-xl dark:text-white">{c.name}</h4>
                              <p className="text-xs text-gray-400 font-bold mt-1 uppercase">{c.department}</p>
                           </div>
                           <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black">{c.subscribers?.length || 0} طالب</span>
                        </div>
                        <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="w-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 py-4 rounded-2xl font-black hover:bg-emerald-600 hover:text-white transition-all">إدارة الدروس والملفات</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="font-black text-xl dark:text-white px-2">الأساتذة المتاحون</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {users.filter(u => u.role === 'professor' && (!filterUniv || u.university === filterUniv) && (!filterFaculty || u.faculty === filterFaculty)).map(prof => (
                      <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border dark:border-gray-800 text-center space-y-4 hover:border-emerald-500 transition-all shadow-sm">
                        <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="md" />
                        <h4 className="font-black text-lg dark:text-white">{prof.firstName} {prof.lastName}</h4>
                        <div className="flex flex-col gap-2">
                           <button onClick={() => {
                             const chan = channels.find(c => c.professorId === prof.id);
                             if (chan) { setSelectedChannel(chan); setView('channel-view'); }
                             else alert("هذا الأستاذ لم يرفع دروساً بعد.");
                           }} className="w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-black">استعراض المواد</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'my-channels' && !isProf && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-left">
              <h2 className="text-3xl font-black dark:text-white">قنواتي التعليمية 📡</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {channels.filter(c => c.subscribers?.includes(currentUser.id)).map(c => (
                  <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border dark:border-gray-800 flex justify-between items-center shadow-sm hover:shadow-lg transition-all">
                    <div>
                      <h4 className="font-black text-xl dark:text-white">{c.name}</h4>
                      <p className="text-xs text-emerald-600 font-bold mt-1 uppercase">{c.department}</p>
                    </div>
                    <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">دخول</button>
                  </div>
                ))}
                {channels.filter(c => c.subscribers?.includes(currentUser.id)).length === 0 && (
                  <div className="col-span-full py-20 text-center opacity-20"><span className="text-8xl block mb-4">📡</span><p className="text-2xl font-black">لم تشترك في أي قناة بعد</p></div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="max-w-6xl mx-auto h-[75vh] flex bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border dark:border-gray-800 overflow-hidden">
               <div className="w-1/3 border-l dark:border-gray-800 flex flex-col">
                  <div className="p-6 font-black text-emerald-600 border-b dark:border-gray-800 text-xl">المراسلات</div>
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                    {(isProf ? users.filter(u => u.role === 'student') : getSubscribedProfessors()).map(u => (
                      <button key={u.id} onClick={() => setActiveChatUserId(u.id)} className={`w-full p-6 text-right flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all border-b dark:border-gray-800 ${activeChatUserId === u.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>
                         <ProfessorRank avatar={u.avatar} studentCount={u.studentCount || 0} size="sm" />
                         <div>
                           <p className="font-black dark:text-white text-sm">{u.firstName} {u.lastName}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{u.role === 'professor' ? 'أستاذ معتمد' : 'طالب'}</p>
                         </div>
                      </button>
                    ))}
                  </div>
               </div>
               <div className="flex-1 flex flex-col bg-gray-50/20 dark:bg-gray-950/20 relative">
                  {activeChatUserId ? (
                    <>
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-28 custom-scrollbar">
                        {(personalChats[[currentUser.id, activeChatUserId].sort().join('_')] || []).map((m, i) => (
                          <div key={i} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                            <div className={`p-4 rounded-2xl max-w-[75%] shadow-sm text-sm font-bold ${m.senderId === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 dark:text-white rounded-tl-none'}`}>
                              {m.text}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex gap-3 shadow-2xl">
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendPersonal()} placeholder="اكتب استفسارك هنا..." className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl dark:text-white outline-none focus:ring-2 ring-emerald-500 transition-all font-bold" />
                        <button onClick={handleSendPersonal} className="bg-emerald-600 text-white px-8 rounded-2xl font-black shadow-lg">إرسال</button>
                      </div>
                    </>
                  ) : <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-4"><span className="text-9xl">💬</span><p className="text-3xl font-black">اختر محادثة لبدء التواصل</p></div>}
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in">
              <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border dark:border-gray-800 shadow-sm text-center space-y-6">
                 <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="lg" />
                 <div>
                    <h2 className="text-3xl font-black dark:text-white">{currentUser.firstName} {currentUser.lastName}</h2>
                    <p className="text-emerald-600 font-bold mt-1">{currentUser.email}</p>
                    <p className="text-gray-400 text-xs mt-2 uppercase font-black">{currentUser.university} • {currentUser.faculty}</p>
                 </div>
                 
                 <div className="pt-6 grid grid-cols-1 gap-4">
                    <div className="flex justify-between items-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border dark:border-gray-800">
                       <div className="flex items-center gap-4">
                          <span className="text-2xl">{isDarkMode ? '🌙' : '☀️'}</span>
                          <span className="font-black dark:text-white">الوضع الليلي</span>
                       </div>
                       <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-14 h-8 rounded-full relative transition-colors p-1 ${isDarkMode ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                          <div className={`w-6 h-6 bg-white rounded-full transition-all shadow-lg ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                       </button>
                    </div>
                    <button onClick={async () => { await supabase.auth.signOut(); setView('landing'); }} className="w-full text-red-500 font-black py-5 bg-red-50 dark:bg-red-950/20 rounded-[2rem] border border-red-100 dark:border-red-900/20 transition-all hover:bg-red-100">تسجيل الخروج من WAY</button>
                 </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Channel Content View
  if (view === 'channel-view' && selectedChannel && currentUser) {
    const isProf = selectedChannel.professorId === currentUser.id;
    const isSubscribed = selectedChannel.subscribers?.includes(currentUser.id);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-right animate-in fade-in">
        {showAddContent && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-10 rounded-[2.5rem] shadow-2xl space-y-6 animate-in zoom-in">
              <h3 className="text-2xl font-black text-emerald-600">رفع محتوى أكاديمي جديد</h3>
              <div className="space-y-4">
                 <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder="اسم المطلب / الدرس..." className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl outline-none dark:text-white font-bold" />
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,video/*,image/*" />
                 <button onClick={() => fileInputRef.current?.click()} className="w-full p-10 border-4 border-dashed border-emerald-100 dark:border-emerald-900/50 rounded-3xl flex flex-col items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                   <span className="text-5xl">📁</span>
                   <span className="font-black text-emerald-700 dark:text-emerald-400">{selectedFile ? selectedFile.name : 'اضغط هنا للوصول لملفاتك'}</span>
                 </button>
              </div>
              <div className="flex gap-3 pt-4">
                 <button onClick={handleAddContent} disabled={loading || !selectedFile} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition disabled:opacity-50">{loading ? 'جاري الرفع...' : 'نشر المحتوى'}</button>
                 <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl font-black dark:text-white">إلغاء</button>
              </div>
            </div>
          </div>
        )}

        <header className="bg-white dark:bg-gray-900 p-5 shadow-lg flex justify-between items-center sticky top-0 z-50 border-b dark:border-gray-800">
           <button onClick={() => setView('dashboard')} className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-5 py-2 rounded-xl font-black hover:bg-emerald-600 hover:text-white transition-all">✕ رجوع</button>
           <div className="text-center">
              <h2 className="font-black text-xl dark:text-white">{selectedChannel.name}</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selectedChannel.department}</p>
           </div>
           <div className="w-20"></div> {/* Spacer */}
        </header>

        <main className="flex-1 p-6 md:p-12 overflow-y-auto space-y-6 max-w-5xl mx-auto w-full no-scrollbar pb-32">
          {!isProf && !isSubscribed ? (
            <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] text-center space-y-6 shadow-xl border-4 border-emerald-50 dark:border-emerald-900/20 animate-in zoom-in">
               <span className="text-8xl block">🔒</span>
               <h3 className="text-2xl font-black dark:text-white">هذا المحتوى مخصص للمشتركين فقط</h3>
               <p className="text-gray-500 font-bold">اشترك الآن للوصول لكامل الدروس، الملفات، والمشاركة في دردشة الأستاذ.</p>
               <button onClick={() => handleSubscribe(selectedChannel.id)} disabled={loading} className="bg-emerald-600 text-white px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 transition-all">
                 {loading ? 'جاري التحميل...' : `اشترك الآن مقابل ${selectedChannel.price} دج`}
               </button>
            </div>
          ) : (
            <>
              {isProf && (
                <button onClick={() => setShowAddContent(true)} className="w-full bg-white dark:bg-gray-900 border-4 border-dashed border-emerald-200 dark:border-emerald-800 p-12 rounded-[3rem] text-emerald-600 font-black flex flex-col items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all shadow-sm">
                  <span className="text-5xl">➕</span> رفع درس أو مطلب أكاديمي جديد
                </button>
              )}
              
              <div className="space-y-4">
                {selectedChannel.content?.map(item => (
                  <div key={item.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-xl transition-all group">
                     <div className="flex gap-3 w-full md:w-auto">
                       <button onClick={() => {
                         setIsJarvisThinking(true);
                         setIsJarvisOpen(true);
                         handleJarvisSummarize(item);
                       }} className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg active:scale-95 transition">✨ تلخيص Jarvis</button>
                       <a href={item.url} target="_blank" rel="noreferrer" className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-6 py-3 rounded-2xl text-[10px] font-black text-center active:scale-95 transition">📂 فتح الملف</a>
                     </div>
                     <div className="flex items-center gap-4 text-right w-full md:w-auto">
                        <div className="flex-1">
                           <p className="font-black dark:text-white text-lg group-hover:text-emerald-600 transition-colors">{item.title}</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{new Date(item.createdAt).toLocaleDateString('ar-DZ')}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl text-2xl shadow-inner">
                           {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : '🖼️'}
                        </div>
                     </div>
                  </div>
                ))}
                {(!selectedChannel.content || selectedChannel.content.length === 0) && (
                  <div className="py-20 text-center opacity-10"><span className="text-9xl block mb-4">📚</span><p className="text-2xl font-black">لا يوجد دروس مرفوعة حالياً</p></div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  const handleJarvisSummarize = async (item: ContentItem) => {
    setJarvisChat(prev => [...prev, { role: 'user', text: `يا جارفيس، لخصلي هاد المطلب الأكاديمي: ${item.title}` }]);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: summary || '...' }]);
    setIsJarvisThinking(false);
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-white dark:bg-gray-950 transition-opacity ${loading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
       <div className="w-20 h-20 border-8 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
    </div>
  );
};

export default App;
