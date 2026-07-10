import React, { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Store } from "lucide-react";
import { countries } from "../lib/countries";
import { useLanguage } from "../contexts/LanguageContext";
import CustomSelect from "../components/CustomSelect";

export default function Login() {
  const [mode, setMode] = useState<'login' | 'completeProfile'>('login');
  
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const { t } = useLanguage();
  
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || !userDoc.data()?.phone) {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || user.email?.split('@')[0] || "");
          setPhone(data.phone || "");
          setCountry(data.country || "");
          setGender(data.gender || "");
        } else {
          setUsername(user.email?.split('@')[0] || "");
        }
        setTempUser(user);
        setMode('completeProfile');
        return;
      }
      navigate("/");
    } catch (err: any) {
      console.error("Google sign in error:", err);
      let errorMessage = err.message || "Erreur lors de la connexion avec Google.";
      if (err.code === 'auth/network-request-failed') {
        errorMessage = "Erreur réseau. Veuillez vérifier votre connexion ou ouvrir l'application dans un nouvel onglet si vous êtes dans un aperçu.";
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = "La connexion par Google n'est pas activée. Veuillez l'activer dans la console Firebase (Authentication > Sign-in method).";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUser) return;
    setLoading(true);
    setError("");
    try {
      await setDoc(doc(db, "users", tempUser.uid), {
        uid: tempUser.uid,
        email: tempUser.email,
        name: tempUser.displayName || "",
        username: username,
        phone: phone,
        country: country,
        gender: gender,
        photoURL: tempUser.photoURL || ""
      }, { merge: true });
      navigate("/");
    } catch (err: any) {
      console.error("Profile complete error:", err);
      setError(err.message || "Erreur lors de l'enregistrement du profil.");
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'completeProfile') {
    return (
      <div className="max-w-md mx-auto w-full bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 mt-10 mb-10">
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 text-center tracking-tight">Complétez votre profil</h2>
          <p className="text-slate-500 mt-2 text-sm text-center font-medium">Pour continuer, nous avons besoin de quelques informations supplémentaires.</p>
        </div>

        {error && <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>}

        <form onSubmit={handleCompleteProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nom d'utilisateur</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
              placeholder="Ex: jeandupont99"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Sexe</label>
              <CustomSelect
                required
                value={gender}
                onChange={setGender}
                options={[
                  { value: "Homme", label: "Homme" },
                  { value: "Femme", label: "Femme" },
                  { value: "Autre", label: "Autre" }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Pays</label>
              <CustomSelect
                required
                value={country}
                onChange={setCountry}
                options={countries.map(c => ({ value: c, label: c }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Numéro de Téléphone (WhatsApp)</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-5 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
              placeholder="+221..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-6"
          >
            {loading ? "Veuillez patienter..." : "Enregistrer et Continuer"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 mt-10 mb-10 text-center">
      <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <Store className="w-10 h-10 text-indigo-600" />
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-2">{t('marketplace')}</h2>
      <p className="text-slate-500 font-medium mb-10">Rejoignez notre communauté de vendeurs et d'acheteurs.</p>
      
      {error && <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>}

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full bg-white text-slate-700 border border-slate-200 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2 shadow-sm"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        <span className="text-base">{loading ? "Connexion en cours..." : "Continuer avec Google"}</span>
      </button>
    </div>
  );
}
