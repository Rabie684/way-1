
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk, JARVIS_SYSTEM_INSTRUCTION } from './services/geminiService';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration - Safe initialization
const supabaseUrl = 'https://xvcqkdytqbqkdxyiwmzx.supabase.co';
const supabaseKey = process.env.API_KEY || ''; 
let supabase: any = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {
  console.error("Supabase initialization failed", e);
}

const App: React.FC = () => {
  // --- Core State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'login' | 'dashboard' | 'channel-view'>('landing');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'my-channels' | 'messages' | 'wallet' | 'profile'>('home');
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  // UI Preferences
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');

  // Jarvis & Chat State
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string, sources?: any[]}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');
  const [personalChats, setPersonalChats] = useState<Record<string, ChatMessage[]>>({}); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Modals & Upload
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newChannelData, setNewChannelData] = useState({ name: '', department: '', description: '', price: 200 });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' | 'image' });

  // --- Effects ---
  useEffect(() => {
    const init = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
          if (profile) {
            setCurrentUser(profile);
            setView('dashboard');
          }
        }
        
        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData) setUsers(usersData);
        
        const { data: channelsData } = await supabase.from('channels').select('*');
        if (channelsData) setChannels(channelsData);
      } catch (err) {
        console.error("Initialization error", err);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase?.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        supabase.from('users').select('*').eq('id', session.user.id).single().then(({ data }: any) => {
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

  // --- Handlers ---
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
    } catch (err: any) {
      alert("خطأ: " + err.message);
      setLoading(false);
    }
  };

  const handleRegister = async (role: UserRole, data: any) => {
    if (!supabase) return;
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
      alert("خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
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

  const handleSubscribe = async (channelId: string) => {
    if (!currentUser || !supabase) return;
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
      setChannels(prev => prev.map(c => c.id === channelId ? { ...c, subscribers: updatedSubscribers } : c));
      setCurrentUser(prev => prev ? { ...prev, walletBalance: newBalance } : null);
      alert("تم الاشتراك بنجاح!");
    } else {
      alert("حدث خطأ أثناء الاشتراك.");
    }
    setLoading(false);
  };

  // --- Render Sections ---

  const renderLanding = () => (
    <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-6 text-center">
      <div className="animate-float mb-12">
        <h1 className="text-9xl font-black tracking-tighter mb-2">WAY</h1>
        <p className="text-xl opacity-80 font-bold">جامعتك الرقمية أينما كنت</p>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button onClick={() => setView('register-prof')} className="bg-white text-emerald-600 py-5 rounded-3xl font-black text-lg shadow-2xl btn-active">أنا أستاذ</button>
        <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white py-5 rounded-3xl font-black text-lg border-2 border-emerald-400 shadow-2xl btn-active">أنا طالب</button>
        <button onClick={() => setView('login')} className="mt-6 text-emerald-100 font-bold hover:underline">لديك حساب؟ سجل دخولك</button>
      </div>
    </div>
  );

  const renderAuthForm = () => {
    const isReg = view.startsWith('register');
    const isProfView = view === 'register-prof';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6">
          <h2 className="text-3xl font-black text-emerald-600 text-center">{view === 'login' ? 'دخول' : 'حساب جديد'}</h2>
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
                <input name="fname" placeholder="الاسم" required className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white" />
                <input name="lname" placeholder="اللقب" required className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white" />
              </div>
            )}
            <input name="email" type="email" placeholder="البريد الإلكتروني" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white" />
            <input name="password" type="password" placeholder="كلمة المرور" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 outline-none dark:text-white" />
            {isProfView && (
              <>
                <select name="univ" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:text-white">
                  <option value="">اختر الجامعة...</option>
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select name="faculty" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:text-white">
                  <option value="">اختر الكلية...</option>
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </>
            )}
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition">
              {view === 'login' ? 'دخول' : 'بدء الرحلة'}
            </button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 font-bold text-sm">رجوع</button>
          </form>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    if (!currentUser) return null;
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
        {/* Sidebar */}
        <aside className="hidden md:flex w-72 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-8 flex-col gap-10 shadow-2xl">
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
        <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-28 right-6 md:bottom-10 md:right-10 z-[110] w-16 h-16 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white dark:border-gray-800">
          <span className="text-3xl">✨</span>
        </button>

        {/* Jarvis Overlay */}
        {isJarvisOpen && (
          <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsJarvisOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-900 w-full md:max-w-2xl h-[85vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-5 bg-emerald-600 text-white flex justify-between items-center">
                <h3 className="font-black text-lg">✨ Jarvis الأكاديمي</h3>
                <button onClick={() => setIsJarvisOpen(false)}>✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 dark:bg-gray-950 no-scrollbar">
                {jarvisChat.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-2xl max-w-[85%] text-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 dark:text-white border dark:border-gray-700 rounded-tl-none shadow-sm'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex gap-2">
                <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleJarvisChat()} placeholder="اسأل جارفيس..." className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl dark:text-white outline-none" />
                <button onClick={handleJarvisChat} className="bg-emerald-600 text-white px-6 rounded-2xl font-black">🚀</button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32">
          {activeTab === 'home' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <h1 className="text-4xl font-black dark:text-white">أهلاً، {currentUser.firstName} 👋</h1>
              {isProf ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {channels.filter(c => c.professorId === currentUser.id).map(c => (
                    <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border dark:border-gray-800 shadow-sm">
                      <h4 className="font-black text-xl dark:text-white">{c.name}</h4>
                      <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="mt-4 w-full bg-emerald-50 text-emerald-600 py-3 rounded-xl font-black">إدارة</button>
                    </div>
                  ))}
                  <button onClick={() => setShowCreateChannel(true)} className="bg-emerald-600 text-white p-8 rounded-[2rem] font-black text-xl shadow-xl">➕ مادة جديدة</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {users.filter(u => u.role === 'professor').map(prof => (
                    <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border dark:border-gray-800 text-center space-y-4 shadow-sm">
                      <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="md" />
                      <h4 className="font-black text-lg dark:text-white">{prof.firstName} {prof.lastName}</h4>
                      <button onClick={() => {
                        const chan = channels.find(c => c.professorId === prof.id);
                        if (chan) { setSelectedChannel(chan); setView('channel-view'); }
                        else alert("لا توجد مواد.");
                      }} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black">المواد</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto bg-white dark:bg-gray-900 p-10 rounded-[3rem] text-center space-y-6">
               <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="lg" />
               <h2 className="text-3xl font-black dark:text-white">{currentUser.firstName} {currentUser.lastName}</h2>
               <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl font-black dark:text-white">
                 {isDarkMode ? '☀️ الوضع النهاري' : '🌙 الوضع الليلي'}
               </button>
               <button onClick={() => supabase?.auth.signOut()} className="w-full text-red-500 font-black py-5 bg-red-50 rounded-2xl">خروج</button>
            </div>
          )}
        </main>

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex justify-around p-3 z-[100] pb-safe">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex flex-col items-center gap-1 ${activeTab === t.id ? 'text-emerald-600' : 'text-gray-400'}`}>
              <span className="text-2xl">{t.i}</span>
              <span className="text-[10px] font-black">{t.l}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  };

  const renderChannelView = () => {
    if (!selectedChannel || !currentUser) return null;
    const isOwner = selectedChannel.professorId === currentUser.id;
    const isSub = selectedChannel.subscribers?.includes(currentUser.id);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-right">
        <header className="bg-white dark:bg-gray-900 p-5 shadow-lg flex justify-between items-center">
           <button onClick={() => setView('dashboard')} className="text-emerald-600 font-black">✕ رجوع</button>
           <h2 className="font-black text-xl dark:text-white">{selectedChannel.name}</h2>
           <div className="w-10"></div>
        </header>
        <main className="flex-1 p-6 space-y-4 max-w-4xl mx-auto w-full">
          {!isOwner && !isSub ? (
            <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] text-center space-y-6">
              <span className="text-8xl block">🔒</span>
              <button onClick={() => handleSubscribe(selectedChannel.id)} className="bg-emerald-600 text-white px-12 py-5 rounded-[2rem] font-black text-xl">
                اشترك بـ {selectedChannel.price} دج
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               {selectedChannel.content?.map(item => (
                 <div key={item.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 flex justify-between items-center">
                    <button onClick={() => handleJarvisSummarize(item)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-black">✨ تلخيص</button>
                    <div className="text-right">
                       <p className="font-black dark:text-white">{item.title}</p>
                       <p className="text-[10px] text-gray-400">{item.type}</p>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </main>
      </div>
    );
  };

  // --- Main Render Controller ---
  const renderContent = () => {
    switch(view) {
      case 'landing': return renderLanding();
      case 'register-student':
      case 'register-prof':
      case 'login': return renderAuthForm();
      case 'dashboard': return renderDashboard();
      case 'channel-view': return renderChannelView();
      default: return renderLanding();
    }
  };

  return (
    <div className="min-h-screen">
      {renderContent()}
      
      {/* Global Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
          <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default App;
