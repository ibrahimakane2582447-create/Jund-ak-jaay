import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Store, PlusCircle, LogIn, LogOut, User, Globe, Home, Settings, MessageCircle, Heart } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import LanguageSelector from "./LanguageSelector";

export default function Layout() {
  const [user, setUser] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-20 sm:pb-0">
      <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center shrink-0 sticky top-0 z-20">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-indigo-900">Jund ak Jaay</span>
          </Link>
          
          <nav className="flex items-center gap-4">
            {user ? (
              <div className="relative" ref={settingsRef}>
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center justify-center w-10 h-10 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden z-50 transition-all origin-top-right animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-sm text-slate-700 font-bold mb-2 px-2">
                        <Globe className="w-4 h-4 text-slate-500" />
                        Langue
                      </div>
                      <LanguageSelector />
                    </div>
                    <button 
                      onClick={handleLogout} 
                      className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LanguageSelector compact />
                <Link to="/login" className="flex items-center gap-2 text-sm font-medium bg-indigo-600 text-white px-5 py-2 rounded-full hover:bg-indigo-700 transition-colors">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('login')}</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Bottom Navigation for Mobile & Desktop */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 sm:justify-center sm:gap-12">
          <Link 
            to="/" 
            className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Home className={`w-6 h-6 ${isActive('/') ? 'fill-indigo-100' : ''}`} />
            <span className="text-[10px] font-bold">Accueil</span>
          </Link>
          
          <Link 
            to="/messages" 
            className={`flex flex-col items-center gap-1 transition-colors ${isActive('/messages') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <MessageCircle className={`w-6 h-6 ${isActive('/messages') ? 'fill-indigo-100' : ''}`} />
            <span className="text-[10px] font-bold">Messages</span>
          </Link>

          <Link 
            to="/post" 
            className="flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all -mt-8 border-4 border-slate-50"
          >
            <PlusCircle className="w-6 h-6" />
          </Link>

          <Link 
            to="/favorites" 
            className={`flex flex-col items-center gap-1 transition-colors ${isActive('/favorites') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Heart className={`w-6 h-6 ${isActive('/favorites') ? 'fill-indigo-100' : ''}`} />
            <span className="text-[10px] font-bold">Favoris</span>
          </Link>

          <Link 
            to={`/seller/${user.uid}`} 
            className={`flex flex-col items-center gap-1 transition-colors ${isActive(`/seller/${user.uid}`) ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <User className={`w-6 h-6 ${isActive(`/seller/${user.uid}`) ? 'fill-indigo-100' : ''}`} />
            <span className="text-[10px] font-bold">Profil</span>
          </Link>
        </div>
      )}
    </div>
  );
}
