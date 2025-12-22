
import React, { useState, useEffect } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES, APP_COMMISSION } from './constants';
import { getMedal, getMedalPrice } from './utils';
import ProfessorRank from './components/ProfessorRank';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'dashboard' | 'admin' | 'channel-view'>('landing');
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelTab, setChannelTab] = useState<'pdf' | 'media' | 'chat'>('pdf');
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'channels' | 'messages'>('home');
  
  // States for new content/channel
  const [showAddContent, setShowAddContent] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '' });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'image' | 'video' });

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Record<string, ChatMessage[]>>({});
  const [selectedStudentChat, setSelectedStudentChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Initial Mock Data
    const mockProf: User = {
      id: 'p1',
      firstName: 'محمد',
      lastName: 'بن علي',
      email: 'prof@univ.dz',
      role: 'professor',
      university: UNIVERSITIES[1],
      faculty: FACULTIES[1],
      walletBalance: 5400,
      avatar: 'https://i.pravatar.cc/150?u=prof1',
      isApproved: true,
      studentCount: 155
    };
    
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

    setUsers([mockProf, mockStudent]);
    setChannels([{
      id: 'c1',
      professorId: 'p1',
      name: 'فيزياء الجوامد',
      description: 'دورة شاملة في فيزياء الجوامد لطلاب السنة الثالثة جامعي.',
      price: 300,
      subscribers: ['s1'],
      content: [
        { id: 'ct1', type: 'pdf', title: 'المحاضرة 01: بنية البلورات', url: '#', createdAt: new Date() },
        { id: 'ct2', type: 'video', title: 'شرح تجربة الحيود', url: '#', createdAt: new Date() },
      ]
    }]);
  }, []);

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
    setView('dashboard');
  };

  const handleCreateChannel = () => {
    if (!currentUser || !newChannelData.name) return;
    const medal = getMedal(currentUser.studentCount || 0);
    const price = getMedalPrice(medal);

    const newChannel: Channel = {
      id: 'c' + Date.now(),
      professorId: currentUser.id,
      name: newChannelData.name,
      description: newChannelData.description,
      price: price,
      subscribers: [],
      content: []
    };

    setChannels([...channels, newChannel]);
    setShowCreateChannel(false);
    setNewChannelData({ name: '', description: '' });
    setActiveTab('channels'); // الانتقال لقسم القنوات لرؤية النتيجة
  };

  const handleAddContent = () => {
    if (!selectedChannel || !newContentData.title) return;
    
    const newItem: ContentItem = {
      id: 'ct' + Date.now(),
      type: newContentData.type,
      title: newContentData.title,
      url: '#',
      createdAt: new Date()
    };

    const updatedChannels = channels.map(c => 
      c.id === selectedChannel.id ? { ...c, content: [...c.content, newItem] } : c
    );
    
    setChannels(updatedChannels);
    setSelectedChannel({ ...selectedChannel, content: [...selectedChannel.content, newItem] });
    setShowAddContent(false);
    setNewContentData({ title: '', type: 'pdf' });
  };

  const sendMessage = (isPrivate = false) => {
    if (!newMessage.trim() || !currentUser) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      text: newMessage,
      timestamp: new Date()
    };

    if (isPrivate && selectedStudentChat) {
      setPrivateMessages(prev => ({
        ...prev,
        [selectedStudentChat]: [...(prev[selectedStudentChat] || []), msg]
      }));
    } else {
      setChatMessages([...chatMessages, msg]);
    }
    setNewMessage('');
  };

  const openChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setView('channel-view');
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
    alert('تم الاشتراك بنجاح!');
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-green-900 flex flex-col items-center justify-center text-white p-6">
        <div className="animate-float mb-12 text-center">
          <h1 className="text-9xl font-black tracking-tighter mb-2">WAY</h1>
          <p className="text-2xl font-light opacity-80 italic">جامعتك الرقمية أينما كنت</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button onClick={() => setView('register-prof')} className="group relative bg-white text-emerald-900 p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl overflow-hidden text-right">
            <h3 className="text-2xl font-black mb-2">أنا أستاذ</h3>
            <p className="text-sm opacity-70">أنشئ قناتك وارفع دروسك وتفاعل مع طلابك.</p>
          </button>
          <button onClick={() => setView('register-student')} className="group relative bg-emerald-500 text-white p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl border-2 border-emerald-400 overflow-hidden text-right">
            <h3 className="text-2xl font-black mb-2">أنا طالب</h3>
            <p className="text-sm opacity-70">التحق بأفضل القنوات ونظم مسارك الدراسي.</p>
          </button>
        </div>
        <div className="mt-12 flex gap-8">
           <button onClick={() => setView('admin')} className="text-emerald-200 hover:text-white transition text-sm underline underline-offset-4">لوحة الإدارة</button>
           <button onClick={() => { const u = users.find(x=>x.role==='professor'); if(u) {setCurrentUser(u); setView('dashboard');} }} className="text-emerald-200 hover:text-white transition text-sm">دخول سريع (أستاذ)</button>
           <button onClick={() => { const u = users.find(x=>x.role==='student'); if(u) {setCurrentUser(u); setView('dashboard');} }} className="text-emerald-200 hover:text-white transition text-sm">دخول سريع (طالب)</button>
        </div>
      </div>
    );
  }

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

  if (view === 'dashboard' && currentUser) {
    const isProfessor = currentUser.role === 'professor';
    const myOwnedChannels = channels.filter(c => c.professorId === currentUser.id);
    const availableChannels = channels.filter(c => c.professorId !== currentUser.id);

    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-right">
        {/* Sidebar */}
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
            <button onClick={() => setActiveTab('messages')} className={`flex items-center justify-between gap-4 p-4 rounded-2xl font-bold transition ${activeTab === 'messages' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>
              <span>الرسائل الخاصة</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
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

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'home' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <header className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h1 className="text-4xl font-black text-gray-900">أهلاً بك، {currentUser.firstName}</h1>
                  <p className="text-gray-500">اكتشف أحدث القنوات التعليمية</p>
                </div>
                {isProfessor && (
                  <button onClick={() => setShowCreateChannel(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition active:scale-95">إنشاء قناة جديدة +</button>
                )}
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {availableChannels.map(channel => {
                   const prof = users.find(u => u.id === channel.professorId);
                   const isSubscribed = channel.subscribers.includes(currentUser.id);
                   return (
                     <div key={channel.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-xl transition group">
                        <div className="flex items-center gap-4 mb-4 justify-end text-right">
                          <div className="flex flex-col">
                            <h4 className="font-black text-lg text-gray-800">{channel.name}</h4>
                            <p className="text-xs text-emerald-600 font-bold">{prof?.firstName} {prof?.lastName}</p>
                          </div>
                          <ProfessorRank avatar={prof?.avatar || ''} studentCount={prof?.studentCount || 0} size="sm" />
                        </div>
                        <p className="text-gray-500 text-sm mb-6 flex-1 line-clamp-2">{channel.description}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                           <span className="text-emerald-700 font-black text-xl">{channel.price} <span className="text-[10px] opacity-60">دج</span></span>
                           <button 
                            onClick={() => isSubscribed ? openChannel(channel) : subscribeToChannel(channel.id)}
                            className={`px-6 py-2.5 rounded-xl font-bold transition ${isSubscribed ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-emerald-700 hover:bg-emerald-50'}`}
                           >
                             {isSubscribed ? 'دخول القناة' : 'اشتراك'}
                           </button>
                        </div>
                     </div>
                   );
                 })}
              </div>
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="max-w-5xl mx-auto space-y-8">
               <h1 className="text-4xl font-black text-gray-900">{isProfessor ? 'قنواتي التي أنشأتها' : 'قنوات اشتركت فيها'}</h1>
               { (isProfessor ? myOwnedChannels : channels.filter(c => c.subscribers.includes(currentUser.id))).length === 0 ? (
                 <div className="bg-white rounded-[3rem] p-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100">
                    <div className="bg-gray-50 p-8 rounded-full mb-6">📁</div>
                    <p className="text-gray-400 font-bold text-xl">لا توجد قنوات هنا حالياً</p>
                    {isProfessor && <button onClick={() => setShowCreateChannel(true)} className="mt-4 text-emerald-600 font-black">ابدأ بإنشاء أول قناة لك الآن</button>}
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(isProfessor ? myOwnedChannels : channels.filter(c => c.subscribers.includes(currentUser.id))).map(channel => (
                      <div key={channel.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col hover:shadow-xl transition">
                         <h4 className="font-black text-2xl text-emerald-900 mb-2">{channel.name}</h4>
                         <p className="text-gray-500 text-sm mb-8 flex-1">{channel.description}</p>
                         <div className="flex flex-col gap-2">
                            <button onClick={() => openChannel(channel)} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-md hover:bg-emerald-700 transition">دخول وإدارة المحتوى</button>
                            {isProfessor && (
                              <div className="flex gap-2">
                                 <div className="flex-1 bg-emerald-50 text-emerald-700 text-center py-2 rounded-xl text-xs font-bold">{channel.subscribers.length} طالب</div>
                                 <div className="flex-1 bg-emerald-50 text-emerald-700 text-center py-2 rounded-xl text-xs font-bold">{channel.content.length} ملف</div>
                              </div>
                            )}
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="max-w-5xl mx-auto flex h-[80vh] bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
               <div className="w-1/3 border-l border-gray-100 bg-gray-50/50 p-6 overflow-y-auto text-right">
                  <h3 className="font-black text-xl mb-6">المحادثات</h3>
                  <div className="space-y-4">
                    {users.filter(u => u.id !== currentUser.id).map(u => (
                      <button 
                        key={u.id}
                        onClick={() => setSelectedStudentChat(u.id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl transition justify-end ${selectedStudentChat === u.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white hover:bg-emerald-50 shadow-sm'}`}
                      >
                        <div className="text-right overflow-hidden flex-1">
                           <p className="font-bold text-sm truncate">{u.firstName} {u.lastName}</p>
                           <p className={`text-[10px] truncate ${selectedStudentChat === u.id ? 'text-emerald-100' : 'text-gray-400'}`}>{u.university || 'مستخدم في WAY'}</p>
                        </div>
                        <img src={u.avatar} className="w-10 h-10 rounded-full border-2 border-white" alt="" />
                      </button>
                    ))}
                  </div>
               </div>
               <div className="flex-1 flex flex-col p-6 text-right">
                  {selectedStudentChat ? (
                    <>
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4">
                        {(privateMessages[selectedStudentChat] || []).map(msg => (
                          <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                            <div className={`p-4 rounded-2xl max-w-[85%] text-sm font-medium ${msg.senderId === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => sendMessage(true)} className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg hover:bg-emerald-700 transition">
                           <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                        </button>
                        <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage(true)} placeholder="اكتب ردك هنا..." className="flex-1 bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 border border-gray-100" />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4">
                       <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl">💬</div>
                       <p className="font-bold">اختر محادثة لبدء التواصل</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="max-w-xl mx-auto space-y-8">
               <div className="bg-gradient-to-br from-emerald-700 to-green-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-10 -translate-y-10" />
                  <p className="opacity-70 font-bold text-lg mb-2">الرصيد الكلي</p>
                  <h2 className="text-7xl font-black mb-10">{currentUser.walletBalance} <span className="text-2xl font-light opacity-50 uppercase tracking-widest">DZD</span></h2>
                  <div className="flex flex-col gap-3">
                    <button className="w-full bg-white text-emerald-800 py-5 rounded-[1.5rem] font-black shadow-xl hover:bg-emerald-50 transition active:scale-95">شحن الرصيد (فليكسي / بطاقة)</button>
                    {isProfessor && <button className="w-full bg-emerald-500/30 border border-white/20 text-white py-5 rounded-[1.5rem] font-black shadow-xl hover:bg-emerald-500/40 transition active:scale-95">طلب سحب الأرباح (CCP)</button>}
                  </div>
               </div>
            </div>
          )}

          {/* Create Channel Modal */}
          {showCreateChannel && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6 text-right">
               <div className="bg-white w-full max-w-lg p-10 rounded-[3rem] shadow-2xl space-y-6">
                  <h3 className="text-3xl font-black text-emerald-900">قناة تعليمية جديدة</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 px-2">اسم المادة</label>
                      <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="مثال: رياضيات 1، تشريح.." className="w-full bg-gray-50 p-5 rounded-2xl outline-none border border-gray-100 focus:border-emerald-500 transition" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 px-2">وصف القناة</label>
                      <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder="ماذا سيجد الطالب في هذه القناة؟" className="w-full bg-gray-50 p-5 rounded-2xl outline-none border border-gray-100 focus:border-emerald-500 h-32 transition" />
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-2xl flex items-center justify-between">
                     <span className="text-emerald-700 font-black text-2xl">{getMedalPrice(getMedal(currentUser.studentCount || 0))} دج</span>
                     <span className="text-emerald-600 font-bold text-sm">سعر الاشتراك (تلقائي)</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition">تأكيد الإنشاء</button>
                    <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-black transition">إلغاء</button>
                  </div>
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
      <div className="min-h-screen flex flex-col bg-gray-50 text-right">
        <header className="bg-white border-b border-gray-100 p-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
             {isProf && (
              <button onClick={() => setShowAddContent(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md hover:bg-emerald-700 transition">رفع محتوى +</button>
            )}
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button onClick={() => setChannelTab('pdf')} className={`px-6 py-2 rounded-xl text-sm font-black transition ${channelTab === 'pdf' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>المكتبة (PDF)</button>
              <button onClick={() => setChannelTab('media')} className={`px-6 py-2 rounded-xl text-sm font-black transition ${channelTab === 'media' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>الوسائط</button>
              <button onClick={() => setChannelTab('chat')} className={`px-6 py-2 rounded-xl text-sm font-black transition ${channelTab === 'chat' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>النقاش</button>
            </div>
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
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedChannel.content.filter(i => i.type === 'pdf').length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400 font-bold">لا توجد ملفات PDF حالياً</div>
              ) : (
                selectedChannel.content.filter(i => i.type === 'pdf').map(item => (
                  <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition">
                    <button className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl font-black text-xs hover:bg-emerald-100 transition">تحميل</button>
                    <div className="flex items-center gap-4 text-right">
                       <div>
                         <p className="font-black text-gray-800 text-lg">{item.title}</p>
                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">درس بصيغة PDF</p>
                       </div>
                       <div className="bg-red-50 text-red-600 p-4 rounded-2xl font-black text-xs">PDF</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {channelTab === 'media' && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {selectedChannel.content.filter(i => i.type === 'video' || i.type === 'image').length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400 font-bold">لا توجد صور أو فيديوهات حالياً</div>
              ) : (
                selectedChannel.content.filter(i => i.type === 'video' || i.type === 'image').map(item => (
                  <div key={item.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm group hover:shadow-2xl transition cursor-pointer">
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      <img src={`https://picsum.photos/seed/${item.id}/600/400`} className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition duration-700" alt="" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition" />
                      <div className="absolute top-4 left-4">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-white shadow-lg ${item.type === 'video' ? 'bg-red-600' : 'bg-blue-600'}`}>
                          {item.type === 'video' ? 'فيديو' : 'صورة'}
                        </span>
                      </div>
                      {item.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white/90 p-5 rounded-full shadow-2xl text-emerald-600 group-hover:scale-125 transition">▶</div>
                        </div>
                      )}
                    </div>
                    <div className="p-6 text-right">
                       <p className="font-black text-gray-800 truncate text-lg">{item.title}</p>
                       <p className="text-xs text-gray-400 mt-2">تاريخ النشر: {item.createdAt.toLocaleDateString('ar-DZ')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {channelTab === 'chat' && (
            <div className="max-w-4xl mx-auto h-[75vh] flex flex-col bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
               <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4">
                      <div className="text-6xl">📣</div>
                      <p className="font-bold">مجموعة الدردشة خالية حالياً</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                         <p className="text-[10px] font-black text-gray-400 mb-1 px-3">{msg.senderName}</p>
                         <div className={`p-5 rounded-[1.8rem] max-w-[80%] text-sm font-medium shadow-sm ${msg.senderId === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                            {msg.text}
                         </div>
                      </div>
                    ))
                  )}
               </div>
               <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                  <button onClick={() => sendMessage()} className="bg-emerald-600 text-white p-5 rounded-2xl shadow-xl hover:bg-emerald-700 transition active:scale-95">
                    <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </button>
                  <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="شارك زملائك معلومة أو اطرح سؤالاً..." className="flex-1 bg-white border border-gray-200 rounded-2xl px-8 py-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-right" />
               </div>
            </div>
          )}
        </main>

        {showAddContent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6 text-right">
             <div className="bg-white w-full max-w-lg p-10 rounded-[3rem] shadow-2xl space-y-6">
                <h3 className="text-3xl font-black text-emerald-900">إضافة محتوى للقناة</h3>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 px-2">عنوان الملف</label>
                      <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder="مثال: الدرس الأول في التشريح" className="w-full bg-gray-50 p-5 rounded-2xl outline-none border border-gray-100 focus:border-emerald-500 transition" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 px-2">نوع الملف</label>
                      <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => setNewContentData({...newContentData, type: 'pdf'})} className={`py-4 rounded-2xl font-black text-xs border-2 transition ${newContentData.type === 'pdf' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-gray-100 text-gray-400'}`}>PDF</button>
                        <button onClick={() => setNewContentData({...newContentData, type: 'video'})} className={`py-4 rounded-2xl font-black text-xs border-2 transition ${newContentData.type === 'video' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-gray-100 text-gray-400'}`}>فيديو</button>
                        <button onClick={() => setNewContentData({...newContentData, type: 'image'})} className={`py-4 rounded-2xl font-black text-xs border-2 transition ${newContentData.type === 'image' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-gray-100 text-gray-400'}`}>صورة</button>
                      </div>
                   </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={handleAddContent} className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black shadow-lg hover:bg-emerald-700 transition active:scale-95">رفع الملف</button>
                  <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-[1.5rem] font-black transition">إلغاء</button>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default App;
