import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, setDoc, deleteDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, getDocs, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { MessageCircle, ShieldCheck, RefreshCw, User, ChevronLeft, MapPin, Trash2, CheckCircle2, Heart } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import toast from "react-hot-toast";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    
    if (id) {
      const q = query(collection(db, "products", id, "comments"), orderBy("createdAt", "asc"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const commentsData: any[] = [];
        querySnapshot.forEach((doc) => {
          commentsData.push({ id: doc.id, ...doc.data() });
        });
        setComments(commentsData);
      }, (error) => {
        console.error("Comments listener error:", error);
      });
      return () => unsubscribe();
    }
  }, [id]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !id) return;
    
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    setSubmittingComment(true);
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userName = userDoc.exists() ? userDoc.data().name : "Utilisateur";

      await addDoc(collection(db, "products", id, "comments"), {
        userId: auth.currentUser.uid,
        userName,
        text: newComment.trim(),
        createdAt: new Date(),
      });
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Erreur lors de l'ajout du commentaire.");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-12">{t('noProducts')}</div>;
  }

  const handleWhatsApp = () => {
    const phone = product.phone.replace(/[^\d+]/g, '');
    const message = encodeURIComponent(`Bonjour, je suis intéressé(e) par votre produit ${product.title} à ${product.price} FCFA.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const isOwner = auth.currentUser && auth.currentUser.uid === product.sellerId;

  const handleToggleSold = async () => {
    if (!id || !isOwner) return;
    try {
      const newStatus = !product.isSold;
      const docRef = doc(db, "products", id);
      await updateDoc(docRef, { isSold: newStatus });
      setProduct({ ...product, isSold: newStatus });
      toast.success(newStatus ? "Produit marqué comme vendu." : "Produit remis en vente.");
    } catch (err) {
      console.error("Failed to toggle sold status", err);
      toast.error("Erreur lors de la modification du statut.");
    }
  };

  const handleDelete = async () => {
    if (!id || !isOwner) return;
    try {
      const docRef = doc(db, "products", id);
      await deleteDoc(docRef);
      toast.success("Produit supprimé définitivement.");
      navigate("/");
    } catch (err) {
      console.error("Failed to delete product", err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleLike = async () => {
    if (!auth.currentUser || !product || !id) {
      navigate('/login');
      return;
    }
    
    const userId = auth.currentUser.uid;
    const isLiked = product.likes?.includes(userId);
    const productRef = doc(db, "products", id);
    const userRef = doc(db, "users", userId);

    try {
      if (isLiked) {
        await updateDoc(productRef, { likes: arrayRemove(userId) });
        await setDoc(userRef, { favorites: arrayRemove(id) }, { merge: true });
        setProduct({ ...product, likes: (product.likes || []).filter((uid: string) => uid !== userId) });
        toast.success("Retiré de vos favoris.");
      } else {
        await updateDoc(productRef, { likes: arrayUnion(userId) });
        await setDoc(userRef, { favorites: arrayUnion(id) }, { merge: true });
        setProduct({ ...product, likes: [...(product.likes || []), userId] });
        toast.success("Ajouté à vos favoris !");
      }
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Link to="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> {t('back')}
        </Link>
        {isOwner && (
          <div className="flex gap-2">
            <button 
              onClick={handleToggleSold}
              className={`${product.isSold ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-1 transition-colors`}
            >
              <CheckCircle2 className="w-4 h-4" /> {product.isSold ? 'Remettre en vente' : 'Marquer Vendu'}
            </button>
            <Link 
              to={`/edit/${product.id}`}
              className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-indigo-200 flex items-center gap-1 transition-colors"
            >
              Modifier
            </Link>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl">
                <span className="text-sm font-bold text-red-700">Supprimer ?</span>
                <button onClick={handleDelete} className="text-sm font-bold text-white bg-red-600 px-2 py-0.5 rounded hover:bg-red-700">Oui</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="text-sm font-bold text-slate-600 hover:text-slate-800">Non</button>
              </div>
            ) : (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-red-200 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row mb-8">
        {/* Images */}
        <div className="w-full md:w-1/2 p-4 md:p-6 bg-slate-100 flex flex-col relative">
          {product.isSold && (
            <div className="absolute top-8 left-8 z-10 bg-slate-900/80 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-lg uppercase">
              Produit Vendu
            </div>
          )}
          {product.isPromotion && !product.isSold && (
            <div className="absolute top-8 left-8 z-10 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg uppercase shadow-sm">
              En Promotion
            </div>
          )}
          <div className="flex-1 rounded-2xl overflow-hidden border border-slate-300 relative bg-white aspect-square md:aspect-auto">
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none overflow-hidden">
              <span className="text-black/10 drop-shadow-sm font-black text-3xl md:text-5xl -rotate-12 uppercase tracking-widest text-center px-4 mix-blend-overlay">JUND AK JAAY</span>
            </div>
            {product.images && product.images.length > 0 ? (
              <img src={product.images[activeImage]} alt={product.title} className={`w-full h-full object-contain ${product.isSold ? 'grayscale opacity-80' : ''}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">Sans image</div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-4 mt-4 overflow-x-auto pb-2 scrollbar-hide">
              {product.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-colors flex-shrink-0 ${activeImage === idx ? 'border-indigo-600' : 'border-slate-300'}`}
                >
                  <img src={img} alt={`View ${idx+1}`} className={`w-full h-full object-cover ${product.isSold ? 'grayscale opacity-80' : ''}`} />
                </button>
              ))}
            </div>
          )}
          {product.video && (
            <div className="mt-4 rounded-2xl overflow-hidden border border-slate-300 bg-black aspect-video">
              <video src={product.video} controls className="w-full h-full object-contain"></video>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">{product.title}</h1>
            <div className="flex items-center justify-between mb-6">
              <div className="text-4xl font-black text-indigo-600">{product.price.toLocaleString('fr-FR')} FCFA</div>
              <button 
                onClick={handleLike}
                className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <Heart className={`w-6 h-6 ${product.likes?.includes(auth.currentUser?.uid || '') ? 'fill-red-500 text-red-500' : 'text-slate-500'}`} />
                {product.likes && product.likes.length > 0 && (
                  <span className="font-bold text-slate-600">{product.likes.length}</span>
                )}
              </button>
            </div>
            
            <div className="flex flex-col gap-3 text-sm font-medium text-slate-500 tracking-wider mb-6">
              {product.location && (
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> Adresse: <strong className="text-slate-900">{product.location}</strong></span>
              )}
              {product.genre && (
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400"></div>Genre/Catégorie: <strong className="text-slate-900">{product.genre}</strong></span>
              )}
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400"></div>{t('color')}: <strong className="text-slate-900">{product.color}</strong></span>
              {product.problems && (
                <span className="flex items-center gap-2 text-red-600"><div className="w-2 h-2 rounded-full bg-red-400"></div>Problèmes: <strong className="text-red-700">{product.problems}</strong></span>
              )}
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-400" />{t('warranty')}: <strong className="text-slate-900">{product.warranty}</strong></span>
              <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-slate-400" />{t('refund')}: <strong className="text-slate-900">{product.refundPolicy}</strong></span>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center text-lg font-bold">
                  {product.sellerName?.substring(0, 2).toUpperCase() || <User className="w-6 h-6" />}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t('seller')}</div>
                  <Link to={`/seller/${product.sellerId}`} className="font-bold text-lg text-slate-900 hover:text-indigo-600">
                    {product.sellerName}
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleWhatsApp}
                disabled={product.isSold}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-200 hover:scale-[1.02] transition-transform text-lg disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                <MessageCircle className="w-6 h-6 fill-current" />
                {product.isSold ? "Produit Vendu" : t('contactWhatsApp')}
              </button>
              
              {!product.isSold && product.sellerId !== auth.currentUser?.uid && (
                <Link
                  to={`/chat/${product.sellerId}`}
                  className="w-full py-4 rounded-2xl font-bold flex justify-center items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-100 text-lg"
                >
                  <MessageCircle className="w-6 h-6" />
                  Envoyer un message
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8 mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Commentaires</h2>
        <div className="space-y-6 mb-8">
          {comments.length === 0 ? (
            <p className="text-slate-500 font-medium text-center py-4">Soyez le premier à commenter ce produit.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600 shrink-0">
                  {comment.userName?.substring(0, 2).toUpperCase() || <User className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <Link to={`/seller/${comment.userId}`} className="font-bold text-slate-900 hover:text-indigo-600">
                      {comment.userName}
                    </Link>
                    <span className="text-xs text-slate-400 font-medium">
                      {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString('fr-FR') : ''}
                    </span>
                  </div>
                  <p className="text-slate-700">{comment.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
        
        <form onSubmit={handleCommentSubmit} className="flex gap-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Écrire un commentaire..."
            className="flex-1 px-4 py-3 bg-slate-100 border-transparent focus:bg-white border focus:border-indigo-500 rounded-2xl outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submittingComment}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submittingComment ? "Envoi..." : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
}
