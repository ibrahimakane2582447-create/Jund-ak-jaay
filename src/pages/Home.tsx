import React, { useEffect, useState } from "react";
import { collection, query, getDocs, updateDoc, setDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { Search, Heart, User } from "lucide-react";
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
    <div>
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight leading-tight">
          Achetez et vendez <br className="hidden sm:block" /> vos marchandises
        </h1>
        <p className="text-slate-500 mt-4 font-medium text-lg max-w-2xl mx-auto">
          Découvrez les meilleures offres autour de vous et vendez vos articles rapidement.
        </p>
        
        <div className="mt-8 max-w-2xl mx-auto relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-shadow hover:shadow-md"
            placeholder="Rechercher un produit (ex: Iphone, Décoration) ou un vendeur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categories Quick Links */}
        <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-3xl mx-auto">
          {["Tous", "Téléphones", "Électronique", "Vêtements", "Véhicules", "Immobilier", "Décoration"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSearchQuery(cat === "Tous" ? "" : cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                (cat === "Tous" && searchQuery === "") || searchQuery === cat
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {searchQuery && filteredUsers.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Utilisateurs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredUsers.map(user => (
              <Link 
                key={user.id} 
                to={`/seller/${user.id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name?.substring(0, 2).toUpperCase() || <User className="w-6 h-6" />
                  )}
                </div>
                <h3 className="font-bold text-slate-900">{user.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}

      {searchQuery && filteredUsers.length > 0 && filteredProducts.length > 0 && (
         <h2 className="text-2xl font-bold text-slate-900 mb-6">Produits</h2>
      )}

      {filteredProducts.length > 0 || filteredUsers.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {searchQuery ? (filteredUsers.length > 0 ? '' : 'Produits') : 'Les plus récents'}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500 hidden sm:inline">Trier par:</span>
            <div className="w-48">
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
      ) : null}

      {filteredProducts.length === 0 && filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-slate-500 font-medium">Aucun résultat trouvé pour votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4">
          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="group bg-white rounded-xl border-2 border-indigo-500 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col hover:-translate-y-1 relative"
            >
              <button 
                onClick={(e) => handleLike(e, product.id, product.likes)}
                className="absolute top-1.5 right-1.5 z-20 p-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
              >
                <Heart className={`w-3 h-3 ${product.likes?.includes(auth.currentUser?.uid || '') ? 'fill-red-500 text-red-500' : 'text-slate-400 hover:text-red-500'}`} />
              </button>
              
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
                <p className="text-[9px] text-slate-500 mt-0.5 font-medium truncate">{product.location || product.sellerName}</p>
                <div className="mt-auto pt-1 flex items-center justify-between">
                  <span className="font-bold text-[11px] sm:text-xs text-indigo-600">{product.price.toLocaleString('fr-FR')} FCFA</span>
                  {product.likes && product.likes.length > 0 && (
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5 fill-slate-300" /> {product.likes.length}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
