
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

  // Modals States
  const [showAddContent, setShowAddContent] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '' });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as 'pdf' | 'video' });

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
      walletBalance: 5000,
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

  const handleCreateChannel = () => {
    if (!currentUser || !newChannelData.name) return;
    const medal = getMedal(currentUser.studentCount || 0);
    const medalPrice = getMedalPrice(medal);

    const newChannel: Channel = {
      id: 'c' + Date.now(),
      professorId: currentUser.id,
      name: newChannelData.name,
      description: newChannelData.description,
      price: medalPrice,
      subscribers: [],
      content: []
    };

    setChannels([...channels, newChannel]);
    setShowCreateChannel(false);
    setNewChannelData({ name: '', description: '' });
    alert('تم إنشاء القناة بنجاح!');
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

  const openChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setView('channel-view');
    setChannelTab('pdf');
    setJarvisResponse(null);
    setJarvisChat([]);
  };

  // Render Modals
  const renderCreateChannelModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6 text-right">
        <h3 className="text-2xl font-black text-emerald-900">إنشاء قناة جديدة</h3>
        <div className="space-y-4">
          <input 
            value={newChannelData.name} 
            onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} 
            placeholder="اسم المادة (مثلاً: اقتصاد كلي)" 
            className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
          />
          <textarea 
            value={newChannelData.description} 
            onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} 
            placeholder="وصف القناة..." 
            className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold h-32"
          />
        </div>
        <div className="flex gap-4">
          <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg">تأكيد الإنشاء</button>
          <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">إلغاء</button>
        </div>
      </div>
    </div>
  );

  const renderAddContentModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6 text-right">
        <h3 className="text-2xl font-black text-emerald-900">إضافة محتوى جديد</h3>
        <div className="space-y-4">
          <input 
            value={newContentData.title} 
            onChange={e => setNewContentData({...newContentData, title: e.target.value})} 
            placeholder="عنوان الدرس..." 
            className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
          />
          <select 
            value={newContentData.type} 
            onChange={e => setNewContentData({...newContentData, type: e.target.value as any})}
            className="w-full bg-gray-50 p-4 rounded-2xl font-bold"
          >
            <option value="pdf">ملف PDF</option>
            <option value="video">فيديو تعليمي</option>
          </select>
        </div>
        <div className="flex gap-4">
          <button onClick={handleAddContent} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg">رفع الآن</button>
          <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">إلغاء</button>
        </div>
      </div>
    </div>
  );

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

  if (view === 'dashboard' && currentUser) {
    const isProfessor = currentUser.role === 'professor';
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-right">
        {showCreateChannel && renderCreateChannelModal()}
        <aside className="w-full md:w-72 bg-white border-l border-gray-100 p-8 flex flex-col gap-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 justify-end">
            <h2 className="text-2xl font-black text-emerald-900 tracking-tight">WAY</h2>
            <div className="bg-emerald-600 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black text-2xl">W</div>
          </div>
          <nav className="flex flex-col gap-2">
            <button onClick={() => setActiveTab('home')} className={`flex items-center justify-between gap-4 p-4 rounded-2xl font-bold transition ${activeTab === 'home' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>
              <span>الرئيسية</span>
            </button>
            <button onClick={() => setActiveTab('wallet')} className={`flex items-center justify-between gap-4 p-4 rounded-2xl font-bold transition ${activeTab === 'wallet' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>
              <span>المحفظة</span>
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
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="space-y-2 text-right">
                       <label className="text-xs font-black text-emerald-700 px-2">الجامعة</label>
                       <select value={filterUniv} onChange={e => {setFilterUniv(e.target.value); setFilterFaculty(''); setSelectedProfId(null);}} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold">
                          <option value="">اختر الجامعة...</option>
                          {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2 text-right">
                       <label className="text-xs font-black text-emerald-700 px-2">الكلية</label>
                       <select disabled={!filterUniv} value={filterFaculty} onChange={e => {setFilterFaculty(e.target.value); setSelectedProfId(null);}} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold disabled:opacity-50">
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
                            .map(prof => (
                              <button key={prof.id} onClick={() => setSelectedProfId(prof.id)} className={`bg-white p-6 rounded-[2.5rem] border transition flex flex-col items-center text-center hover:shadow-xl ${selectedProfId === prof.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-100 shadow-sm'}`}>
                                 <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="lg" />
                                 <h4 className="font-black text-lg text-gray-800 mt-4">{prof.firstName} {prof.lastName}</h4>
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
                                  <button onClick={() => isSubscribed ? openChannel(channel) : subscribeToChannel(channel.id)} className={`w-full py-5 rounded-2xl font-black transition shadow-md flex items-center justify-center gap-3 ${isSubscribed ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                                    {isSubscribed ? 'دخول القناة' : (
                                      <>
                                        <span>اشتراك في القناة</span>
                                        <span className="bg-emerald-700 text-white px-3 py-1 rounded-lg text-sm">{channel.price} دج</span>
                                      </>
                                    )}
                                  </button>
                               </div>
                             )
                          })}
                       </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-8 text-right">
                  <header className="flex justify-between items-center flex-row-reverse">
                    <h1 className="text-4xl font-black text-gray-900">لوحة تحكم الأستاذ</h1>
                    <button onClick={() => setShowCreateChannel(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition">إنشاء قناة +</button>
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
                  <h2 className="text-7xl font-black mb-10">{currentUser.walletBalance} <span className="text-2xl font-light opacity-50">DZD</span></h2>
                  <button className="w-full bg-white text-emerald-800 py-5 rounded-[1.5rem] font-black shadow-xl hover:bg-emerald-50 transition active:scale-95">شحن الرصيد</button>
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
        {showAddContent && renderAddContentModal()}
        <header className="bg-white border-b border-gray-100 p-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button onClick={() => setChannelTab('pdf')} className={`px-6 py-2 rounded-xl text-sm font-black transition ${channelTab === 'pdf' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>المكتبة</button>
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
              {isProf && (
                <button onClick={() => setShowAddContent(true)} className="w-full bg-white border-2 border-dashed border-emerald-300 p-8 rounded-[2.5rem] text-emerald-600 font-black text-xl hover:bg-emerald-50 transition">إضافة درس جديد +</button>
              )}
              {selectedChannel.content.length === 0 && !isProf && (
                 <div className="text-center p-20 text-gray-400 font-bold">لا يوجد محتوى حالياً في هذه القناة</div>
              )}
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
                     <p className="text-emerald-200 font-bold opacity-80 text-lg">أنا مساعدك الذكي المبني بتقنيات Gemini، كيف يمكنني مساعدتك اليوم؟</p>
                  </div>
               </div>

               {isJarvisThinking && (
                 <div className="flex flex-col items-center gap-4 py-10">
                    <div className="flex gap-2">
                       <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce"></div>
                       <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                       <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                    </div>
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
