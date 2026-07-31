import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Store, Lock, Phone, Mail, User as UserIcon, Globe, ArrowRight, ShieldCheck } from "lucide-react";
import { countries } from "../lib/countries";
import { useLanguage } from "../contexts/LanguageContext";
import CustomSelect from "../components/CustomSelect";
import toast from "react-hot-toast";

export default function Login() {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Connexion state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Inscription state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("Sénégal");
  const [gender, setGender] = useState("Homme");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const formatAuthEmail = (input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed.includes("@")) {
      return trimmed;
    }
    const cleaned = trimmed.replace(/[^a-z0-9]/gi, "");
    return `${cleaned}@jundakjaay.app`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginIdentifier || !loginPassword) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      const authEmail = formatAuthEmail(loginIdentifier);
      await signInWithEmailAndPassword(auth, authEmail, loginPassword);
      toast.success("Connexion réussie !");
      navigate("/");
    } catch (err: any) {
      console.error("Login error:", err);
      let msg = "Identifiant ou mot de passe incorrect.";
      if (err.code === "auth/too-many-requests") {
        msg = "Trop de tentatives échouées. Veuillez réitérer dans quelques minutes.";
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Identifiant ou mot de passe incorrect.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Veuillez entrer votre nom complet.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError("Veuillez renseigner un numéro de téléphone ou un e-mail.");
      return;
    }
    if (registerPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (registerPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const mainIdentifier = phone.trim() || email.trim();
      const authEmail = formatAuthEmail(mainIdentifier);

      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, registerPassword);
      const user = userCredential.user;

      const generatedUsername = username.trim() || fullName.trim().toLowerCase().replace(/\s+/g, "_");

      // Execute profile update and firestore doc creation concurrently for speed
      await Promise.all([
        updateProfile(user, { displayName: fullName.trim() }),
        setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: fullName.trim(),
          username: generatedUsername,
          phone: phone.trim(),
          email: email.trim() || `${phone.trim().replace(/[^a-z0-9]/gi, "")}@jundakjaay.app`,
          country: country || "Sénégal",
          gender: gender || "Homme",
          photoURL: "",
          createdAt: new Date().toISOString()
        }, { merge: true })
      ]);

      toast.success("Compte créé avec succès !");
      navigate("/");
    } catch (err: any) {
      console.error("Register error:", err);
      let msg = "Erreur lors de la création du compte.";
      if (err.code === "auth/email-already-in-use") {
        msg = "Un compte existe déjà avec ce numéro ou cet e-mail.";
      } else if (err.code === "auth/weak-password") {
        msg = "Le mot de passe doit comporter au moins 6 caractères.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 my-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Jund ak Jaay</h2>
        <p className="text-slate-500 font-medium text-sm mt-1">Connectez-vous pour acheter et vendre rapidement</p>
      </div>

      {/* Tabs Switcher */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => { setTab('login'); setError(""); }}
          className={`py-3 text-sm font-bold rounded-xl transition-all ${
            tab === 'login'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Se connecter
        </button>
        <button
          type="button"
          onClick={() => { setTab('register'); setError(""); }}
          className={`py-3 text-sm font-bold rounded-xl transition-all ${
            tab === 'register'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          S'inscrire
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs sm:text-sm font-bold leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab 1: CONNEXION */}
      {tab === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Numéro de téléphone ou E-mail
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="Ex: 771234567 ou exemple@gmail.com"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
              />
              <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50 mt-6"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Connexion en cours...
              </span>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Tab 2: INSCRIPTION */
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nom complet
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Cheikh Ndiaye"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
              />
              <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Numéro de Téléphone (WhatsApp)
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 77 123 45 67"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
              />
              <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Adresse E-mail (Optionnel)
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@email.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
              />
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sexe
              </label>
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Pays
              </label>
              <CustomSelect
                required
                value={country}
                onChange={setCountry}
                options={countries.map(c => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Créer un mot de passe
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50 mt-6"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Création du compte...
              </span>
            ) : (
              <>
                <span>Créer mon compte</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

