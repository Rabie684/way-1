
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES, DEPARTMENTS } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk } from './services/geminiService';

/**
 * WAY - جامعتك الرقمية
 * المطور والرؤية: حمر العين ربيع (Rabie)
 */

const App: React.FC = () => {
  // --- States ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'channel-view' | 'chat-view'>('landing');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'messages' | 'wallet' | 'profile'>('home');
  
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activeChatChannel, setActiveChatChannel] = useState<Channel | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');

  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string, sources?: any[]}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');

  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  
  const [newChannelData, setNewChannelData] = useState({ name: '', department: DEPARTMENTS[0], price: 300, description: '' });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as any });

  // --- Initial Data ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const storedUsers = localStorage.getItem('way_users');
      const storedChannels = localStorage.getItem('way_channels');
      const sessionUser = localStorage.getItem('way_session');

      let initialUsers = storedUsers ? JSON.parse(storedUsers) : [];
      
      const starUsers: User[] = [
        {
          id: 'q_student_rabie',
          firstName: 'حمر العين',
          lastName: 'ربيع',
          email: 'rabie@way.dz',
          role: 'student',
          university: 'USTHB',
          faculty: 'كلية التكنولوجيا',
          walletBalance: 5000,
          isApproved: true,
          avatar: '',
          studentCount: 0,
          phoneNumber: '0550123456'
        },
        {
          id: 'q_prof_bentahar',
          firstName: 'بن الطاهر',
          lastName: 'بختة',
          email: 'bentahar@way.dz',
          role: 'professor',
          university: 'جامعة ابن خلدون تيارت - ملحقة قصر الشلالة',
          faculty: 'كلية العلوم الاقتصادية والتجارية وعلوم التسيير',
          walletBalance: 15000,
          isApproved: true,
          avatar: '',
          studentCount: 180
        }
      ];

      starUsers.forEach(star => {
        if (!initialUsers.find((u: User) => u.id === star.id)) initialUsers.push(star);
      });
      setUsers(initialUsers);
      
      let initialChannels = storedChannels ? JSON.parse(storedChannels) : [];
      if (initialChannels.length === 0) {
        initialChannels = [
          {
            id: 'ch_eco_1',
            professorId: 'q_prof_bentahar',
            name: 'الاقتصاد الجزئي 1',
            department: 'قسم العلوم الاقتصادية',
            description: 'شرح مفصل لنظرية سلوك المستهلك والمنتج بالتفصيل الممل.',
            price: 400,
            subscribers: ['q_student_rabie'],
            content: [
              { id: 'c1', title: 'المحاضرة الأولى: مقدمة في الاقتصاد', type: 'pdf', url: '#', createdAt: new Date() },
              { id: 'c2', title: 'فيديو شرح قانون الطلب', type: 'video', url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', createdAt: new Date() }
            ]
          }
        ];
      }
      setChannels(initialChannels);
      
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        const freshUser = initialUsers.find((u: User) => u.id === parsed.id) || parsed;
        setCurrentUser(freshUser);
        setView('dashboard');
      }
      
      setTimeout(() => setLoading(false), 1200);
    };
    init();
  }, []);

  useEffect(() => { localStorage.setItem('way_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('way_channels', JSON.stringify(channels)); }, [channels]);

  useEffect(() => { 
    document.documentElement.classList.toggle('dark', isDarkMode); 
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // --- Logic Handlers ---
  const handleLogin = (role: 'student' | 'prof_bentahar') => {
    setLoading(true);
    setTimeout(() => {
      const ids = { student: 'q_student_rabie', prof_bentahar: 'q_prof_bentahar' };
      const user = users.find(u => u.id === ids[role]);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('way_session', JSON.stringify(user));
        setView('dashboard');
        setActiveTab('home');
      }
      setLoading(false);
    }, 800);
  };

  const handleSubscribe = (channel: Channel) => {
    if (!currentUser) return;
    if (currentUser.walletBalance < channel.price) {
      alert("رصيدك غير كافٍ. يرجى شحن محفظتك.");
      setActiveTab('wallet');
      return;
    }

    const updatedChannels = channels.map(c => 
      c.id === channel.id ? { ...c, subscribers: [...c.subscribers, currentUser.id] } : c
    );
    setChannels(updatedChannels);

    const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance - channel.price };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));

    // Update Professor's wallet and student count
    setUsers(prev => prev.map(u => {
      if (u.id === channel.professorId) {
        return { 
          ...u, 
          walletBalance: u.walletBalance + (channel.price * 0.7),
          studentCount: (u.studentCount || 0) + 1 
        };
      }
      return u;
    }));

    alert("تم الاشتراك بنجاح! استمتع بالمحتوى.");
  };

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

  const sendMessage = () => {
    if (!messageInput.trim() || !currentUser || !activeChatChannel) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      text: messageInput,
      timestamp: new Date()
    };
    setChatMessages([...chatMessages, msg]);
    setMessageInput('');
  };

  const filteredProfessors = users.filter(u => {
    if (u.role !== 'professor') return false;
    if (filterUniv && u.university !== filterUniv) return false;
    if (filterFaculty && u.faculty !== filterFaculty) return false;
    return true;
  });

  // --- UI Components ---
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-24 h-24 border-8 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
        <h2 className="mt-8 text-2xl font-black text-emerald-600 animate-pulse">جاري تحميل عالمك الرقمي...</h2>
        <p className="text-gray-400 mt-2 font-bold">WAY - رؤية ربيع المستقبلية</p>
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="animate-float">
          <h1 className="text-8xl font-black tracking-tighter mb-4">WAY</h1>
          <p className="text-xl font-bold opacity-80 mb-12">المنصة الجامعية الرقمية الأولى في الجزائر</p>
        </div>
        <div className="flex flex-col w-full max-w-sm gap-4">
          <button onClick={() => handleLogin('student')} className="bg-white text-emerald-600 py-6 rounded-3xl font-black text-xl shadow-2xl hover:scale-105 transition-transform">دخول كطالب (ربيع)</button>
          <button onClick={() => handleLogin('prof_bentahar')} className="bg-emerald-800/40 border-2 border-white/20 text-white py-6 rounded-3xl font-black text-xl hover:bg-emerald-700/50 transition-all">دخول كأستاذ (بن الطاهر)</button>
        </div>
        <p className="mt-12 text-sm opacity-60 font-bold">بإشراف وتطوير: حمر العين ربيع</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right">
      {/* Navigation Mobile Top */}
      <div className="md:hidden flex items-center justify-between p-6 bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <h1 className="text-3xl font-black text-emerald-600">WAY</h1>
        <div className="flex gap-4">
           <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl">
             <span className="font-black text-emerald-600">{currentUser?.walletBalance} دج</span>
           </div>
        </div>
      </div>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-80 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-8 flex-col gap-10 shadow-2xl z-20 sticky top-0 h-screen">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-5xl font-black text-emerald-600 tracking-tighter">WAY</h2>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">جامعتك الرقمية الموثوقة</span>
        </div>
        <nav className="flex flex-col gap-2">
          {[
            { id: 'home', label: 'الرئيسية', icon: '🏠' },
            { id: 'messages', label: 'الدردشة', icon: '💬' },
            { id: 'wallet', label: 'المحفظة', icon: '💰' },
            { id: 'profile', label: 'الملف الشخصي', icon: '👤' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => { setActiveTab(tab.id as any); setView('dashboard'); }} 
              className={`p-5 rounded-3xl font-black flex items-center gap-4 transition-all ${activeTab === tab.id && view === 'dashboard' ? 'bg-emerald-600 text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-800'}`}
            >
              <span className="text-xl">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>
        
        {currentUser?.role === 'professor' && (
          <div className="mt-auto bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[2.5rem] border-2 border-emerald-100 dark:border-emerald-800">
             <button onClick={() => setShowCreateChannel(true)} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg">إنشاء قناة جديدة</button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32 no-scrollbar">
        {view === 'dashboard' && activeTab === 'home' && (
          <div className="space-y-12 max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black dark:text-white">أهلاً، {currentUser?.firstName} 👋</h1>
                <p className="text-gray-400 font-bold mt-2">استكشف قنوات الأساتذة والدروس الحصرية</p>
              </div>
            </header>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-900 p-4 rounded-[3rem] shadow-sm border dark:border-gray-800">
              <select 
                value={filterUniv} 
                onChange={e => setFilterUniv(e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 p-5 rounded-[2rem] outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500"
              >
                <option value="">كل الجامعات</option>
                {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select 
                value={filterFaculty} 
                onChange={e => setFilterFaculty(e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 p-5 rounded-[2rem] outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500"
              >
                <option value="">كل الكليات</option>
                {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Professors List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {filteredProfessors.map(prof => (
                <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[4rem] border dark:border-gray-800 text-center space-y-6 shadow-sm hover:shadow-2xl transition-all group relative">
                  <div className="flex justify-center">
                    <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="lg" />
                  </div>
                  <div>
                    <h4 className="font-black text-2xl dark:text-white">{prof.firstName} {prof.lastName}</h4>
                    <p className="text-[10px] text-emerald-600 font-black mt-2 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full inline-block">{prof.university}</p>
                    <p className="text-xs text-gray-400 font-bold mt-2 line-clamp-1">{prof.faculty}</p>
                  </div>
                  <button 
                    onClick={() => {
                      const profChan = channels.filter(c => c.professorId === prof.id);
                      if (profChan.length > 0) { setSelectedChannel(profChan[0]); setView('channel-view'); }
                      else alert("هذا الأستاذ لم يفتح أي قناة حالياً.");
                    }}
                    className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] text-sm font-black shadow-lg"
                  >
                    تصفح القنوات
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'channel-view' && selectedChannel && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
             <button onClick={() => setView('dashboard')} className="mb-4 text-emerald-600 font-black flex items-center gap-2">
               <span>← العودة للرئيسية</span>
             </button>
             <div className="bg-white dark:bg-gray-900 rounded-[4rem] p-8 md:p-12 border dark:border-gray-800 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-bl-full"></div>
                <h2 className="text-4xl font-black dark:text-white mb-2">{selectedChannel.name}</h2>
                <p className="text-emerald-600 font-black mb-6">{selectedChannel.department}</p>
                <p className="text-gray-500 dark:text-gray-400 font-bold leading-loose text-lg mb-10">{selectedChannel.description}</p>
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t dark:border-gray-800 pt-10">
                   <div className="text-center md:text-right">
                      <p className="text-xs text-gray-400 font-black uppercase">سعر الاشتراك</p>
                      <p className="text-4xl font-black text-emerald-600">{selectedChannel.price} دج</p>
                   </div>
                   {selectedChannel.subscribers.includes(currentUser?.id || '') ? (
                     <div className="flex flex-col gap-4 w-full md:w-auto">
                        <button className="bg-emerald-100 text-emerald-700 px-12 py-5 rounded-[2rem] font-black" disabled>أنت مشترك بالفعل</button>
                        <button onClick={() => { setActiveChatChannel(selectedChannel); setView('chat-view'); }} className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black shadow-lg">دخول للدردشة 💬</button>
                     </div>
                   ) : (
                     <button onClick={() => handleSubscribe(selectedChannel)} className="w-full md:w-auto bg-emerald-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:scale-105 transition-transform">اشتراك الآن</button>
                   )}
                </div>
             </div>

             {/* Content List - Only for Subscribers */}
             <div className="space-y-6">
                <h3 className="text-2xl font-black dark:text-white">محتوى القناة 📚</h3>
                {selectedChannel.subscribers.includes(currentUser?.id || '') || currentUser?.id === selectedChannel.professorId ? (
                   <div className="grid gap-4">
                      {selectedChannel.content.map(item => (
                        <div key={item.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] flex items-center justify-between border dark:border-gray-800 hover:border-emerald-500 transition-all">
                           <div className="flex items-center gap-6">
                              <span className="text-3xl">{item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : '🖼️'}</span>
                              <div>
                                 <h4 className="font-black dark:text-white">{item.title}</h4>
                                 <p className="text-[10px] text-gray-400 font-bold uppercase">{item.type}</p>
                              </div>
                           </div>
                           <button onClick={async () => {
                             alert(`جاري تلخيص الملف: ${item.title}`);
                             const sum = await summarizeContent(item.title, item.type);
                             alert(`خلاصة جارفيس:\n\n${sum}`);
                           }} className="text-emerald-600 font-black text-xs hover:underline">ملخص جارفيس ✨</button>
                        </div>
                      ))}
                      {(currentUser?.id === selectedChannel.professorId) && (
                        <button onClick={() => setShowAddContent(true)} className="p-8 border-4 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] text-gray-400 font-black hover:bg-gray-50 transition-colors">+ إضافة درس جديد</button>
                      )}
                   </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-900/50 p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-gray-400 font-black">يجب عليك الاشتراك لرؤية المحتوى والدروس</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {view === 'chat-view' && activeChatChannel && (
          <div className="h-full flex flex-col max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden border dark:border-gray-800">
             <div className="p-6 bg-emerald-600 text-white flex items-center justify-between">
                <button onClick={() => setView('channel-view')} className="font-black">إغلاق</button>
                <div className="text-center">
                   <h3 className="font-black text-lg">{activeChatChannel.name}</h3>
                   <p className="text-[10px] opacity-80">مجموعة المشتركين الحصرية</p>
                </div>
                <div className="w-10"></div>
             </div>
             <div className="flex-1 p-6 overflow-y-auto space-y-4 no-scrollbar">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-blue-600 dark:text-blue-400 text-center text-xs font-bold">
                  أهلاً بك في فضاء الدردشة الخاص. يرجى احترام آداب الحوار الجامعي.
                </div>
                {chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-[1.5rem] shadow-sm ${m.senderId === currentUser?.id ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-800 dark:text-white rounded-bl-none'}`}>
                       <p className="text-[10px] font-black opacity-60 mb-1">{m.senderName}</p>
                       <p className="font-bold">{m.text}</p>
                    </div>
                  </div>
                ))}
             </div>
             <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex gap-4">
                <input 
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1 bg-white dark:bg-gray-900 p-5 rounded-2xl outline-none font-bold dark:text-white"
                />
                <button onClick={sendMessage} className="bg-emerald-600 text-white px-8 rounded-2xl font-black">إرسال</button>
             </div>
          </div>
        )}

        {activeTab === 'wallet' && view === 'dashboard' && (
          <div className="max-w-xl mx-auto space-y-8 animate-in zoom-in duration-300">
             <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <p className="font-black opacity-80 uppercase tracking-widest text-xs mb-4">الرصيد المتاح</p>
                <h2 className="text-6xl font-black mb-8">{currentUser?.walletBalance} <span className="text-2xl opacity-60">دج</span></h2>
                <button onClick={() => setShowRechargeModal(true)} className="w-full bg-white text-emerald-600 py-6 rounded-3xl font-black text-xl shadow-lg">تعبئة الرصيد</button>
             </div>

             <div className="space-y-4">
                <h3 className="text-2xl font-black dark:text-white">العمليات الأخيرة</h3>
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] overflow-hidden border dark:border-gray-800">
                   <div className="p-8 flex items-center justify-between border-b dark:border-gray-800">
                      <div>
                        <p className="font-black dark:text-white">هدية من ربيع</p>
                        <p className="text-[10px] text-gray-400">منحة تشجيعية للمنصة</p>
                      </div>
                      <span className="text-emerald-600 font-black">+5000 دج</span>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'profile' && view === 'dashboard' && (
          <div className="max-w-2xl mx-auto text-center space-y-8">
             <div className="bg-white dark:bg-gray-900 p-16 rounded-[5rem] shadow-sm border dark:border-gray-800">
                <div className="flex justify-center">
                  <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="lg" />
                </div>
                <h2 className="text-4xl font-black dark:text-white mt-8">{currentUser?.firstName} {currentUser?.lastName}</h2>
                <p className="text-emerald-600 font-black mt-2">{currentUser?.role === 'professor' ? 'أستاذ محاضر' : 'طالب جامعي'}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-12">
                   <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl">
                      <p className="text-[10px] text-gray-400 font-black">الرتبة</p>
                      <p className="font-black text-lg dark:text-white">طالب نخبوي</p>
                   </div>
                   <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl">
                      <p className="text-[10px] text-gray-400 font-black">الجامعة</p>
                      <p className="font-black text-lg dark:text-white">{currentUser?.university}</p>
                   </div>
                </div>

                <div className="mt-12 space-y-4">
                   <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full p-8 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] font-black dark:text-white flex items-center justify-between">
                      <span>الوضع {isDarkMode ? 'النهاري' : 'الليلي'}</span>
                      <span className="text-3xl">{isDarkMode ? '☀️' : '🌙'}</span>
                   </button>
                   <button onClick={() => { localStorage.removeItem('way_session'); setView('landing'); }} className="w-full bg-red-50 text-red-500 py-8 rounded-[3rem] font-black border-2 border-red-100 mt-10">تسجيل الخروج</button>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Jarvis Button & Modal */}
      <button 
        onClick={() => setIsJarvisOpen(true)}
        className="fixed bottom-24 right-6 md:bottom-12 md:right-12 z-[100] w-20 h-20 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform animate-float border-4 border-white dark:border-gray-900"
      >
        <div className="relative">
          <span className="text-4xl">🤖</span>
          <span className="absolute -top-2 -right-2 bg-red-500 w-5 h-5 rounded-full border-2 border-white animate-ping"></span>
        </div>
      </button>

      {isJarvisOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-6">
           <div className="bg-white dark:bg-gray-950 w-full max-w-2xl h-[80vh] rounded-[4rem] flex flex-col overflow-hidden shadow-2xl border dark:border-gray-800 animate-in zoom-in duration-300">
              <div className="p-8 bg-emerald-600 text-white flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <span className="text-4xl">🤖</span>
                    <div>
                       <h3 className="text-2xl font-black leading-none">جارفيس (Jarvis)</h3>
                       <p className="text-[10px] opacity-80 font-bold">مساعد ربيع الوفي | العقل المدبر لـ WAY</p>
                    </div>
                 </div>
                 <button onClick={() => setIsJarvisOpen(false)} className="bg-white/20 p-4 rounded-full font-black">إغلاق</button>
              </div>
              
              <div className="flex-1 p-8 overflow-y-auto space-y-6 no-scrollbar">
                 {jarvisChat.length === 0 && (
                   <div className="text-center py-20">
                      <p className="text-4xl mb-4">👋</p>
                      <h4 className="text-2xl font-black dark:text-white mb-2">واش راك يا خويا؟</h4>
                      <p className="text-gray-400 font-bold">أنا جارفيس، كيفاش نقدر نعاونك في قرايتك اليوم؟</p>
                   </div>
                 )}
                 {jarvisChat.map((chat, idx) => (
                   <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-6 rounded-[2rem] shadow-sm ${chat.role === 'user' ? 'bg-emerald-100 text-emerald-900 rounded-br-none' : 'bg-gray-100 dark:bg-gray-900 dark:text-white border dark:border-gray-800 rounded-bl-none'}`}>
                         <p className="font-bold leading-relaxed whitespace-pre-wrap">{chat.text}</p>
                         {chat.sources && chat.sources.length > 0 && (
                           <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                              <p className="text-[10px] font-black uppercase text-emerald-600 mb-2">المراجع المقترحة:</p>
                              <div className="flex flex-wrap gap-2">
                                 {chat.sources.map((s, i) => (
                                   <a key={i} href={s.web?.uri} target="_blank" className="text-[9px] bg-emerald-50 dark:bg-emerald-900/40 p-2 rounded-lg font-bold truncate max-w-[150px]">{s.web?.title}</a>
                                 ))}
                              </div>
                           </div>
                         )}
                      </div>
                   </div>
                 ))}
                 {isJarvisThinking && (
                   <div className="flex justify-start">
                      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-[2rem] flex gap-2">
                         <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
                         <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-100"></div>
                         <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-200"></div>
                      </div>
                   </div>
                 )}
              </div>
              
              <div className="p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex gap-4">
                 <input 
                   value={jarvisInput}
                   onChange={e => setJarvisInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()}
                   placeholder="اسألني أي حاجة أكاديمية..."
                   className="flex-1 bg-white dark:bg-gray-900 p-6 rounded-3xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500 transition-all"
                 />
                 <button 
                  onClick={handleJarvisAsk}
                  disabled={isJarvisThinking}
                  className="bg-emerald-600 text-white px-10 rounded-3xl font-black shadow-lg disabled:opacity-50"
                 >
                   سقسي
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Modals: Create Channel, Add Content, Recharge */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-6">
           <div className="bg-white dark:bg-gray-950 w-full max-w-lg p-10 rounded-[4rem] shadow-2xl space-y-6">
              <h3 className="text-3xl font-black dark:text-white">إنشاء قناة تعليمية</h3>
              <div className="space-y-4">
                 <input placeholder="اسم المقياس (Module)" className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white font-bold" />
                 <select className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white font-bold">
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                 </select>
                 <input type="number" placeholder="السعر (دج)" className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white font-bold" />
                 <textarea placeholder="وصف القناة..." className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white font-bold h-32"></textarea>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => { alert('تم إنشاء القناة بنجاح!'); setShowCreateChannel(false); }} className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black">تأكيد الإنشاء</button>
                 <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 text-gray-400 py-5 rounded-2xl font-black">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-6">
           <div className="bg-white dark:bg-gray-950 w-full max-w-md p-10 rounded-[4rem] shadow-2xl text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-4xl">💳</div>
              <h3 className="text-3xl font-black dark:text-white">تعبئة الرصيد</h3>
              <p className="text-gray-400 font-bold">يرجى الاتصال بالرقم 0550XXXXXX لإرسال الرصيد عبر تطبيق BaridiMob أو CCP.</p>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800">
                 <p className="text-xs font-black text-emerald-600 uppercase mb-2">رقم الحساب الجاري (CCP)</p>
                 <p className="text-2xl font-black dark:text-white">0012345678 / 99</p>
              </div>
              <button onClick={() => setShowRechargeModal(false)} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black">فهمت، سأقوم بالشحن</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
