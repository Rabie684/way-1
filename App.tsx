
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk, JARVIS_SYSTEM_INSTRUCTION, getJarvisAI } from './services/geminiService';
import { Modality } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = 'https://xvcqkdytqbqkdxyiwmzx.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || ''; // Assume this is provided by the environment
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
  const [language, setLanguage] = useState<'ar' | 'en' | 'fr'>('ar');

  // Jarvis Global State
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string, sources?: any[]}[]>(() => {
    const saved = localStorage.getItem('jarvis_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [jarvisInput, setJarvisInput] = useState('');
  
  // Jarvis Live States
  const [isLiveActive, setIsLiveActive] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat/Broadcast
  const [personalChats, setPersonalChats] = useState<Record<string, ChatMessage[]>>({}); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [broadcastMessages, setBroadcastMessages] = useState<Record<string, ChatMessage[]>>({}); 
  const [chatInput, setChatInput] = useState('');

  // Modals
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', department: '', description: '', price: 200 });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' | 'image' });

  // References
  const chatEndRef = useRef<HTMLDivElement>(null);
  const jarvisEndRef = useRef<HTMLDivElement>(null);

  // Initialize Data and Check Auth Session
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          setCurrentUser(profile);
          setView('dashboard');
        }
      }
    };
    checkUser();

    // Mock initial data (could be fetched from Supabase in production)
    const targetUniv = "جامعة ابن خلدون ملحقة قصر الشلالة";
    const targetFaculty = "كلية العلوم الاقتصادية";
    setChannels([
      { id: 'c_b1', professorId: 'p5', name: 'الاقتصاد الجزئي', department: 'قسم التسيير', description: 'أساسيات الاقتصاد الجزئي للسنة الأولى.', price: 200, subscribers: [], content: [] },
      { id: 'c_a1', professorId: 'p6', name: 'الاقتصاد الكلي', department: 'قسم العلوم الاقتصادية', description: 'تحليل المتغيرات الكلية.', price: 150, subscribers: [], content: [] }
    ]);
  }, []);

  useEffect(() => {
    localStorage.setItem('jarvis_history', JSON.stringify(jarvisChat));
  }, [jarvisChat]);

  useEffect(() => { 
    document.documentElement.classList.toggle('dark', isDarkMode); 
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleRegister = async (role: UserRole, data: any) => {
    setLoading(true);
    try {
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      // 2. Create user profile in 'users' table
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

      const { error: dbError } = await supabase
        .from('users')
        .insert([newUserProfile]);

      if (dbError) throw dbError;

      setCurrentUser(newUserProfile as User);
      setView('dashboard');
      alert("تم التسجيل بنجاح! مرحبا بك في WAY.");
    } catch (err: any) {
      alert("خطأ في التسجيل: " + (err.message || "حاول مرة أخرى"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const email = target.email.value;
    const password = target.password.value;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (profile) {
        setCurrentUser(profile);
        setView('dashboard');
      }
    } catch (err: any) {
      alert("خطأ في تسجيل الدخول: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startJarvisLive = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = getJarvisAI();
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
        },
        callbacks: {
          onopen: () => {
            setIsLiveActive(true);
            const inCtx = new AudioContext({ sampleRate: 16000 });
            const source = inCtx.createMediaStreamSource(stream);
            const processor = inCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: encodeBase64(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              }));
            };
            source.connect(processor);
            processor.connect(inCtx.destination);
          },
          onmessage: async (msg) => {
            const audioBase64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioBase64 && audioContextRef.current) {
              const data = decodeBase64(audioBase64);
              const int16 = new Int16Array(data.buffer);
              const buffer = audioContextRef.current.createBuffer(1, int16.length, 24000);
              const channel = buffer.getChannelData(0);
              for (let i = 0; i < int16.length; i++) channel[i] = int16[i] / 32768.0;
              
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current.destination);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: () => setIsLiveActive(false)
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
    }
  };

  const decodeBase64 = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const encodeBase64 = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const stopJarvisLive = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    setIsLiveActive(false);
  };

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
    setIsJarvisThinking(true);
    setIsJarvisOpen(true);
    setJarvisChat(prev => [...prev, { role: 'user', text: `يا جارفيس، لخصلي هاد المطلب: ${item.title}` }]);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: summary || '...' }]);
    setIsJarvisThinking(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const ext = file.name.split('.').pop()?.toLowerCase();
      let detectedType: 'pdf' | 'video' | 'image' | 'text' = 'pdf';
      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) detectedType = 'image';
      else if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) detectedType = 'video';
      else if (['pdf'].includes(ext || '')) detectedType = 'pdf';
      setNewContentData({ ...newContentData, title: file.name, type: detectedType as any });
    }
  };

  const handleAddContent = () => {
    if (!newContentData.title.trim() || !selectedChannel) return;
    const fileUrl = selectedFile ? URL.createObjectURL(selectedFile) : '#';
    const newItem: ContentItem = { id: 'i' + Date.now(), type: newContentData.type, title: newContentData.title, url: fileUrl, createdAt: new Date() };
    const updatedChannels = channels.map(c => c.id === selectedChannel.id ? { ...c, content: [...c.content, newItem] } : c);
    setChannels(updatedChannels);
    setSelectedChannel(updatedChannels.find(c => c.id === selectedChannel.id) || null);
    setShowAddContent(false);
    setNewContentData({ title: '', type: 'pdf' });
    setSelectedFile(null);
  };

  const handleSendPersonal = () => {
    if (!chatInput.trim() || !currentUser || !activeChatUserId) return;
    const key = [currentUser.id, activeChatUserId].sort().join('_');
    const msg: ChatMessage = { id: Date.now().toString(), senderId: currentUser.id, senderName: currentUser.firstName, text: chatInput, timestamp: new Date() };
    setPersonalChats(prev => ({ ...prev, [key]: [...(prev[key] || []), msg] }));
    setChatInput('');
  };

  const handleSendBroadcast = () => {
    if (!chatInput.trim() || !selectedChannel || !currentUser) return;
    const newMessage: ChatMessage = { id: 'broadcast-' + Date.now(), senderId: currentUser.id, senderName: `${currentUser.firstName} ${currentUser.lastName}`, text: chatInput, timestamp: new Date() };
    setBroadcastMessages(prev => ({ ...prev, [selectedChannel.id]: [...(prev[selectedChannel.id] || []), newMessage] }));
    setChatInput('');
  };

  const subscribe = (chanId: string) => {
    if (!currentUser) return;
    const chan = channels.find(c => c.id === chanId);
    if (!chan || currentUser.walletBalance < chan.price) return alert('الرصيد لا يكفي');
    setCurrentUser({ ...currentUser, walletBalance: currentUser.walletBalance - chan.price });
    setChannels(prev => prev.map(c => c.id === chanId ? { ...c, subscribers: [...c.subscribers, currentUser.id] } : c));
    alert('تم الاشتراك بنجاح!');
  };

  const renderJarvisOverlay = () => (
    <div className={`fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-500 ${isJarvisOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-md" onClick={() => setIsJarvisOpen(false)}></div>
      <div className="relative bg-white dark:bg-gray-900 w-full md:max-w-4xl h-[95vh] md:h-[85vh] rounded-t-[3rem] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
        <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-600 to-green-800 text-white flex items-center justify-between shadow-lg">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl animate-pulse">✨</div>
              <div>
                 <h3 className="text-lg md:text-2xl font-black italic tracking-tight">Jarvis الأكاديمي</h3>
                 <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">بواسطة ربيع • WAY</p>
              </div>
           </div>
           <button onClick={() => setIsJarvisOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-gray-950/30 custom-scrollbar pb-32">
           {jarvisChat.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-5xl mb-4 shadow-xl border-4 border-white animate-float">🤖</div>
                <h4 className="text-2xl font-black text-emerald-900 dark:text-emerald-400">واش راك يا بطل؟ 👋</h4>
                <p className="text-gray-500 dark:text-gray-400 font-bold max-w-sm leading-relaxed text-sm">أنا جارفيس، المساعد الأكاديمي لمنصة WAY. راني هنا باش نعاونك في بحثك.</p>
                <button onClick={startJarvisLive} className="bg-emerald-600 text-white px-8 py-4 rounded-full font-black flex items-center gap-3 shadow-xl animate-pulse text-sm">🎙️ ابدأ تحدث مباشر</button>
             </div>
           ) : jarvisChat.map((msg, i) => (
             <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2 animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`p-4 md:p-7 rounded-[2rem] max-w-[95%] md:max-w-[85%] text-xs md:text-lg font-medium shadow-sm whitespace-pre-line leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border dark:border-gray-700 rounded-tl-none'}`}>
                   {msg.text}
                </div>
             </div>
           ))}
           {isJarvisThinking && (
             <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl w-fit animate-pulse border border-emerald-100">
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-150"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-300"></div>
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 italic">جارفيس راهو يقلب...</span>
             </div>
           )}
           <div ref={jarvisEndRef} />
        </div>
        <div className="p-4 md:p-8 bg-white dark:bg-gray-900 border-t dark:border-gray-800 shadow-2xl mb-safe">
           <div className="flex gap-2 items-center">
              <button onClick={isLiveActive ? stopJarvisLive : startJarvisLive} className={`p-4 rounded-2xl shadow-xl transition-all active:scale-90 ${isLiveActive ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>{isLiveActive ? '⏹️' : '🎙️'}</button>
              <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleJarvisChat()} placeholder="اسأل جارفيس..." className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3 font-bold text-sm outline-none dark:text-white border-2 border-transparent focus:border-emerald-500 transition-all shadow-inner" />
              <button onClick={handleJarvisChat} className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl active:scale-90 transition">🚀</button>
           </div>
        </div>
      </div>
    </div>
  );

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-green-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="animate-float mb-12">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-2">WAY</h1>
          <p className="text-lg md:text-2xl font-light opacity-80">جامعتك الرقمية أينما كنت</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          <button onClick={() => setView('register-prof')} className="bg-white text-emerald-900 p-6 rounded-3xl font-black text-lg shadow-xl hover:scale-105 transition-all">أنا أستاذ</button>
          <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white p-6 rounded-3xl font-black text-lg border-2 border-emerald-400 shadow-xl hover:scale-105 transition-all">أنا طالب</button>
        </div>
        <button onClick={() => setView('login')} className="mt-8 text-emerald-100 font-bold hover:underline">لديك حساب بالفعل؟ تسجيل الدخول</button>
      </div>
    );
  }

  if (view === 'register-student' || view === 'register-prof') {
    const isProfReg = view === 'register-prof';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 space-y-6">
          <h2 className="text-2xl font-black text-emerald-600 text-center">حساب جديد - {isProfReg ? 'أستاذ' : 'طالب'}</h2>
          <form className="space-y-4" onSubmit={(e: any) => { 
            e.preventDefault(); 
            const data = {
              firstName: e.target.fname.value, 
              lastName: e.target.lname.value, 
              email: e.target.email.value,
              password: e.target.password.value,
              university: isProfReg ? e.target.univ.value : '',
              faculty: isProfReg ? e.target.faculty.value : ''
            };
            handleRegister(isProfReg ? 'professor' : 'student', data); 
          }}>
            <div className="grid grid-cols-2 gap-4">
              <input name="fname" placeholder="الاسم" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none border focus:border-emerald-500 transition font-bold" />
              <input name="lname" placeholder="اللقب" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none border focus:border-emerald-500 transition font-bold" />
            </div>
            <input name="email" type="email" placeholder="البريد الإلكتروني" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none border focus:border-emerald-500 transition font-bold" />
            <input name="password" type="password" placeholder="كلمة المرور" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none border focus:border-emerald-500 transition font-bold" />
            {isProfReg && (
              <>
                <select name="univ" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none border focus:border-emerald-500 transition font-bold">
                  <option value="">اختر الجامعة...</option>
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select name="faculty" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none border focus:border-emerald-500 transition font-bold">
                  <option value="">اختر الكلية...</option>
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </>
            )}
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg disabled:opacity-50">
              {loading ? "جاري الإنشاء..." : "ابدأ الآن"}
            </button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 text-sm font-bold">رجوع</button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 space-y-6">
          <h2 className="text-2xl font-black text-emerald-600 text-center">تسجيل الدخول</h2>
          <form className="space-y-4" onSubmit={handleLogin}>
            <input name="email" type="email" placeholder="البريد الإلكتروني" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none border focus:border-emerald-500 transition font-bold" />
            <input name="password" type="password" placeholder="كلمة المرور" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none border focus:border-emerald-500 transition font-bold" />
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg disabled:opacity-50">
              {loading ? "جاري الدخول..." : "دخول"}
            </button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 text-sm font-bold">رجوع للرئيسية</button>
          </form>
        </div>
      </div>
    );
  }

  if (currentUser && view === 'dashboard') {
    const isProf = currentUser.role === 'professor';
    const mobileTabs = isProf ? [
      {id:'home', l: 'الرئيسية', i: '🏠'},
      {id:'messages', l: 'الرسائل', i: '💬'}, 
      {id:'wallet', l: 'المحفظة', i: '💰'},
      {id:'profile', l: 'الملف', i: '👤'}
    ] : [
      {id:'home', l: 'اكتشاف', i: '🔍'},
      {id:'my-channels', l: 'قنواتي', i: '📡'},
      {id:'messages', l: 'الرسائل', i: '💬'}, 
      {id:'wallet', l: 'المحفظة', i: '💰'},
      {id:'profile', l: 'الملف', i: '👤'}
    ];

    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right relative overflow-x-hidden">
        <aside className="hidden md:flex w-72 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-8 flex-col gap-8 shadow-xl z-50">
          <div className="flex justify-center"><h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">WAY</h2></div>
          <nav className="flex flex-col gap-2">
            {mobileTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`p-4 rounded-2xl font-black text-right transition flex items-center gap-4 ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <span>{tab.i}</span> {tab.l}
              </button>
            ))}
          </nav>
        </aside>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 z-[100] flex justify-around items-center p-2 mb-safe shadow-2xl">
           {mobileTabs.map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1 p-3 transition-all ${activeTab === tab.id ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}>
                <span className="text-xl">{tab.i}</span>
                <span className="text-[10px] font-black">{tab.l}</span>
             </button>
           ))}
        </nav>

        <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-24 right-4 md:bottom-10 md:right-10 z-[110] w-14 h-14 md:w-20 md:h-20 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce border-4 border-white dark:border-gray-800 transition-all active:scale-90">
           <span className="text-2xl md:text-3xl">✨</span>
        </button>
        {renderJarvisOverlay()}

        <main className="flex-1 p-4 md:p-12 overflow-y-auto pb-32">
          {activeTab === 'home' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
               <div className="flex flex-col gap-2">
                  <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">أهلاً بك، {currentUser.firstName} 👋</h1>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">{currentUser.university}</p>
               </div>
               {isProf && (
                 <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-xl flex items-center justify-around">
                    <div className="text-center">
                       <p className="text-[10px] font-black uppercase opacity-70">إجمالي الطلاب</p>
                       <p className="text-3xl font-black">{currentUser.studentCount || 0}</p>
                    </div>
                    <div className="w-px h-10 bg-white/20"></div>
                    <div className="text-center">
                       <p className="text-[10px] font-black uppercase opacity-70">القنوات</p>
                       <p className="text-3xl font-black">{channels.filter(c => c.professorId === currentUser.id).length}</p>
                    </div>
                 </div>
               )}
               {/* Dashboard content based on tabs... */}
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-3xl border dark:border-gray-800 shadow-sm space-y-8">
               <div className="flex flex-col items-center gap-4 text-center">
                  <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="lg" />
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black dark:text-white">{currentUser.firstName} {currentUser.lastName}</h2>
                    <p className="text-emerald-600 dark:text-emerald-400 font-black">{currentUser.email}</p>
                    <span className="inline-block bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 px-4 py-2 rounded-full text-[10px] font-black tracking-tighter uppercase mt-2">{currentUser.role === 'professor' ? '🛡️ أستاذ معتمد' : '🎓 طالب مفعل'}</span>
                  </div>
               </div>
               <button onClick={async () => { await supabase.auth.signOut(); setCurrentUser(null); setView('landing'); }} className="w-full text-red-500 font-black hover:bg-red-50 dark:hover:bg-red-950/20 py-4 rounded-2xl transition-all border border-red-100 dark:border-red-900/20">تسجيل الخروج</button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
};

export default App;
