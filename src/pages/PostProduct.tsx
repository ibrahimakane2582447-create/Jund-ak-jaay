import React, { useState, useEffect } from "react";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate, useParams } from "react-router-dom";
import { Upload, X, Loader2, Video } from "lucide-react";
import { fileToBase64 } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import CustomSelect from "../components/CustomSelect";

export default function PostProduct() {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [color, setColor] = useState("");
  const [genre, setGenre] = useState("");
  const [problems, setProblems] = useState("");
  const [warranty, setWarranty] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [isPromotion, setIsPromotion] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { t } = useLanguage();

  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      try {
        if (id) {
          const productDoc = await getDoc(doc(db, "products", id));
          if (productDoc.exists()) {
            const data = productDoc.data();
            if (data.sellerId !== auth.currentUser?.uid) {
              navigate("/");
              return;
            }
            setTitle(data.title || "");
            setPrice(data.price?.toString() || "");
            setColor(data.color || "");
            setGenre(data.genre || "");
            setProblems(data.problems || "");
            setWarranty(data.warranty || "");
            setRefundPolicy(data.refundPolicy || "");
            setLocation(data.location || "");
            setPhone(data.phone || "");
            setIsPromotion(data.isPromotion || false);
            setImages(data.images || []);
            setVideo(data.video || "");
          } else {
            navigate("/");
          }
        } else {
          // New product, try to fetch user's phone number as default
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDoc.exists() && userDoc.data().phone) {
            setPhone(userDoc.data().phone);
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };

    loadData();
  }, [id, navigate]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (images.length + filesArray.length > 3) {
        setError("Vous ne pouvez ajouter que 3 images au maximum.");
        return;
      }
      
      try {
        const base64Images = await Promise.all(filesArray.map((file: File) => fileToBase64(file)));
        setImages(prev => [...prev, ...base64Images]);
        setError("");
      } catch (err) {
        setError("Erreur lors du traitement des images.");
      }
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 700 * 1024) {
        setError("La vidéo doit faire moins de 10Mo.");
        return;
      }
      try {
        const base64Video = await fileToBase64(file);
        setVideo(base64Video);
        setError("");
      } catch (err) {
        setError("Erreur lors du traitement de la vidéo.");
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideo("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (images.length < 1) {
      setError("Veuillez ajouter au moins une image.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();

      if (!userData) {
        throw new Error("Profil utilisateur non trouvé.");
      }

      if (!phone) {
        throw new Error("Veuillez renseigner votre numéro de téléphone.");
      }

      const productData = {
        sellerId: auth.currentUser.uid,
        sellerName: userData.name,
        phone,
        title,
        price: parseFloat(price),
        color,
        genre,
        problems,
        warranty,
        refundPolicy,
        location,
        isPromotion,
        images,
        video,
      };

      if (id) {
        await updateDoc(doc(db, "products", id), productData);
      } else {
        await addDoc(collection(db, "products"), {
          ...productData,
          isSold: false,
          createdAt: new Date(),
        });
      }

      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight">{id ? "Modifier le produit" : t('postProduct')}</h1>
      
      {error && <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Images du produit (Max 3)</label>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {images.map((img, index) => (
              <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-50">
                <img src={img} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {images.length < 3 && (
              <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors bg-slate-50">
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 mt-2 text-center px-2">Ajouter Photo</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Vidéo du produit (Optionnel)</label>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {video ? (
              <div className="col-span-3 sm:col-span-1 relative aspect-video sm:aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-900">
                <video src={video} className="w-full h-full object-cover" controls />
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="col-span-3 sm:col-span-1 aspect-video sm:aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors bg-slate-50">
                <Video className="w-6 h-6 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 mt-2 text-center px-2">Ajouter Vidéo</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
              </label>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('productTitle')}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-5 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              placeholder="Ex: iPhone 13 Pro Max"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-1">Numéro de téléphone</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-5 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              placeholder="Ex: +221 77 000 00 00"
            />
            <p className="text-xs text-slate-500 mt-1">Obligatoire pour que les acheteurs puissent vous contacter.</p>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('price')} (FCFA)</label>
            <input
              type="number"
              required
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-5 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('color')}</label>
            <input
              type="text"
              required
              list="color-list"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-5 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              placeholder="Ex: Noir, Blanc..."
            />
            <datalist id="color-list">
              <option value="Noir" />
              <option value="Blanc" />
              <option value="Gris" />
              <option value="Rouge" />
              <option value="Bleu" />
              <option value="Vert" />
              <option value="Jaune" />
              <option value="Or" />
              <option value="Argent" />
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Genre / Catégorie</label>
            <input
              type="text"
              required
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full px-5 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              placeholder="Ex: Électronique, Vêtements..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Problèmes ou défauts</label>
            <input
              type="text"
              value={problems}
              onChange={(e) => setProblems(e.target.value)}
              className="w-full px-5 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              placeholder="Ex: Aucun, Rayure sur l'écran..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-1">Adresse / Lieu du produit</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-5 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              placeholder="Ex: Dakar, Point E"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('warranty')}</label>
            <input
              type="text"
              required
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
              className="w-full px-5 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              placeholder="Ex: 6 mois"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('refund')}</label>
            <CustomSelect
              value={refundPolicy}
              onChange={setRefundPolicy}
              required
              options={[
                { value: "Possible", label: "Possible" },
                { value: "Not Possible", label: "Pas possible" }
              ]}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <input
            type="checkbox"
            id="isPromotion"
            checked={isPromotion}
            onChange={(e) => setIsPromotion(e.target.checked)}
            className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="isPromotion" className="text-sm font-bold text-slate-700 cursor-pointer">
            Mettre ce produit en promotion
          </label>
        </div>

        <div className="pt-6 border-t border-slate-200">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (id ? "Mettre à jour" : t('publishProduct'))}
          </button>
        </div>
      </form>
    </div>
  );
}
