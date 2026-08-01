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
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
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
            setVideoDuration(data.videoDuration || null);
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
      if (images.length + filesArray.length > 8) {
        setError("Vous pouvez ajouter jusqu'à 8 images au maximum.");
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

      const tempVideo = document.createElement("video");
      tempVideo.preload = "metadata";
      tempVideo.src = URL.createObjectURL(file);

      tempVideo.onloadedmetadata = async () => {
        URL.revokeObjectURL(tempVideo.src);
        const duration = tempVideo.duration;

        if (duration < 3) {
          setError(`La vidéo est trop courte (${Math.round(duration)}s). Elle doit durer au moins 3 secondes.`);
          return;
        }

        try {
          const base64Video = await fileToBase64(file);
          setVideo(base64Video);
          setVideoDuration(Math.round(duration));
          setError("");
        } catch (err) {
          setError("Erreur lors du traitement de la vidéo.");
        }
      };

      tempVideo.onerror = () => {
        setError("Format de vidéo non valide ou illisible.");
      };
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideo("");
    setVideoDuration(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (images.length < 3) {
      setError(`Veuillez ajouter au moins 3 photos du produit (actuellement : ${images.length}/3).`);
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
        videoDuration: videoDuration || null,
      };

      if (id) {
        await updateDoc(doc(db, "products", id), productData);
      } else {
        const newProductRef = await addDoc(collection(db, "products"), {
          ...productData,
          isSold: false,
          createdAt: new Date(),
        });

        // Broadcast notification to all clients
        try {
          await addDoc(collection(db, "notifications"), {
            title: "Nouveau produit publié !",
            message: `${userData.name || 'Un vendeur'} a publié : "${title}" (${parseFloat(price).toLocaleString()} FCFA)`,
            productId: newProductRef.id,
            productTitle: title,
            productImage: images[0] || "",
            sellerId: auth.currentUser.uid,
            sellerName: userData.name || "",
            createdAt: new Date().toISOString(),
            readBy: [auth.currentUser.uid]
          });

          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Nouveau produit sur Jund ak Jaay !", {
              body: `${userData.name || 'Un vendeur'} a publié "${title}"`,
              icon: images[0] || "/app_icon.jpg"
            });
          }
        } catch (notifErr) {
          console.error("Error creating notification document:", notifErr);
        }
      }

      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200/80">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">{id ? "Modifier le produit" : t('postProduct')}</h1>
      
      {error && <div className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold border border-rose-100">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Photos du produit <span className="text-rose-500 font-extrabold">*</span>
            </label>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              images.length >= 3 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {images.length < 3 ? `Minimum 3 photos requises (${images.length}/3)` : `${images.length} photos ajoutées`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Ajoutez au moins 3 photos claires sous différents angles pour rassurer vos acheteurs (Max 8 photos).
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {images.map((img, index) => (
              <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-50">
                <img src={img} alt={`Aperçu ${index + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                  #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1.5 right-1.5 bg-rose-600 text-white rounded-full p-1 transition-opacity hover:bg-rose-700 shadow-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {images.length < 8 && (
              <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-emerald-600 hover:bg-emerald-50/50 transition-all bg-slate-50 p-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700 mt-1.5 text-center">Ajouter photo</span>
                <span className="text-[10px] text-slate-400 font-medium text-center">(Max 8)</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Vidéo du produit (Optionnel)</label>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Min. 3 secondes
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Ajoutez une vidéo de présentation du produit (minimum 3 secondes, tous les poids MB sont acceptés).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {video ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 group bg-black shadow-xs">
                <video src={video} className="w-full h-full object-cover" controls />
                {videoDuration && (
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm z-10">
                    ⏱️ {videoDuration}s
                  </span>
                )}
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-1.5 hover:bg-rose-700 z-10 shadow-xs"
                  title="Supprimer la vidéo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-emerald-600 hover:bg-emerald-50/50 transition-all bg-slate-50 p-4">
                <Video className="w-6 h-6 text-emerald-600 mb-1" />
                <span className="text-xs font-bold text-slate-700">Ajouter une vidéo</span>
                <span className="text-[11px] text-slate-400 mt-0.5">3 secondes minimum</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
              </label>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('productTitle')}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none text-sm font-medium transition-all"
              placeholder="Ex: iPhone 13 Pro Max"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Numéro de téléphone</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none text-sm font-medium transition-all"
              placeholder="Ex: +221 77 000 00 00"
            />
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Obligatoire pour que les acheteurs puissent vous contacter.</p>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('price')} (FCFA)</label>
            <input
              type="number"
              required
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none text-sm font-medium transition-all"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('color')}</label>
            <input
              type="text"
              required
              list="color-list"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none text-sm font-medium transition-all"
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Genre / Catégorie</label>
            <input
              type="text"
              required
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none text-sm font-medium transition-all"
              placeholder="Ex: Électronique, Vêtements..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Problèmes ou défauts</label>
            <input
              type="text"
              value={problems}
              onChange={(e) => setProblems(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none text-sm font-medium transition-all"
              placeholder="Ex: Aucun, Rayure sur l'écran..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Adresse / Lieu du produit</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none text-sm font-medium transition-all"
              placeholder="Ex: Dakar, Point E"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('warranty')}</label>
            <input
              type="text"
              required
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none text-sm font-medium transition-all"
              placeholder="Ex: 6 mois"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('refund')}</label>
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

        <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <input
            type="checkbox"
            id="isPromotion"
            checked={isPromotion}
            onChange={(e) => setIsPromotion(e.target.checked)}
            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
          />
          <label htmlFor="isPromotion" className="text-xs font-bold text-slate-800 cursor-pointer">
            Mettre ce produit en promotion (Badge Promo visible)
          </label>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (id ? "Mettre à jour" : t('publishProduct'))}
          </button>
        </div>
      </form>
    </div>
  );
}
