import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../firebase";
import { User, ChevronLeft, UserPlus, UserCheck, MessageCircle, Camera } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { fileToBase64 } from "../lib/utils";
import toast from "react-hot-toast";

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  isPromotion?: boolean;
  isSold?: boolean;
  location?: string;
}

export default function SellerProfile() {
  const { id } = useParams<{ id: string }>();
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [followingUsers, setFollowingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!id) return;
      try {
        const sellerDoc = await getDoc(doc(db, "users", id));
        if (sellerDoc.exists()) {
          const sellerData: any = { id: sellerDoc.id, ...sellerDoc.data() };
          setSeller(sellerData);
          
          if (auth.currentUser) {
            const currentUserDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (currentUserDoc.exists() && currentUserDoc.data().following?.includes(id)) {
              setIsFollowing(true);
            }
          }

          if (sellerData.following && sellerData.following.length > 0) {
            const followingPromises = sellerData.following.map((fId: string) => getDoc(doc(db, "users", fId)));
            const followingDocs = await Promise.all(followingPromises);
            setFollowingUsers(followingDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })));
          }
        }

        const q = query(collection(db, "products"), where("sellerId", "==", id));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(data);
      } catch (error) {
        console.error("Error fetching seller data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [id]);

  const handleFollow = async () => {
    if (!auth.currentUser || !seller) return;
    try {
      const currentUserRef = doc(db, "users", auth.currentUser.uid);
      const sellerRef = doc(db, "users", seller.id);

      if (isFollowing) {
        await setDoc(currentUserRef, { following: arrayRemove(seller.id), friends: arrayRemove(seller.id) }, { merge: true });
        await setDoc(sellerRef, { followers: arrayRemove(auth.currentUser.uid), friends: arrayRemove(auth.currentUser.uid) }, { merge: true });
        setIsFollowing(false);
        setSeller(prev => ({ 
          ...prev, 
          followers: (prev.followers || []).filter((id: string) => id !== auth.currentUser!.uid),
          friends: (prev.friends || []).filter((id: string) => id !== auth.currentUser!.uid)
        }));
        toast.success("Vous vous êtes désabonné(e) de ce vendeur.");
      } else {
        const isMutual = seller.following?.includes(auth.currentUser.uid);
        const currentUserUpdates: any = { following: arrayUnion(seller.id) };
        const sellerUpdates: any = { followers: arrayUnion(auth.currentUser.uid) };

        if (isMutual) {
          currentUserUpdates.friends = arrayUnion(seller.id);
          sellerUpdates.friends = arrayUnion(auth.currentUser.uid);
        }

        await setDoc(currentUserRef, currentUserUpdates, { merge: true });
        await setDoc(sellerRef, sellerUpdates, { merge: true });
        
        setIsFollowing(true);
        setSeller(prev => ({ 
          ...prev, 
          followers: [...(prev.followers || []), auth.currentUser!.uid],
          friends: isMutual ? [...(prev.friends || []), auth.currentUser!.uid] : (prev.friends || [])
        }));
        
        if (isMutual) {
          toast.success("Vous êtes maintenant amis !");
        } else {
          toast.success("Vous êtes maintenant abonné(e) ! Vous recevrez des notifications.");
        }
      }
    } catch (error) {
      console.error("Error following/unfollowing:", error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && isOwnProfile && auth.currentUser) {
      try {
        const file = e.target.files[0];
        const base64Photo = await fileToBase64(file);
        
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          photoURL: base64Photo
        });
        
        setSeller((prev: any) => ({ ...prev, photoURL: base64Photo }));
        toast.success("Photo de profil mise à jour avec succès !");
      } catch (err) {
        console.error("Erreur lors de l'upload de la photo :", err);
        toast.error("Erreur lors de la mise à jour de la photo.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!seller) {
    return <div className="text-center py-12">Seller not found.</div>;
  }

  const isOwnProfile = auth.currentUser?.uid === seller.id;

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 mb-8 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" /> {t('back')}
      </Link>

      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-[2rem] text-white p-6 sm:p-10 mb-10 relative overflow-hidden shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border border-white/10">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-40 pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-40 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full sm:w-auto text-center sm:text-left">
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] bg-white/10 backdrop-blur-md flex items-center justify-center text-4xl font-bold border-2 border-white/30 overflow-hidden shadow-xl shrink-0 transition-transform hover:scale-105">
              {seller.photoURL ? (
                <img src={seller.photoURL} alt={seller.name} className="w-full h-full object-cover" />
              ) : (
                seller.name?.substring(0, 2).toUpperCase() || <User className="w-12 h-12 text-indigo-200" />
              )}
            </div>
            {isOwnProfile && (
              <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-xl cursor-pointer shadow-lg hover:bg-indigo-500 transition-colors border-2 border-indigo-900 hover:scale-110">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
          <div className="mt-2 sm:mt-4">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{seller.name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-sm font-medium flex items-center gap-2">
                <span className="text-indigo-200">{seller.followers?.length || 0}</span> Abonnés
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-sm font-medium flex items-center gap-2">
                <span className="text-indigo-200">{seller.following?.length || 0}</span> Abonnements
              </div>
            </div>
          </div>
        </div>
        
        {!isOwnProfile && auth.currentUser && (
          <div className="relative z-10 w-full sm:w-auto flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
            <button 
              onClick={handleFollow}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isFollowing 
                  ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30' 
                  : 'bg-white text-indigo-900 hover:bg-indigo-50 shadow-lg'
              }`}
            >
              {isFollowing ? (
                <><UserCheck className="w-5 h-5" /> Abonné(e)</>
              ) : (
                <><UserPlus className="w-5 h-5" /> S'abonner</>
              )}
            </button>
            <Link
              to={`/chat/${seller.id}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-indigo-500 border border-indigo-400 text-white hover:bg-indigo-400 transition-all shadow-lg"
            >
              <MessageCircle className="w-5 h-5" /> Message
            </Link>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('listingsBy')} {seller.name} ({products.length})</h2>

      {products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[2rem] border border-slate-200 shadow-sm mb-10">
          <p className="text-slate-500">{t('noActiveListings')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4 mb-10">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="group bg-white rounded-xl border-2 border-indigo-500 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col hover:-translate-y-1 relative"
            >
              {product.isSold && (
                <div className="absolute top-1.5 left-1.5 z-20 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                  Vendu
                </div>
              )}
              {product.isPromotion && !product.isSold && (
                <div className="absolute top-1.5 left-1.5 z-20 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shadow-sm">
                  Promo
                </div>
              )}
              <div className="aspect-square bg-slate-100 overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none overflow-hidden">
                  <span className="text-white/40 drop-shadow-md font-black text-xs md:text-lg -rotate-12 uppercase tracking-widest text-center px-1 mix-blend-overlay">JUND AK JAAY</span>
                </div>
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className={`w-full h-full object-cover transition-transform duration-300 ${product.isSold ? 'grayscale opacity-70' : 'group-hover:scale-105'}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-[10px]">
                    Sans image
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 p-2 sm:p-3">
                <h3 className="font-semibold text-slate-900 text-[11px] sm:text-xs line-clamp-2 leading-tight">{product.title}</h3>
                <p className="text-[9px] text-slate-500 mt-0.5 font-medium truncate">{product.location || seller.name}</p>
                <div className="mt-auto pt-1">
                  <span className="font-bold text-[11px] sm:text-xs text-indigo-600">{product.price.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {followingUsers.length > 0 && (
        <>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Abonnements ({followingUsers.length})</h2>
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 overflow-hidden mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {followingUsers.map(user => (
                <Link 
                  key={user.id} 
                  to={`/seller/${user.id}`}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                >
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name?.substring(0, 2).toUpperCase() || <User className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{user.name}</h3>
                    <p className="text-xs font-medium text-slate-500">{user.followers?.length || 0} Abonnés</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
