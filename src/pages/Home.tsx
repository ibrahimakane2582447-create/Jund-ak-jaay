import React, { useEffect, useState } from "react";
import { collection, query, getDocs, updateDoc, setDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { Search, Heart, User, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import CustomSelect from "../components/CustomSelect";

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  sellerName: string;
  isPromotion?: boolean;
  isSold?: boolean;
  location?: string;
  likes?: string[];
  createdAt?: any;
  genre?: string;
  category?: string;
}

interface AppUser {
  id: string;
  name: string;
  photoURL?: string;
}

type SortOption = 'newest' | 'price_asc' | 'price_desc';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, "products"))),
          getDocs(query(collection(db, "users")))
        ]);
        
        const productsData = productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(productsData);

        const usersData = usersSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || "Utilisateur",
          photoURL: doc.data().photoURL
        })) as AppUser[];
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLike = async (e: React.MouseEvent, productId: string, currentLikes: string[] = []) => {
    e.preventDefault();
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    
    const userId = auth.currentUser.uid;
    const isLiked = currentLikes.includes(userId);
    const productRef = doc(db, "products", productId);
    const userRef = doc(db, "users", userId);

    try {
      if (isLiked) {
        await updateDoc(productRef, { likes: arrayRemove(userId) });
        await setDoc(userRef, { favorites: arrayRemove(productId) }, { merge: true });
        setProducts(products.map(p => p.id === productId ? { ...p, likes: currentLikes.filter(id => id !== userId) } : p));
        toast.success("Retiré de vos favoris.");
      } else {
        await updateDoc(productRef, { likes: arrayUnion(userId) });
        await setDoc(userRef, { favorites: arrayUnion(productId) }, { merge: true });
        setProducts(products.map(p => p.id === productId ? { ...p, likes: [...currentLikes, userId] } : p));
        toast.success("Ajouté à vos favoris !");
      }
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const handleQuickShare = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const productUrl = `${window.location.origin}/product/${product.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.title} - Jund ak Jaay`,
          text: `Regarde ce produit sur Jund ak Jaay : "${product.title}" (${product.price.toLocaleString('fr-FR')} FCFA)`,
          url: productUrl
        });
      } catch (err) {
        // User closed share window
      }
    } else {
      navigator.clipboard.writeText(productUrl);
      toast.success("Lien du produit copié !");
    }
  };

  const filteredProducts = products.filter(product => 
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    product.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (sortOption === 'price_asc') {
      return a.price - b.price;
    } else if (sortOption === 'price_desc') {
      return b.price - a.price;
    } else {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA;
    }
  });

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Clean Marketplace Header & Search */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Marché local en direct • Sénégal
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Achetez & vendez en toute confiance
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base font-medium">
            Des milliers de bonnes affaires près de chez vous : téléphones, vêtements, véhicules, immobilier et bien plus.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                placeholder="Rechercher un produit, marque (ex: iPhone, Robe, Moto)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-2xl transition-colors"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Categories Horizontal Chips */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            {["Tous", "Téléphones", "Électronique", "Vêtements", "Véhicules", "Immobilier", "Maison"].map((cat) => {
              const isSelected = (cat === "Tous" && searchQuery === "") || searchQuery === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSearchQuery(cat === "Tous" ? "" : cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Users Results Search */}
      {searchQuery && filteredUsers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            <span>Vendeurs trouvés ({filteredUsers.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredUsers.map(user => (
              <Link 
                key={user.id} 
                to={`/seller/${user.id}`}
                className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border border-slate-200">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name?.substring(0, 2).toUpperCase() || <User className="w-5 h-5" />
                  )}
                </div>
                <h3 className="font-bold text-xs text-slate-900 truncate group-hover:text-emerald-600 transition-colors">{user.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products Results & Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900">
              {searchQuery ? `Résultats (${filteredProducts.length})` : 'Annonces récentes'}
            </h2>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Trier :</span>
            <div className="w-44">
              <CustomSelect
                value={sortOption}
                onChange={(val) => setSortOption(val as SortOption)}
                options={[
                  { value: "newest", label: "Plus récents" },
                  { value: "price_asc", label: "Prix croissant" },
                  { value: "price_desc", label: "Prix décroissant" }
                ]}
              />
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 && filteredUsers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-slate-900 font-bold text-base">Aucune annonce ne correspond à votre recherche.</p>
            <p className="text-slate-500 text-xs mt-1">Essayez avec d'autres mots clés ou parcourez les catégories.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Réinitialiser la recherche
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="group bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden relative"
              >
                {/* Image & Action Overlay */}
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className={`w-full h-full object-cover transition-transform duration-300 ease-out ${
                        product.isSold ? 'grayscale opacity-60' : 'group-hover:scale-105'
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-xs">
                      Sans image
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    {product.isSold && (
                      <span className="bg-slate-900/90 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg backdrop-blur-sm shadow-xs uppercase">
                        Vendu
                      </span>
                    )}
                    {product.isPromotion && !product.isSold && (
                      <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-xs uppercase">
                        PROMO
                      </span>
                    )}
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <button 
                      onClick={(e) => handleQuickShare(e, product)}
                      className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow-xs hover:scale-110 transition-all backdrop-blur-sm"
                      title="Partager"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => handleLike(e, product.id, product.likes)}
                      className="p-1.5 bg-white/90 hover:bg-white rounded-full shadow-xs hover:scale-110 transition-all backdrop-blur-sm"
                      title="Favoris"
                    >
                      <Heart className={`w-3.5 h-3.5 ${product.likes?.includes(auth.currentUser?.uid || '') ? 'fill-rose-500 text-rose-500' : 'text-slate-500 hover:text-rose-500'}`} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                    {product.title}
                  </h3>
                  
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-end justify-between gap-1">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                        {product.location || product.sellerName}
                      </p>
                      <p className="font-extrabold text-sm text-slate-900 mt-0.5">
                        {product.price.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-emerald-600">FCFA</span>
                      </p>
                    </div>
                    {product.likes && product.likes.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5 mb-0.5">
                        <Heart className="w-3 h-3 fill-slate-300 text-slate-300" /> {product.likes.length}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
