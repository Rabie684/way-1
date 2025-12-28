import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, ContentItem, ChatMessage, Language, UserRole } from './types.ts';
import { UNIVERSITIES } from './constants.ts';
import ProfessorRank from './components/ProfessorRank.tsx';
import { jarvisAsk } from './services/geminiService.ts';

interface Announcement {
  id: string;
  professorId: string;
  professorName: string;
  title: string;
  content: string;
  date: Date;
  tag: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [authRole, setAuthRole] = useState<UserRole>('student');
  const [isLogin, setIsLogin] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'ads' | 'wallet' | 'profile'>('home');
  const [loading, setLoading] = useState(true);

  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // UI States
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [jarvisChat, setJarvisChat] = useState<{ role: 'user' | 'jarvis'; text: string }[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);

  // Modals
  const [showCreateAd, setShowCreateAd] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const storedUsers = localStorage.getItem('way_users');
        const storedChannels = localStorage.getItem('way_channels');
        const session = localStorage.getItem('way_session');
        const storedAds = localStorage.getItem('way_ads');

        const defaultUsers: User[] = [
          {
            id: 's_rabie',
            firstName: 'ربيع',
            lastName: 'حمر العين',
            email: 'rabie@way.dz',
            role: 'student',
            university: 'جامعة العلوم والتكنولوجيا هواري بومدين (USTHB)',
            walletBalance: 1200,
            isApproved: true,
            avatar: ''
          },
          {
            id: 'p_bentahar',
            firstName: 'بختة',
            lastName: 'بن الطاهر',
            email: 'bentahar@way.dz',
            role: 'professor',
            university: 'جامعة ابن خلدون تيارت - ملحقة قصر الشلالة',
            walletBalance: 15000,
            studentCount: 245,
            isApproved: true,
            avatar: ''
          }
        ];

        let initialUsers = storedUsers ? JSON.parse(storedUsers) : defaultUsers;
        
        // Ensure demo users exist
        defaultUsers.forEach(du => {
          if (!initialUsers.find((u: User) => u.email === du.email)) {
            initialUsers.push(du);
          }
        });

        setUsers(initialUsers);
        if (storedChannels) setChannels(JSON.parse(storedChannels));
        if (storedAds) setAnnouncements(JSON.parse(storedAds));

