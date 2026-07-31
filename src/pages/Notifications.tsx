import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { Bell, ShoppingBag, CheckCheck, Clock, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  productId?: string;
  productTitle?: string;
  productImage?: string;
  sellerId?: string;
  sellerName?: string;
  createdAt: string | any;
  readBy?: string[];
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AppNotification[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AppNotification[];
        setNotifications(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, navigate]);

  const requestNotificationPermission = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Les notifications ne sont pas supportées par ce navigateur.");
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermissionStatus(perm);
      if (perm === "granted") {
        toast.success("Notifications système activées avec succès !");
        new Notification("Jund ak Jaay", {
          body: "Vous recevrez désormais des alertes pour les nouveaux produits !",
          icon: "/app_icon.jpg",
        });
      } else if (perm === "denied") {
        toast.error("Permission refusée dans les paramètres de votre navigateur.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (currentUser && (!notif.readBy || !notif.readBy.includes(currentUser.uid))) {
      try {
        await updateDoc(doc(db, "notifications", notif.id), {
          readBy: arrayUnion(currentUser.uid),
        });
      } catch (e) {
        console.error("Error marking read:", e);
      }
    }

    if (notif.productId) {
      navigate(`/product/${notif.productId}`);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    const unread = notifications.filter((n) => !n.readBy || !n.readBy.includes(currentUser.uid));
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        const ref = doc(db, "notifications", n.id);
        batch.update(ref, {
          readBy: arrayUnion(currentUser.uid),
        });
      });
      await batch.commit();
      toast.success("Toutes les notifications ont été marquées comme lues.");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la mise à jour.");
    }
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return "Récemment";
    const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt.toDate ? createdAt.toDate() : new Date();
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return "À l'instant";
    if (diffInMins < 60) return `Il y a ${diffInMins} min`;
    if (diffInHours < 24) return `Il y a ${diffInHours} h`;
    return `Il y a ${diffInDays} j`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
            <p className="text-xs text-slate-500 font-medium">Restez informé des nouveaux produits et opportunités</p>
          </div>
        </div>

        {notifications.some((n) => currentUser && (!n.readBy || !n.readBy.includes(currentUser.uid))) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Tout lire</span>
          </button>
        )}
      </div>

      {/* System Browser Notifications Banner */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-[2rem] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-sm sm:text-base">Alertes Instantanées sur votre appareil</h2>
          </div>
          <p className="text-xs text-slate-300">
            Recevez une alerte sur votre téléphone ou ordinateur dès qu'un produit est publié par un vendeur !
          </p>
        </div>

        {permissionStatus === "granted" ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-2 rounded-xl shrink-0">
            <ShieldCheck className="w-4 h-4" />
            <span>Alertes Activées</span>
          </div>
        ) : (
          <button
            onClick={requestNotificationPermission}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 shadow-lg shadow-indigo-950"
          >
            <span>Activer les alertes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-slate-500">Chargement de vos notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-slate-200 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Aucune notification pour le moment</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Dès qu'un vendeur ajoutera un article ou qu'un message vous sera envoyé, vous le verrez s'afficher ici.
            </p>
            <Link
              to="/"
              className="inline-block mt-4 text-xs font-bold text-white bg-indigo-600 px-5 py-3 rounded-2xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Explorer le marché
            </Link>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = currentUser && (!notif.readBy || !notif.readBy.includes(currentUser.uid));
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center ${
                  isUnread
                    ? "bg-indigo-50/60 border-indigo-200 shadow-sm hover:bg-indigo-50"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                {/* Thumbnail / Icon */}
                <div className="relative shrink-0">
                  {notif.productImage ? (
                    <img
                      src={notif.productImage}
                      alt={notif.productTitle || "Produit"}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 bg-slate-100"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                      <ShoppingBag className="w-7 h-7" />
                    </div>
                  )}

                  {isUnread && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 border-2 border-white rounded-full"></span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{notif.title}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{notif.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
