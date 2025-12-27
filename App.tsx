
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk, JARVIS_SYSTEM_INSTRUCTION, getJarvisAI } from './services/geminiService';
import { Modality } from '@google/genai';

const App: React.FC = () => {
  // Core State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'dashboard' | 'channel-view'>('landing');
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

  // Other UI States
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);
  const [personalChats, setPersonalChats] = useState<Record<string, ChatMessage[]>>({}); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [broadcastMessages, setBroadcastMessages] = useState<Record<string, ChatMessage[]>>({}); 
  const [chatInput, setChatInput] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', department: '', description: '', price: 200 });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' | 'image' });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const jarvisEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targetUniv = "جامعة ابن خلدون ملحقة قصر الشلالة";
    const targetFaculty = "كلية العلوم الاقتصادية";
    
    const mockProfs: User[] = [
      { id: 'p5', firstName: 'بختة', lastName: 'بن الطاهر', specialty: 'الاقتصاد الجزئي', email: 'bentahar@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 1250, avatar: '', isApproved: true, studentCount: 120, paymentMethod: 'bentahar.ccp@algeriepost.dz' },
      { id: 'p6', firstName: 'أيت عيسى', lastName: '', specialty: 'الاقتصاد الكلي', email: 'aitissa@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 850, avatar: '', isApproved: true, studentCount: 105 },
    ];
    
    const mockStudent: User = { id: 's1', firstName: 'ربيع', lastName: 'حمر العين', email: 'rabieriri665@gmail.com', role: 'student', walletBalance: 2500, avatar: '', isApproved: true, phoneNumber: '0781723461', university: targetUniv, faculty: targetFaculty };
    
    setUsers([...mockProfs, mockStudent]);
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

  useEffect(() => { 
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; 
    document.documentElement.lang = language; 
  }, [language]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [personalChats, broadcastMessages, activeChatUserId, channelTab]);
  useEffect(() => { jarvisEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [jarvisChat, isJarvisThinking]);

  const t = (ar: string, en: string, fr: string = "") => {
    if (language === 'ar') return ar;
    if (language === 'fr') return fr || en;
    return en;
  };

  const handleRegister = (role: UserRole, data: { firstName: string, lastName: string, email: string, university?: string, faculty?: string }) => {
    const newUser: User = {
      id: 'u' + Date.now(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: role,
      university: data.university,
      faculty: data.faculty,
      walletBalance: role === 'student' ? 1000 : 0,
      avatar: '',
      isApproved: true,
      studentCount: 0,
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    setView('dashboard');
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
      
      setNewContentData({
        ...newContentData,
        title: file.name,
        type: detectedType as any
      });
    }
  };

  const handleAddContent = () => {
    if (!newContentData.title.trim() || !selectedChannel) return;
    const fileUrl = selectedFile ? URL.createObjectURL(selectedFile) : '#';
    const newItem: ContentItem = {
      id: 'i' + Date.now(),
      type: newContentData.type,
      title: newContentData.title,
      url: fileUrl, 
      createdAt: new Date()
    };
    const updatedChannels = channels.map(c => 
      c.id === selectedChannel.id ? { ...c, content: [...c.content, newItem] } : c
    );
    setChannels(updatedChannels);
    setSelectedChannel(updatedChannels.find(c => c.id === selectedChannel.id) || null);
    setShowAddContent(false);
    setNewContentData({ title: '', type: 'pdf' });
    setSelectedFile(null);
  };

  const handleSendPersonal = (imageUrl?: string) => {
    if ((!chatInput.trim() && !imageUrl) || !currentUser || !activeChatUserId) return;
    const key = [currentUser.id, activeChatUserId].sort().join('_');
    const msg: ChatMessage = { 
      id: Date.now().toString(), 
      senderId: currentUser.id, 
      senderName: currentUser.firstName, 
      text: chatInput, 
      imageUrl: imageUrl,
      timestamp: new Date() 
    };
    setPersonalChats(prev => ({ ...prev, [key]: [...(prev[key] || []), msg] }));
    setChatInput('');
  };

  const handleSendBroadcast = () => {
    if (!chatInput.trim() || !selectedChannel || !currentUser) return;
    const newMessage: ChatMessage = {
      id: 'broadcast-' + Date.now(),
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      text: chatInput,
      timestamp: new Date()
    };
    setBroadcastMessages(prev => ({
      ...prev,
      [selectedChannel.id]: [...(prev[selectedChannel.id] || []), newMessage]
    }));
    setChatInput('');
  };

  const subscribe = (chanId: string) => {
    if (!currentUser) return;
    const chan = channels.find(c => c.id === chanId);
    if (!chan || currentUser.walletBalance < chan.price) return alert(t('الرصيد لا يكفي', 'Insufficient balance', 'Solde insuffisant'));
    const updatedStudent = { ...currentUser, walletBalance: currentUser.walletBalance - chan.price };
    setCurrentUser(updatedStudent);
    setChannels(prev => prev.map(c => c.id === chanId ? { ...c, subscribers: [...c.subscribers, currentUser.id] } : c));
    alert(t('تم الاشتراك بنجاح!', 'Subscribed successfully!', 'Abonné avec succès !'));
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
           {jarvisChat.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-5xl mb-4 shadow-xl border-4 border-white animate-float">🤖</div>
                <h4 className="text-2xl font-black text-emerald-900 dark:text-emerald-400">واش راك يا بطل؟ 👋</h4>
                <p className="text-gray-500 dark:text-gray-400 font-bold max-w-sm leading-relaxed text-sm">أنا جارفيس، المساعد الأكاديمي لمنصة WAY. راني هنا باش نعاونك في بحثك.</p>
                <button onClick={startJarvisLive} className="bg-emerald-600 text-white px-8 py-4 rounded-full font-black flex items-center gap-3 shadow-xl animate-pulse text-sm">🎙️ ابدأ تحدث مباشر</button>
             </div>
           )}
           {jarvisChat.map((msg, i) => (
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
        <div className="mt-12 flex flex-col gap-4">
          <button onClick={() => { setCurrentUser(users.find(u => u.email === 'rabieriri665@gmail.com') || null); setView('dashboard'); }} className="text-emerald-100 underline font-bold text-sm">دخول سريع: ربيع (طالب)</button>
          <button onClick={() => { setCurrentUser(users.find(u => u.id === 'p5') || null); setView('dashboard'); }} className="text-emerald-50 underline font-bold text-sm opacity-80">دخول سريع: بختة (أستاذ)</button>
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
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right transition-colors relative overflow-x-hidden">
        
        {/* Desktop Sidebar */}
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

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 z-[100] flex justify-around items-center p-2 mb-safe shadow-2xl">
           {mobileTabs.map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1 p-3 transition-all ${activeTab === tab.id ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}>
                <span className="text-xl">{tab.i}</span>
                <span className="text-[10px] font-black">{tab.l}</span>
             </button>
           ))}
        </nav>

        {/* Jarvis Button FAB */}
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

               {!isProf ? (
                 <>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-gray-900 p-4 rounded-3xl border dark:border-gray-800 shadow-sm">
                      <select value={filterUniv || currentUser.university} onChange={e => setFilterUniv(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl dark:text-white outline-none border focus:border-emerald-500 transition-all text-sm font-bold">
                         <option value="">اختر الجامعة...</option>
                         {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <select value={filterFaculty || currentUser.faculty} onChange={e => setFilterFaculty(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl dark:text-white outline-none border focus:border-emerald-500 transition-all text-sm font-bold">
                         <option value="">اختر الكلية...</option>
                         {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                   </div>
                   
                   <div className="space-y-4">
                      <h3 className="font-black text-lg px-2 flex items-center gap-2">
                         <span className="w-2 h-6 bg-emerald-600 rounded-full"></span>
                         الأساتذة المتاحون
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {users.filter(u => u.role === 'professor' && u.university === (filterUniv || currentUser.university) && u.faculty === (filterFaculty || currentUser.faculty)).map(prof => (
                           <div key={prof.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800 shadow-sm text-center space-y-4 hover:border-emerald-500 transition-all">
                              <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="md" />
                              <h4 className="font-black dark:text-white">{prof.firstName} {prof.lastName}</h4>
                              <div className="flex gap-2">
                                 <button onClick={() => setSelectedProfId(prof.id)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition">المواد</button>
                                 <button onClick={() => { setActiveChatUserId(prof.id); setActiveTab('messages'); }} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xl hover:bg-emerald-50 transition active:scale-90">💬</button>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   {selectedProfId && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-5">
                        {channels.filter(c => c.professorId === selectedProfId).map(chan => (
                          <div key={chan.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800 shadow-sm flex flex-col justify-between group">
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                   <h4 className="font-black text-lg dark:text-white group-hover:text-emerald-600 transition">{chan.name}</h4>
                                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{chan.department || 'عام'}</p>
                                </div>
                                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[10px] px-2 py-1 rounded-lg font-black">{chan.subscribers.length} طالب</span>
                             </div>
                             <button onClick={() => chan.subscribers.includes(currentUser.id) ? (setSelectedChannel(chan), setView('channel-view')) : subscribe(chan.id)} className="w-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 py-3.5 rounded-xl font-black hover:bg-emerald-600 hover:text-white transition shadow-sm active:scale-95">
                               {chan.subscribers.includes(currentUser.id) ? 'دخول القناة' : `اشتراك (${chan.price} دج)`}
                             </button>
                          </div>
                        ))}
                     </div>
                   )}
                 </>
               ) : (
                 <div className="space-y-6">
                    <button onClick={() => setShowCreateChannel(true)} className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition">
                       <span className="text-2xl">➕</span> إنشاء قناة جديدة
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {channels.filter(c => c.professorId === currentUser.id).map(c => (
                         <div key={c.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800 shadow-sm group hover:border-emerald-500 transition-all">
                            <div className="flex justify-between items-start mb-4">
                               <div>
                                  <h4 className="font-black text-lg dark:text-white">{c.name}</h4>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.department || 'بدون قسم'}</p>
                               </div>
                               <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-1 rounded-lg font-black">
                                  {c.subscribers.length} طالب
                               </div>
                            </div>
                            <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black hover:bg-emerald-700 transition active:scale-95">إدارة</button>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
               <div className="bg-gradient-to-br from-emerald-600 to-green-800 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                  <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">رصيدك الحالي</p>
                  <h3 className="text-5xl font-black mb-6 flex items-baseline gap-2">{currentUser.walletBalance.toLocaleString()}<span className="text-lg opacity-60">دج</span></h3>
                  <div className="flex gap-3">
                     <button className="flex-1 bg-white text-emerald-800 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition">⚡ شحن</button>
                     <button className="flex-1 bg-emerald-500/30 backdrop-blur-md border border-white/20 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition">💰 سحب</button>
                  </div>
               </div>
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
               <div className="pt-8 border-t dark:border-gray-800 space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl">
                     <div className="flex items-center gap-3"><span className="text-xl">{isDarkMode ? '🌙' : '☀️'}</span><span className="font-black text-sm dark:text-white">الوضع الليلي</span></div>
                     <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-6 rounded-full relative transition-colors p-1 ${isDarkMode ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-md ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                     </button>
                  </div>
                  <button onClick={() => setView('landing')} className="w-full text-red-500 font-black hover:bg-red-50 dark:hover:bg-red-950/20 py-4 rounded-2xl transition-all border border-red-100 dark:border-red-900/20">تسجيل الخروج</button>
               </div>
            </div>
          )}

          {activeTab === 'messages' && (
             <div className="max-w-6xl mx-auto h-[75vh] flex flex-col md:flex-row bg-white dark:bg-gray-900 rounded-3xl shadow-xl border dark:border-gray-800 overflow-hidden relative">
               <div className={`w-full md:w-80 border-l dark:border-gray-800 flex flex-col ${activeChatUserId ? 'hidden md:flex' : 'flex h-full'}`}>
                  <div className="p-6 border-b dark:border-gray-800 font-black text-xl text-emerald-600">المحادثات</div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar pb-32">
                     {users.filter(u => u.id !== currentUser.id).map(u => (
                       <button key={u.id} onClick={() => setActiveChatUserId(u.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeChatUserId === u.id ? 'bg-emerald-600 text-white shadow-xl' : 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300'}`}>
                          <ProfessorRank avatar={u.avatar} studentCount={u.studentCount || 0} size="sm" />
                          <div className="text-right">
                             <p className="font-black text-sm">{u.firstName}</p>
                             <p className={`text-[10px] ${activeChatUserId === u.id ? 'text-emerald-100' : 'text-gray-400'}`}>{u.role === 'professor' ? 'أستاذ' : 'طالب'}</p>
                          </div>
                       </button>
                     ))}
                  </div>
               </div>
               <div className={`flex-1 flex flex-col bg-gray-50/20 dark:bg-gray-950/20 h-full ${activeChatUserId ? 'flex' : 'hidden md:flex'}`}>
                  {activeChatUserId ? (
                    <>
                      <div className="p-4 md:p-6 border-b dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center shadow-sm">
                         <div className="flex items-center gap-3">
                            <button onClick={() => setActiveChatUserId(null)} className="md:hidden text-emerald-600 text-xl font-black p-2">◀</button>
                            <p className="font-black text-lg dark:text-white text-emerald-600">{users.find(u => u.id === activeChatUserId)?.firstName}</p>
                         </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-40">
                        {(personalChats[[currentUser.id, activeChatUserId].sort().join('_')] || []).map(msg => (
                          <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                            <div className={`p-4 rounded-2xl max-w-[90%] md:max-w-[80%] shadow-md ${msg.senderId === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 dark:text-white rounded-tl-none border dark:border-gray-700'}`}>
                              {msg.text && <p className="font-bold text-sm leading-relaxed">{msg.text}</p>}
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex gap-2 z-[101]">
                         <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendPersonal()} placeholder="اكتب رسالة..." className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-all font-bold dark:text-white" />
                         <button onClick={() => handleSendPersonal()} className="bg-emerald-600 text-white px-6 md:px-10 rounded-xl font-black shadow-xl active:scale-95 transition">🚀</button>
                      </div>
                    </>
                  ) : <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-20"><span className="text-8xl mb-4 block">💬</span><p className="font-black text-2xl">اختر محادثة للبدء</p></div>}
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
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-right transition-colors relative">
        {showAddContent && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowAddContent(false)}></div>
            <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl space-y-6">
              <h3 className="text-xl font-black text-emerald-600">إضافة محتوى جديد (رفع ملف)</h3>
              <div className="space-y-4">
                <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder="عنوان المحتوى..." className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border focus:border-emerald-500 outline-none font-bold dark:text-white" />
                <div className="mt-4">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,video/*,image/*" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-6 rounded-2xl border-2 border-dashed border-emerald-300 hover:bg-emerald-100 transition active:scale-95">
                    <span className="text-2xl">📂</span>
                    <div className="text-right">
                       <p className="font-black text-sm">{selectedFile ? "تغيير الملف" : "اختر ملف من جهازك"}</p>
                       {selectedFile && <p className="text-[10px] opacity-70 truncate max-w-[200px]">{selectedFile.name}</p>}
                    </div>
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleAddContent} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg">حفظ ورفع</button>
                <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-500 py-4 rounded-2xl font-black">إلغاء</button>
              </div>
            </div>
          </div>
        )}

        <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
           <button onClick={() => setView('dashboard')} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl transition text-emerald-600 font-black text-xs active:scale-90">✕ رجوع</button>
           <div className="text-right">
              <h2 className="font-black text-sm text-emerald-900 dark:text-emerald-400 truncate max-w-[150px]">{selectedChannel.name}</h2>
              <p className="text-[9px] font-bold text-gray-400">{selectedChannel.department}</p>
           </div>
        </header>

        <nav className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex p-1 sticky top-[65px] z-40">
            {[{id:'pdf', l:'الدروس', i:'📄'}, {id:'broadcast', l:'الإعلانات', i:'📢'}].map(tab => (
              <button key={tab.id} onClick={() => setChannelTab(tab.id as any)} className={`flex-1 py-3 rounded-xl font-black transition text-xs ${channelTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500'}`}>
                {tab.i} {tab.l}
              </button>
            ))}
        </nav>

        <main className="flex-1 p-4 overflow-y-auto pb-32">
          {channelTab === 'pdf' && (
            <div className="max-w-4xl mx-auto space-y-4">
              {isProf && (
                <button onClick={() => setShowAddContent(true)} className="w-full bg-white dark:bg-gray-900 border-2 border-dashed border-emerald-300 dark:border-emerald-700 p-10 rounded-3xl text-emerald-600 dark:text-emerald-400 font-black hover:bg-emerald-50 transition flex flex-col items-center gap-2 active:scale-95">
                  <span className="text-4xl">➕</span>
                  <span className="text-sm">إضافة درس جديد (رفع ملف)</span>
                </button>
              )}
              {selectedChannel.content && selectedChannel.content.length > 0 ? selectedChannel.content.map(item => (
                <div key={item.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl border dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm group animate-in slide-in-from-right transition-all">
                   <div className="flex gap-2 w-full md:w-auto">
                     <button onClick={() => handleJarvisSummarize(item)} className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg shadow-emerald-500/20 active:scale-95">✨ تلخيص</button>
                     <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 px-6 py-3 rounded-2xl text-[10px] font-black shadow-inner text-center active:scale-95">📂 عرض</a>
                   </div>
                   <div className="flex items-center gap-4 text-right w-full md:w-auto">
                      <div className="flex-1">
                         <p className="font-black text-base dark:text-white leading-tight">{item.title}</p>
                         <p className="text-[9px] text-gray-400 mt-1">{new Date(item.createdAt).toLocaleDateString('ar-DZ')}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl text-2xl shadow-inner">
                         {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : '🖼️'}
                      </div>
                   </div>
                </div>
              )) : (
                <div className="text-center py-20 opacity-20"><span className="text-6xl mb-4 block text-emerald-200">📭</span><p className="font-black text-xl dark:text-white">لا يوجد محتوى حالياً.</p></div>
              )}
            </div>
          )}
          
          {channelTab === 'broadcast' && (
            <div className="max-w-3xl mx-auto h-[65vh] flex flex-col bg-white dark:bg-gray-900 rounded-3xl border dark:border-gray-800 overflow-hidden shadow-xl animate-in zoom-in">
               <div className="bg-emerald-600 text-white p-6 text-center font-black text-lg shadow-md">📢 لوحة الإعلانات</div>
               <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-32">
                  {broadcastMessages[selectedChannel.id]?.map(msg => (
                    <div key={msg.id} className="bg-white dark:bg-gray-800 border-r-4 border-emerald-500 p-6 rounded-2xl shadow-sm animate-in slide-in-from-left">
                       <p className="text-[9px] text-gray-400 mb-2 font-black">📅 {new Date(msg.timestamp).toLocaleString('ar-DZ')}</p>
                       <p className="font-bold text-sm leading-relaxed text-gray-700 dark:text-gray-200">{msg.text}</p>
                    </div>
                  )) || <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4"><span className="text-6xl animate-bounce text-emerald-400">📢</span><p className="font-black text-lg">لا توجد إعلانات عاجلة.</p></div>}
                  <div ref={chatEndRef}></div>
               </div>
               {isProf && (
                 <div className="p-4 border-t dark:border-gray-800 flex gap-2 bg-white dark:bg-gray-900">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendBroadcast()} placeholder="اكتب إعلاناً..." className="flex-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none font-bold dark:text-white text-sm border focus:border-emerald-500" />
                    <button onClick={handleSendBroadcast} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-black shadow-lg active:scale-95 transition">نشر</button>
                 </div>
               )}
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
};

export default App;