        if (session) {
          const parsed = JSON.parse(session);
          const current = initialUsers.find((u: User) => u.id === parsed.id);
          if (current) {
            setCurrentUser(current);
            setView('dashboard');
          } else {
            localStorage.removeItem('way_session');
          }
        }
      } catch (e) {
        console.error("Initialization Error:", e);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (users.length > 0) localStorage.setItem('way_users', JSON.stringify(users));
    if (channels.length > 0) localStorage.setItem('way_channels', JSON.stringify(channels));
    if (announcements.length > 0) localStorage.setItem('way_ads', JSON.stringify(announcements));
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [users, channels, announcements, isDarkMode]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [jarvisChat]);

  const handleLogout = () => {
    localStorage.removeItem('way_session');
    setCurrentUser(null);
    setView('landing');
    setActiveTab('home');
    setIsJarvisOpen(false);
  };

  const handleDemoLogin = (email: string) => {
    const user = users.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('way_session', JSON.stringify(user));
      setView('dashboard');
      setActiveTab('home');
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    
    if (isLogin) {
      const user = users.find(u => u.email === email && u.role === authRole);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('way_session', JSON.stringify(user));
        setView('dashboard');
      } else {
        alert("المستخدم غير موجود بهذا الدور. جرب الدخول التجريبي المتاح في الصفحة الرئيسية.");
      }
    } else {
      const newUser: User = {
        id: 'u_' + Date.now(),
        firstName: (form.elements.namedItem('fname') as HTMLInputElement).value,
        lastName: (form.elements.namedItem('lname') as HTMLInputElement).value,
        email: email,
        role: authRole,
        university: (form.elements.namedItem('univ') as HTMLSelectElement).value,
        walletBalance: authRole === 'professor' ? 0 : 500,
        isApproved: true,
        avatar: ''
      };
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      localStorage.setItem('way_session', JSON.stringify(newUser));
      setView('dashboard');
    }
  };

  const handleJarvisAsk = async () => {
    if (!jarvisInput.trim()) return;
    const q = jarvisInput;
    setJarvisInput('');
    setJarvisChat(prev => [...prev, { role: 'user', text: q }]);
    setIsJarvisThinking(true);
    try {
      const res = await jarvisAsk(q);
      setJarvisChat(prev => [...prev, { role: 'jarvis', text: res.text }]);
    } catch (err) {
      setJarvisChat(prev => [...prev, { role: 'jarvis', text: "عذراً، حدث خطأ أثناء معالجة طلبك." }]);
    } finally {
      setIsJarvisThinking(false);
    }
  };

  const createAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const form = e.target as HTMLFormElement;
    const ad: Announcement = {
      id: 'ad_' + Date.now(),
      professorId: currentUser.id,
      professorName: `${currentUser.lastName} ${currentUser.firstName}`,
      title: (form.elements.namedItem('title') as HTMLInputElement).value,
      content: (form.elements.namedItem('content') as HTMLTextAreaElement).value,
      tag: (form.elements.namedItem('tag') as HTMLSelectElement).value,
      date: new Date()
    };
    setAnnouncements(prev => [ad, ...prev]);
    setShowCreateAd(false);
  };

  const createChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const form = e.target as HTMLFormElement;
    const chan: Channel = {
      id: 'ch_' + Date.now(),
      professorId: currentUser.id,
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      description: (form.elements.namedItem('desc') as HTMLTextAreaElement).value,
      price: parseInt((form.elements.namedItem('price') as HTMLInputElement).value),
      subscribers: [],
      content: []
    };
    setChannels(prev => [...prev, chan]);
    setShowCreateChannel(false);
  };

  const handleSubscribe = (channelId: string, price: number) => {
    if (!currentUser || currentUser.role !== 'student') return;

    if (currentUser.walletBalance < price) {
      alert("رصيدك غير كافٍ للاشتراك في هذا المقياس. يرجى شحن المحفظة.");
      return;
    }

    setChannels(prevChannels => {
      const updatedChannels = prevChannels.map(channel => {
        if (channel.id === channelId && !channel.subscribers.includes(currentUser.id)) {
          return {
            ...channel,
            subscribers: [...channel.subscribers, currentUser.id]
          };
        }
        return channel;
      });
      return updatedChannels;
    });

    setUsers(prevUsers => {
      return prevUsers.map(user => {
        if (user.id === currentUser.id) {
          return { ...user, walletBalance: user.walletBalance - price };
        }
        if (user.id === channels.find(c => c.id === channelId)?.professorId) {
          return { ...user, studentCount: (user.studentCount || 0) + 1 };
        }
        return user;
      });
    });

    setCurrentUser(prevUser => {
      if (!prevUser) return null;
      return { ...prevUser, walletBalance: prevUser.walletBalance - price };
    });

    alert("تم الاشتراك في المقياس بنجاح!");
  };

  const handleRechargeWallet = () => {
    if (!currentUser || currentUser.role !== 'student') return;
    const rechargeAmount = 5000; // Example fixed recharge amount
    setUsers(prevUsers => {
      return prevUsers.map(user => {
        if (user.id === currentUser.id) {
          return { ...user, walletBalance: user.walletBalance + rechargeAmount };
        }
        return user;
      });
    });
    setCurrentUser(prevUser => {
      if (!prevUser) return null;
      return { ...prevUser, walletBalance: prevUser.walletBalance + rechargeAmount };
    });
    alert(`تم شحن رصيد محفظتك بمبلغ ${rechargeAmount} دج.`);
  };


  // Icons
  const HomeIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
  const AdsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 1 0 0-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>;
  const SearchIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>;
  const WalletIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>;
  const ProfileIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-950">
      <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <h2 className="mt-4 text-xl font-black text-emerald-600 animate-pulse tracking-widest">WAY ...</h2>
    </div>
  );

  // Landing
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 text-[20rem] font-black flex items-center justify-center select-none pointer-events-none">WAY</div>
        
        <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl mb-8 flex items-center justify-center shadow-2xl animate-float">
          <span className="text-emerald-600 text-4xl md:text-5xl font-black">way</span>
        </div>
        
        <h1 className="relative z-10 text-5xl md:text-7xl font-black mb-4 tracking-tighter uppercase drop-shadow-xl text-center">جامعتك الرقمية</h1>
        <p className="relative z-10 text-lg md:text-xl font-bold opacity-80 mb-12 text-center max-w-md leading-relaxed">أول منصة جامعية جزائرية متكاملة تربط الأستاذ بالطالب في فضاء ذكي وعصري.</p>
        
        <div className="relative z-10 flex flex-col gap-4 w-full max-w-sm">
          <button onClick={() => setView('auth')} className="bg-white text-emerald-600 px-12 py-5 rounded-3xl font-black text-xl shadow-2xl hover:scale-105 transition-all active:scale-95">ابدأ رحلتك الآن</button>
          
          <div className="mt-8 space-y-3">
            <p className="text-center font-black text-sm opacity-80 uppercase tracking-widest mb-2">الدخول التجريبي</p>
            <button onClick={() => handleDemoLogin('rabie@way.dz')} className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/20 transition-all backdrop-blur-sm text-right">
              <span className="text-2xl">🎓</span>
              <div className="flex-1">
                <p className="font-black text-sm">الطالب: حمر العين ربيع</p>
                <p className="text-[10px] opacity-60 uppercase">حساب الطالب</p>
              </div>
            </button>
            <button onClick={() => handleDemoLogin('bentahar@way.dz')} className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/20 transition-all backdrop-blur-sm text-right">
              <span className="text-2xl">👨‍🏫</span>
              <div className="flex-1">
                <p className="font-black text-sm">الأستاذة: بن الطاهر</p>
                <p className="text-[10px] opacity-60 uppercase">حساب الأستاذ</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auth
  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-[3rem] p-10 md:p-14 shadow-2xl space-y-8 animate-fade-in border dark:border-gray-800">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-black dark:text-white uppercase tracking-tighter">
              {isLogin ? 'مرحباً بعودتك' : 'انضم إلينا اليوم'}
            </h2>
            <p className="text-gray-400 font-bold">أنت تسجل دخولك كـ <span className="text-emerald-600">{authRole === 'professor' ? 'أستاذ' : 'طالب'}</span></p>
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl">
            <button onClick={() => setAuthRole('student')} className={`flex-1 py-3 rounded-xl font-black transition-all ${authRole === 'student' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm' : 'text-gray-400'}`}>طالب</button>
            <button onClick={() => setAuthRole('professor')} className={`flex-1 py-3 rounded-xl font-black transition-all ${authRole === 'professor' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm' : 'text-gray-400'}`}>أستاذ</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <input required name="fname" placeholder="الاسم" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500 transition-all" />
                <input required name="lname" placeholder="اللقب" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500 transition-all" />
              </div>
            )}
            <input required name="email" type="email" placeholder="البريد الإلكتروني" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500 transition-all" />
            {!isLogin && (
              <select name="univ" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500">
                {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            )}
            <input required type="password" placeholder="كلمة المرور" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500 transition-all" />
            <button type="submit" className="w-full bg-emerald-600 text-white p-6 rounded-2xl font-black text-lg shadow-xl hover:shadow-emerald-500/20 active:scale-95 transition-all">
              {isLogin ? 'دخول الفضاء الرقمي' : 'تأكيد الحساب الجديد'}
            </button>
          </form>

          <p className="text-center font-bold text-gray-400">
            {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'} 
            <button onClick={() => setIsLogin(!isLogin)} className="text-emerald-600 mr-2 underline underline-offset-4">اضغط هنا</button>
          </p>
          <button onClick={() => setView('landing')} className="w-full text-center text-gray-300 font-bold text-sm">العودة للرئيسية</button>
        </div>
      </div>
    );
  }

  // Dashboard View Logic
  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: 'الرئيسية' },
    { id: 'explore', icon: <SearchIcon />, label: 'استكشف', show: currentUser?.role === 'student' },
    { id: 'ads', icon: <AdsIcon />, label: 'إعلانات' },
    { id: 'wallet', icon: <WalletIcon />, label: 'المحفظة' },
    { id: 'profile', icon: <ProfileIcon />, label: 'الملف الشخصي' }
  ].filter(i => i.show !== false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row transition-colors pb-24 md:pb-0">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-72 bg-white dark:bg-gray-900 border-l dark:border-gray-800 flex-col p-8 gap-8 shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg">W</div>
          <h2 className="text-2xl font-black text-emerald-600 tracking-tighter">WAY</h2>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`p-4 rounded-2xl font-black flex items-center gap-4 transition-all ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-lg translate-x-1' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-14 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-12 animate-fade-in">
          
          {/* Dashboard Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="md" />
              <div>
                <h1 className="text-3xl md:text-4xl font-black dark:text-white tracking-tighter">أهلاً، {currentUser?.firstName} 👋</h1>
                <p className="text-gray-400 font-bold text-sm md:text-base">{currentUser?.university}</p>
              </div>
            </div>
            <div className="bg-emerald-600/10 p-5 rounded-3xl border border-emerald-500/20 text-center min-w-[200px]">
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">الرصيد المتاح</span>
              <p className="text-3xl font-black text-emerald-600 tracking-tighter">{currentUser?.walletBalance} <span className="text-lg">دج</span></p>
            </div>
          </header>

          {/* Home View */}
          {activeTab === 'home' && (
            <section className="space-y-8">
              <div className="flex justify-between items-center border-r-8 border-emerald-600 pr-4">
                <h2 className="text-2xl font-black dark:text-white uppercase tracking-tight">
                  {currentUser?.role === 'professor' ? 'فضاء المقاييس الخاصة بي' : 'المقاييس المشترك بها'}
                </h2>
                {currentUser?.role === 'professor' && (
                  <button onClick={() => setShowCreateChannel(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:scale-105 transition-all tracking-tight">+ مقياس جديد</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(currentUser?.role === 'professor' ? channels.filter(c => c.professorId === currentUser.id) : channels.filter(c => c.subscribers.includes(currentUser?.id || ''))).map(c => (
                  <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border-2 border-emerald-500/5 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
                    <h3 className="text-xl font-black dark:text-white mb-2">{c.name}</h3>
                    <p className="text-gray-400 text-xs font-bold line-clamp-2 leading-relaxed">{c.description}</p>
                    <div className="mt-6 flex justify-between items-center border-t dark:border-gray-800 pt-4">
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{c.subscribers.length} طالب</span>
                       <button className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-md">
                         {currentUser?.role === 'professor' ? 'إدارة' : 'دخول'}
                       </button>
                    </div>
                  </div>
                ))}
                {(currentUser?.role === 'professor' ? channels.filter(c => c.professorId === currentUser.id) : channels.filter(c => c.subscribers.includes(currentUser?.id || ''))).length === 0 && (
                   <div className="col-span-full py-20 text-center bg-gray-100 dark:bg-gray-800/50 rounded-[3rem] border-4 border-dashed dark:border-gray-800">
                      <p className="text-gray-400 font-black text-lg">لا توجد مقاييس متاحة حالياً</p>
                   </div>
                )}
              </div>
            </section>
          )}

          {/* Explore Tab (Student Only) */}
          {activeTab === 'explore' && currentUser?.role === 'student' && (
            <section className="space-y-8">
              <div className="flex justify-between items-center border-r-8 border-emerald-600 pr-4">
                <h2 className="text-2xl font-black dark:text-white uppercase tracking-tight">استكشف المقاييس الجديدة</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.filter(c => !c.subscribers.includes(currentUser.id)).map(c => (
                  <div key={c.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border-2 border-blue-500/5 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                    <h3 className="text-xl font-black dark:text-white mb-2">{c.name}</h3>
                    <p className="text-gray-400 text-xs font-bold line-clamp-2 leading-relaxed">{c.description}</p>
                    <div className="mt-6 flex justify-between items-center border-t dark:border-gray-800 pt-4">
                       <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{c.subscribers.length} طالب</span>
                       <span className="text-sm font-black text-gray-500">{c.price} دج</span>
                       <button onClick={() => handleSubscribe(c.id, c.price)} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-md">اشتراك</button>
                    </div>
                  </div>
                ))}
                {channels.filter(c => !c.subscribers.includes(currentUser.id)).length === 0 && (
                   <div className="col-span-full py-20 text-center bg-gray-100 dark:bg-gray-800/50 rounded-[3rem] border-4 border-dashed dark:border-gray-800">
                      <p className="text-gray-400 font-black text-lg">لا توجد مقاييس جديدة لاستكشافها حالياً</p>
                   </div>
                )}
              </div>
            </section>
          )}

          {/* Ads Tab */}
          {activeTab === 'ads' && (
            <section className="space-y-8 max-w-3xl mx-auto">
              <div className="flex justify-between items-end border-r-8 border-emerald-600 pr-4">
                <div>
                   <h2 className="text-4xl font-black dark:text-white uppercase tracking-tighter">الإعلانات</h2>
                   <p className="text-gray-400 font-bold text-sm mt-1">آخر الأخبار من أساتذتك والجامعة</p>
                </div>
                {currentUser?.role === 'professor' && (
                  <button onClick={() => setShowCreateAd(true)} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:scale-105 transition-all tracking-tight">+ بث إعلان</button>
                )}
              </div>
              <div className="space-y-6">
                {announcements.map(ad => (
                  <div key={ad.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3.5rem] shadow-xl border dark:border-gray-800 relative group overflow-hidden transition-all hover:-translate-y-1 text-right">
                    <div className="absolute top-0 left-10 bg-emerald-600 text-white px-6 py-1.5 rounded-b-2xl text-[10px] font-black uppercase shadow-lg tracking-widest">{ad.tag}</div>
                    <h3 className="text-2xl font-black dark:text-white mb-3 mt-4 leading-tight">{ad.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-bold leading-relaxed mb-6">{ad.content}</p>
                    <div className="flex justify-between items-center text-[10px] font-black pt-4 border-t dark:border-gray-800">
                      <span className="text-emerald-600 uppercase tracking-widest">أ. {ad.professorName}</span>
                      <span className="text-gray-300">📅 {new Date(ad.date).toLocaleDateString('ar-DZ')}</span>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="py-20 text-center bg-white dark:bg-gray-900 rounded-[3rem] shadow-sm border-2 border-dashed dark:border-gray-800">
                    <p className="text-gray-400 font-black">لا توجد إعلانات حالياً لمشاركتها.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Wallet Section */}
          {activeTab === 'wallet' && (
            <section className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-gray-900 rounded-[4rem] p-12 md:p-16 shadow-2xl border dark:border-gray-800 relative overflow-hidden">
                 <div className="flex flex-col md:flex-row items-center gap-10">
                   <span className="text-8xl">💰</span>
                   <div className="text-center md:text-right flex-1 space-y-4">
                      <h2 className="text-4xl md:text-5xl font-black dark:text-white uppercase tracking-tighter leading-tight">محفظتي</h2>
                      <p className="text-xl text-gray-400 font-bold">إدارة رصيدك على منصة WAY</p>
                   </div>
                 </div>
                 <div className="mt-12 pt-12 border-t dark:border-gray-800 space-y-6">
                    <div className="bg-emerald-600/10 p-5 rounded-3xl border border-emerald-500/20 text-center">
                       <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">الرصيد الحالي</span>
                       <p className="text-5xl font-black text-emerald-600 tracking-tighter">{currentUser?.walletBalance} <span className="text-xl">دج</span></p>
                    </div>
                    {currentUser?.role === 'student' && (
                      <button onClick={handleRechargeWallet} className="w-full bg-emerald-600 text-white p-6 rounded-2xl font-black text-lg shadow-xl hover:shadow-emerald-500/20 active:scale-95 transition-all">
                        شحن الرصيد الآن
                      </button>
                    )}
                    {/* Add more wallet features here */}
                 </div>
              </div>
            </section>
          )}


          {/* Profile Section */}
          {activeTab === 'profile' && (
            <section className="max-w-4xl mx-auto">
               <div className="bg-white dark:bg-gray-900 rounded-[4rem] p-12 md:p-16 shadow-2xl border dark:border-gray-800 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <ProfessorRank avatar={currentUser?.avatar || ''} studentCount={currentUser?.studentCount || 0} size="lg" />
                    <div className="text-center md:text-right flex-1 space-y-4">
                       <h2 className="text-4xl md:text-5xl font-black dark:text-white uppercase tracking-tighter leading-tight">{currentUser?.firstName} {currentUser?.lastName}</h2>
                       <p className="text-xl text-gray-400 font-bold">{currentUser?.university}</p>
                       <span className="inline-block bg-emerald-600 text-white px-8 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20">{currentUser?.role}</span>
                    </div>
                  </div>
                  <div className="mt-12 pt-12 border-t dark:border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl font-black dark:text-white flex justify-between items-center group transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
                       <span>مظهر التطبيق</span>
                       <span className="text-2xl group-hover:rotate-12 transition-transform">{isDarkMode ? '🌙' : '☀️'}</span>
                    </button>
                    <button onClick={handleLogout} className="bg-red-50 dark:bg-red-900/10 text-red-600 p-6 rounded-3xl font-black shadow-sm transition-all hover:bg-red-100 hover:shadow-md">تسجيل الخروج الآمن</button>
                  </div>
               </div>
            </section>
          )}

        </div>
      </main>

      {/* Jarvis Floating Button */}
      <button onClick={() => setIsJarvisOpen(true)} className="fixed bottom-28 left-8 md:bottom-12 md:left-12 w-20 h-20 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center text-4xl animate-float z-50 hover:scale-110 active:scale-95 transition-transform ring-8 ring-emerald-600/10">🤖</button>

      {/* Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-5 flex justify-around items-center z-40 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}>
            <span className={`${activeTab === item.id ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>{item.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Modals for Content Creation */}
      {showCreateAd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-6 animate-fade-in">
           <form onSubmit={createAd} className="bg-white dark:bg-gray-950 w-full max-w-lg p-10 rounded-[3.5rem] space-y-6 border dark:border-gray-800 shadow-2xl">
              <h3 className="text-3xl font-black dark:text-white tracking-tighter">بث إعلان جديد للطلبة 📢</h3>
              <input required name="title" placeholder="عنوان الإعلان" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500" />
              <textarea required name="content" placeholder="نص الإعلان..." className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white h-48 resize-none border-2 border-transparent focus:border-emerald-500" />
              <select name="tag" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500">
                <option value="تنبيه">تنبيه</option>
                <option value="عاجل">عاجل</option>
                <option value="تحديث">تحديث</option>
                <option value="درس">درس</option>
              </select>
              <div className="flex gap-4">
                 <button type="submit" className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl hover:scale-105 transition-all">بث الإعلان الآن</button>
                 <button type="button" onClick={() => setShowCreateAd(false)} className="bg-gray-100 text-gray-400 px-8 py-5 rounded-2xl font-black">إلغاء</button>
              </div>
           </form>
        </div>
      )}

      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-6 animate-fade-in">
           <form onSubmit={createChannel} className="bg-white dark:bg-gray-950 w-full max-w-lg p-10 rounded-[3.5rem] space-y-6 border dark:border-gray-800 shadow-2xl">
              <h3 className="text-3xl font-black dark:text-white tracking-tighter">إنشاء مقياس جديد 📑</h3>
              <input required name="name" placeholder="اسم المقياس" className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-emerald-500" />
              <textarea required name="desc" placeholder="وصف المقياس..." className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold dark:text-white h-32 resize-none border-2 border-transparent focus:border-emerald-500" />
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl">
                 <input required name="price" type="number" defaultValue="400" className="bg-transparent text-3xl font-black outline-none w-full text-center dark:text-white" />
                 <span className="font-black text-emerald-600">دج</span>
              </div>
              <div className="flex gap-4">
                 <button type="submit" className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl hover:scale-105 transition-all">تأكيد الإنشاء</button>
                 <button type="button" onClick={() => setShowCreateChannel(false)} className="bg-gray-100 text-gray-400 px-8 py-5 rounded-2xl font-black">إلغاء</button>
              </div>
           </form>
        </div>
      )}

      {/* Jarvis AI Modal */}
      {isJarvisOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[3000] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-[80vh] rounded-[4rem] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in border dark:border-gray-800">
              <div className="p-8 bg-emerald-600 text-white flex justify-between items-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 pointer-events-none text-[12rem] font-black -translate-x-1/4 select-none">AI</div>
                 <div className="flex items-center gap-4 relative z-10">
                    <span className="text-5xl animate-pulse">🤖</span>
                    <div>
                       <h3 className="text-2xl font-black tracking-tighter">جارفيس الذكي</h3>
                       <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">المساعد الرقمي المتكامل لمنصة WAY</p>
                    </div>
                 </div>
                 <button onClick={() => setIsJarvisOpen(false)} className="bg-white/20 px-6 py-2 rounded-xl font-black relative z-10 hover:bg-white/30 transition-all">إغلاق</button>
              </div>
              <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-gray-50/50 dark:bg-gray-800/50 scroll-smooth no-scrollbar">
                 {jarvisChat.map((c, i) => (
                   <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div className={`p-6 rounded-[2.5rem] max-w-[85%] font-bold shadow-sm leading-relaxed ${c.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-700 dark:text-white border-2 border-emerald-500/10 rounded-tl-none'}`}>
                        {c.text}
                      </div>
                   </div>
                 ))}
                 {jarvisChat.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <span className="text-7xl mb-4">✨</span>
                      <p className="text-xl font-black">أهلاً بك في جارفيس! <br/> كيف يمكنني مساعدتك في رحلتك التعليمية؟</p>
                   </div>
                 )}
                 {isJarvisThinking && <div className="text-emerald-600 animate-pulse font-black p-4 flex items-center gap-2"><span> جارفيس يقوم بتحليل البيانات...</span><div className="w-4 h-4 bg-emerald-600 rounded-full animate-ping"></div></div>}
                 <div ref={chatEndRef}></div>
              </div>
              <div className="p-8 border-t dark:border-gray-800 flex gap-4 bg-white dark:bg-gray-900">
                 <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJarvisAsk()} placeholder="اسأل جارفيس عن أي موضوع أكاديمي..." className="flex-1 bg-gray-100 dark:bg-gray-800 p-6 rounded-3xl outline-none dark:text-white font-bold border-4 border-transparent focus:border-emerald-500 transition-all" />
                 <button onClick={handleJarvisAsk} className="bg-emerald-600 text-white px-10 py-6 rounded-3xl font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">إرسال</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;