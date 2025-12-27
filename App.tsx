
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk, JARVIS_SYSTEM_INSTRUCTION, getJarvisAI } from './services/geminiService';
import { Modality } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = 'https://xvcqkdytqbqkdxyiwmzx.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.API_KEY || ''; 
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
  
  // Filtering
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');

  // Jarvis State
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  // Fix: Added sources to jarvisChat state to support Google Search grounding display
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string, sources?: any[]}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');

  // File Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat
  const [personalChats, setPersonalChats] = useState<Record<string, ChatMessage[]>>({}); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Modals
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', department: '', description: '', price: 200 });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' | 'image' });

  useEffect(() => {
    const initApp = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        if (profile) {
          setCurrentUser(profile);
          setView('dashboard');
        }
      }
      
      // Fetch all professors and channels
      const { data: allUsers } = await supabase.from('users').select('*').eq('role', 'professor');
      if (allUsers) setUsers(allUsers);
      
      const { data: allChannels } = await supabase.from('channels').select('*');
      if (allChannels) setChannels(allChannels);
    };
    initApp();
  }, []);

  useEffect(() => { 
    document.documentElement.classList.toggle('dark', isDarkMode); 
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleRegister = async (role: UserRole, data: any) => {
    setLoading(true);
    try {
      if (!supabase) throw new Error("Supabase is not connected");
      
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
        studentCount: 0,
        avatar: '',
      };

      await supabase.from('users').insert([newUserProfile]);
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
    if (!supabase) return;
    const target = e.target as any;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: target.email.value, 
        password: target.password.value 
      });
      if (error) throw error;
      const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      if (profile) {
        setCurrentUser(profile);
        setView('dashboard');
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const ext = file.name.split('.').pop()?.toLowerCase();
      let type: any = 'pdf';
      if (['png','jpg','jpeg'].includes(ext!)) type = 'image';
      else if (['mp4','mov','avi'].includes(ext!)) type = 'video';
      setNewContentData({ ...newContentData, title: file.name, type });
    }
  };

  const handleAddContent = async () => {
    if (!selectedFile || !selectedChannel) return;
    setLoading(true);
    // Simulation of upload (real would use supabase.storage)
    const fileUrl = URL.createObjectURL(selectedFile);
    const newItem: ContentItem = {
      id: 'i' + Date.now(),
      type: newContentData.type,
      title: newContentData.title,
      url: fileUrl,
      createdAt: new Date()
    };
    
    const updatedChannels = channels.map(c => 
      c.id === selectedChannel.id ? { ...c, content: [...(c.content || []), newItem] } : c
    );
    setChannels(updatedChannels);
    setSelectedChannel({ ...selectedChannel, content: [...(selectedChannel.content || []), newItem] });
    setShowAddContent(false);
    setSelectedFile(null);
    setLoading(false);
  };

  const handleCreateChannel = async () => {
    if (!currentUser || !newChannelData.name.trim()) return;
    const newChan: Channel = {
      id: 'c' + Date.now(),
      professorId: currentUser.id,
      name: newChannelData.name,
      description: newChannelData.description,
      department: newChannelData.department,
      price: newChannelData.price,
      subscribers: [],
      content: []
    };
    setChannels([...channels, newChan]);
    setShowCreateChannel(false);
    setNewChannelData({ name: '', department: '', description: '', price: 200 });
  };

  const handleJarvisChat = async () => {
    if (!jarvisInput.trim()) return;
    const msg = jarvisInput;
    setJarvisInput('');
    setJarvisChat(prev => [...prev, { role: 'user', text: msg }]);
    setIsJarvisThinking(true);
    const res = await jarvisAsk(msg);
    // Fix: Storing sources from grounding for Jarvis responses
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: res.text || '', sources: res.sources }]);
    setIsJarvisThinking(false);
  };

  const getSubscribedProfessors = () => {
    if (!currentUser) return [];
    const profIds = channels
      .filter(c => c.subscribers.includes(currentUser.id))
      .map(c => c.professorId);
    return users.filter(u => profIds.includes(u.id));
  };

  // Fix: Moved handleSendPersonal and handleJarvisSummarize up to prevent "used before declaration" errors
  const handleSendPersonal = () => {
    if (!chatInput.trim() || !currentUser || !activeChatUserId) return;
    const key = [currentUser.id, activeChatUserId].sort().join('_');
    const msg: ChatMessage = { id: Date.now().toString(), senderId: currentUser.id, senderName: currentUser.firstName, text: chatInput, timestamp: new Date() };
    setPersonalChats({ ...personalChats, [key]: [...(personalChats[key] || []), msg] });
    setChatInput('');
  };

  const handleJarvisSummarize = async (item: ContentItem) => {
    setIsJarvisThinking(true);
    setIsJarvisOpen(true);
    setJarvisChat(prev => [...prev, { role: 'user', text: `يا جارفيس، لخصلي هاد المطلب: ${item.title}` }]);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: summary || '...' }]);
    setIsJarvisThinking(false);
  };

  const renderJarvis = () => (
    <div className={`fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-500 ${isJarvisOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsJarvisOpen(false)}></div>
      <div className="relative bg-white dark:bg-gray-900 w-full md:max-w-2xl h-[80vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
          <h3 className="font-black">جارفيس - المساعد الأكاديمي</h3>
          <button onClick={() => setIsJarvisOpen(false)}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
          {jarvisChat.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 dark:text-white border'}`}>
                {m.text}
                {/* Fix: Rendering grounding sources for compliance with Google Search tool requirements */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-[10px] opacity-70">
                    <p className="font-bold mb-1">المصادر:</p>
                    <ul className="list-disc list-inside">
                      {m.sources.map((s, idx) => (
                        s.web && <li key={idx}><a href={s.web.uri} target="_blank" rel="noreferrer" className="underline">{s.web.title || s.web.uri}</a></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isJarvisThinking && <div className="text-xs text-emerald-600 animate-pulse font-bold">جارفيس يفكر...</div>}
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 flex gap-2">
          <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleJarvisChat()} placeholder="اسأل جارفيس..." className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-xl outline-none dark:text-white" />
          <button onClick={handleJarvisChat} className="bg-emerald-600 text-white px-4 rounded-xl">🚀</button>
        </div>
      </div>
    </div>
  );

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="animate-float mb-12">
          <h1 className="text-8xl font-black mb-2">WAY</h1>
          <p className="text-xl opacity-80">جامعتك الرقمية أينما كنت</p>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={() => setView('register-prof')} className="bg-white text-emerald-600 py-4 rounded-2xl font-black shadow-xl">أنا أستاذ</button>
          <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white py-4 rounded-2xl font-black border-2 border-emerald-400 shadow-xl">أنا طالب</button>
          <button onClick={() => setView('login')} className="mt-4 text-emerald-100 underline">لديك حساب؟ سجل دخولك</button>
        </div>
      </div>
    );
  }

  if (view === 'register-student' || view === 'register-prof' || view === 'login') {
    const isReg = view.startsWith('register');
    const isProf = view === 'register-prof';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6">
          <h2 className="text-2xl font-black text-emerald-600 text-center">{view === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}</h2>
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
              <div className="grid grid-cols-2 gap-2">
                <input name="fname" placeholder="الاسم" required className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border focus:border-emerald-500 outline-none dark:text-white" />
                <input name="lname" placeholder="اللقب" required className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border focus:border-emerald-500 outline-none dark:text-white" />
              </div>
            )}
            <input name="email" type="email" placeholder="البريد الإلكتروني" required className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border focus:border-emerald-500 outline-none dark:text-white" />
            <input name="password" type="password" placeholder="كلمة المرور" required className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border focus:border-emerald-500 outline-none dark:text-white" />
            {isProf && (
              <>
                <select name="univ" required className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border dark:text-white">
                  <option value="">اختر الجامعة...</option>
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select name="faculty" required className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border dark:text-white">
                  <option value="">اختر الكلية...</option>
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </>
            )}
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg">
              {loading ? 'جاري التحميل...' : (view === 'login' ? 'دخول' : 'بدء الرحلة')}
            </button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 text-sm">رجوع</button>
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
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex w-64 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-6 flex-col gap-6 shadow-xl">
          <h2 className="text-3xl font-black text-emerald-600 text-center">WAY</h2>
          <nav className="flex flex-col gap-2">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`p-4 rounded-xl font-bold flex items-center gap-3 transition ${activeTab === t.id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <span>{t.i}</span> {t.l}
              </button>
            ))}
          </nav>
        </aside>

        {/* Bottom Nav Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex justify-around p-2 z-[100] pb-safe">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex flex-col items-center p-2 ${activeTab === t.id ? 'text-emerald-600' : 'text-gray-400'}`}>
              <span className="text-xl">{t.i}</span>
              <span className="text-[10px] font-bold">{t.l}</span>
            </button>
          ))}
        </nav>

        {/* Jarvis FAB */}
        <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-24 right-4 md:bottom-10 md:right-10 z-[110] w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce">
          <span className="text-2xl">✨</span>
        </button>
        {renderJarvis()}

        <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32">
          {activeTab === 'home' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
              <h1 className="text-3xl font-black dark:text-white">مرحباً، {currentUser.firstName} 👋</h1>
              
              {!isProf && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-white dark:bg-gray-900 rounded-3xl border dark:border-gray-800">
                  <select value={filterUniv} onChange={e => setFilterUniv(e.target.value)} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white border outline-none">
                    <option value="">كل الجامعات</option>
                    {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white border outline-none">
                    <option value="">كل الكليات</option>
                    {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}

              {isProf ? (
                <div className="space-y-4">
                  <button onClick={() => setShowCreateChannel(true)} className="w-full bg-emerald-600 text-white p-6 rounded-3xl font-black text-xl shadow-xl">➕ إنشاء قناة مادة جديدة</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channels.filter(c => c.professorId === currentUser.id).map(c => (
                      <div key={c.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800 shadow-sm">
                        <h4 className="font-black text-lg dark:text-white">{c.name}</h4>
                        <p className="text-xs text-gray-400">{c.department}</p>
                        <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="mt-4 w-full bg-emerald-50 text-emerald-600 py-2 rounded-xl font-bold">إدارة المحتوى</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-black dark:text-white">الأساتذة المقترحون</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {users.filter(u => (!filterUniv || u.university === filterUniv) && (!filterFaculty || u.faculty === filterFaculty)).map(prof => (
                      <div key={prof.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800 text-center space-y-3">
                        <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="md" />
                        <h4 className="font-black dark:text-white">{prof.firstName} {prof.lastName}</h4>
                        <div className="flex gap-2">
                           <button onClick={() => {
                             const chan = channels.find(c => c.professorId === prof.id);
                             if (chan) { setSelectedChannel(chan); setView('channel-view'); }
                             else alert("هذا الأستاذ ليس لديه قنوات حالياً");
                           }} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs">عرض المواد</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'my-channels' && !isProf && (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-2xl font-black dark:text-white">قنواتي المشترك بها</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {channels.filter(c => c.subscribers.includes(currentUser.id)).map(c => (
                  <div key={c.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800 flex justify-between items-center shadow-md">
                    <div>
                      <h4 className="font-black dark:text-white">{c.name}</h4>
                      <p className="text-xs text-emerald-600">{c.department}</p>
                    </div>
                    <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold">دخول</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="max-w-5xl mx-auto h-[70vh] flex bg-white dark:bg-gray-900 rounded-3xl shadow-xl border dark:border-gray-800 overflow-hidden">
               <div className="w-1/3 border-l dark:border-gray-800 overflow-y-auto">
                  <div className="p-4 font-black text-emerald-600 border-b">المحادثات</div>
                  {(isProf ? users.filter(u => u.role === 'student') : getSubscribedProfessors()).map(u => (
                    <button key={u.id} onClick={() => setActiveChatUserId(u.id)} className={`w-full p-4 text-right flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition ${activeChatUserId === u.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>
                       <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">👤</div>
                       <div>
                         <p className="font-bold dark:text-white text-sm">{u.firstName} {u.lastName}</p>
                         <p className="text-[10px] text-gray-400">{u.role === 'professor' ? 'أستاذ' : 'طالب'}</p>
                       </div>
                    </button>
                  ))}
               </div>
               <div className="flex-1 flex flex-col bg-gray-50/30 dark:bg-gray-950/30 relative">
                  {activeChatUserId ? (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                        {(personalChats[[currentUser.id, activeChatUserId].sort().join('_')] || []).map((m, i) => (
                          <div key={i} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-2xl max-w-[70%] text-sm ${m.senderId === currentUser.id ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 dark:text-white shadow-sm'}`}>
                              {m.text}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t flex gap-2">
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendPersonal()} placeholder="اكتب رسالة..." className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-xl dark:text-white outline-none" />
                        <button onClick={handleSendPersonal} className="bg-emerald-600 text-white px-6 rounded-xl font-bold">إرسال</button>
                      </div>
                    </>
                  ) : <div className="flex-1 flex items-center justify-center opacity-20 font-black">اختر محادثة للبدء</div>}
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border dark:border-gray-800 shadow-sm text-center">
                 <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="lg" />
                 <h2 className="text-2xl font-black mt-4 dark:text-white">{currentUser.firstName} {currentUser.lastName}</h2>
                 <p className="text-emerald-600 font-bold">{currentUser.email}</p>
                 <div className="mt-8 flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <span className="font-bold dark:text-white">الوضع الليلي</span>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-6 rounded-full relative transition-colors ${isDarkMode ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                       <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isDarkMode ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
                 <button onClick={() => { if(supabase) supabase.auth.signOut(); setCurrentUser(null); setView('landing'); }} className="mt-6 w-full text-red-500 font-black py-4 border border-red-100 rounded-2xl">تسجيل الخروج</button>
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-right">
        {showAddContent && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-6 animate-in zoom-in">
              <h3 className="text-xl font-black text-emerald-600">رفع محتوى جديد</h3>
              <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder="اسم الدرس..." className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none dark:text-white" />
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,video/*,image/*" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full p-6 border-2 border-dashed border-emerald-300 rounded-2xl flex flex-col items-center gap-2 hover:bg-emerald-50 transition">
                <span className="text-3xl">📂</span>
                <span className="font-bold text-emerald-700">{selectedFile ? selectedFile.name : 'اختر ملف من جهازك'}</span>
              </button>
              <div className="flex gap-2">
                 <button onClick={handleAddContent} disabled={loading} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black">{loading ? 'جاري الرفع...' : 'حفظ ونشر'}</button>
                 <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 py-4 rounded-xl font-bold">إلغاء</button>
              </div>
            </div>
          </div>
        )}

        <header className="bg-white dark:bg-gray-900 p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
           <button onClick={() => setView('dashboard')} className="text-emerald-600 font-bold">✕ رجوع</button>
           <h2 className="font-black dark:text-white">{selectedChannel.name}</h2>
        </header>

        <main className="flex-1 p-4 md:p-10 overflow-y-auto space-y-4">
          {isProf && (
            <button onClick={() => setShowAddContent(true)} className="w-full bg-white dark:bg-gray-900 border-2 border-dashed border-emerald-400 p-8 rounded-3xl text-emerald-600 font-black flex flex-col items-center gap-2">
              <span className="text-4xl">➕</span> رفع درس جديد
            </button>
          )}
          
          {selectedChannel.content?.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl border dark:border-gray-800 shadow-sm flex justify-between items-center group">
               <div className="flex gap-2">
                 <button onClick={() => handleJarvisSummarize(item)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">✨ تلخيص</button>
                 <a href={item.url} target="_blank" className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold">📂 عرض</a>
               </div>
               <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-black dark:text-white text-sm">{item.title}</p>
                    <p className="text-[10px] text-gray-400">{item.type.toUpperCase()}</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">
                    {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : '🖼️'}
                  </div>
               </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  return null;
};

export default App;
