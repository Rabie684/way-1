
import React, { useState, useEffect } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES, APP_COMMISSION } from './constants';
import { getMedal, getMedalPrice } from './utils';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk } from './services/geminiService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'dashboard' | 'admin-dashboard' | 'channel-view'>('landing');
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelTab, setChannelTab] = useState<'pdf' | 'media' | 'chat' | 'jarvis'>('pdf');
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'channels' | 'messages' | 'approvals' | 'stats'>('home');
  
  // Student Search Filters
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);

  // Jarvis States
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisResponse, setJarvisResponse] = useState<string | null>(null);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');

  // States for new content/channel
  const [showAddContent, setShowAddContent] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '' });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'image' | 'video' });

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const targetUniv = "جامعة ابن خلدون ملحقة قصر الشلالة";
    const targetFaculty = "كلية العلوم الاقتصادية";

    // Initial Mock Data
    const mockProfs: User[] = [
      {
        id: 'p1',
        firstName: 'محمد',
        lastName: 'بن علي',
        email: 'prof1@univ.dz',
        role: 'professor',
        university: UNIVERSITIES[0],
        faculty: FACULTIES[0],
        walletBalance: 5400,
        avatar: 'https://i.pravatar.cc/150?u=prof1',
        isApproved: true,
        studentCount: 155
      },
      {
        id: 'p5',
        firstName: 'بختة',
        lastName: 'بن الطاهر',
        email: 'bentahar@univ.dz',
        role: 'professor',
        university: targetUniv,
        faculty: targetFaculty,
        walletBalance: 0,
        avatar: 'https://i.pravatar.cc/150?u=p5',
        isApproved: true,
        studentCount: 120
      },
      {
        id: 'p6',
        firstName: 'الأستاذ',
        lastName: 'ايت عيسى',
        email: 'aitissa@univ.dz',
        role: 'professor',
        university: targetUniv,
        faculty: targetFaculty,
        walletBalance: 0,
        avatar: 'https://i.pravatar.cc/150?u=p6',
        isApproved: true,
        studentCount: 105
      },
      {
        id: 'p7',
        firstName: 'الأستاذ',
        lastName: 'لكحل',
        email: 'lakhal@univ.dz',
        role: 'professor',
        university: targetUniv,
        faculty: targetFaculty,
        walletBalance: 0,
        avatar: 'https://i.pravatar.cc/150?u=p7',
        isApproved: true,
        studentCount: 85
      },
      {
        id: 'p8',
        firstName: 'الأستاذ',
        lastName: 'بربار',
        email: 'barbar@univ.dz',
        role: 'professor',
        university: targetUniv,
        faculty: targetFaculty,
        walletBalance: 0,
        avatar: 'https://i.pravatar.cc/150?u=p8',
        isApproved: true,
        studentCount: 45
      },
      {
        id: 'p9',
        firstName: 'الأستاذ',
        lastName: 'حجاج',
        email: 'haddadj@univ.dz',
        role: 'professor',
        university: targetUniv,
        faculty: targetFaculty,
        walletBalance: 0,
        avatar: 'https://i.pravatar.cc/150?u=p9',
        isApproved: true,
        studentCount: 30
      }
    ];

    const mockStudent: User = {
      id: 's1',
      firstName: 'أمين',
      lastName: 'دزيري',
      email: 'student@mail.dz',
      role: 'student',
      walletBalance: 1200,
      avatar: 'https://i.pravatar.cc/150?u=stud1',
      isApproved: true
    };

    const adminUser: User = {
      id: 'admin',
      firstName: 'مدير',
      lastName: 'الجامعة',
      email: 'admin@way.dz',
      role: 'admin',
      walletBalance: 50000,
      avatar: 'https://i.pravatar.cc/150?u=admin',
      isApproved: true
    };

    setUsers([...mockProfs, mockStudent, adminUser]);
    setChannels([
      {
        id: 'c1',
        professorId: 'p1',
        name: 'فيزياء الجوامد',
        description: 'دورة شاملة في فيزياء الجوامد لطلاب السنة الثالثة جامعي.',
        price: 300,
        subscribers: ['s1'],
        content: []
      },
      {
        id: 'c_bakhta',
        professorId: 'p5',
        name: 'الاقتصاد الجزئي',
        description: 'شرح مفصل لمبادئ الاقتصاد الجزئي وسلوك المستهلك.',
        price: 200,
        subscribers: [],
        content: [{ id: 'ct_b1', type: 'pdf', title: 'المحاضرة 1: العرض والطلب', url: '#', createdAt: new Date() }]
      },
      {
        id: 'c_ait',
        professorId: 'p6',
        name: 'الاقتصاد الكلي',
        description: 'تحليل المتغيرات الاقتصادية الكلية والسياسات المالية.',
        price: 150,
        subscribers: [],
        content: []
      },
      {
        id: 'c_lakhal',
        professorId: 'p7',
        name: 'الرياضيات المالية',
        description: 'تطبيقات الرياضيات في العمليات المالية والمصرفية.',
        price: 150,
        subscribers: [],
        content: []
      },
      {
        id: 'c_barbar',
        professorId: 'p8',
        name: 'الإحصاء الوصفي',
        description: 'طرق جمع وتبويب وتمثيل البيانات إحصائياً.',
        price: 100,
        subscribers: [],
        content: []
      },
      {
        id: 'c_haddadj',
        professorId: 'p9',
        name: 'تسيير المؤسسة',
        description: 'مبادئ إدارة المنظمات والمؤسسات الاقتصادية.',
        price: 100,
        subscribers: [],
        content: []
      }
    ]);
  }, []);

  const handleJarvisSummarize = async (item: ContentItem) => {
    setChannelTab('jarvis');
    setIsJarvisThinking(true);
    setJarvisResponse(null);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisResponse(summary);
    setIsJarvisThinking(false);
  };

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

  const handleRegister = (role: UserRole, formData: any) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      role,
      walletBalance: 0,
      avatar: `https://i.pravatar.cc/150?u=${formData.email}`,
      isApproved: role === 'student', 
    };
    setUsers([...users, newUser]);
    setCurrentUser(newUser);
    if (role === 'student') setView('dashboard');
    else alert('تم استلام طلبك. يرجى انتظار موافقة إدارة الجامعة.');
  };

  const subscribeToChannel = (channelId: string) => {
    if (!currentUser) return;
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return;
    if (currentUser.walletBalance < channel.price) {
      alert('رصيدك غير كافٍ للاشتراك!');
      return;
    }
    const updatedChannels = channels.map(c => 
      c.id === channelId ? { ...c, subscribers: [...c.subscribers, currentUser.id] } : c
    );
    setChannels(updatedChannels);
    setCurrentUser({ ...currentUser, walletBalance: currentUser.walletBalance - channel.price });
    alert(`تم الاشتراك في "${channel.name}" بنجاح!`);
  };

  const openChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setView('channel-view');
    setChannelTab('pdf');
    setJarvisResponse(null);
    setJarvisChat([]);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !currentUser) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      text: newMessage,
      timestamp: new Date()
    };
    setChatMessages([...chatMessages, msg]);
    setNewMessage('');
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-green-900 flex flex-col items-center justify-center text-white p-6 text-right">
        <div className="animate-float mb-12 text-center">
          <h1 className="text-9xl font-black tracking-tighter mb-2">WAY</h1>
          <p className="text-2xl font-light opacity-80 italic">جامعتك الرقمية أينما كنت</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button onClick={() => setView('register-prof')} className="group relative bg-white text-emerald-900 p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl overflow-hidden">
            <h3 className="text-2xl font-black mb-2">أنا أستاذ</h3>
            <p className="text-sm opacity-70">أنشئ قناتك التعليمية بعد موافقة الجامعة.</p>
          </button>
          <button onClick={() => setView('register-student')} className="group relative bg-emerald-500 text-white p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl border-2 border-emerald-400 overflow-hidden">
            <h3 className="text-2xl font-black mb-2">أنا طالب</h3>
            <p className="text-sm opacity-70">التحق بأفضل القنوات ونظم مسارك الدراسي.</p>
          </button>
        </div>
        <div className="mt-12 flex gap-8">
           <button onClick={() => { const u = users.find(x=>x.role==='admin'); if(u) {setCurrentUser(u); setView('admin-dashboard'); setActiveTab('stats');} }} className="text-emerald-200 hover:text-white transition text-sm font-bold bg-white/10 px-6 py-2 rounded-full backdrop-blur-sm">لوحة إدارة الجامعة</button>
           <button onClick={() => { const u = users.find(x=>x.role==='professor' && x.isApproved); if(u) {setCurrentUser(u); setView('dashboard'); setActiveTab('home');} }} className="text-emerald-200 hover:text-white transition text-sm">دخول سريع (أستاذ)</button>
           <button onClick={() => { const u = users.find(x=>x.role==='student'); if(u) {setCurrentUser(u); setView('dashboard'); setActiveTab('home');} }} className="text-emerald-200 hover:text-white transition text-sm">دخول سريع (طالب)</button>
        </div>
      </div>
    );
  }

  // Register Views...
  if (view === 'register-student' || view === 'register-prof') {
    const isProf = view === 'register-prof';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-right">
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 border border-gray-100">
          <header className="text-center mb-8">
            <h2 className="text-3xl font-black text-emerald-800 mb-2">إنشاء حساب {isProf ? 'أستاذ' : 'طالب'}</h2>
          </header>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const target = e.target as any;
            handleRegister(isProf ? 'professor' : 'student', {
              firstName: target.firstName.value,
              lastName: target.lastName.value,
              email: target.email.value,
              ...(isProf ? { university: target.university.value, faculty: target.faculty.value } : {})
            });
          }}>
            <div className="grid grid-cols-2 gap-4">
              <input name="firstName" required className="bg-gray-50 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="الاسم" />
              <input name="lastName" required className="bg-gray-50 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="اللقب" />
            </div>
            <input name="email" type="email" required className="w-full bg-gray-50 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none text-left" placeholder="البريد الإلكتروني" />
            {isProf && (
              <>
                <select name="university" className="w-full bg-gray-50 rounded-2xl p-4 outline-none">
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select name="faculty" className="w-full bg-gray-50 rounded-2xl p-4 outline-none">
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </>
            )}
            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg mt-4">إتمام التسجيل</button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 text-sm py-2">رجوع</button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard logic...
  if (view === 'dashboard' && currentUser) {
    const isProfessor = currentUser.role === 'professor';
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-right">
        <aside className="w-full md:w-72 bg-white border-l border-gray-100 p-8 flex flex-col gap-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 justify-end">
            <h2 className="text-2xl font-black text-emerald-900 tracking-tight">WAY</h2>
            <div className="bg-emerald-600 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black text-2xl">W</div>
          </div>
          <nav className="flex flex-col gap-2">
            <button onClick={() => setActiveTab('home')} className={`flex items-center justify-between gap-4 p-4 rounded-2xl font-bold transition ${activeTab === 'home' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>
              <span>الرئيسية</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            </button>
            <button onClick={() => setActiveTab('channels')} className={`flex items-center justify-between gap-4 p-4 rounded-2xl font-bold transition ${activeTab === 'channels' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>
              <span>{isProfessor ? 'قنواتي' : 'اشتراكاتي'}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            </button>
            <button onClick={() => setActiveTab('wallet')} className={`flex items-center justify-between gap-4 p-4 rounded-2xl font-bold transition ${activeTab === 'wallet' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>
              <span>المحفظة</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            </button>
          </nav>
          <div className="mt-auto p-6 bg-emerald-50 rounded-3xl flex flex-col items-center gap-3">
             <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="md" />
             <p className="font-black text-emerald-900">{currentUser.firstName} {currentUser.lastName}</p>
             <button onClick={() => setView('landing')} className="text-red-500 text-xs font-bold hover:underline">تسجيل الخروج</button>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'home' && (
            <div className="max-w-5xl mx-auto space-y-8">
              {!isProfessor ? (
                <>
                  <header className="space-y-4">
                    <h1 className="text-4xl font-black text-gray-900">البحث عن أستاذ</h1>
                    <p className="text-gray-500">اختر الجامعة والكلية لتجد أفضل الأساتذة المعتمدين.</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="space-y-2 text-right">
                       <label className="text-xs font-black text-emerald-700 px-2">الجامعة</label>
                       <select value={filterUniv} onChange={e => {setFilterUniv(e.target.value); setFilterFaculty(''); setSelectedProfId(null);}} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700">
                          <option value="">اختر الجامعة...</option>
                          {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2 text-right">
                       <label className="text-xs font-black text-emerald-700 px-2">الكلية</label>
                       <select disabled={!filterUniv} value={filterFaculty} onChange={e => {setFilterFaculty(e.target.value); setSelectedProfId(null);}} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700 disabled:opacity-50">
                          <option value="">اختر الكلية...</option>
                          {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                       </select>
                    </div>
                  </div>

                  {filterUniv && filterFaculty && (
                    <div className="space-y-6">
                       <h3 className="text-xl font-black text-emerald-900">الأساتذة المتاحون</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {users
                            .filter(u => u.role === 'professor' && u.isApproved && u.university === filterUniv && u.faculty === filterFaculty)
                            .sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0))
                            .map(prof => (
                              <button key={prof.id} onClick={() => setSelectedProfId(prof.id)} className={`bg-white p-6 rounded-[2.5rem] border transition flex flex-col items-center text-center hover:shadow-xl ${selectedProfId === prof.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-100 shadow-sm'}`}>
                                 <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="lg" />
                                 <h4 className="font-black text-lg text-gray-800 mt-4">{prof.firstName} {prof.lastName}</h4>
                                 <div className="text-[10px] bg-gray-50 px-3 py-1 rounded-full text-gray-400 font-bold uppercase tracking-widest mt-2">{prof.studentCount || 0} طالب</div>
                              </button>
                            ))}
                       </div>
                    </div>
                  )}

                  {selectedProfId && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                       <h3 className="text-xl font-black text-emerald-900">قنوات الأستاذ</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {channels.filter(c => c.professorId === selectedProfId).map(channel => {
                             const isSubscribed = channel.subscribers.includes(currentUser.id);
                             return (
                               <div key={channel.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col group hover:shadow-xl transition">
                                  <h4 className="font-black text-2xl text-emerald-900 mb-2">{channel.name}</h4>
                                  <p className="text-gray-500 text-sm mb-8 flex-1">{channel.description}</p>
                                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                     <button onClick={() => isSubscribed ? openChannel(channel) : subscribeToChannel(channel.id)} className={`w-full py-4 rounded-2xl font-black transition shadow-md flex items-center justify-center gap-3 ${isSubscribed ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                       {isSubscribed ? 'دخول القناة' : `اشتراك (${channel.price} دج)`}
                                     </button>
                                  </div>
                               </div>
                             )
                          })}
                       </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-8">
                  <header className="flex justify-between items-center">
                    <h1 className="text-4xl font-black text-gray-900">لوحة تحكم الأستاذ</h1>
                    <button onClick={() => setShowCreateChannel(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">إنشاء قناة +</button>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {channels.filter(c => c.professorId === currentUser.id).map(channel => (
                      <div key={channel.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col hover:shadow-xl transition group">
                         <h4 className="font-black text-2xl text-emerald-900 mb-2">{channel.name}</h4>
                         <p className="text-gray-500 text-sm mb-8 flex-1">{channel.description}</p>
                         <button onClick={() => openChannel(channel)} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-md">إدارة المحتوى</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="max-w-xl mx-auto space-y-8">
               <div className="bg-gradient-to-br from-emerald-700 to-green-900 p-12 rounded-[3.5rem] text-white shadow-2xl">
                  <p className="opacity-70 font-bold text-lg mb-2">رصيد محفظتك</p>
                  <h2 className="text-7xl font-black mb-10">{currentUser.walletBalance} <span className="text-2xl font-light opacity-50 uppercase tracking-widest">DZD</span></h2>
                  <button className="w-full bg-white text-emerald-800 py-5 rounded-[1.5rem] font-black shadow-xl hover:bg-emerald-50 transition active:scale-95">شحن الرصيد</button>
               </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Channel View with Jarvis
  if (view === 'channel-view' && selectedChannel && currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 text-right">
        <header className="bg-white border-b border-gray-100 p-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button onClick={() => setChannelTab('pdf')} className={`px-6 py-2 rounded-xl text-sm font-black transition ${channelTab === 'pdf' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>المكتبة</button>
            <button onClick={() => setChannelTab('chat')} className={`px-6 py-2 rounded-xl text-sm font-black transition ${channelTab === 'chat' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>النقاش</button>
            <button onClick={() => setChannelTab('jarvis')} className={`px-6 py-2 rounded-xl text-sm font-black transition flex items-center gap-2 ${channelTab === 'jarvis' ? 'bg-emerald-600 shadow-sm text-white' : 'text-emerald-700'}`}>
              <span>جارفيس AI ✨</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <h2 className="font-black text-2xl text-emerald-900">{selectedChannel.name}</h2>
            <button onClick={() => setView('dashboard')} className="p-3 hover:bg-gray-100 rounded-2xl transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          {channelTab === 'pdf' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {selectedChannel.content.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between group">
                  <div className="flex gap-2">
                     <button onClick={() => handleJarvisSummarize(item)} className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-emerald-600 hover:text-white transition">لخص مع جارفيس ✨</button>
                     <button className="bg-gray-50 text-gray-500 px-4 py-2.5 rounded-xl font-black text-xs">تحميل</button>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                     <div>
                       <p className="font-black text-gray-800 text-lg">{item.title}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase">{item.type === 'pdf' ? 'ملف PDF' : 'فيديو تعليمي'}</p>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {channelTab === 'jarvis' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
               <div className="bg-gradient-to-br from-emerald-900 to-green-950 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 flex flex-col items-center text-center">
                     <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(16,185,129,0.5)] mb-6 animate-pulse">🤖</div>
                     <h3 className="text-3xl font-black mb-2">أهلاً بك في "جارفيس"</h3>
                     <p className="text-emerald-200 font-bold opacity-80">أنا مساعدك الذكي المبني بتقنيات Gemini، كيف يمكنني مساعدتك اليوم؟</p>
                  </div>
               </div>

               {isJarvisThinking && (
                 <div className="flex flex-col items-center gap-4 py-10">
                    <p className="text-emerald-700 font-black animate-pulse">جارفيس يحلل البيانات الآن...</p>
                 </div>
               )}

               {jarvisResponse && (
                 <div className="bg-white p-10 rounded-[3rem] border-t-8 border-emerald-600 shadow-xl prose prose-emerald max-w-none text-right">
                    <h4 className="text-emerald-800 font-black text-xl mb-4 flex items-center gap-2">📝 ملخص المحتوى</h4>
                    <div className="text-gray-700 leading-relaxed font-medium whitespace-pre-line text-lg">{jarvisResponse}</div>
                 </div>
               )}

               <div className="space-y-4">
                  <div className="bg-gray-100/50 p-6 rounded-[2.5rem] min-h-[200px] flex flex-col gap-4">
                     {jarvisChat.map((msg, i) => (
                       <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] font-black text-gray-400 mb-1 px-2 uppercase">{msg.role === 'jarvis' ? 'جارفيس' : 'أنت'}</span>
                          <div className={`p-5 rounded-3xl max-w-[85%] text-sm font-bold shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-100 text-gray-800'}`}>
                             {msg.text}
                          </div>
                       </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                     <button onClick={handleJarvisChat} disabled={isJarvisThinking} className="bg-emerald-600 text-white p-5 rounded-2xl shadow-lg active:scale-95 disabled:opacity-50">
                        <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                     </button>
                     <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleJarvisChat()} placeholder="اسأل جارفيس أي شيء عن هذا الدرس..." className="flex-1 bg-white border border-emerald-200 rounded-2xl px-8 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-100 shadow-sm text-right" />
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
