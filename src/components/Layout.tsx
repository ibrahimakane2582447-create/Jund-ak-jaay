import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Store, PlusCircle, LogIn, LogOut, User, Globe, Home, Settings, MessageCircle, Heart, Bell } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import LanguageSelector from "./LanguageSelector";
import InstallPwaBanner from "./InstallPwaBanner";

export default function Layout() {
  const [user, setUser] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadNotifsCount(0);
      return;
    }

    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let count = 0;
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.readBy || !data.readBy.includes(user.uid)) {
            count++;
          }
        });
        setUnreadNotifsCount(count);
      },
      (err) => console.error("Error listening notifications:", err)
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setShowSettings(false);
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-900 pb-24 sm:pb-0">
      <header className="h-16 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center shrink-0 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">Jund ak Jaay</span>
              <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase mt-0.5">Sénégal</span>
            </div>
          </Link>
          
          <nav className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <Link
                  to="/post"
                  className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Vendre un article</span>
                </Link>

                <Link
                  to="/notifications"
                  className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                    isActive("/notifications")
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white font-bold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white">
                      {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                    </span>
                  )}
                </Link>

                <div className="relative" ref={settingsRef}>
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center justify-center w-10 h-10 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Paramètres"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  
                  {showSettings && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 transition-all origin-top-right animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mb-2 px-1 uppercase tracking-wider">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          Langue du site
                        </div>
                        <LanguageSelector />
                      </div>
                      <Link
                        to="/notifications"
                        onClick={() => setShowSettings(false)}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors border-b border-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-slate-500" />
                          <span>Notifications</span>
                        </div>
                        {unreadNotifsCount > 0 && (
                          <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {unreadNotifsCount}
                          </span>
                        )}
                      </Link>
                      <button 
                        onClick={handleLogout} 
                        className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <LanguageSelector compact />
                <Link to="/login" className="flex items-center gap-2 text-xs font-bold bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-sm">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('login')}</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Bottom Navigation for Mobile */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex justify-around items-center z-40 sm:hidden">
          <Link 
            to="/" 
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              isActive('/') ? 'text-slate-900 font-extrabold bg-slate-100' : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Accueil</span>
          </Link>
          
          <Link 
            to="/messages" 
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              isActive('/messages') ? 'text-slate-900 font-extrabold bg-slate-100' : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px]">Messages</span>
          </Link>

          <Link 
            to="/post" 
            className="flex items-center justify-center w-12 h-12 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all -mt-5 border-2 border-white"
            title="Vendre"
          >
            <PlusCircle className="w-6 h-6" />
          </Link>

          <Link 
            to="/favorites" 
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              isActive('/favorites') ? 'text-slate-900 font-extrabold bg-slate-100' : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-[10px]">Favoris</span>
          </Link>

          <Link 
            to={`/seller/${user.uid}`} 
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              isActive(`/seller/${user.uid}`) ? 'text-slate-900 font-extrabold bg-slate-100' : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Profil</span>
          </Link>
        </div>
      )}
      <InstallPwaBanner />
    </div>
  );
}
