
import React, { useState, useEffect } from 'react';
import { User, UserRole, Channel, ContentItem, ChatMessage, Medal } from './types';
import { UNIVERSITIES, FACULTIES, APP_COMMISSION } from './constants';
import { getMedal, getMedalPrice } from './utils';
import ProfessorRank from './components/ProfessorRank';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'register-student' | 'register-prof' | 'dashboard' | 'admin-dashboard' | 'channel-view'>('landing');
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelTab, setChannelTab] = useState<'pdf' | 'media' | 'chat'>('pdf');
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'channels' | 'messages' | 'approvals' | 'stats'>('home');
  
  // Student Search Filters
  const [filterUniv, setFilterUniv] = useState<string>('');
  const [filterFaculty, setFilterFaculty] = useState<string>('');
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);

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
        id: 'p3',
        firstName: 'سارة',
        lastName: 'عمراني',
        email: 'sarah@univ.dz',
        role: 'professor',
        university: UNIVERSITIES[0],
        faculty: FACULTIES[0],
        walletBalance: 2000,
        avatar: 'https://i.pravatar.cc/150?u=prof3',
        isApproved: true,
        studentCount: 80
      },
      {
        id: 'p4',
        firstName: 'إبراهيم',
        lastName: 'خليل',
        email: 'ibrahim@univ.dz',
        role: 'professor',
        university: UNIVERSITIES[1],
        faculty: FACULTIES[1],
        walletBalance: 1000,
        avatar: 'https://i.pravatar.cc/150?u=prof4',
        isApproved: true,
        studentCount: 20
      }
    ];

    const pendingProf: User = {
      id: 'p2',
      firstName: 'أحمد',
      lastName: 'منصور',
      email: 'ahmed@univ.dz',
      role: 'professor',
      university: UNIVERSITIES[2],
      faculty: FACULTIES[0],
      walletBalance: 0,
      avatar: 'https://i.pravatar.cc/150?u=prof2',
      isApproved: false,
      studentCount: 0
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

    setUsers([...mockProfs, pendingProf, mockStudent, adminUser]);
    setChannels([
      {
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
      },
      {
        id: 'c2',
        professorId: 'p3',
        name: 'كيمياء عضوية',
        description: 'أساسيات الكيمياء العضوية والتفاعلات الحيوية.',
        price: 150,
        subscribers: [],
        content: []
      }
    ]);
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
    if (role === 'student') setView('dashboard');
    else alert('تم استلام طلبك. يرجى انتظار موافقة إدارة الجامعة لتتمكن من الدخول.');
  };

  const approveProfessor = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, isApproved: true } : u));
    alert('تم قبول الأستاذ بنجاح!');
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
    setActiveTab('channels');
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
        <div className="animate-float mb-12 text-center text-right">
          <h1 className="text-9xl font-black tracking-tighter mb-2">WAY</h1>
          <p className="text-2xl font-light opacity-80 italic">جامعتك الرقمية أينما كنت</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button onClick={() => setView('register-prof')} className="group relative bg-white text-emerald-900 p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl overflow-hidden text-right">
            <h3 className="text-2xl font-black mb-2">أنا أستاذ</h3>
            <p className="text-sm opacity-70">أنشئ قناتك التعليمية بعد موافقة الجامعة.</p>
          </button>
          <button onClick={() => setView('register-student')} className="group relative bg-emerald-500 text-white p-8 rounded-3xl transition-all hover:scale-105 shadow-2xl border-2 border-emerald-400 overflow-hidden text-right">
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

  // Admin Dashboard View
  if (view === 'admin-dashboard' && currentUser) {
    const totalStudents = users.filter(u => u.role === 'student').length;
    const approvedProfs = users.filter(u => u.role === 'professor' && u.isApproved).length;
    const pendingProfs = users.filter(u => u.role === 'professor' && !u.isApproved);
    const totalProfit = channels.reduce((acc, c) => acc + (c.subscribers.length * c.price * APP_COMMISSION), 0);

    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-right">
        <aside className="w-full md:w-72 bg-white border-l border-gray-100 p-8 flex flex-col gap-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 justify-end">
            <h2 className="text-2xl font-black text-emerald-900">إدارة الجامعة</h2>
          </div>
          <nav className="flex flex-col gap-2">
            <button onClick={() => setActiveTab('stats')} className={`flex items-center justify-between gap-4 p-4 rounded-2xl font-bold transition ${activeTab === 'stats' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>
              <span>الإحصائيات</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </button>
            <button onClick={() => setActiveTab('approvals')} className={`flex items-center justify-between gap-4 p-4 rounded-2xl font-bold transition ${activeTab === 'approvals' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <span>قبول الأساتذة</span>
                {pendingProfs.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingProfs.length}</span>}
              </div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            </button>
            <button onClick={() => setActiveTab('home')} className={`flex items-center justify-between gap-4 p-4 rounded-2xl font-bold transition ${activeTab === 'home' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>
              <span>بيانات الطلاب</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </button>
          </nav>
          <div className="mt-auto p-6 bg-emerald-50 rounded-3xl flex flex-col items-center gap-3">
             <img src={currentUser.avatar} className="w-16 h-16 rounded-full border-4 border-white shadow-md" />
             <p className="font-black text-emerald-900">{currentUser.firstName} {currentUser.lastName}</p>
             <button onClick={() => setView('landing')} className="text-red-500 text-xs font-bold">تسجيل الخروج</button>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'stats' && (
            <div className="max-w-6xl mx-auto space-y-8">
               <h1 className="text-4xl font-black text-gray-900">إحصائيات الجامعة الرقمية</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'إجمالي الطلاب', value: totalStudents, color: 'bg-blue-500', icon: '👥' },
                    { label: 'الأساتذة المعتمدين', value: approvedProfs, color: 'bg-emerald-500', icon: '🎓' },
                    { label: 'إجمالي القنوات', value: channels.length, color: 'bg-purple-500', icon: '📺' },
                    { label: 'أرباح المنصة (DZD)', value: totalProfit.toFixed(0), color: 'bg-yellow-500', icon: '💰' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center">
                       <div className={`${stat.color} text-white w-12 h-12 flex items-center justify-center rounded-2xl text-2xl mb-4 shadow-lg`}>{stat.icon}</div>
                       <p className="text-gray-400 font-bold text-sm mb-1">{stat.label}</p>
                       <h3 className="text-3xl font-black text-gray-800">{stat.value}</h3>
                    </div>
                  ))}
               </div>

               <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
                  <h3 className="text-2xl font-black mb-6">النشاط التعليمي حسب الكلية</h3>
                  <div className="space-y-4">
                    {FACULTIES.map(f => {
                       const count = users.filter(u => u.faculty === f).length;
                       return (
                        <div key={f} className="flex items-center gap-4">
                           <span className="w-32 text-xs font-bold text-gray-500 truncate">{f}</span>
                           <div className="flex-1 bg-gray-100 h-3 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${(count / totalStudents) * 100 || 0}%` }} />
                           </div>
                           <span className="text-sm font-black text-emerald-700">{count} طالب</span>
                        </div>
                       )
                    })}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="max-w-5xl mx-auto space-y-8">
               <h1 className="text-4xl font-black text-gray-900">طلبات انضمام الأساتذة</h1>
               {pendingProfs.length === 0 ? (
                 <div className="bg-white rounded-[3rem] p-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold">لا توجد طلبات معلقة حالياً</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-4">
                    {pendingProfs.map(prof => (
                      <div key={prof.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
                         <div className="flex gap-3">
                           <button onClick={() => approveProfessor(prof.id)} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-emerald-700 transition">قبول الطلب</button>
                           <button className="bg-red-50 text-red-600 px-6 py-2.5 rounded-xl font-black text-sm hover:bg-red-100 transition">رفض</button>
                         </div>
                         <div className="flex items-center gap-4 text-right">
                            <div className="flex flex-col">
                               <h4 className="font-black text-lg">{prof.firstName} {prof.lastName}</h4>
                               <p className="text-xs text-emerald-600 font-bold">{prof.university} • {prof.faculty}</p>
                               <p className="text-[10px] text-gray-400">{prof.email}</p>
                            </div>
                            <img src={prof.avatar} className="w-14 h-14 rounded-full border-2 border-gray-50" />
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {activeTab === 'home' && (
            <div className="max-w-6xl mx-auto space-y-8">
               <h1 className="text-4xl font-black text-gray-900">قائمة الطلاب المسجلين</h1>
               <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-right">
                     <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                           <th className="p-6 text-sm font-black text-gray-400">الطالب</th>
                           <th className="p-6 text-sm font-black text-gray-400">الكلية</th>
                           <th className="p-6 text-sm font-black text-gray-400">تاريخ الانضمام</th>
                           <th className="p-6 text-sm font-black text-gray-400">رصيد المحفظة</th>
                           <th className="p-6 text-sm font-black text-gray-400">الإجراء</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {users.filter(u => u.role === 'student').map(student => (
                          <tr key={student.id} className="hover:bg-gray-50/50 transition">
                             <td className="p-6 flex items-center gap-3 justify-end">
                                <span className="font-bold text-gray-800">{student.firstName} {student.lastName}</span>
                                <img src={student.avatar} className="w-10 h-10 rounded-full" />
                             </td>
                             <td className="p-6 text-sm text-gray-500 font-bold">{student.faculty || 'غير محدد'}</td>
                             <td className="p-6 text-sm text-gray-400 font-bold">12/10/2023</td>
                             <td className="p-6 text-sm font-black text-emerald-600">{student.walletBalance} دج</td>
                             <td className="p-6">
                                <button className="text-gray-400 hover:text-emerald-600 font-bold text-xs underline">التفاصيل</button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Dashboard for Professor and Student
  if (view === 'dashboard' && currentUser) {
    if (currentUser.role === 'professor' && !currentUser.isApproved) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
           <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md border border-emerald-100">
              <div className="text-6xl mb-6">⏳</div>
              <h2 className="text-3xl font-black text-emerald-900 mb-4">طلبك قيد المراجعة</h2>
              <p className="text-gray-500 leading-relaxed">أهلاً بك يا أستاذ. طلب انضمامك لمنصة WAY قيد المراجعة من قبل إدارة الجامعة. سنقوم بتفعيل حسابك فور التأكد من هويتك الأكاديمية.</p>
              <button onClick={() => setView('landing')} className="mt-8 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg">رجوع للرئيسية</button>
           </div>
        </div>
      );
    }
    const isProfessor = currentUser.role === 'professor';

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
                    <div className="space-y-2">
                       <label className="text-xs font-black text-emerald-700 px-2">الجامعة</label>
                       <select value={filterUniv} onChange={e => {setFilterUniv(e.target.value); setFilterFaculty(''); setSelectedProfId(null);}} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700">
                          <option value="">اختر الجامعة...</option>
                          {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-emerald-700 px-2">الكلية</label>
                       <select disabled={!filterUniv} value={filterFaculty} onChange={e => {setFilterFaculty(e.target.value); setSelectedProfId(null);}} className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700 disabled:opacity-50">
                          <option value="">اختر الكلية...</option>
                          {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                       </select>
                    </div>
                  </div>

                  {filterUniv && filterFaculty && (
                    <div className="space-y-6">
                       <h3 className="text-xl font-black text-emerald-900">الأساتذة المتاحون في هذه الكلية</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {users
                            .filter(u => u.role === 'professor' && u.isApproved && u.university === filterUniv && u.faculty === filterFaculty)
                            .sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0))
                            .map(prof => (
                              <button 
                                key={prof.id} 
                                onClick={() => setSelectedProfId(prof.id)}
                                className={`bg-white p-6 rounded-[2.5rem] border transition flex flex-col items-center text-center hover:shadow-xl ${selectedProfId === prof.id ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-lg' : 'border-gray-100 shadow-sm'}`}
                              >
                                 <ProfessorRank avatar={prof.avatar} studentCount={prof.studentCount || 0} size="lg" />
                                 <h4 className="font-black text-lg text-gray-800 mt-4">{prof.firstName} {prof.lastName}</h4>
                                 <p className="text-xs text-emerald-600 font-bold mb-4">{getMedal(prof.studentCount || 0) !== Medal.NONE ? `رتبة: ${getMedal(prof.studentCount || 0)}` : 'أستاذ جديد'}</p>
                                 <div className="text-[10px] bg-gray-50 px-3 py-1 rounded-full text-gray-400 font-bold uppercase tracking-widest">{prof.studentCount || 0} طالب مشترك</div>
                              </button>
                            ))}
                       </div>
                    </div>
                  )}

                  {selectedProfId && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                       <h3 className="text-xl font-black text-emerald-900">قنوات الأستاذ المختارة</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {channels.filter(c => c.professorId === selectedProfId).map(channel => {
                             const isSubscribed = channel.subscribers.includes(currentUser.id);
                             return (
                               <div key={channel.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col group hover:shadow-xl transition">
                                  <h4 className="font-black text-2xl text-emerald-900 mb-2">{channel.name}</h4>
                                  <p className="text-gray-500 text-sm mb-8 flex-1">{channel.description}</p>
                                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                     <span className="text-emerald-700 font-black text-2xl">{channel.price} <span className="text-xs opacity-50">دج</span></span>
                                     <button 
                                      onClick={() => isSubscribed ? openChannel(channel) : subscribeToChannel(channel.id)}
                                      className={`px-8 py-3 rounded-2xl font-black transition shadow-md active:scale-95 ${isSubscribed ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                     >
                                       {isSubscribed ? 'دخول القناة' : 'اشتراك الآن'}
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
                    <div className="flex flex-col">
                      <h1 className="text-4xl font-black text-gray-900">لوحة تحكم الأستاذ</h1>
                      <p className="text-gray-500">إدارة القنوات والطلاب الخاصين بك.</p>
                    </div>
                    <button onClick={() => setShowCreateChannel(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition active:scale-95">إنشاء قناة جديدة +</button>
                  </header>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {channels.filter(c => c.professorId === currentUser.id).map(channel => (
                      <div key={channel.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col hover:shadow-xl transition group">
                         <h4 className="font-black text-2xl text-emerald-900 mb-2">{channel.name}</h4>
                         <p className="text-gray-500 text-sm mb-8 flex-1">{channel.description}</p>
                         <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-6">
                            <span>{channel.subscribers.length} طالب</span>
                            <span>{channel.price} دج</span>
                         </div>
                         <button onClick={() => openChannel(channel)} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-md hover:bg-emerald-700 transition">إدارة المحتوى</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="max-w-5xl mx-auto space-y-8">
               <h1 className="text-4xl font-black text-gray-900">{isProfessor ? 'قنواتي التي أنشأتها' : 'قنوات اشتركت فيها'}</h1>
               {(!isProfessor ? channels.filter(c => c.subscribers.includes(currentUser.id)) : channels.filter(c => c.professorId === currentUser.id)).length === 0 ? (
                 <div className="bg-white rounded-[3rem] p-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100">
                    <p className="text-gray-400 font-bold text-xl">لا توجد قنوات هنا حالياً</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(!isProfessor ? channels.filter(c => c.subscribers.includes(currentUser.id)) : channels.filter(c => c.professorId === currentUser.id)).map(channel => (
                      <div key={channel.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col hover:shadow-xl transition">
                         <h4 className="font-black text-2xl text-emerald-900 mb-2">{channel.name}</h4>
                         <p className="text-gray-500 text-sm mb-8 flex-1">{channel.description}</p>
                         <button onClick={() => openChannel(channel)} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-md">دخول القناة</button>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="max-w-xl mx-auto space-y-8">
               <div className="bg-gradient-to-br from-emerald-700 to-green-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                  <p className="opacity-70 font-bold text-lg mb-2">الرصيد الكلي</p>
                  <h2 className="text-7xl font-black mb-10">{currentUser.walletBalance} <span className="text-2xl font-light opacity-50 uppercase tracking-widest">DZD</span></h2>
                  <div className="flex flex-col gap-3">
                    <button className="w-full bg-white text-emerald-800 py-5 rounded-[1.5rem] font-black shadow-xl hover:bg-emerald-50 transition active:scale-95">شحن الرصيد (فليكسي / بطاقة)</button>
                  </div>
               </div>
            </div>
          )}

          {/* Modals Logic Omitted, reused from previous versions for AddContent and CreateChannel */}
          {showCreateChannel && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
               <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl space-y-4 text-right">
                  <h3 className="text-2xl font-black text-emerald-900 mb-4">إنشاء قناة جديدة</h3>
                  <input value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})} placeholder="اسم المادة/الدورة" className="w-full bg-gray-50 p-4 rounded-2xl outline-none border focus:border-emerald-500" />
                  <textarea value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})} placeholder="وصف موجز للدورة" className="w-full bg-gray-50 p-4 rounded-2xl outline-none border focus:border-emerald-500 h-32" />
                  <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-700 text-sm font-bold">سعر الاشتراك التلقائي حسب رتبتك: {getMedalPrice(getMedal(currentUser.studentCount || 0))} دج</div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={handleCreateChannel} className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold">تأكيد</button>
                    <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-2xl font-bold">إلغاء</button>
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Channel View logic matches previous implementation...
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
              {selectedChannel.content.filter(i => i.type === 'pdf').map(item => (
                <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group">
                  <button className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl font-black text-xs">تحميل</button>
                  <div className="flex items-center gap-4 text-right">
                     <div>
                       <p className="font-black text-gray-800 text-lg">{item.title}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">درس بصيغة PDF</p>
                     </div>
                     <div className="bg-red-50 text-red-600 p-4 rounded-2xl font-black text-xs">PDF</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {channelTab === 'chat' && (
            <div className="max-w-4xl mx-auto h-[75vh] flex flex-col bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
               <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                       <p className="text-[10px] font-black text-gray-400 mb-1 px-3">{msg.senderName}</p>
                       <div className={`p-5 rounded-[1.8rem] max-w-[80%] text-sm font-medium shadow-sm ${msg.senderId === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                          {msg.text}
                       </div>
                    </div>
                  ))}
               </div>
               <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                  <button onClick={() => sendMessage()} className="bg-emerald-600 text-white p-5 rounded-2xl shadow-xl active:scale-95 transition">
                    <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </button>
                  <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="اطرح سؤالاً..." className="flex-1 bg-white border border-gray-200 rounded-2xl px-8 py-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-right" />
               </div>
            </div>
          )}
        </main>
        
        {showAddContent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-right">
             <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl space-y-4">
                <h3 className="text-2xl font-black text-emerald-900 mb-4">إضافة محتوى جديد</h3>
                <input value={newContentData.title} onChange={e => setNewContentData({...newContentData, title: e.target.value})} placeholder="عنوان الملف" className="w-full bg-gray-50 p-4 rounded-2xl outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => setNewContentData({...newContentData, type: 'pdf'})} className={`flex-1 py-3 rounded-xl font-bold border-2 ${newContentData.type === 'pdf' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-gray-100 text-gray-400'}`}>PDF</button>
                  <button onClick={() => setNewContentData({...newContentData, type: 'video'})} className={`flex-1 py-3 rounded-xl font-bold border-2 ${newContentData.type === 'video' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-gray-100 text-gray-400'}`}>فيديو</button>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={handleAddContent} className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold">إضافة</button>
                  <button onClick={() => setShowAddContent(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-2xl font-bold">إلغاء</button>
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
