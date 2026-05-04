import { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'es' | 'en';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<Lang, Record<string, string>> = {
  es: {
    'nav.marketplace': 'Marketplace',
    'nav.howItWorks': 'Cómo funciona',
    'nav.login': 'Iniciar sesión',
    'nav.register': 'Registrarse',
    'nav.dashboard': 'Mi Panel',
    'nav.profile': 'Mi Perfil',
    'nav.logout': 'Cerrar sesión',
    'nav.becomeASeller': 'Vender',

    'hero.eyebrow': 'Marketplace educativo para docentes',
    'hero.title1': 'Comparte tu conocimiento.',
    'hero.title2': 'Transforma la educación.',
    'hero.subtitle': 'Vende cursos, recursos y materiales educativos. Miles de docentes ya confían en YaProfe para hacer crecer su impacto.',
    'hero.cta.explore': 'Explorar recursos',
    'hero.cta.sell': 'Empieza a vender',
    'hero.stats.sellers': 'Docentes vendedores',
    'hero.stats.resources': 'Recursos disponibles',
    'hero.stats.buyers': 'Educadores activos',

    'features.title': '¿Por qué elegir YaProfe?',
    'features.subtitle': 'La plataforma diseñada por y para educadores',
    'features.portal.title': 'Tu portal personalizado',
    'features.portal.desc': 'Crea tu perfil de vendedor con logo, banner y catálogo propio. Tu marca, tu espacio.',
    'features.pwa.title': 'App móvil instantánea',
    'features.pwa.desc': 'Instala YaProfe como app en cualquier dispositivo. Notificaciones en tiempo real de tus ventas.',
    'features.earnings.title': 'Ganancias transparentes',
    'features.earnings.desc': 'Comisión justa y clara. Recibe tus pagos directamente con reportes detallados.',
    'features.bilingual.title': 'Bilingüe',
    'features.bilingual.desc': 'Toda la plataforma disponible en español e inglés para llegar a más docentes.',
    'features.community.title': 'Comunidad docente',
    'features.community.desc': 'Conecta con otros educadores, comparte experiencias y aprende juntos.',
    'features.secure.title': 'Seguro y confiable',
    'features.secure.desc': 'Tus datos y pagos protegidos. Revisión de contenido para garantizar calidad.',

    'categories.title': 'Explora por materia',
    'categories.subtitle': 'Recursos para cada nivel y asignatura',
    'categories.viewAll': 'Ver todas las categorías',

    'howItWorks.title': '¿Cómo funciona?',
    'howItWorks.subtitle': 'Tres pasos para empezar a vender o aprender',
    'howItWorks.step1.title': 'Crea tu cuenta',
    'howItWorks.step1.desc': 'Regístrate gratis como vendedor o comprador en menos de 2 minutos.',
    'howItWorks.step2.title': 'Publica tus recursos',
    'howItWorks.step2.desc': 'Sube tus cursos, fichas, plantillas o materiales. Nosotros revisamos y publicamos.',
    'howItWorks.step3.title': 'Gana dinero',
    'howItWorks.step3.desc': 'Cada vez que alguien compre tu recurso, recibes tu pago directo a tu cuenta.',

    'cta.seller.title': '¿Listo para vender?',
    'cta.seller.subtitle': 'Únete a cientos de docentes que ya generan ingresos con sus conocimientos',
    'cta.seller.btn': 'Crear mi portal gratis',

    'marketplace.title': 'Marketplace',
    'marketplace.search': 'Buscar recursos, cursos...',
    'marketplace.filter.all': 'Todos',
    'marketplace.filter.course': 'Cursos',
    'marketplace.filter.resource': 'Recursos',
    'marketplace.filter.template': 'Plantillas',
    'marketplace.filter.ebook': 'Libros',
    'marketplace.sort.newest': 'Más recientes',
    'marketplace.sort.popular': 'Más populares',
    'marketplace.sort.price_asc': 'Precio: menor a mayor',
    'marketplace.sort.price_desc': 'Precio: mayor a menor',
    'marketplace.empty': 'No se encontraron recursos',
    'marketplace.free': 'Gratis',

    'product.addToCart': 'Comprar ahora',
    'product.preview': 'Vista previa',
    'product.by': 'por',
    'product.reviews': 'reseñas',
    'product.downloads': 'descargas',

    'seller.products': 'Recursos',
    'seller.sales': 'Ventas',
    'seller.followers': 'Seguidores',
    'seller.since': 'Miembro desde',
    'seller.verified': 'Verificado',

    'dashboard.title': 'Mi Panel',
    'dashboard.overview': 'Resumen',
    'dashboard.products': 'Mis Recursos',
    'dashboard.orders': 'Ventas',
    'dashboard.earnings': 'Ganancias',
    'dashboard.newProduct': 'Nuevo recurso',
    'dashboard.totalEarnings': 'Ganancias totales',
    'dashboard.totalSales': 'Ventas totales',
    'dashboard.pendingReview': 'En revisión',
    'dashboard.published': 'Publicados',

    'auth.login.title': 'Bienvenido de vuelta',
    'auth.login.subtitle': 'Inicia sesión en tu cuenta',
    'auth.login.email': 'Correo electrónico',
    'auth.login.password': 'Contraseña',
    'auth.login.btn': 'Iniciar sesión',
    'auth.login.noAccount': '¿No tienes cuenta?',
    'auth.login.register': 'Regístrate gratis',
    'auth.login.forgot': 'Olvidé mi contraseña',
    'auth.forgotModal.title': 'Recuperar contraseña',
    'auth.forgotModal.hint': 'Indica el correo de tu cuenta. Si está registrado, recibirás un enlace para crear una nueva contraseña (revisa spam).',
    'auth.forgotModal.emailLabel': 'Correo electrónico',
    'auth.forgotModal.send': 'Enviar enlace',
    'auth.forgotModal.sent':
      'Si ese correo está registrado, te hemos enviado un enlace. Caduca en 1 hora.',
    'auth.forgotModal.close': 'Cerrar',
    'auth.forgotModal.smtpWarning':
      'El servidor de correo no está configurado: contacta al administrador (SMTP en el servidor).',

    'auth.reset.title': 'Nueva contraseña',
    'auth.reset.subtitle': 'Elige una contraseña segura para tu cuenta.',
    'auth.reset.password': 'Nueva contraseña',
    'auth.reset.password2': 'Confirmar contraseña',
    'auth.reset.submit': 'Guardar contraseña',
    'auth.reset.success': 'Contraseña actualizada. Ya puedes iniciar sesión.',
    'auth.reset.mismatch': 'Las contraseñas no coinciden',
    'auth.reset.invalid': 'Enlace inválido o caducado. Solicita uno nuevo desde iniciar sesión.',

    'auth.register.title': 'Crea tu cuenta',
    'auth.register.subtitle': 'Únete a la comunidad de docentes',
    'auth.register.name': 'Nombre completo',
    'auth.register.email': 'Correo electrónico',
    'auth.register.password': 'Contraseña',
    'auth.register.role': 'Quiero...',
    'auth.register.role.buyer': 'Comprar recursos',
    'auth.register.role.seller': 'Vender mis recursos',
    'auth.register.btn': 'Crear cuenta',
    'auth.register.hasAccount': '¿Ya tienes cuenta?',
    'auth.register.login': 'Iniciar sesión',

    'footer.tagline': 'El marketplace educativo para docentes.',
    'footer.links': 'Enlaces',
    'footer.support': 'Soporte',
    'footer.legal': 'Legal',
    'footer.rights': 'Todos los derechos reservados.',
  },
  en: {
    'nav.marketplace': 'Marketplace',
    'nav.howItWorks': 'How it works',
    'nav.login': 'Log in',
    'nav.register': 'Sign up',
    'nav.dashboard': 'Dashboard',
    'nav.profile': 'My Profile',
    'nav.logout': 'Log out',
    'nav.becomeASeller': 'Sell',

    'hero.eyebrow': 'Educational marketplace for teachers',
    'hero.title1': 'Share your knowledge.',
    'hero.title2': 'Transform education.',
    'hero.subtitle': 'Sell courses, resources and educational materials. Thousands of teachers already trust YaProfe to grow their impact.',
    'hero.cta.explore': 'Explore resources',
    'hero.cta.sell': 'Start selling',
    'hero.stats.sellers': 'Selling teachers',
    'hero.stats.resources': 'Resources available',
    'hero.stats.buyers': 'Active educators',

    'features.title': 'Why choose YaProfe?',
    'features.subtitle': 'The platform designed by and for educators',
    'features.portal.title': 'Your custom portal',
    'features.portal.desc': 'Create your seller profile with logo, banner and personal catalog. Your brand, your space.',
    'features.pwa.title': 'Instant mobile app',
    'features.pwa.desc': 'Install YaProfe as an app on any device. Real-time notifications for your sales.',
    'features.earnings.title': 'Transparent earnings',
    'features.earnings.desc': 'Fair and clear commission. Receive your payments directly with detailed reports.',
    'features.bilingual.title': 'Bilingual',
    'features.bilingual.desc': 'The entire platform available in Spanish and English to reach more teachers.',
    'features.community.title': 'Teacher community',
    'features.community.desc': 'Connect with other educators, share experiences and learn together.',
    'features.secure.title': 'Safe and reliable',
    'features.secure.desc': 'Your data and payments protected. Content review to ensure quality.',

    'categories.title': 'Browse by subject',
    'categories.subtitle': 'Resources for every level and subject',
    'categories.viewAll': 'View all categories',

    'howItWorks.title': 'How does it work?',
    'howItWorks.subtitle': 'Three steps to start selling or learning',
    'howItWorks.step1.title': 'Create your account',
    'howItWorks.step1.desc': 'Sign up for free as a seller or buyer in less than 2 minutes.',
    'howItWorks.step2.title': 'Publish your resources',
    'howItWorks.step2.desc': 'Upload your courses, worksheets, templates or materials. We review and publish them.',
    'howItWorks.step3.title': 'Earn money',
    'howItWorks.step3.desc': 'Every time someone buys your resource, you receive your payment directly.',

    'cta.seller.title': 'Ready to sell?',
    'cta.seller.subtitle': 'Join hundreds of teachers already generating income with their knowledge',
    'cta.seller.btn': 'Create my free portal',

    'marketplace.title': 'Marketplace',
    'marketplace.search': 'Search resources, courses...',
    'marketplace.filter.all': 'All',
    'marketplace.filter.course': 'Courses',
    'marketplace.filter.resource': 'Resources',
    'marketplace.filter.template': 'Templates',
    'marketplace.filter.ebook': 'Books',
    'marketplace.sort.newest': 'Newest',
    'marketplace.sort.popular': 'Most popular',
    'marketplace.sort.price_asc': 'Price: low to high',
    'marketplace.sort.price_desc': 'Price: high to low',
    'marketplace.empty': 'No resources found',
    'marketplace.free': 'Free',

    'product.addToCart': 'Buy now',
    'product.preview': 'Preview',
    'product.by': 'by',
    'product.reviews': 'reviews',
    'product.downloads': 'downloads',

    'seller.products': 'Resources',
    'seller.sales': 'Sales',
    'seller.followers': 'Followers',
    'seller.since': 'Member since',
    'seller.verified': 'Verified',

    'dashboard.title': 'Dashboard',
    'dashboard.overview': 'Overview',
    'dashboard.products': 'My Resources',
    'dashboard.orders': 'Sales',
    'dashboard.earnings': 'Earnings',
    'dashboard.newProduct': 'New resource',
    'dashboard.totalEarnings': 'Total earnings',
    'dashboard.totalSales': 'Total sales',
    'dashboard.pendingReview': 'Under review',
    'dashboard.published': 'Published',

    'auth.login.title': 'Welcome back',
    'auth.login.subtitle': 'Sign in to your account',
    'auth.login.email': 'Email address',
    'auth.login.password': 'Password',
    'auth.login.btn': 'Sign in',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.register': 'Sign up for free',
    'auth.login.forgot': 'Forgot my password',
    'auth.forgotModal.title': 'Reset password',
    'auth.forgotModal.hint':
      'Enter your account email. If it is registered, you will receive a link to set a new password (check spam).',
    'auth.forgotModal.emailLabel': 'Email address',
    'auth.forgotModal.send': 'Send link',
    'auth.forgotModal.sent':
      'If that email is registered, we have sent you a link. It expires in 1 hour.',
    'auth.forgotModal.close': 'Close',
    'auth.forgotModal.smtpWarning': 'Mail is not configured on the server. Please contact support.',

    'auth.reset.title': 'New password',
    'auth.reset.subtitle': 'Choose a strong password for your account.',
    'auth.reset.password': 'New password',
    'auth.reset.password2': 'Confirm password',
    'auth.reset.submit': 'Save password',
    'auth.reset.success': 'Password updated. You can sign in now.',
    'auth.reset.mismatch': 'Passwords do not match',
    'auth.reset.invalid': 'Invalid or expired link. Request a new one from the login page.',

    'auth.register.title': 'Create your account',
    'auth.register.subtitle': 'Join the teacher community',
    'auth.register.name': 'Full name',
    'auth.register.email': 'Email address',
    'auth.register.password': 'Password',
    'auth.register.role': 'I want to...',
    'auth.register.role.buyer': 'Buy resources',
    'auth.register.role.seller': 'Sell my resources',
    'auth.register.btn': 'Create account',
    'auth.register.hasAccount': 'Already have an account?',
    'auth.register.login': 'Sign in',

    'footer.tagline': 'The educational marketplace for teachers.',
    'footer.links': 'Links',
    'footer.support': 'Support',
    'footer.legal': 'Legal',
    'footer.rights': 'All rights reserved.',
  }
};

const LangContext = createContext<LangContextValue>({
  lang: 'es',
  setLang: () => {},
  t: (key) => key,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('yp-lang') as Lang | null;
    return saved || 'es';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('yp-lang', l);
  };

  const t = (key: string): string => {
    return translations[lang][key] || key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
