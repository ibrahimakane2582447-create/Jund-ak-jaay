import React, { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link } from "react-router-dom";
import { Heart, Image as ImageIcon } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export default function Favorites() {
  const [favoriteProducts, setFavoriteProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, "products"));
        const snapshot = await getDocs(q);
        const allProducts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any[];

        const favs = allProducts.filter(p => p.likes?.includes(auth.currentUser?.uid));
        setFavoriteProducts(favs);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
        <Heart className="w-8 h-8 text-indigo-600 fill-indigo-600" />
        Mes Favoris
      </h1>

      {favoriteProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
          <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Aucun favori</h2>
          <p className="text-slate-500 mb-6">Vous n'avez pas encore ajouté de produits à vos favoris.</p>
          <Link to="/" className="inline-block bg-indigo-600 text-white font-bold py-3 px-8 rounded-full hover:bg-indigo-700 transition-colors">
            Découvrir des produits
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4">
          {favoriteProducts.map((product) => (
            <Link key={product.id} to={`/product/${product.id}`} className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col border-2 border-indigo-500 h-full relative">
              <div className="relative aspect-square overflow-hidden bg-slate-100 shrink-0">
                {product.images && product.images[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-[10px]">
                    Sans image
                  </div>
                )}
                {product.isSold && (
                  <div className="absolute top-1.5 left-1.5 bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {t('sold')}
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/90 shadow-sm backdrop-blur-sm">
                  <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                </div>
              </div>
              <div className="p-2 sm:p-3 flex flex-col flex-grow">
                <div className="flex-grow">
                  <h3 className="font-semibold text-slate-900 text-[11px] sm:text-xs line-clamp-2 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                    {product.title}
                  </h3>
                </div>
                <div className="mt-1 shrink-0">
                  <p className="font-bold text-[11px] sm:text-xs text-indigo-600">
                    {product.price.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
