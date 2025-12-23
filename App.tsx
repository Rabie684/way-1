
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES, APP_COMMISSION } from './constants';
import { getMedal, getMedalPrice } from './utils';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk } from './services/geminiService';

const App: React.FC = () => {
  // Core State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'dashboard' | 'admin-dashboard' | 'channel-view'>('landing');
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelTab, setChannelTab] = useState<'pdf' | 'broadcast' | 'jarvis'>('pdf');
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'messages'>('home');
  
  // Search Filters
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);

  // Jarvis AI States
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [jarvisResponse, setJarvisResponse] = useState<string | null>(null);
  const [jarvisChat, setJarvisChat] = useState<{role: 'user' | 'jarvis', text: string}[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');

  // Chat States
  const [personalChats, setPersonalChats] = useState<Record<string, ChatMessage[]>>({}); 
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [broadcastMessages, setBroadcastMessages] = useState<Record<string, ChatMessage[]>>({}); 
  const [chatInput, setChatInput] = useState('');

  // Modals
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '' });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' });

  // Refs for scrolling
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targetUniv = "جامعة ابن خلدون ملحقة قصر الشلالة";
    const targetFaculty = "كلية العلوم الاقتصادية";

    const mockProfs: User[] = [
      { id: 'p5', firstName: 'بختة', lastName: 'بن الطاهر', specialty: 'الاقتصاد الجزئي', email: 'bentahar@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 1250, avatar: 'https://i.pravatar.cc/150?u=p5', isApproved: true, studentCount: 120 },
      { id: 'p6', firstName: 'الأستاذ', lastName: 'ايت عيسى', specialty: 'الاقتصاد الكلي', email: 'aitissa@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 850, avatar: 'https://i.pravatar.cc/150?u=p6', isApproved: true, studentCount: 105 },
      { id: 'p7', firstName: 'الأستاذ', lastName: 'لكحل', specialty: 'الرياضيات المالية', email: 'lakhal@univ.dz', role: 'professor', university: targetUniv, faculty: targetFaculty, walletBalance: 400, avatar: 'https://i.pravatar.cc/150?u=p7', isApproved: true, studentCount: 85 }
    ];

    const mockStudent: User = { id: 's1', firstName: 'أمين', lastName: 'دزيري', email: 'student@mail.dz', role: 'student', walletBalance: 2500, avatar: 'https://i.pravatar.cc/150?u=stud1', isApproved: true };

    setUsers([...mockProfs, mockStudent]);
    setChannels([
      { id: 'c_b1', professorId: 'p5', name: 'الاقتصاد الجزئي', description: 'أساسيات الاقتصاد الجزئي للسنة الأولى.', price: 200, subscribers: [], content: [] },
      { id: 'c_a1', professorId: 'p6', name: 'الاقتصاد الكلي', description: 'تحليل المتغيرات الكلية.', price: 150, subscribers: [], content: [] },
      { id: 'c_l1', professorId: 'p7', name: 'الرياضيات المالية', description: 'الفائدة البسيطة والمركبة.', price: 150, subscribers: [], content: [] }
    ]);
  }, []);

  const handleRegister = (role: UserRole, data: any) => {
    const newUser: User = {
      id: 'u' + Date.now(),
      ...data,
      role,
      walletBalance: role === 'student' ? 500 : 0,
      avatar: `https://i.pravatar.cc/150?u=${data.email}`,
      isApproved: role === 'student'
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    if (role === 'student') setView('dashboard');
    else alert('تم إرسال طلبك للإدارة، سيتم تفعيل حسابك قريباً.');
  };

  const subscribe = (chanId: string) => {
    if (!currentUser) return;
    const chan = channels.find(c => c.id === chanId);
    if (!chan) return;
    
    if (currentUser.walletBalance < chan.price) {
      alert('الرصيد غير كافٍ! يرجى شحن محفظتك عبر رصيد الهاتف.');
      return;
    }

    const professorId = chan.professorId;
    const professorEarnings = chan.price * (1 - APP_COMMISSION); // 70% للأستاذ
    const appCommission = chan.price * APP_COMMISSION; // 30% للتطبيق

    // تحديث رصيد الطالب الحالي
    const updatedStudent = { ...currentUser, walletBalance: currentUser.walletBalance - chan.price };
    setCurrentUser(updatedStudent);

    // تحديث قائمة المستخدمين (رصيد الأستاذ ورصيد الطالب)
    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) return updatedStudent;
      if (u.id === professorId) return { ...u, walletBalance: u.walletBalance + professorEarnings };
      return u;
    }));

    // تحديث القناة (إضافة المشترك)
    setChannels(prev => prev.map(c => c.id === chanId ? { ...c, subscribers: [...c.subscribers, currentUser.id] } : c));
    
    alert(`تم الاشتراك بنجاح! تم خصم ${chan.price} دج. سيصل للأستاذ مبلغ ${professorEarnings} دج.`);
  };

  const handlePhoneRecharge = () => {
    const amount = prompt("أدخل قيمة الشحن برصيد الهاتف (دج):", "200");
    if (amount && !isNaN(Number(amount))) {
      const confirmed = confirm(`هل أنت متأكد من تحويل مبلغ ${amount} دج من رصيدك الهاتفي إلى محفظة WAY؟`);
      if (confirmed && currentUser) {
        const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance + Number(amount) };
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
        alert('تم شحن المحفظة بنجاح!');
      }
    }
  };

  // Logic from previous version maintained for consistency
  const getChatKey = (id1: string, id2: string) => [id1, id2].sort().join('_');

  const handleSendPersonal = () => {
    if (!chatInput.trim() || !currentUser || !activeChatUserId) return;
    const key = getChatKey(currentUser.id, activeChatUserId);
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: `${currentUser.firstName}`,
      text: chatInput,
      timestamp: new Date()
    };
    setPersonalChats(prev => ({ ...prev, [key]: [...(prev[key] || []), msg] }));
    setChatInput('');
  };

  const handleSendBroadcast = () => {
    if (!chatInput.trim() || !currentUser || !selectedChannel) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      text: chatInput,
      timestamp: new Date()
    };
    setBroadcastMessages(prev => ({ ...prev, [selectedChannel.id]: [...(prev[selectedChannel.id] || []), msg] }));
    setChatInput('');
  };

  const handleCreateChannel = () => {
    if (!currentUser || !newChannelData.name) return;
    const medal = getMedal(currentUser.studentCount || 0);
    const price = getMedalPrice(medal);
    const newChan: Channel = {
      id: 'c' + Date.now(),
      professorId: currentUser.id,
      name: newChannelData.name,
      description: newChannelData.description,
      price: price,
      subscribers: [],
      content: []
    };
    setChannels(prev => [...prev, newChan]);
    setShowCreateChannel(false);
    setNewChannelData({ name: '', description: '' });
  };

  const handleAddContent = () => {
    if (!selectedChannel || !newContentData.title) return;
    const item: ContentItem = { id: 'ct' + Date.now(), title: newContentData.title, type: newContentData.type, url: '#', createdAt: new Date() };
    setChannels(prev => prev.map(c => c.id === selectedChannel.id ? { ...c, content: [...c.content, item] } : c));
    setSelectedChannel(prev => prev ? { ...prev, content: [...prev.content, item] } : null);
    setShowAddContent(false);
    setNewContentData({ title: '', type: 'pdf' });
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

  const handleJarvisSummarize = async (item: ContentItem) => {
    setJarvisResponse(null);
    setIsJarvisThinking(true);
    const summary = await summarizeContent(item.title, item.type);
    setJarvisResponse(summary || "عذراً، لم أتمكن من تلخيص هذا المحتوى.");
    setIsJarvisThinking(false);
  };

  const renderModal = (title: string, children: React.ReactNode, onConfirm: () => void, onCancel: () => void) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-3xl font-black text-emerald-900 text-center">{title}</h3>
        {children}
        <div className="flex gap-4">
          <button onClick={onConfirm} className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition">تأكيد</button>
          <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-black hover:bg-gray-200 transition">إلغاء</button>
        </div>
      </div>
    </div>
  );

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-green-900 flex flex-col items-center justify-center text-white p-6 text-right">
        <div className="animate-float mb-12 text-center">
          <h1 className="text-9xl font-black tracking-tighter mb-2">WAY</h1>
          <p className="text-2xl font-light opacity-80">جامعتك الرقمية أينما كنت</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button onClick={() => setView('register-prof')} className="bg-white text-emerald-900 p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl font-black text-2xl">أنا أستاذ</button>
          <button onClick={() => setView('register-student')} className="bg-emerald-500 text-white p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl border-2 border-emerald-400 font-black text-2xl">أنا طالب</button>
        </div>
        <div className="mt-12 flex gap-4">
          <button onClick={() => { setCurrentUser(users.find(u => u.role === 'student') || null); setView('dashboard'); }} className="text-emerald-200 opacity-70 hover:opacity-100 transition text-sm underline">دخول سريع كطالب</button>
          <button onClick={() => { setCurrentUser(users.find(u => u.role === 'professor') || null); setView('dashboard'); }} className="text-emerald-200 opacity-70 hover:opacity-100 transition text-sm underline">دخول سريع كأستاذ</button>
        </div>
      </div>
    );
  }

  if (view === 'register-student' || view === 'register-prof') {
    const isProf = view === 'register-prof';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-right">
        <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-12 space-y-8">
          <h2 className="text-4xl font-black text-emerald-900 text-center">حساب {isProf ? 'أستاذ' : 'طالب'} جديد</h2>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const target = e.target as any;
            handleRegister(isProf ? 'professor' : 'student', {
              firstName: target.fname.value,
              lastName: target.lname.value,
              email: target.email.value,
              university: isProf ? target.univ.value : '',
              faculty: isProf ? target.fac.value : '',
              specialty: isProf ? target.spec.value : ''
            });
          }}>
            <div className="grid grid-cols-2 gap-4">
              <input name="fname" placeholder="الاسم" required className="bg-gray-50 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
              <input name="lname" placeholder="اللقب" required className="bg-gray-50 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
            </div>
            <input name="email" type="email" placeholder="البريد الإلكتروني" required className="w-full bg-gray-50 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
            {isProf && (
              <>
                <select name="univ" className="w-full bg-gray-50 p-5 rounded-2xl font-bold">
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select name="fac" className="w-full bg-gray-50 p-5 rounded-2xl font-bold">
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input name="spec" placeholder="التخصص (مثلاً: رياضيات مالية)" required className="w-full bg-gray-50 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
              </>
            )}
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl">إنشاء الحساب</button>
            <button type="button" onClick={() => setView('landing')} className="w-full text-gray-400 font-bold">رجوع</button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'dashboard' && currentUser) {
    const isProf = currentUser.role === 'professor';
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-right">
        {showCreateChannel && renderModal("إنشاء مادة جديدة", (
          <div className="space-y-4">
            <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="اسم المادة..." className="w-full bg-gray-50 p-5 rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500 font-bold"/>
            <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder="وصف المادة..." className="w-full bg-gray-50 p-5 rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500 font-bold h-32"/>
          </div>
        ), handleCreateChannel, () => setShowCreateChannel(false))}

        <aside className="w-full md:w-80 bg-white border-l p-10 flex flex-col gap-8 shadow-sm">
          <h2 className="text-3xl font-black text-emerald-900 text-center">WAY</h2>
          <nav className="flex flex-col gap-3">
            {[ {id:'home', l:'الرئيسية'}, {id:'messages', l:'الدردشة الشخصية'}, {id:'wallet', l:'المحفظة'} ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`p-5 rounded-2xl font-black text-right transition ${activeTab === t.id ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'text-gray-400 hover:bg-gray-50'}`}>{t.l}</button>
            ))}
          </nav>
          <div className="mt-auto p-8 bg-emerald-50 rounded-[2.5rem] flex flex-col items-center gap-4 text-center">
             <ProfessorRank avatar={currentUser.avatar} studentCount={currentUser.studentCount || 0} size="md" />
             <div>
                <p className="font-black text-emerald-900 text-xl">{currentUser.firstName} {currentUser.lastName}</p>
                <p className="text-xs text-emerald-600 font-bold opacity-70 uppercase tracking-widest">{currentUser.role === 'professor' ? 'أستاذ معتمد' : 'طالب جامعي'}</p>
             </div>
             <button onClick={() => setView('landing')} className="text-red-500 text-xs font-black hover:underline mt-2">تسجيل الخروج</button>
          </div>
        </aside>

        <main className="flex-1 p-12 overflow-y-auto">
          {activeTab === 'home' && (
            <div className="max-w-6xl mx-auto space-y-12">
              {!isProf ? (
                <>
                  <div className="space-y-2">
                     <h1 className="text-5xl font-black text-gray-900">أهلاً بك، {currentUser.firstName}</h1>
                     <p className="text-gray-500 text-lg">ابحث عن أستاذك وابدأ رحلة التعلم اليوم.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[3rem] border shadow-sm">
                    <div className="space-y-3 text-right">
                       <label className="text-sm font-black text-emerald-700 mr-2">الجامعة</label>
                       <select value={filterUniv} onChange={e => { setFilterUniv(e.target.value); setSelectedProfId(null); }} className="w-full bg-gray-50 p-5 rounded-2xl outline-none font-bold border-2 border-gray-100">
                          <option value="">اختر الجامعة...</option>
                          {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                    <div className="space-y-3 text-right">
                       <label className="text-sm font-black text-emerald-700 mr-2">الكلية</label>
                       <select value={filterFaculty} onChange={e => { setFilterFaculty(e.target.value); setSelectedProfId(null); }} className="w-full bg-gray-50 p-5 rounded-2xl outline-none font-bold border-2 border-gray-100">
                          <option value="">اختر الكلية...</option>
                          {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                       </select>
                    </div>
                  </div>

                  {filterUniv && filterFaculty && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
                      {users.filter(u => u.role === 'professor' && u.university === filterUniv && u.faculty === filterFaculty).map(prof => (
                        <div key={prof.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:shadow-2xl transition duration-300">
                          <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="lg" />
                          <h4 className="font-black text-2xl text-gray-800 mt-6">{prof.firstName} {prof.lastName}</h4>
                          <p className="text-emerald-600 font-black text-sm mt-2">{prof.specialty}</p>
                          <div className="flex gap-3 mt-8 w-full">
                            <button onClick={() => setSelectedProfId(prof.id)} className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-black text-sm shadow-lg">عرض المواد</button>
                            <button onClick={() => { setActiveChatUserId(prof.id); setActiveTab('messages'); }} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition">💬</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedProfId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8">
                      {channels.filter(c => c.professorId === selectedProfId).map(channel => {
                        const isSub = channel.subscribers.includes(currentUser.id);
                        return (
                          <div key={channel.id} className="bg-white rounded-[3.5rem] p-10 border border-emerald-50 shadow-sm relative overflow-hidden group">
                            <h4 className="font-black text-3xl text-emerald-900 mb-2">{channel.name}</h4>
                            <p className="text-gray-500 text-sm mb-10 h-12 overflow-hidden">{channel.description}</p>
                            <button onClick={() => {
                              if (isSub) {
                                setSelectedChannel(channel);
                                setView('channel-view');
                              } else {
                                subscribe(channel.id);
                              }
                            }} className={`w-full py-5 rounded-[1.8rem] font-black transition shadow-xl flex items-center justify-center gap-4 ${isSub ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                              {isSub ? 'دخول القناة' : `اشتراك (${channel.price} دج)`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-12">
                  <div className="flex justify-between items-center">
                    <button onClick={() => setShowCreateChannel(true)} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black shadow-2xl hover:scale-105 transition">إنشاء مادة جديدة +</button>
                    <h1 className="text-4xl font-black text-gray-900">موادك التعليمية</h1>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {channels.filter(c => c.professorId === currentUser.id).map(channel => (
                      <div key={channel.id} className="bg-white rounded-[3rem] p-10 border shadow-sm hover:shadow-xl transition">
                         <h4 className="font-black text-3xl text-emerald-900 mb-6">{channel.name}</h4>
                         <button onClick={() => { setSelectedChannel(channel); setView('channel-view'); }} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg">إدارة المحتوى</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="max-w-6xl mx-auto h-[75vh] flex bg-white rounded-[3.5rem] shadow-xl border overflow-hidden">
               <div className="flex-1 flex flex-col relative">
                  {activeChatUserId ? (
                    <>
                      <div className="p-8 border-b bg-white flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <img src={users.find(u => u.id === activeChatUserId)?.avatar} className="w-12 h-12 rounded-full border-2 border-emerald-500" />
                            <p className="font-black text-xl text-gray-900">{users.find(u => u.id === activeChatUserId)?.firstName}</p>
                         </div>
                         <button onClick={() => setActiveChatUserId(null)} className="p-2 hover:bg-gray-50 rounded-full transition">✕</button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-gray-50/50">
                        {(personalChats[getChatKey(currentUser.id, activeChatUserId)] || []).map(msg => (
                          <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                            <div className={`p-5 rounded-[2rem] max-w-[70%] font-bold text-lg shadow-sm ${msg.senderId === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white border rounded-tl-none text-gray-800'}`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="p-8 bg-white border-t flex gap-4">
                         <button onClick={handleSendPersonal} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black">إرسال</button>
                         <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendPersonal()} placeholder="اكتب رسالة خاصة..." className="flex-1 bg-gray-50 px-8 py-4 rounded-2xl font-bold outline-none text-right" />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-6">
                       <div className="text-8xl">💬</div>
                       <p className="font-black text-2xl">اختر شخصاً لبدء المحادثة</p>
                    </div>
                  )}
               </div>
               <div className="w-80 border-r bg-white p-8 flex flex-col gap-6">
                  <h3 className="font-black text-2xl text-emerald-900 border-b pb-4">جهات الاتصال</h3>
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {users.filter(u => u.id !== currentUser.id).map(user => (
                      <button key={user.id} onClick={() => setActiveChatUserId(user.id)} className={`w-full flex items-center gap-4 p-4 rounded-3xl transition ${activeChatUserId === user.id ? 'bg-emerald-50 ring-2 ring-emerald-500' : 'hover:bg-gray-100'}`}>
                         <img src={user.avatar} className="w-10 h-10 rounded-full" />
                         <div className="text-right">
                            <p className="text-sm font-black text-gray-800">{user.firstName}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{user.role === 'professor' ? 'أستاذ' : 'طالب'}</p>
                         </div>
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'wallet' && (
             <div className="max-w-2xl mx-auto py-12">
               <div className="bg-gradient-to-br from-emerald-700 to-green-900 p-16 rounded-[4rem] text-white shadow-2xl text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20"></div>
                  <p className="opacity-70 font-black text-xl mb-4">رصيد محفظة WAY</p>
                  <h2 className="text-8xl font-black mb-8">{currentUser.walletBalance.toFixed(0)} <span className="text-3xl font-light opacity-50">دج</span></h2>
                  
                  {isProf ? (
                    <div className="bg-white/10 p-6 rounded-3xl border border-white/20">
                      <p className="font-bold text-emerald-200 mb-2">كيف يتم احتساب رصيدك؟</p>
                      <p className="text-sm opacity-80 leading-relaxed">أنت تتقاضى <span className="text-white font-black">70%</span> من قيمة كل اشتراك في قنواتك، بينما تذهب 30% كعمولة تشغيل للمنصة.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <button onClick={handlePhoneRecharge} className="w-full bg-white text-emerald-800 py-6 rounded-3xl font-black text-xl shadow-2xl hover:bg-emerald-50 transition flex items-center justify-center gap-3">
                        <span>شحن عبر رصيد الهاتف (فليكسي)</span>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1M17,19H7V5H17V19Z" /></svg>
                      </button>
                      <p className="text-xs opacity-60">يتم خصم المبلغ من رصيد شريحتك (Mobilis, Djezzy, Ooredoo)</p>
                    </div>
                  )}
               </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (view === 'channel-view' && selectedChannel && currentUser) {
    const isProf = selectedChannel.professorId === currentUser.id;
    const bMsgs = broadcastMessages[selectedChannel.id] || [];
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 text-right">
        {showAddContent && renderModal("إضافة درس جديد", (
          <div className="space-y-4">
            <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder="عنوان الدرس..." className="w-full bg-gray-50 p-5 rounded-2xl outline-none font-bold"/>
            <select value={newContentData.type} onChange={e => setNewContentData({...newContentData, type: e.target.value as any})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold">
              <option value="pdf">ملف PDF</option>
              <option value="video">فيديو تعليمي</option>
            </select>
          </div>
        ), handleAddContent, () => setShowAddContent(false))}

        <header className="bg-white border-b p-8 flex items-center justify-between sticky top-0 z-50">
          <div className="flex bg-gray-100 p-1.5 rounded-3xl">
            {[ {id:'pdf', l:'المكتبة'}, {id:'broadcast', l:'الإعلانات 📢'}, {id:'jarvis', l:'جارفيس AI ✨'} ].map(t => (
              <button key={t.id} onClick={() => setChannelTab(t.id as any)} className={`px-10 py-3 rounded-[1.2rem] text-sm font-black transition ${channelTab === t.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}>{t.l}</button>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <h2 className="font-black text-3xl text-emerald-900">{selectedChannel.name}</h2>
            <button onClick={() => setView('dashboard')} className="p-4 hover:bg-gray-100 rounded-2xl transition">✕</button>
          </div>
        </header>

        <main className="flex-1 p-12 overflow-y-auto">
          {channelTab === 'pdf' && (
            <div className="max-w-5xl mx-auto space-y-8">
              {isProf && <button onClick={() => setShowAddContent(true)} className="w-full bg-white border-4 border-dashed border-emerald-200 p-12 rounded-[4rem] text-emerald-600 font-black text-2xl hover:bg-emerald-50 transition">إضافة درس جديد +</button>}
              {selectedChannel.content.map(item => (
                <div key={item.id} className="bg-white p-8 rounded-[3rem] border shadow-sm flex items-center justify-between group">
                  <button onClick={() => { setChannelTab('jarvis'); handleJarvisSummarize(item); }} className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black text-xs hover:bg-emerald-600 hover:text-white transition shadow-sm">لخص مع جارفيس ✨</button>
                  <p className="font-black text-2xl text-gray-800">{item.title}</p>
                </div>
              ))}
            </div>
          )}

          {channelTab === 'broadcast' && (
            <div className="max-w-4xl mx-auto h-[65vh] flex flex-col bg-white rounded-[4rem] border shadow-xl overflow-hidden">
               <div className="bg-emerald-600 text-white p-6 text-center font-black">قناة إعلانات المادة</div>
               <div className="flex-1 overflow-y-auto p-12 space-y-8 bg-gray-50/30">
                  {bMsgs.map(msg => (
                    <div key={msg.id} className="bg-white border-r-[6px] border-emerald-500 p-8 rounded-3xl shadow-sm">
                       <p className="text-emerald-700 font-black text-xs mb-3">{msg.senderName}</p>
                       <p className="font-bold text-xl text-gray-800">{msg.text}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
               </div>
               {isProf ? (
                 <div className="p-8 bg-white border-t flex gap-4">
                    <button onClick={handleSendBroadcast} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black">نشر الإعلان</button>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="اكتب إعلاناً..." className="flex-1 bg-gray-50 rounded-2xl px-8 py-5 font-bold outline-none text-right" />
                 </div>
               ) : (
                 <div className="p-6 bg-emerald-50 text-emerald-800 text-center font-black">تنبيه: الأستاذ فقط مخول بالنشر هنا</div>
               )}
            </div>
          )}

          {channelTab === 'jarvis' && (
            <div className="max-w-5xl mx-auto space-y-10">
               <div className="bg-emerald-900 p-16 rounded-[4.5rem] text-white shadow-2xl text-center">
                  <h3 className="text-5xl font-black mb-2">جارفيس مساعدك الذكي</h3>
                  <p className="opacity-70 text-xl">أنا هنا لتحليل الدروس ومساعدتك في التفوق.</p>
               </div>
               {isJarvisThinking && <p className="text-center text-emerald-700 font-black animate-pulse text-2xl py-12">جارفيس يعمل...</p>}
               {jarvisResponse && (
                 <div className="bg-white p-12 rounded-[4rem] border-t-[12px] border-emerald-600 shadow-2xl text-right">
                    <h4 className="text-emerald-900 font-black text-3xl mb-8">ملخص جارفيس</h4>
                    <div className="text-gray-700 leading-relaxed font-bold text-2xl">{jarvisResponse}</div>
                 </div>
               )}
               <div className="space-y-6">
                  <div className="bg-white p-10 rounded-[3.5rem] min-h-[300px] flex flex-col gap-6 shadow-xl border">
                     {jarvisChat.map((msg, i) => (
                       <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-6 rounded-[2.5rem] max-w-[85%] text-lg font-black ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{msg.text}</div>
                       </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-4">
                     <button onClick={handleJarvisChat} className="bg-emerald-600 text-white p-6 rounded-2xl shadow-2xl text-3xl">🚀</button>
                     <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleJarvisChat()} placeholder="اسأل جارفيس أي شيء..." className="flex-1 bg-white border-2 border-transparent focus:border-emerald-500 rounded-2xl px-10 py-6 font-black text-xl outline-none text-right shadow-xl" />
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
