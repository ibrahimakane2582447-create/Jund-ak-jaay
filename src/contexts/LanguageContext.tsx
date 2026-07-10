import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'en' | 'es' | 'ar' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  marketplace: { fr: 'Dieundakdiaye', en: 'Dieundakdiaye', es: 'Dieundakdiaye', ar: 'Dieundakdiaye', pt: 'Dieundakdiaye' },
  postProduct: { fr: 'Poster un produit', en: 'Post Product', es: 'Publicar producto', ar: 'نشر منتج', pt: 'Publicar Produto' },
  login: { fr: 'Connexion', en: 'Login', es: 'Iniciar sesión', ar: 'تسجيل الدخول', pt: 'Entrar' },
  logout: { fr: 'Déconnexion', en: 'Logout', es: 'Cerrar sesión', ar: 'تسجيل خروج', pt: 'Sair' },
  welcomeBack: { fr: 'Bon retour', en: 'Welcome back', es: 'Bienvenido de nuevo', ar: 'مرحباً بعودتك', pt: 'Bem-vindo de volta' },
  createAccount: { fr: 'Créer un compte', en: 'Create an account', es: 'Crear una cuenta', ar: 'إنشاء حساب', pt: 'Criar uma conta' },
  homeTitle: { fr: 'Produits en vedette', en: 'Featured Products', es: 'Productos destacados', ar: 'منتجات مميزة', pt: 'Produtos em Destaque' },
  homeSubtitle: { fr: 'Découvrez les dernières annonces.', en: 'Discover the latest listings.', es: 'Descubre los últimos anuncios.', ar: 'اكتشف أحدث القوائم.', pt: 'Descubra os anúncios mais recentes.' },
  noProducts: { fr: 'Aucun produit disponible pour le moment.', en: 'No products available yet.', es: 'No hay productos disponibles aún.', ar: 'لا توجد منتجات متاحة بعد.', pt: 'Nenhum produto disponível ainda.' },
  by: { fr: 'Par', en: 'By', es: 'Por', ar: 'بواسطة', pt: 'Por' },
  back: { fr: 'Retour', en: 'Back', es: 'Volver', ar: 'رجوع', pt: 'Voltar' },
  color: { fr: 'Couleur', en: 'Color', es: 'Color', ar: 'اللون', pt: 'Cor' },
  warranty: { fr: 'Garantie', en: 'Warranty', es: 'Garantía', ar: 'ضمان', pt: 'Garantia' },
  refund: { fr: 'Remboursement', en: 'Refund', es: 'Reembolso', ar: 'استرداد', pt: 'Reembolso' },
  seller: { fr: 'Vendeur', en: 'Seller', es: 'Vendedor', ar: 'البائع', pt: 'Vendedor' },
  contactWhatsApp: { fr: 'Contacter sur WhatsApp', en: 'Contact on WhatsApp', es: 'Contactar en WhatsApp', ar: 'تواصل عبر واتساب', pt: 'Contato no WhatsApp' },
  joined: { fr: 'A rejoint', en: 'Joined', es: 'Se unió', ar: 'انضم', pt: 'Entrou' },
  listingsBy: { fr: 'Annonces de', en: 'Listings by', es: 'Anuncios de', ar: 'قوائم بواسطة', pt: 'Anúncios de' },
  noActiveListings: { fr: 'Ce vendeur n\'a aucune annonce.', en: 'This seller has no active listings.', es: 'Este vendedor no tiene anuncios.', ar: 'هذا البائع ليس لديه إعلانات.', pt: 'Este vendedor não tem anúncios.' },
  publishProduct: { fr: 'Publier le produit', en: 'Publish Product', es: 'Publicar producto', ar: 'نشر المنتج', pt: 'Publicar Produto' },
  productTitle: { fr: 'Titre du produit', en: 'Product Title', es: 'Título del producto', ar: 'عنوان المنتج', pt: 'Título do Produto' },
  price: { fr: 'Prix', en: 'Price', es: 'Precio', ar: 'السعر', pt: 'Preço' },
  imagesReq: { fr: 'Images (2-3 requises)', en: 'Images (2-3 required)', es: 'Imágenes (2-3 requeridas)', ar: 'الصور (2-3 مطلوبة)', pt: 'Imagens (2-3 necessárias)' },
  uploadPhoto: { fr: 'Ajouter une photo', en: 'Upload Photo', es: 'Subir foto', ar: 'رفع صورة', pt: 'Carregar foto' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
