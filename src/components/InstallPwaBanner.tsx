import React, { useEffect, useState } from "react";
import { Download, X, Smartphone, Sparkles, Share } from "lucide-react";

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if user already dismissed or installed in this session
    const isDismissed = sessionStorage.getItem("pwa_banner_dismissed");
    if (isDismissed) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Check standalone mode (already installed)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (ios && !isStandalone) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("pwa_banner_dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-50 bg-slate-900 text-white p-4 rounded-3xl shadow-2xl border border-slate-700/80 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl overflow-hidden shrink-0 border border-indigo-400/40 shadow-inner">
          <img src="/app_icon.jpg" alt="Jund ak Jaay App Icon" className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Installer l'application</span>
          </div>
          <h4 className="font-extrabold text-sm text-white truncate">Jund ak Jaay sur écran d'accueil</h4>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
            Accès rapide à vos produits et alertes depuis la liste de vos applications.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>Application web mobile</span>
        </div>

        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ajouter à l'écran d'accueil</span>
        </button>
      </div>

      {showIosGuide && (
        <div className="mt-3 p-3 bg-slate-800 rounded-2xl border border-indigo-500/30 text-xs space-y-2">
          <p className="font-bold text-indigo-300">Comment installer sur iOS (iPhone / iPad) :</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
            <li>Appuyez sur l'icône de partage <Share className="w-3 h-3 inline text-indigo-400" /> en bas du navigateur Safari.</li>
            <li>Faites défiler vers le bas et sélectionnez <strong>"Sur l'écran d'accueil"</strong>.</li>
            <li>Validez en appuyant sur <strong>"Ajouter"</strong>.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
