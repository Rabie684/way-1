
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk, JARVIS_SYSTEM_INSTRUCTION } from './services/geminiService';
import { createClient } from '@supabase/supabase-js';

/**
 * WAY - جامعتك الرقمية
 * المطور: ربيع (Rabie)
 * الوصف: منصة تعليمية تربط الأستاذ والطالب بنظام ذكي متكامل.
 */

// Supabase Initialization
const supabaseUrl = 'https://xvcqkdytqbqkdxyiwmzx.supabase.co';
const supabaseKey = process.env.API_KEY || ''; // نستخدم مفتاح البيئة المتاح
const supabase = createClient(supabaseUrl, supabaseKey);

const App: React.FC = () => {
  // --- حالات النظام الأساسية ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'login' | 'dashboard' | 'channel-view'>('landing');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'my-channels' | 'messages' | 'wallet' | 'profile'>('home');
  
  // بيانات القنوات والمستخدمين
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  // التفضيلات والفلترة
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');

  // جارفيس والمحادثات
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string, sources?: any[]}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');
  const [personalChats, setPersonalChats] = useState<Record<string, ChatMessage[]>>({}); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  // النوافذ المنبثقة والملفات
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newChannelData, setNewChannelData] = useState({ name: '', department: '', description: '', price: 200 });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' | 'image' });

  // --- التأثيرات الجانبية ---
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
          if (profile) {
            setCurrentUser(profile);
            setView('dashboard');
          }
        }
        
        // جلب البيانات العامة
        const [{ data: uData }, { data: cData }] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('channels').select('*')
        ]);
        if (uData) setUsers(uData);
        if (cData) setChannels(cData);
      } catch (err) {
        console.error("Connection failed", err);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase.from('users').select('*').eq('id', session.user.id).single().then(({ data }) => {
          if (data) {
            setCurrentUser(data);
            setView('dashboard');
          }
        });
      } else {
        setCurrentUser(null);
        setView('landing');
      }
    });

    return () => authListener?.subscription.unsubscribe();
  }, []);

  useEffect(() => { 
    document.documentElement.classList.toggle('dark', isDarkMode); 
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // --- معالجات الأحداث ---

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

      await supabase.from('users').insert([newUserProfile]);
      setCurrentUser(newUserProfile as User);
      setView('dashboard');
    } catch (err: any) {
      alert("خطأ في التسجيل: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: target.email.value,
        password: target.password.value
      });
      if (error) throw error;
    } catch (err: any) {
      alert("خطأ: " + err.message);
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!currentUser) return;
    setLoading(true);
    const newChan = {
      professorId: currentUser.id,
      name: newChannelData.name,
      department: newChannelData.department,
      description: newChannelData.description,
      price: newChannelData.price,
      subscribers: [],
      content: []
    };

    const { data, error } = await supabase.from('channels').insert([newChan]).select().single();
    if (error) {
      alert(error.message);
    } else {
      setChannels([...channels, data]);
      setShowCreateChannel(false);
      setNewChannelData({ name: '', department: '', description: '', price: 200 });
    }
    setLoading(false);
  };

  // Fix: Added missing handleFileChange function to handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddContent = async () => {
    if (!selectedFile || !selectedChannel) return;
    setLoading(true);
    // محاكاة رفع الملف (بما أنه تطبيق تجريبي، سنستخدم الرابط المحلي)
    const fileUrl = URL.createObjectURL(selectedFile);
    const newItem: ContentItem = {
      id: 'i' + Date.now(),
      type: newContentData.type,
      title: newContentData.title || selectedFile.name,
      url: fileUrl,
      createdAt: new Date()
    };

    const updatedContent = [...(selectedChannel.content || []), newItem];
    const { error } = await supabase.from('channels').update({ content: updatedContent }).eq('id', selectedChannel.id);
    
    if (error) {
      alert(error.message);
    } else {
      setChannels(channels.map(c => c.id === selectedChannel.id ? { ...c, content: updatedContent } : c));
      setSelectedChannel({ ...selectedChannel, content: updatedContent });
      setShowAddContent(false);
      setSelectedFile(null);
    }
    setLoading(false);
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

    await Promise.all([
      supabase.from('channels').update({ subscribers: updatedSubscribers }).eq('id', channelId),
      supabase.from('users').update({ walletBalance: newBalance }).eq('id', currentUser.id)
    ]);

    setChannels(channels.map(c => c.id === channelId ? { ...c, subscribers: updatedSubscribers } : c));
    setCurrentUser({ ...currentUser, walletBalance: newBalance });
    alert("تم الاشتراك بنجاح في القناة!");
    setLoading(false);
  };

  const handleJarvisChat = async () => {
    if (!jarvisInput.trim()) return;
    const text = jarvisInput;
    setJarvisInput('');
    setJarvisChat(prev => [...prev, { role: 'user', text }]);
    setIsJarvisThinking(true);
    const res = await jarvisAsk(text);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: res.text || '', sources: res.sources }]);
    setIsJarvisThinking(false);
  };

  const handleJarvisSummarize = async (item: ContentItem) => {
    setIsJarvisThinking(true);
    setIsJarvisOpen(true);
    setJarvisChat(prev => [...prev, { role: 'user', text: `يا جارفيس، لخصلي هاد الدرس: ${item.title}` }]);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: summary || '...' }]);
    setIsJarvisThinking(false);
  };

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
    setPersonalChats(prev => ({ ...prev, [key]: [...(prev[key] || []), msg] }));
    setChatInput('');
  };

  const getSubscribedProfs = () => {
    if (!currentUser) return [];
    const profIds = channels.filter(c => c.subscribers?.includes(currentUser.id)).map(c => c.professorId);
    return users.filter(u => u.role === 'professor' && profIds.includes(u.id));
  };

  // --- مكونات واجهة المستخدم ---

  const renderJarvisOverlay = () => (
    <div className={`fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-500 ${isJarvisOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsJarvisOpen(false)}></div>
      <div className="relative bg-white dark:bg-gray-900 w-full md:max-w-2xl h-[85vh] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
        <div className="p-6 bg-emerald-600 text-white flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-pulse">✨</span>
            <div>
              <h3 className="font-black text-xl leading-none">Jarvis الأكاديمي</h3>
              <p className="text-[10px] opacity-80 mt-1 uppercase font-bold tracking-widest">مطور من طرف ربيع • WAY</p>
            </div>
          </div>
          <button onClick={() => setIsJarvisOpen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/40 transition">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-gray-950/50 no-scrollbar">
          {jarvisChat.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <span className="text-8xl mb-4">🤖</span>
              <p className="font-black text-xl">واش راك محتاج يا بطل؟<br/>أنا جارفيس، راني هنا باش نعاونك.</p>
            </div>
          )}
          {jarvisChat.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in`}>
              <div className={`p-4 rounded-3xl max-w-[85%] text-sm font-medium leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 dark:text-white border dark:border-gray-700 rounded-tl-none'}`}>
                {m.text}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-[10px] space-y-1">
                    <p className="font-black text-emerald-600 mb-1">المصادر المكتشفة:</p>
                    {m.sources.map((s, idx) => s.web && (
                      <a key={idx} href={s.web.uri} target="_blank" rel="noreferrer" className="block underline hover:text-emerald-500 truncate">🔗 {s.web.title}</a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isJarvisThinking && (
            <div className="flex items-center gap-2 text-emerald-600 font-black text-xs px-2 animate-pulse">
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
              جارفيس يقوم بفلترة قواعد البيانات...
            </div>
          )}
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex gap-2">
          <input 
            value={jarvisInput} 
            onChange={e => setJarvisInput(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && handleJarvisChat()} 
            placeholder="اسأل جارفيس عن بحوث، مراجع، أو دروس..." 
            className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl dark:text-white outline-none focus:ring-2 ring-emerald-500 transition-all font-bold" 
          />
          <button onClick={handleJarvisChat} className="bg-emerald-600 text-white px-6 rounded-2xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition">🚀</button>
        </div>
      </div>
    </div>
  );

  // Fix: Defined renderContent to handle conditional view rendering based on the current system state
  const renderContent = () => {
    if (view === 'landing') {
      return (
        <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-6 text-center">
          <div className="animate-float mb-12">
            <h1 className="text-9xl font-black tracking-tighter mb-2 drop-shadow-2xl">WAY</h1>
            <p className="text-xl opacity-80 font-bold uppercase tracking-[0.2em]">جامعتك الرقمية</p>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <button onClick={() => setView('register-prof')} className="bg-white text-emerald-600 py-5 rounded-3xl font-black text-lg shadow-2xl hover:scale-105 transition-all btn-active">أنا أستاذ</button>
            <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white py-5 rounded-3xl font-black text-lg border-2 border-emerald-400 shadow-2xl hover:scale-105 transition-all btn-active">أنا طالب</button>
            <button onClick={() => setView('login')} className="mt-8 text-emerald-100 font-bold hover:underline">لديك حساب؟ سجل دخولك</button>
          </div>
          <footer className="absolute bottom-10 opacity-60 text-xs font-bold">بواسطة ربيع • Rabie - 2025</footer>
        </div>
      );
    }

    if (view.startsWith('register') || view === 'login') {
      const isReg = view.startsWith('register');
      const isProfView = view === 'register-prof';
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in duration-300">
            <h2 className="text-4xl font-black text-emerald-600 text-center">{view === 'login' ? 'مرحباً بعودتك' : 'انضم لـ WAY'}</h2>
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
              handleRegister(isProfView ? 'professor' : 'student', d);
            }}>
              {isReg && (
                <div className="grid grid-cols-2 gap-3">
                  <input name="fname" placeholder="الاسم" required className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white font-bold" />
                  <input name="lname" placeholder="اللقب" required className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white font-bold" />
                </div>
              )}
              <input name="email" type="email" placeholder="البريد الإلكتروني" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white font-bold" />
              <input name="password" type="password" placeholder="كلمة المرور" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white font-bold" />
              {isProfView && (
                <>
                  <select name="univ" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 dark:text-white font-bold">
                    <option value="">اختر الجامعة...</option>
                    {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select name="faculty" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 dark:text-white font-bold">
                    <option value="">اختر الكلية...</option>
                    {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </>
              )}
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
                {loading ? 'جاري التحقق...' : (view === 'login' ? 'دخول' : 'بدء الرحلة')}
              </button>
              <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 font-bold text-sm">رجوع للرئيسية</button>
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
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right font-sans overflow-x-hidden">
          {/* Sidebar Desktop */}
          <aside className="hidden md:flex w-72 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-8 flex-col gap-10 shadow-2xl z-50">
            <h2 className="text-4xl font-black text-emerald-600 text-center tracking-tighter">WAY</h2>
            <nav className="flex flex-col gap-3">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`p-5 rounded-2xl font-black flex items-center gap-4 transition-all ${activeTab === t.id ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-800'}`}>
                  <span className="text-2xl">{t.i}</span> {t.l}
                </button>
              ))}
            </nav>
          </aside>

          {/* Jarvis FAB */}
          <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-28 right-6 md:bottom-10 md:right-10 z-[110] w-16 h-16 md:w-20 md:h-20 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce border-4 border-white dark:border-gray-800 active:scale-90 transition">
            <span className="text-3xl md:text-4xl">✨</span>
          </button>
          {renderJarvisOverlay()}

          <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32 no-scrollbar">
            {activeTab === 'home' && (
              <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
                <header className="flex flex-col gap-2">
                   <h1 className="text-4xl font-black dark:text-white">مرحباً، {currentUser.firstName} 👋</h1>
                   <p className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">نظام التعليم الرقمي المتكامل</p>
                </header>
                
                {!isProf && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border dark:border-gray-800">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 px-1 uppercase">اختر الجامعة</label>
                      <select value={filterUniv} onChange={e => setFilterUniv(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white border dark:border-gray-700 outline-none focus:border-emerald-500 font-bold transition-all">
                        <option value="">كل الجامعات الجزائرية</option>
                        {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 px-1 uppercase">اختر الكلية</label>
                      <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white border dark:border-gray-700 outline-none focus:border-emerald-500 font-bold transition-all">
                        <option value="">كل الكليات والتخصصات</option>
                        {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {isProf ? (
                  <div className="space-y-6">
                    <button onClick={() => setShowCreateChannel(true)} className="w-full bg-emerald-600 text-white p-10 rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-4">
                      <span className="text-4xl">➕</span> إنشاء مادة دراسية جديدة
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {channels.filter(c => c.professorId === currentUser.id).map(c => (
                        <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group">
                          <div className="flex justify-between items-start mb-6">
                             <div>
                                <h4 className="font-black text-2xl dark:text-white group-hover:text-emerald-600 transition-colors">{c.name}</h4>
                                <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tighter">{c.department}</p>
                             </div>
                             <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black shadow-inner">{c.subscribers?.length || 0} طالب</span>
                          </div>
                          <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="w-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 py-4 rounded-2xl font-black hover:bg-emerald-600 hover:text-white transition-all shadow-sm">إدارة المحتوى</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="font-black text-2xl dark:text-white px-2">الأساتذة المتاحون</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {users.filter(u => u.role === 'professor' && (!filterUniv || u.university === filterUniv) && (!filterFaculty || u.faculty === filterFaculty)).map(prof => (
                        <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 text-center space-y-5 hover:border-emerald-500 transition-all shadow-sm group">
                          <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="md" />
                          <h4 className="font-black text-xl dark:text-white">{prof.firstName} {prof.lastName}</h4>
                          <div className="flex flex-col gap-2">
                             <button onClick={() => {
                               const chan = channels.find(c => c.professorId === prof.id);
                               if (chan) { setSelectedChannel(chan); setView('channel-view'); }
                               else alert("هذا الأستاذ لم يرفع دروساً بعد.");
                             }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl text-xs font-black shadow-lg group-hover:scale-105 transition-all">استعراض المواد الدراسية</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'my-channels' && !isProf && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-left duration-500">
                <h2 className="text-3xl font-black dark:text-white">قنواتي التعليمية 📡</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {channels.filter(c => c.subscribers?.includes(currentUser.id)).map(c => (
                    <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 flex justify-between items-center shadow-sm hover:shadow-lg transition-all border-r-8 border-r-emerald-600">
                      <div>
                        <h4 className="font-black text-2xl dark:text-white">{c.name}</h4>
                        <p className="text-xs text-emerald-600 font-bold mt-1 uppercase">{c.department}</p>
                      </div>
                      <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all">دخول</button>
                    </div>
                  ))}
                  {channels.filter(c => c.subscribers?.includes(currentUser.id)).length === 0 && (
                    <div className="col-span-full py-24 text-center opacity-10"><span className="text-[10rem] block mb-6">📡</span><p className="text-4xl font-black">لم تشترك في أي قناة بعد</p></div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="max-w-6xl mx-auto h-[75vh] flex bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border dark:border-gray-800 overflow-hidden">
                 <div className="w-1/3 border-l dark:border-gray-800 flex flex-col">
                    <div className="p-8 font-black text-emerald-600 border-b dark:border-gray-800 text-2xl bg-gray-50/50 dark:bg-gray-900/50">المحادثات</div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                      {(isProf ? users.filter(u => u.role === 'student') : getSubscribedProfs()).map(u => (
                        <button key={u.id} onClick={() => setActiveChatUserId(u.id)} className={`w-full p-6 text-right flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all border-b dark:border-gray-800 ${activeChatUserId === u.id ? 'bg-emerald-50 dark:bg-emerald-950/40 border-r-4 border-r-emerald-600' : ''}`}>
                           <ProfessorRank avatar={u.avatar} studentCount={u.studentCount || 0} size="sm" />
                           <div className="flex-1">
                             <p className="font-black dark:text-white text-md">{u.firstName} {u.lastName}</p>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{u.role === 'professor' ? 'أستاذ معتمد' : 'طالب'}</p>
                           </div>
                        </button>
                      ))}
                    </div>
                 </div>
                 <div className="flex-1 flex flex-col bg-gray-50/20 dark:bg-gray-950/20 relative">
                    {activeChatUserId ? (
                      <>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 pb-28 no-scrollbar">
                          {(personalChats[[currentUser.id, activeChatUserId].sort().join('_')] || []).map((m, i) => (
                            <div key={i} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-5`}>
                              <div className={`p-5 rounded-[1.5rem] max-w-[75%] shadow-md text-sm font-bold leading-relaxed ${m.senderId === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-none shadow-emerald-600/20' : 'bg-white dark:bg-gray-800 dark:text-white rounded-tl-none border dark:border-gray-700 shadow-gray-400/10'}`}>
                                {m.text}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex gap-4 shadow-2xl">
                          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendPersonal()} placeholder="اكتب استفسارك أو ردك هنا..." className="flex-1 bg-gray-100 dark:bg-gray-800 p-5 rounded-[1.5rem] dark:text-white outline-none focus:ring-4 ring-emerald-500/10 transition-all font-bold" />
                          <button onClick={handleSendPersonal} className="bg-emerald-600 text-white px-10 rounded-[1.5rem] font-black shadow-xl hover:bg-emerald-700 active:scale-95 transition-all">إرسال</button>
                        </div>
                      </>
                    ) : <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-6"><span className="text-[12rem]">💬</span><p className="text-4xl font-black">اختر محادثة لبدء التواصل</p></div>}
                 </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in duration-500">
                <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border dark:border-gray-800 shadow-sm text-center space-y-8">
                   <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="lg" />
                   <div className="space-y-2">
                      <h2 className="text-4xl font-black dark:text-white">{currentUser.firstName} {currentUser.lastName}</h2>
                      <p className="text-emerald-600 font-bold text-lg">{currentUser.email}</p>
                      <p className="text-gray-400 text-xs mt-4 uppercase font-black bg-gray-50 dark:bg-gray-800 py-3 rounded-full inline-block px-8">{currentUser.university} • {currentUser.faculty}</p>
                   </div>
                   
                   <div className="pt-10 grid grid-cols-1 gap-6">
                      <div className="flex justify-between items-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border dark:border-gray-800">
                         <div className="flex items-center gap-5">
                            <span className="text-4xl p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">{isDarkMode ? '🌙' : '☀️'}</span>
                            <span className="font-black text-xl dark:text-white">الوضع الليلي</span>
                         </div>
                         <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-16 h-10 rounded-full relative transition-colors p-1.5 ${isDarkMode ? 'bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`}>
                            <div className={`w-7 h-7 bg-white rounded-full transition-all shadow-xl ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                         </button>
                      </div>
                      <button onClick={async () => { await supabase.auth.signOut(); }} className="w-full text-red-500 font-black py-6 bg-red-50 dark:bg-red-950/20 rounded-[2.5rem] border-2 border-red-100 dark:border-red-900/20 transition-all hover:bg-red-100 hover:scale-[1.02] shadow-sm">تسجيل الخروج الآمن</button>
                   </div>
                </div>
              </div>
            )}
          </main>

          {/* Mobile Navbar */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex justify-around p-4 z-[100] pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex flex-col items-center gap-1.5 p-1 transition-all ${activeTab === t.id ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}>
                <span className="text-2xl">{t.i}</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{t.l}</span>
              </button>
            ))}
          </nav>
        </div>
      );
    }

    if (view === 'channel-view' && selectedChannel && currentUser) {
      const isOwner = selectedChannel.professorId === currentUser.id;
      const isSub = selectedChannel.subscribers?.includes(currentUser.id);

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-right animate-in fade-in duration-500">
          {showAddContent && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-12 rounded-[3rem] shadow-2xl space-y-8 animate-in zoom-in duration-300">
                <h3 className="text-3xl font-black text-emerald-600">رفع محتوى أكاديمي</h3>
                <div className="space-y-5">
                   <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder="اسم المطلب / عنوان الدرس..." className="w-full bg-gray-100 dark:bg-gray-800 p-5 rounded-[1.5rem] outline-none dark:text-white font-bold border-2 border-transparent focus:border-emerald-500 transition-all" />
                   <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,video/*,image/*" />
                   <button onClick={() => fileInputRef.current?.click()} className="w-full p-12 border-4 border-dashed border-emerald-100 dark:border-emerald-800 rounded-[2rem] flex flex-col items-center gap-4 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group">
                     <span className="text-7xl group-hover:scale-110 transition-transform">📁</span>
                     <span className="font-black text-emerald-700 dark:text-emerald-400 text-lg">{selectedFile ? selectedFile.name : 'اضغط للوصول للملفات'}</span>
                   </button>
                </div>
                <div className="flex gap-4">
                   <button onClick={handleAddContent} disabled={loading || !selectedFile} className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50">{loading ? 'جاري الرفع...' : 'نشر المحتوى'}</button>
                   <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 p-5 rounded-[1.5rem] font-black dark:text-white transition-all">إلغاء</button>
                </div>
              </div>
            </div>
          )}

          <header className="bg-white dark:bg-gray-900 p-6 shadow-xl flex justify-between items-center sticky top-0 z-50 border-b dark:border-gray-800">
             <button onClick={() => setView('dashboard')} className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-6 py-3 rounded-2xl font-black hover:bg-emerald-600 hover:text-white transition-all shadow-sm">✕ رجوع</button>
             <div className="text-center">
                <h2 className="font-black text-2xl dark:text-white">{selectedChannel.name}</h2>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">{selectedChannel.department}</p>
             </div>
             <div className="w-24"></div>
          </header>

          <main className="flex-1 p-6 md:p-12 overflow-y-auto space-y-8 max-w-5xl mx-auto w-full no-scrollbar pb-32">
            {!isOwner && !isSub ? (
              <div className="bg-white dark:bg-gray-900 p-16 rounded-[4rem] text-center space-y-8 shadow-2xl border-4 border-emerald-50 dark:border-emerald-900/20 animate-in zoom-in">
                 <span className="text-[12rem] block mb-4">🔒</span>
                 <h3 className="text-4xl font-black dark:text-white">هذا المحتوى مغلق حالياً</h3>
                 <p className="text-gray-500 font-bold text-xl leading-relaxed">بصفتك طالباً، يجب عليك الاشتراك في قناة الأستاذ للوصول إلى كامل الدروس، الملفات، والملخصات الذكية.</p>
                 <button onClick={() => handleSubscribe(selectedChannel.id)} disabled={loading} className="bg-emerald-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-2xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:scale-105 transition-all">
                   {loading ? 'جاري التحميل...' : `اشترك الآن بـ ${selectedChannel.price} دج`}
                 </button>
              </div>
            ) : (
              <>
                {isOwner && (
                  <button onClick={() => setShowAddContent(true)} className="w-full bg-white dark:bg-gray-900 border-4 border-dashed border-emerald-200 dark:border-emerald-800 p-16 rounded-[3rem] text-emerald-600 font-black flex flex-col items-center gap-4 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all shadow-sm group">
                    <span className="text-7xl group-hover:scale-110 transition-transform">➕</span> رفع مطلب أو درس أكاديمي جديد
                  </button>
                )}
                
                <div className="grid grid-cols-1 gap-6">
                  {selectedChannel.content?.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-2xl transition-all group border-r-8 border-r-emerald-500">
                       <div className="flex gap-4 w-full md:w-auto">
                         <button onClick={() => handleJarvisSummarize(item)} className="flex-1 bg-emerald-600 text-white px-8 py-4 rounded-[1.5rem] text-xs font-black shadow-lg active:scale-95 transition-all hover:bg-emerald-700">✨ تلخيص Jarvis</button>
                         <a href={item.url} target="_blank" rel="noreferrer" className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-8 py-4 rounded-[1.5rem] text-xs font-black text-center active:scale-95 transition-all hover:bg-emerald-100">📂 فتح الملف</a>
                       </div>
                       <div className="flex items-center gap-6 text-right w-full md:w-auto">
                          <div className="flex-1">
                             <p className="font-black dark:text-white text-2xl group-hover:text-emerald-600 transition-colors">{item.title}</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-widest">{new Date(item.createdAt).toLocaleDateString('ar-DZ')}</p>
                          </div>
                          <div className="p-5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-[1.5rem] text-4xl shadow-inner group-hover:rotate-12 transition-transform">
                             {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : '🖼️'}
                          </div>
                       </div>
                    </div>
                  ))}
                  {(!selectedChannel.content || selectedChannel.content.length === 0) && (
                    <div className="py-32 text-center opacity-10 flex flex-col items-center gap-6"><span className="text-[12rem]">📚</span><p className="text-4xl font-black">القناة فارغة حالياً</p></div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      );
    }

    return null;
  };

  // نافذة إنشاء قناة للأستاذ
  const renderCreateChannelModal = () => (
    <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity ${showCreateChannel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
       <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-12 rounded-[3rem] shadow-2xl space-y-8 animate-in zoom-in duration-300">
          <h3 className="text-3xl font-black text-emerald-600">إنشاء قناة مادة جديدة</h3>
          <div className="space-y-4">
             <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="اسم المادة (مثلاً: الاقتصاد الجزئي)..." className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-[1.5rem] outline-none dark:text-white font-bold border-2 border-transparent focus:border-emerald-500 transition-all" />
             <input value={newChannelData.department} onChange={e => setNewChannelData({...newChannelData, department: e.target.value})} placeholder="اسم القسم أو السنة الدراسية..." className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-[1.5rem] outline-none dark:text-white font-bold border-2 border-transparent focus:border-emerald-500 transition-all" />
             <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder="وصف موجز للمادة..." className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-[1.5rem] outline-none dark:text-white font-bold h-32 border-2 border-transparent focus:border-emerald-500 transition-all" />
             <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-950/20 p-5 rounded-[1.5rem]">
                <span className="font-black text-emerald-600">سعر الاشتراك (دج):</span>
                <input type="number" value={newChannelData.price} onChange={e => setNewChannelData({...newChannelData, price: Number(e.target.value)})} className="flex-1 bg-white dark:bg-gray-800 p-2 rounded-xl font-black text-center" />
             </div>
          </div>
          <div className="flex gap-4">
             <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-xl hover:bg-emerald-700 transition-all">تأكيد الإنشاء</button>
             <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 p-5 rounded-[1.5rem] font-black dark:text-white">إلغاء</button>
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen selection:bg-emerald-200 selection:text-emerald-900">
      {renderContent()}
      {renderCreateChannelModal()}
      
      {/* غطاء التحميل العالمي */}
      {loading && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-white/90 dark:bg-gray-950/90 backdrop-blur-md">
          <div className="relative flex items-center justify-center">
             <div className="w-32 h-32 border-8 border-emerald-100 border-t-emerald-600 rounded-full animate-spin shadow-2xl"></div>
             <span className="absolute font-black text-emerald-600 text-sm">WAY</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
