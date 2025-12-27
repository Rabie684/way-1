
import React, { useState, useEffect } from 'react';
import { User, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES, DEPARTMENTS } from './constants';
import ProfessorRank from './components/ProfessorRank';
import { summarizeContent, jarvisAsk } from './services/geminiService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'dashboard' | 'channel-view' | 'chat-view'>('landing');
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
  
  const [newChannelData, setNewChannelData] = useState({ name: '', department: DEPARTMENTS[0], price: 300, description: '', meetingUrl: '' });
  const [newContentData, setNewContentData] = useState({ title: '', type: 'pdf' as any });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const storedUsers = localStorage.getItem('way_users');
      const storedChannels = localStorage.getItem('way_channels');
      const sessionUser = localStorage.getItem('way_session');

      let initialUsers = storedUsers ? JSON.parse(storedUsers) : [];
      const starUsers: User[] = [
        { id: 'q_student_rabie', firstName: 'حمر العين', lastName: 'ربيع', email: 'rabie@way.dz', role: 'student', university: 'USTHB', faculty: 'كلية التكنولوجيا', walletBalance: 5000, isApproved: true, avatar: '' },
        { id: 'q_prof_bentahar', firstName: 'بن الطاهر', lastName: 'بختة', email: 'bentahar@way.dz', role: 'professor', university: 'جامعة ابن خلدون تيارت - ملحقة قصر الشلالة', faculty: 'كلية العلوم الاقتصادية والتجارية وعلوم التسيير', walletBalance: 15000, isApproved: true, avatar: '', studentCount: 180 }
      ];
      starUsers.forEach(star => { if (!initialUsers.find((u: User) => u.id === star.id)) initialUsers.push(star); });
      setUsers(initialUsers);
      
      let initialChannels = storedChannels ? JSON.parse(storedChannels) : [];
      if (initialChannels.length === 0) {
        initialChannels = [{
          id: 'ch_eco_1', professorId: 'q_prof_bentahar', name: 'الاقتصاد الجزئي 1', department: 'قسم العلوم الاقتصادية', description: 'شرح مفصل لنظرية سلوك المستهلك.', price: 400, subscribers: ['q_student_rabie'],
          content: [{ id: 'c1', title: 'المحاضرة الأولى: مقدمة', type: 'pdf', url: '#', createdAt: new Date() }],
          meetingUrl: 'https://meet.google.com/new'
        }];
      }
      setChannels(initialChannels);
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        setCurrentUser(initialUsers.find((u: User) => u.id === parsed.id) || parsed);
        setView('dashboard');
      }
      setTimeout(() => setLoading(false), 800);
    };
    init();
  }, []);

  useEffect(() => { localStorage.setItem('way_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('way_channels', JSON.stringify(channels)); }, [channels]);
  useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);

  const handleLogin = (role: 'student' | 'prof_bentahar') => {
    const ids = { student: 'q_student_rabie', prof_bentahar: 'q_prof_bentahar' };
    const user = users.find(u => u.id === ids[role]);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('way_session', JSON.stringify(user));
      setView('dashboard');
    }
  };

  const handleCreateChannel = () => {
    if (!currentUser) return;
    const newChan: Channel = {
      id: 'ch_' + Date.now(),
      professorId: currentUser.id,
      name: newChannelData.name,
      department: newChannelData.department,
      description: newChannelData.description,
      price: Number(newChannelData.price),
      subscribers: [],
      content: [],
      meetingUrl: newChannelData.meetingUrl || 'https://meet.google.com/new'
    };
    setChannels([...channels, newChan]);
    setShowCreateChannel(false);
    alert("تم إنشاء القناة بنجاح!");
  };

  const handleAddContent = () => {
    if (!selectedChannel) return;
    const newItem: ContentItem = {
      id: 'item_' + Date.now(),
      title: newContentData.title,
      type: newContentData.type,
      url: '#',
      createdAt: new Date()
    };
    const updated = channels.map(c => c.id === selectedChannel.id ? { ...c, content: [...c.content, newItem] } : c);
    setChannels(updated);
    setSelectedChannel({ ...selectedChannel, content: [...selectedChannel.content, newItem] });
    setShowAddContent(false);
    alert("تم رفع الملف بنجاح!");
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

  const filteredProfessors = users.filter(u => {
    if (u.role !== 'professor') return false;
    if (filterUniv && u.university !== filterUniv) return false;
    if (filterFaculty && u.faculty !== filterFaculty) return false;
    return true;
  });

  // ميزة الخصوصية: الأستاذ يرى قنواته فقط في تبويب الإدارة
  const myChannels = channels.filter(c => c.professorId === currentUser?.id);

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-gray-950 font-black text-emerald-600 text-2xl animate-pulse">WAY...</div>;

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <h1 className="text-8xl font-black mb-4">WAY</h1>
        <p className="text-xl font-bold opacity-80 mb-12">جامعتك الرقمية الموثوقة</p>
        <div className="flex flex-col w-full max-w-sm gap-4">
          <button onClick={() => handleLogin('student')} className="bg-white text-emerald-600 py-6 rounded-3xl font-black text-xl shadow-2xl">دخول كطالب</button>
          <button onClick={() => handleLogin('prof_bentahar')} className="bg-emerald-800 text-white py-6 rounded-3xl font-black text-xl">دخول كأستاذ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-right">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-8 flex flex-col gap-8 shadow-xl">
        <h2 className="text-4xl font-black text-emerald-600 text-center">WAY</h2>
        <nav className="flex flex-col gap-2">
          {['home', 'messages', 'wallet', 'profile'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab as any); setView('dashboard'); }} className={`p-4 rounded-2xl font-black text-right ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400'}`}>
              {tab === 'home' ? '🏠 الرئيسية' : tab === 'messages' ? '💬 الدردشة' : tab === 'wallet' ? '💰 المحفظة' : '👤 الملف'}
            </button>
          ))}
        </nav>
        {currentUser?.role === 'professor' && (
          <div className="mt-auto space-y-2">
            <h3 className="text-xs font-black text-gray-400 uppercase">لوحة الأستاذ</h3>
            <button onClick={() => setShowCreateChannel(true)} className="w-full bg-emerald-100 text-emerald-700 py-4 rounded-2xl font-black text-sm">إنشاء قناة جديدة</button>
          </div>
        )}
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32">
        {view === 'dashboard' && activeTab === 'home' && (
          <div className="max-w-6xl mx-auto space-y-10">
            <h1 className="text-4xl font-black dark:text-white">مرحباً {currentUser?.firstName}</h1>
            
            {currentUser?.role === 'professor' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-emerald-600">قنواتي التعليمية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myChannels.map(c => (
                    <div key={c.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border-2 border-emerald-500 shadow-md">
                      <h4 className="font-black text-xl dark:text-white">{c.name}</h4>
                      <p className="text-sm text-gray-400 mb-4">{c.subscribers.length} مشترك</p>
                      <button onClick={() => { setSelectedChannel(c); setView('channel-view'); }} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-black text-xs">إدارة المحتوى</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
              {filteredProfessors.filter(p => p.id !== currentUser?.id).map(prof => (
                <div key={prof.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 text-center space-y-4">
                  <div className="flex justify-center"><ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="lg" /></div>
                  <h4 className="font-black text-xl dark:text-white">{prof.firstName} {prof.lastName}</h4>
                  <p className="text-xs text-emerald-600 font-bold">{prof.university}</p>
                  <button onClick={() => { 
                    const pc = channels.find(c => c.professorId === prof.id);
                    if(pc) { setSelectedChannel(pc); setView('channel-view'); }
                    else alert("لا توجد قنوات حالياً.");
                  }} className="w-full bg-gray-100 dark:bg-gray-800 py-4 rounded-2xl font-black text-xs">تصفح القنوات</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'channel-view' && selectedChannel && (
          <div className="max-w-4xl mx-auto space-y-8">
            <button onClick={() => setView('dashboard')} className="text-emerald-600 font-black">← رجوع</button>
            <div className="bg-white dark:bg-gray-900 p-10 rounded-[4rem] border dark:border-gray-800 relative shadow-xl">
              <h2 className="text-4xl font-black dark:text-white mb-2">{selectedChannel.name}</h2>
              <p className="text-gray-500 mb-8">{selectedChannel.description}</p>
              
              <div className="flex flex-wrap gap-4">
                {currentUser?.id === selectedChannel.professorId ? (
                   <>
                    <button onClick={() => window.open(selectedChannel.meetingUrl, '_blank')} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">إطلاق Google Meet 🎥</button>
                    <button onClick={() => setShowAddContent(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black">رفع ملف جديد 📤</button>
                   </>
                ) : (
                  selectedChannel.subscribers.includes(currentUser?.id || '') ? (
                    <>
                      <button onClick={() => window.open(selectedChannel.meetingUrl, '_blank')} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black">حضور المحاضرة المباشرة 🎥</button>
                      <button onClick={() => { setActiveChatChannel(selectedChannel); setView('chat-view'); }} className="bg-emerald-100 text-emerald-700 px-8 py-4 rounded-2xl font-black">دردشة القناة 💬</button>
                    </>
                  ) : (
                    <button onClick={() => alert("يرجى الاشتراك أولاً")} className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black">اشتراك بـ {selectedChannel.price} دج</button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-black dark:text-white">الملفات والدروس</h3>
              <div className="grid gap-3">
                {selectedChannel.content.map(item => (
                  <div key={item.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border dark:border-gray-800 flex justify-between items-center">
                    <span className="font-black dark:text-white">{item.type === 'pdf' ? '📄' : '🎥'} {item.title}</span>
                    <button onClick={async () => alert(await summarizeContent(item.title, item.type))} className="text-xs font-black text-emerald-600">ملخص جارفيس ✨</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Jarvis AI */}
      <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-12 left-12 w-20 h-20 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center text-4xl border-4 border-white animate-float z-50">🤖</button>
      
      {isJarvisOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-6">
           <div className="bg-white dark:bg-gray-950 w-full max-w-2xl h-[80vh] rounded-[4rem] flex flex-col overflow-hidden border dark:border-gray-800 animate-in zoom-in">
              <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black">جارفيس (Jarvis) 🤖</h3>
                 <button onClick={() => setIsJarvisOpen(false)} className="bg-white/20 px-4 py-2 rounded-full">إغلاق</button>
              </div>
              <div className="flex-1 p-8 overflow-y-auto space-y-6 no-scrollbar">
                 {jarvisChat.length === 0 && (
                   <div className="text-center py-10 space-y-4">
                      <p className="text-xl font-bold dark:text-white">«مرحبًا 👋 أنا جارفيس، مساعد ذكي مصمم لمساعدة الطلبة والأساتذة في الجامعة.»</p>
                      <p className="text-sm text-gray-400">«أهلاً بك، أنا جارفيس. هدفي تبسيط المعرفة وتنظيم التواصل الأكاديمي.»</p>
                   </div>
                 )}
                 {jarvisChat.map((c, i) => (
                   <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-5 rounded-3xl max-w-[80%] font-bold ${c.role === 'user' ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-100 dark:bg-gray-800 dark:text-white'}`}>
                        {c.text}
                      </div>
                   </div>
                 ))}
                 {isJarvisThinking && <div className="text-emerald-600 animate-pulse font-black">جارفيس يحلل...</div>}
              </div>
              <div className="p-8 border-t dark:border-gray-800 flex gap-4">
                 <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()} placeholder="سقسي جارفيس..." className="flex-1 bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl outline-none dark:text-white" />
                 <button onClick={handleJarvisAsk} className="bg-emerald-600 text-white px-8 rounded-2xl font-black">إرسال</button>
              </div>
           </div>
        </div>
      )}

      {/* Modals */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-6">
           <div className="bg-white dark:bg-gray-950 w-full max-w-lg p-10 rounded-[3rem] space-y-6">
              <h3 className="text-2xl font-black dark:text-white">قناة تعليمية جديدة</h3>
              <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="اسم المقياس" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none" />
              <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder="وصف القناة" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none h-24" />
              <input value={newChannelData.meetingUrl} onChange={e => setNewChannelData({...newChannelData, meetingUrl: e.target.value})} placeholder="رابط غوغل ميت (اختياري)" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none" />
              <div className="flex gap-4">
                 <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black">تأكيد</button>
                 <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 py-4 rounded-xl">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {showAddContent && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-6">
           <div className="bg-white dark:bg-gray-950 w-full max-w-md p-10 rounded-[3rem] space-y-6">
              <h3 className="text-2xl font-black dark:text-white">رفع ملف جديد</h3>
              <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder="عنوان الملف (مثلاً: المحاضرة 1)" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none" />
              <select value={newContentData.type} onChange={e => setNewContentData({...newContentData, type: e.target.value as any})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none">
                 <option value="pdf">ملف PDF</option>
                 <option value="video">فيديو</option>
              </select>
              <div className="flex gap-4">
                 <button onClick={handleAddContent} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black">رفع الآن</button>
                 <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 py-4 rounded-xl">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
