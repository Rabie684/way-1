
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES, APP_COMMISSION } from './constants';
import { getMedal, getMedalPrice } from './utils';
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
  const [activeTab, setActiveTab] = useState<'home' | 'my-channels' | 'wallet' | 'messages' | 'profile'>('home');
  
  // UI Preferences
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'en' | 'fr'>('ar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Other States
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);
  const [personalChats, setPersonalChats] = useState<Record<string, ChatMessage[]>>({}); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [broadcastMessages, setBroadcastMessages] = useState<Record<string, ChatMessage[]>>({}); 
  const [chatInput, setChatInput] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '', price: 200 });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' | 'image' });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const jarvisEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // تحديث الجامعة للأستاذة بن طاهر بختة والأستاذ أيت عيسى لجامعة ابن خلدون ملحقة قصر الشلالة
    const targetUniv = "جامعة ابن خلدون ملحقة قصر الشلالة";
    const targetFaculty = "كلية العلوم الاقتصادية";
    
    const mockProfs: User[] = [
      { id: 'p5', firstName: 'بختة', lastName: 'بن الطاهر', specialty: 'الاقتصاد الجزئي', email: 'bentahar@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 1250, avatar: '', isApproved: true, studentCount: 120, paymentMethod: 'bentahar.ccp@algeriepost.dz' },
      { id: 'p6', firstName: 'أيت عيسى', lastName: '', specialty: 'الاقتصاد الكلي', email: 'aitissa@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 850, avatar: '', isApproved: true, studentCount: 105 },
    ];
    
    const mockStudent: User = { id: 's1', firstName: 'ربيع', lastName: 'حمر العين', email: 'rabieriri665@gmail.com', role: 'student', walletBalance: 2500, avatar: '', isApproved: true, phoneNumber: '0781723461', university: targetUniv, faculty: targetFaculty };
    
    setUsers([...mockProfs, mockStudent]);
    setChannels([
      { id: 'c_b1', professorId: 'p5', name: 'الاقتصاد الجزئي', description: 'أساسيات الاقتصاد الجزئي للسنة الأولى.', price: 200, subscribers: [], content: [] },
      { id: 'c_a1', professorId: 'p6', name: 'الاقتصاد الكلي', description: 'تحليل المتغيرات الكلية.', price: 150, subscribers: [], content: [] }
    ]);
  }, []);

  useEffect(() => {
    localStorage.setItem('jarvis_history', JSON.stringify(jarvisChat));
  }, [jarvisChat]);

  useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);
  useEffect(() => { 
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; 
    document.documentElement.lang = language; 
  }, [language]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [personalChats, broadcastMessages, activeChatUserId]);
  useEffect(() => { jarvisEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [jarvisChat, isJarvisThinking]);

  const t = (ar: string, en: string, fr: string = "") => {
    if (language === 'ar') return ar;
    if (language === 'fr') return fr || en;
    return en;
  };

  // --- Auth Logic ---
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

  // --- Jarvis Live Audio Logic ---
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
      alert("Microphone access denied.");
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
    setJarvisChat(prev => [...prev, { role: 'user', text: `يا جارفيس المساعد تاع ربيع، لخصلي هاد المطلب: ${item.title}` }]);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisChat(prev => [...prev, { role: 'jarvis', text: summary || '...' }]);
    setIsJarvisThinking(false);
  };

  const getChatKey = (id1: string, id2: string) => [id1, id2].sort().join('_');

  const handleSendPersonal = (imageUrl?: string) => {
    if ((!chatInput.trim() && !imageUrl) || !currentUser || !activeChatUserId) return;
    const key = getChatKey(currentUser.id, activeChatUserId);
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

  const handleImageUpload = () => {
    const url = prompt(t("أدخل رابط الصورة:", "Enter image URL:", "Entrez l'URL de l'image :"), "https://picsum.photos/400/300");
    if (url) handleSendPersonal(url);
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

  const handleAddContent = () => {
    if (!newContentData.title.trim() || !selectedChannel) return;
    const newItem: ContentItem = {
      id: 'i' + Date.now(),
      type: newContentData.type,
      title: newContentData.title,
      url: '#', 
      createdAt: new Date()
    };
    
    // Update both global channels list and selectedChannel local state
    const updatedChannels = channels.map(c => 
      c.id === selectedChannel.id ? { ...c, content: [...c.content, newItem] } : c
    );
    setChannels(updatedChannels);
    setSelectedChannel(updatedChannels.find(c => c.id === selectedChannel.id) || null);
    setShowAddContent(false);
    setNewContentData({ title: '', type: 'pdf' });
  };

  const handleCreateChannel = () => {
    if (!newChannelData.name.trim() || !currentUser) return;
    const newChan: Channel = {
      id: 'c' + Date.now(),
      professorId: currentUser.id,
      name: newChannelData.name,
      description: newChannelData.description,
      price: newChannelData.price,
      subscribers: [],
      content: []
    };
    setChannels(prev => [...prev, newChan]);
    setShowCreateChannel(false);
    setNewChannelData({ name: '', description: '', price: 200 });
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
        <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-800 to-green-900 text-white flex items-center justify-between shadow-lg">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl animate-pulse shadow-inner">✨</div>
              <div>
                 <h3 className="text-xl md:text-2xl font-black italic tracking-tight">Jarvis الأكاديمي</h3>
                 <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest text-emerald-100">بواسطة ربيع • مبتكر WAY</p>
                 </div>
              </div>
           </div>
           <div className="flex gap-2">
              <button onClick={() => setJarvisChat([])} className="p-2 hover:bg-white/10 rounded-full text-xs font-bold opacity-50">مسح التاريخ</button>
              <button onClick={() => setIsJarvisOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition">✕</button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-gray-950/30 scroll-smooth custom-scrollbar">
           {jarvisChat.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                <div className="w-32 h-32 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-6xl mb-4 shadow-xl border-4 border-white animate-float">🤖</div>
                <h4 className="text-3xl font-black text-emerald-900 dark:text-emerald-400">واش راك يا بطل؟ 👋</h4>
                <p className="text-gray-500 dark:text-gray-400 font-bold max-w-sm leading-relaxed text-lg">
                   أنا جارفيس، تابع لـ ربيع صاحب فكرة منصة WAY جامعتك الرقمية. راني هنا باش نعاونك في بحثك الأكاديمي.
                </p>
                <button onClick={startJarvisLive} className="bg-emerald-600 text-white px-8 py-4 rounded-full font-black flex items-center gap-3 shadow-xl animate-pulse">
                   <span className="text-xl">🎙️</span> ابدأ تحدث مباشر (Live)
                </button>
             </div>
           )}
           {jarvisChat.map((msg, i) => (
             <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2 animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`p-5 md:p-7 rounded-[2rem] max-w-[90%] md:max-w-[85%] text-sm md:text-lg font-medium shadow-sm whitespace-pre-line leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border dark:border-gray-700 rounded-tl-none'}`}>
                   {msg.text}
                </div>
             </div>
           ))}
           {isJarvisThinking && (
             <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl w-fit animate-pulse border border-emerald-100">
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-150"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-300"></div>
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 italic">جارفيس راهو يقلب في المجلات...</span>
             </div>
           )}
           <div ref={jarvisEndRef} />
        </div>

        <div className="p-4 md:p-8 bg-white dark:bg-gray-900 border-t dark:border-gray-800 shadow-2xl">
           <div className="flex gap-3 items-center">
              <button 
                onClick={isLiveActive ? stopJarvisLive : startJarvisLive} 
                className={`p-5 rounded-3xl shadow-xl transition-all active:scale-90 ${isLiveActive ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}
                title="تحدث مباشر"
              >
                {isLiveActive ? '⏹️' : '🎙️'}
              </button>
              <input 
                value={jarvisInput} 
                onChange={e => setJarvisInput(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && handleJarvisChat()} 
                placeholder="اسأل جارفيس مساعد ربيع..." 
                className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-3xl px-8 py-5 font-bold text-lg outline-none dark:text-white border-2 border-transparent focus:border-emerald-500 transition-all shadow-inner" 
              />
              <button onClick={handleJarvisChat} className="bg-emerald-600 text-white p-5 rounded-3xl shadow-xl active:scale-90 hover:bg-emerald-700 transition">🚀</button>
           </div>
           {isLiveActive && (
             <div className="mt-4 flex justify-center">
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-black flex items-center gap-2">
                   <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
                   الميكروفون مفعل - جارفيس يسمع فيك الآن
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );

  const renderModal = (title: string, body: React.ReactNode, onConfirm: () => void, onClose: () => void) => (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl p-6 md:p-10 shadow-2xl space-y-6 animate-in zoom-in">
        <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-400 text-center">{title}</h3>
        {body}
        <div className="flex gap-4 pt-4">
          <button onClick={onConfirm} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg">حفظ</button>
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-500 py-4 rounded-2xl font-black">إلغاء</button>
        </div>
      </div>
    </div>
  );

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-green-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="animate-float mb-12">
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-2">WAY</h1>
          <p className="text-lg md:text-2xl font-light opacity-80">جامعتك الرقمية أينما كنت</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          <button onClick={() => setView('register-prof')} className="bg-white text-emerald-900 p-6 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition">أنا أستاذ</button>
          <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white p-6 rounded-2xl font-black text-lg border-2 border-emerald-400 shadow-xl hover:scale-105 transition">أنا طالب</button>
        </div>
        <div className="mt-12 flex flex-col gap-4">
          <button onClick={() => { setCurrentUser(users.find(u => u.email === 'rabieriri665@gmail.com') || null); setView('dashboard'); }} className="text-emerald-200 underline font-bold text-sm">دخول سريع: حمر العين ربيع (طالب)</button>
          <button onClick={() => { setCurrentUser(users.find(u => u.id === 'p5') || null); setView('dashboard'); }} className="text-emerald-100 underline font-bold text-sm opacity-80">دخول سريع: بختة بن الطاهر (أستاذ)</button>
        </div>
      </div>
    );
  }

  if (view === 'register-student' || view === 'register-prof') {
    const isProfReg = view === 'register-prof';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-6">
          <h2 className="text-2xl font-black text-emerald-900 dark:text-emerald-400 text-center">حساب جديد - {isProfReg ? 'أستاذ' : 'طالب'}</h2>
          <form className="space-y-4" onSubmit={(e: any) => { 
            e.preventDefault(); 
            handleRegister(isProfReg ? 'professor' : 'student', { 
              firstName: e.target.fname.value, 
              lastName: e.target.lname.value, 
              email: e.target.email.value,
              university: isProfReg ? e.target.univ.value : '',
              faculty: isProfReg ? e.target.faculty.value : ''
            }); 
          }}>
            <input name="fname" placeholder="الاسم" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl dark:text-white outline-none" />
            <input name="lname" placeholder="اللقب" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl dark:text-white outline-none" />
            <input name="email" type="email" placeholder="البريد" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl dark:text-white outline-none" />
            {isProfReg && (
              <>
                <select name="univ" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl dark:text-white outline-none">
                  <option value="">اختر الجامعة التي تدرس بها...</option>
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select name="faculty" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl dark:text-white outline-none">
                  <option value="">اختر الكلية...</option>
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </>
            )}
            <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black">بدء الاستخدام</button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 font-bold">رجوع</button>
          </form>
        </div>
      </div>
    );
  }

  if (currentUser && view === 'dashboard') {
    const isProf = currentUser.role === 'professor';
    const tabs = isProf ? [
      {id:'home', l: t('الرئيسية', 'Home', 'Accueil'), i: '🏠'},
      {id:'messages', l: t('الدردشة', 'Messages', 'Messages'), i: '💬'}, 
      {id:'wallet', l: t('المحفظة', 'Wallet', 'Portefeuille'), i: '💰'},
      {id:'profile', l: t('الملف', 'Profile', 'Profil'), i: '👤'}
    ] : [
      {id:'home', l: t('اكتشاف', 'Discover', 'Découvrir'), i: '🏠'},
      {id:'my-channels', l: t('قنواتي', 'My Channels', 'Mes Canaux'), i: '📡'},
      {id:'messages', l: t('الدردشة', 'Messages', 'Messages'), i: '💬'}, 
      {id:'wallet', l: t('المحفظة', 'Wallet', 'Portefeuille'), i: '💰'},
      {id:'profile', l: t('الملف', 'Profile', 'Profil'), i: '👤'}
    ];

    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right">
        <button 
          onClick={() => setIsJarvisOpen(true)} 
          className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[110] w-16 h-16 md:w-20 md:h-20 bg-emerald-600 text-white rounded-full shadow-2xl flex flex-col items-center justify-center hover:scale-110 active:scale-95 transition-all animate-bounce border-4 border-white dark:border-gray-800 group"
        >
           <span className="text-2xl md:text-3xl">✨</span>
           <span className="text-[7px] md:text-[9px] font-black uppercase hidden md:block">Jarvis</span>
        </button>
        {renderJarvisOverlay()}

        {showCreateChannel && renderModal("إنشاء قناة جديدة", (
          <div className="space-y-4">
            <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="اسم القناة/المادة" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" />
            <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder="وصف المادة" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold h-24" />
            <div className="flex items-center justify-between">
              <span className="font-bold">سعر الاشتراك (دج)</span>
              <input type="number" value={newChannelData.price} onChange={e => setNewChannelData({...newChannelData, price: Number(e.target.value)})} className="w-32 bg-gray-50 p-2 rounded-xl border text-center font-bold" />
            </div>
          </div>
        ), handleCreateChannel, () => setShowCreateChannel(false))}

        <aside className={`${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} fixed md:static inset-y-0 right-0 w-72 bg-white dark:bg-gray-900 border-l p-8 flex flex-col gap-8 shadow-xl z-50 transition-transform`}>
          <div className="flex justify-between items-center md:justify-center">
            <h2 className="text-3xl font-black text-emerald-900 dark:text-emerald-400">WAY</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400">✕</button>
          </div>
          <nav className="flex flex-col gap-2">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setIsSidebarOpen(false); }} className={`p-4 rounded-2xl font-black text-right transition flex items-center gap-4 ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <span>{tab.i}</span> {tab.l}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-12 overflow-y-auto">
          {activeTab === 'home' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
               <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight">
                 {t(`أهلاً بك، ${currentUser.firstName}`, `Welcome, ${currentUser.firstName}`, `Bienvenue, ${currentUser.firstName}`)} ✨
               </h1>
               {!isProf ? (
                 <>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-900 p-5 rounded-3xl border dark:border-gray-800 shadow-sm">
                      <div className="space-y-1">
                        <label className="text-xs font-black mr-2">الجامعة</label>
                        <select value={filterUniv || currentUser.university} onChange={e => setFilterUniv(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl dark:text-white outline-none">
                           <option value="">اختر الجامعة...</option>
                           {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black mr-2">الكلية</label>
                        <select value={filterFaculty || currentUser.faculty} onChange={e => setFilterFaculty(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl dark:text-white outline-none">
                           <option value="">اختر الكلية...</option>
                           {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                   </div>
                   {(filterUniv || currentUser.university) && (filterFaculty || currentUser.faculty) && (
                     <div className="space-y-6">
                        <h3 className="font-black text-emerald-700">الأساتذة المتاحون في {filterUniv || currentUser.university}:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {users.filter(u => u.role === 'professor' && u.university === (filterUniv || currentUser.university) && u.faculty === (filterFaculty || currentUser.faculty)).map(prof => (
                             <div key={prof.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border shadow-sm hover:shadow-md transition text-center space-y-4">
                                <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="lg" />
                                <h4 className="font-black">{prof.firstName} {prof.lastName}</h4>
                                <div className="flex gap-2">
                                   <button onClick={() => setSelectedProfId(prof.id)} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-black">المواد</button>
                                   <button onClick={() => { setActiveChatUserId(prof.id); setActiveTab('messages'); }} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-lg">💬</button>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                   {selectedProfId && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-5">
                        {channels.filter(c => c.professorId === selectedProfId).map(chan => (
                          <div key={chan.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border shadow-sm group">
                             <h4 className="font-black text-xl mb-4 group-hover:text-emerald-600 transition">{chan.name}</h4>
                             <button onClick={() => chan.subscribers.includes(currentUser.id) ? (setSelectedChannel(chan), setView('channel-view')) : subscribe(chan.id)} className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl font-black hover:bg-emerald-600 hover:text-white transition">
                               {chan.subscribers.includes(currentUser.id) ? 'دخول القناة' : `اشتراك (${chan.price} دج)`}
                             </button>
                          </div>
                        ))}
                     </div>
                   )}
                 </>
               ) : (
                 <div className="space-y-6">
                    <button onClick={() => setShowCreateChannel(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl">+ إنشاء قناة جديدة</button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {channels.filter(c => c.professorId === currentUser.id).map(c => (
                         <div key={c.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border shadow-sm">
                            <h4 className="font-black text-xl mb-4">{c.name}</h4>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold opacity-50">{c.subscribers.length} مشترك</span>
                              <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-black">إدارة</button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'my-channels' && (
            <div className="max-w-5xl mx-auto space-y-6">
               <h2 className="text-3xl font-black">قنواتي المشترك بها</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {channels.filter(c => c.subscribers.includes(currentUser.id)).map(chan => (
                    <div key={chan.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border shadow-sm flex justify-between items-center">
                       <h4 className="font-black text-xl">{chan.name}</h4>
                       <button onClick={() => { setSelectedChannel(chan); setView('channel-view'); }} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black">دخول</button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="max-w-6xl mx-auto h-[75vh] flex flex-col md:flex-row bg-white dark:bg-gray-900 rounded-3xl shadow-xl border overflow-hidden">
               <div className={`w-full md:w-80 border-l dark:border-gray-800 flex flex-col ${activeChatUserId ? 'hidden md:flex' : 'flex'}`}>
                  <div className="p-6 border-b dark:border-gray-800 font-black text-xl">المحادثات</div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                     {users.filter(u => u.id !== currentUser.id).map(u => (
                       <button key={u.id} onClick={() => setActiveChatUserId(u.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition ${activeChatUserId === u.id ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                          <ProfessorRank avatar={u.avatar} studentCount={u.studentCount || 0} size="sm" />
                          <div className="text-right">
                             <p className="font-black text-sm">{u.firstName} {u.lastName}</p>
                             <p className={`text-[10px] ${activeChatUserId === u.id ? 'text-emerald-100' : 'text-gray-400'}`}>{u.role === 'professor' ? 'أستاذ' : 'طالب'}</p>
                          </div>
                       </button>
                     ))}
                  </div>
               </div>
               <div className={`flex-1 flex flex-col bg-gray-50/20 dark:bg-gray-950/20 ${activeChatUserId ? 'flex' : 'hidden md:flex'}`}>
                  {activeChatUserId ? (
                    <>
                      <div className="p-4 md:p-6 border-b dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <button onClick={() => setActiveChatUserId(null)} className="md:hidden text-emerald-600">◀</button>
                            <ProfessorRank avatar={users.find(u => u.id === activeChatUserId)?.avatar || ''} studentCount={0} size="sm" />
                            <p className="font-black text-lg">{users.find(u => u.id === activeChatUserId)?.firstName}</p>
                         </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {(personalChats[getChatKey(currentUser.id, activeChatUserId)] || []).map(msg => (
                          <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                            <div className={`p-4 rounded-2xl max-w-[85%] shadow-sm ${msg.senderId === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 rounded-tl-none border'}`}>
                              {msg.imageUrl && <img src={msg.imageUrl} className="rounded-lg mb-2 max-w-full h-auto border border-black/10" />}
                              {msg.text && <p className="font-bold text-sm">{msg.text}</p>}
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="p-4 bg-white dark:bg-gray-900 border-t flex gap-2">
                         <button onClick={handleImageUpload} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-emerald-50 text-xl">📷</button>
                         <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendPersonal()} placeholder="اكتب رسالة..." className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-5 py-2 outline-none border focus:border-emerald-500 transition" />
                         <button onClick={() => handleSendPersonal()} className="bg-emerald-600 text-white px-6 rounded-xl font-black">إرسال</button>
                      </div>
                    </>
                  ) : <div className="flex-1 flex items-center justify-center opacity-20 text-4xl font-black">اختر محادثة</div>}
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-3xl border shadow-sm space-y-8">
               <div className="flex items-center gap-6">
                  <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="lg" />
                  <div className="flex-1">
                    <h2 className="text-2xl font-black">{currentUser.firstName} {currentUser.lastName}</h2>
                    <p className="text-emerald-600 font-bold">{currentUser.email}</p>
                    <p className="text-xs text-gray-400 mt-1 uppercase font-black tracking-tighter">{currentUser.role === 'professor' ? 'أستاذ معتمد' : 'طالب مفعل'}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black opacity-50">رقم الهاتف</label>
                    <input 
                      type="tel" 
                      defaultValue={currentUser.phoneNumber || ''} 
                      placeholder="07XXXXXXXX"
                      className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700 outline-none font-bold"
                      onChange={(e) => setCurrentUser({...currentUser, phoneNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black opacity-50">اللغة / Language</label>
                    <select value={language} onChange={e => setLanguage(e.target.value as any)} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700 outline-none font-bold">
                       <option value="ar">العربية (Arabic)</option>
                       <option value="en">English (الإنجليزية)</option>
                       <option value="fr">Français (الفرنسية)</option>
                    </select>
                  </div>
               </div>

               <div className="space-y-4 border-t pt-6 text-center">
                  <button onClick={() => setView('landing')} className="text-red-500 font-black hover:underline py-2">تسجيل الخروج</button>
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
        {showAddContent && renderModal("إضافة محتوى دراسي جديد", (
          <div className="space-y-4">
            <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder="عنوان المحتوى (مثلاً: المحاضرة 1)" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" />
            <select value={newContentData.type} onChange={e => setNewContentData({...newContentData, type: e.target.value as any})} className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold">
               <option value="pdf">📄 ملف PDF / درس</option>
               <option value="video">🎥 فيديو تعليمي</option>
               <option value="image">🖼️ صورة / مخطط توضيحي</option>
            </select>
            <p className="text-[10px] text-gray-400 font-bold px-2">ملاحظة: سيتم رفع الملف إلى خوادم WAY الآمنة.</p>
          </div>
        ), handleAddContent, () => setShowAddContent(false))}

        {/* Floating Jarvis */}
        <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[110] w-16 h-16 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce border-4 border-white">✨</button>
        {renderJarvisOverlay()}

        <header className="bg-white dark:bg-gray-900 border-b p-4 md:p-8 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4 shadow-sm">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl overflow-x-auto w-full md:w-auto">
            {[{id:'pdf', l:'المحتوى العلمي', i:'📄'}, {id:'broadcast', l:'الإعلانات', i:'📢'}].map(tab => (
              <button key={tab.id} onClick={() => setChannelTab(tab.id as any)} className={`flex-1 px-8 py-3 rounded-xl font-black transition whitespace-nowrap ${channelTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500'}`}>
                {tab.i} {tab.l}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <button onClick={() => window.open(`https://meet.google.com/new`, '_blank')} className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:bg-red-700 transition active:scale-95">
              <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
              {isProf ? 'بدء محاضرة Meet' : 'دخول المحاضرة'}
            </button>
            <div className="flex items-center gap-3">
               <h2 className="font-black text-xl text-emerald-900 dark:text-emerald-400 truncate max-w-[200px]">{selectedChannel.name}</h2>
               <button onClick={() => setView('dashboard')} className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition">✕</button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-12 overflow-y-auto">
          {channelTab === 'pdf' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {isProf && (
                <button onClick={() => setShowAddContent(true)} className="w-full bg-white dark:bg-gray-900 border-2 border-dashed border-emerald-300 dark:border-emerald-700 p-12 rounded-[2.5rem] text-emerald-600 font-black hover:bg-emerald-50 transition shadow-inner flex flex-col items-center gap-2 group">
                  <span className="text-4xl group-hover:scale-125 transition">➕</span>
                  <span className="text-lg">إضافة محتوى دراسي (PDF / فيديو / صورة)</span>
                </button>
              )}
              <div className="space-y-4">
                 {selectedChannel.content && selectedChannel.content.length > 0 ? selectedChannel.content.map(item => (
                   <div key={item.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm hover:shadow-md transition group animate-in slide-in-from-right duration-300">
                      <button onClick={() => handleJarvisSummarize(item)} className="w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg hover:bg-emerald-700 transition active:scale-95">✨ تلخيص جارفيس</button>
                      <div className="flex items-center gap-5 text-right w-full md:w-auto">
                         <div className="flex-1">
                            <p className="font-black text-xl text-gray-800 dark:text-white group-hover:text-emerald-600 transition">{item.title}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{new Date(item.createdAt).toLocaleDateString('ar-DZ')}</p>
                         </div>
                         <div className="p-5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl text-3xl shadow-inner group-hover:rotate-12 transition">
                            {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : '🖼️'}
                         </div>
                      </div>
                   </div>
                 )) : (
                   <div className="text-center py-32 space-y-4 opacity-30">
                     <span className="text-7xl">📭</span>
                     <p className="font-black text-2xl italic">القناة فارغة حالياً، الأستاذ لم يرفع أي محتوى بعد.</p>
                   </div>
                 )}
              </div>
            </div>
          )}
          
          {channelTab === 'broadcast' && (
            <div className="max-w-3xl mx-auto h-[70vh] flex flex-col bg-white dark:bg-gray-900 rounded-[2.5rem] border overflow-hidden shadow-2xl animate-in zoom-in duration-500">
               <div className="bg-emerald-600 text-white p-6 text-center font-black text-xl shadow-md">📢 لوحة الإعلانات والتنبيهات العاجلة</div>
               <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/10 dark:bg-gray-950/10 custom-scrollbar">
                  {broadcastMessages[selectedChannel.id]?.map(msg => (
                    <div key={msg.id} className="bg-white dark:bg-gray-800 border-r-8 border-emerald-500 p-8 rounded-2xl shadow-sm animate-in slide-in-from-left">
                       <p className="text-[11px] text-gray-400 mb-4 font-bold flex items-center gap-2">
                         <span>📅</span> {new Date(msg.timestamp).toLocaleString('ar-DZ')}
                       </p>
                       <p className="font-bold text-xl leading-relaxed text-gray-700 dark:text-gray-200">{msg.text}</p>
                    </div>
                  )) || (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 gap-6">
                      <span className="text-8xl animate-bounce">📢</span>
                      <p className="font-black text-2xl italic">لا توجد إعلانات رسمية حتى الآن</p>
                    </div>
                  )}
                  <div ref={chatEndRef}></div>
               </div>
               {isProf && (
                 <div className="p-6 border-t flex gap-4 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendBroadcast()} placeholder="اكتب إعلاناً جديداً لطلابك (تاريخ امتحان، ملاحظة مهمة...)" className="flex-1 bg-white dark:bg-gray-800 p-5 rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500 transition-all font-bold shadow-inner" />
                    <button onClick={handleSendBroadcast} className="bg-emerald-600 text-white px-10 py-2 rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition active:scale-95">نشر الإعلان</button>
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
