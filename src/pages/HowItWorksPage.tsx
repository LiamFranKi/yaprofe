import { ArrowRight, UserPlus, Upload, ShoppingCart, DollarSign, Star, Shield, Bell, Globe, BookOpen, Users, CheckCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useLang } from '../context/LangContext';

interface HowItWorksPageProps {
  onNavigate: (page: string) => void;
}

const faqs = [
  {
    q_es: '¿Es gratis crear una cuenta?',
    q_en: 'Is it free to create an account?',
    a_es: 'Sí, crear una cuenta como comprador o vendedor es completamente gratuito. Solo pagamos una comisión sobre las ventas realizadas.',
    a_en: 'Yes, creating a buyer or seller account is completely free. We only charge a commission on completed sales.',
  },
  {
    q_es: '¿Qué tipos de recursos puedo vender?',
    q_en: 'What types of resources can I sell?',
    a_es: 'Puedes vender fichas de trabajo, presentaciones, guías didácticas, planificaciones, plantillas, cursos en video y cualquier recurso educativo digital.',
    a_en: 'You can sell worksheets, presentations, teaching guides, lesson plans, templates, video courses and any digital educational resource.',
  },
  {
    q_es: '¿Cómo recibo mis ganancias?',
    q_en: 'How do I receive my earnings?',
    a_es: 'Las ganancias se acumulan en tu dashboard y puedes solicitarlas mediante transferencia bancaria o PayPal una vez que alcances el monto mínimo de retiro.',
    a_en: 'Earnings accumulate in your dashboard and you can request them via bank transfer or PayPal once you reach the minimum withdrawal amount.',
  },
  {
    q_es: '¿Mis recursos están protegidos contra copia?',
    q_en: 'Are my resources protected against copying?',
    a_es: 'Sí. Todos los archivos se distribuyen con marca de agua digital y nuestro sistema monitorea el uso para proteger tu propiedad intelectual.',
    a_en: 'Yes. All files are distributed with a digital watermark and our system monitors usage to protect your intellectual property.',
  },
  {
    q_es: '¿En qué países está disponible YaProfe?',
    q_en: 'In which countries is YaProfe available?',
    a_es: 'YaProfe está disponible en toda Latinoamérica y España. Puedes comprar y vender desde cualquier país hispanohablante.',
    a_en: 'YaProfe is available throughout Latin America and Spain. You can buy and sell from any Spanish-speaking country.',
  },
];

export default function HowItWorksPage({ onNavigate }: HowItWorksPageProps) {
  const { lang } = useLang();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const buyerSteps = [
    {
      icon: <UserPlus className="w-7 h-7" />,
      title_es: 'Crea tu cuenta',
      title_en: 'Create your account',
      desc_es: 'Regístrate gratis en segundos. Solo necesitas tu correo y una contraseña.',
      desc_en: 'Sign up for free in seconds. You only need your email and a password.',
    },
    {
      icon: <ShoppingCart className="w-7 h-7" />,
      title_es: 'Encuentra recursos',
      title_en: 'Find resources',
      desc_es: 'Explora el marketplace, filtra por categoría, nivel o precio y descubre miles de recursos.',
      desc_en: 'Explore the marketplace, filter by category, level or price and discover thousands of resources.',
    },
    {
      icon: <BookOpen className="w-7 h-7" />,
      title_es: 'Descarga y usa',
      title_en: 'Download and use',
      desc_es: 'Paga de forma segura y descarga al instante. El recurso queda guardado en tu biblioteca para siempre.',
      desc_en: 'Pay securely and download instantly. The resource is saved in your library forever.',
    },
  ];

  const sellerSteps = [
    {
      icon: <UserPlus className="w-7 h-7" />,
      title_es: 'Crea tu perfil de vendedor',
      title_en: 'Create your seller profile',
      desc_es: 'Personaliza tu portal con foto, bio y banner. Tu URL única es /profe/tu-nombre.',
      desc_en: 'Customize your portal with photo, bio and banner. Your unique URL is /profe/your-name.',
    },
    {
      icon: <Upload className="w-7 h-7" />,
      title_es: 'Sube tus recursos',
      title_en: 'Upload your resources',
      desc_es: 'Carga PDF, PPTX, documentos o videos. Ponles precio, descripción y categoría.',
      desc_en: 'Upload PDFs, PPTX, documents or videos. Set a price, description and category.',
    },
    {
      icon: <DollarSign className="w-7 h-7" />,
      title_es: 'Empieza a ganar',
      title_en: 'Start earning',
      desc_es: 'Recibe pagos automáticos cada vez que un docente compra tu material. Retira tus ganancias cuando quieras.',
      desc_en: 'Receive automatic payments every time a teacher buys your material. Withdraw your earnings whenever you want.',
    },
  ];

  const benefits = [
    { icon: <Globe className="w-5 h-5" />, color: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400', text_es: 'Bilingüe: español e inglés', text_en: 'Bilingual: Spanish and English' },
    { icon: <Bell className="w-5 h-5" />, color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400', text_es: 'Notificaciones push de ventas', text_en: 'Push notifications for sales' },
    { icon: <Shield className="w-5 h-5" />, color: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400', text_es: 'Pagos 100% seguros y protegidos', text_en: '100% secure and protected payments' },
    { icon: <Users className="w-5 h-5" />, color: 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400', text_es: 'Comunidad activa de docentes', text_en: 'Active teacher community' },
    { icon: <Star className="w-5 h-5" />, color: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400', text_es: 'Sistema de reseñas y valoraciones', text_en: 'Reviews and ratings system' },
    { icon: <CheckCircle className="w-5 h-5" />, color: 'bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400', text_es: 'Soporte dedicado para vendedores', text_en: 'Dedicated seller support' },
  ];

  return (
    <div className="overflow-hidden pt-16">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/20">
            <BookOpen className="w-3.5 h-3.5" />
            {lang === 'es' ? 'Guía completa' : 'Complete guide'}
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight">
            {lang === 'es' ? '¿Cómo funciona YaProfe?' : 'How does YaProfe work?'}
          </h1>
          <p className="text-blue-100 text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            {lang === 'es'
              ? 'YaProfe es el marketplace educativo donde los docentes compran y venden recursos digitales de calidad. Simple, seguro y diseñado para la comunidad docente.'
              : 'YaProfe is the educational marketplace where teachers buy and sell quality digital resources. Simple, secure and designed for the teaching community.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('marketplace')}
              className="px-7 py-3.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
            >
              {lang === 'es' ? 'Explorar recursos' : 'Explore resources'}
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              {lang === 'es' ? 'Empezar gratis' : 'Start for free'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Two tracks */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              {lang === 'es' ? 'Elige tu camino' : 'Choose your path'}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {lang === 'es' ? 'YaProfe funciona para compradores y vendedores por igual' : 'YaProfe works for buyers and sellers alike'}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Buyer track */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    {lang === 'es' ? 'Soy comprador' : "I'm a buyer"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {lang === 'es' ? 'Busco recursos para mi clase' : 'Looking for resources for my class'}
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                {buyerSteps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center relative">
                      {step.icon}
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 rounded-full text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                        {lang === 'es' ? step.title_es : step.title_en}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {lang === 'es' ? step.desc_es : step.desc_en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onNavigate('marketplace')}
                className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {lang === 'es' ? 'Ir al marketplace' : 'Go to marketplace'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Seller track */}
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-3xl p-8 border border-amber-100 dark:border-amber-900/40">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    {lang === 'es' ? 'Soy vendedor' : "I'm a seller"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {lang === 'es' ? 'Quiero monetizar mis recursos' : 'I want to monetize my resources'}
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                {sellerSteps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center relative">
                      {step.icon}
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                        {lang === 'es' ? step.title_es : step.title_en}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {lang === 'es' ? step.desc_es : step.desc_en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onNavigate('register')}
                className="mt-8 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {lang === 'es' ? 'Crear mi portal' : 'Create my portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits grid */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              {lang === 'es' ? '¿Por qué elegir YaProfe?' : 'Why choose YaProfe?'}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {lang === 'es' ? 'Una plataforma pensada desde cero para docentes' : 'A platform built from scratch for teachers'}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${b.color}`}>
                  {b.icon}
                </div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                  {lang === 'es' ? b.text_es : b.text_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission info */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              {lang === 'es' ? 'Transparencia total en comisiones' : 'Full transparency on commissions'}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {lang === 'es' ? 'Sin sorpresas, sin letra pequeña' : 'No surprises, no fine print'}
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              { pct: '80%', label_es: 'Para el vendedor', label_en: 'For the seller', color: 'border-blue-600', textColor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950' },
              { pct: '15%', label_es: 'Comisión de plataforma', label_en: 'Platform commission', color: 'border-gray-300 dark:border-gray-700', textColor: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-900' },
              { pct: '5%', label_es: 'Procesamiento de pago', label_en: 'Payment processing', color: 'border-gray-300 dark:border-gray-700', textColor: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-900' },
            ].map((item, i) => (
              <div key={i} className={`${item.bg} rounded-2xl p-7 border-2 ${item.color} text-center`}>
                <p className={`text-5xl font-extrabold ${item.textColor} mb-2`}>{item.pct}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {lang === 'es' ? item.label_es : item.label_en}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-500">
            {lang === 'es'
              ? 'Los porcentajes se calculan sobre el precio de venta final. No hay costos mensuales ni tarifas de publicación.'
              : 'Percentages are calculated on the final sale price. There are no monthly costs or listing fees.'}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              {lang === 'es' ? 'Preguntas frecuentes' : 'Frequently asked questions'}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {lang === 'es' ? 'Todo lo que necesitas saber antes de empezar' : 'Everything you need to know before getting started'}
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-gray-900 dark:text-white text-sm pr-4">
                    {lang === 'es' ? faq.q_es : faq.q_en}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {lang === 'es' ? faq.a_es : faq.a_en}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
            {lang === 'es' ? 'Listo para empezar' : 'Ready to get started'}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
            {lang === 'es'
              ? 'Únete a miles de docentes que ya están comprando y vendiendo en YaProfe'
              : 'Join thousands of teachers who are already buying and selling on YaProfe'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('register')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 flex items-center justify-center gap-2"
            >
              {lang === 'es' ? 'Crear cuenta gratis' : 'Create free account'}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('marketplace')}
              className="px-8 py-4 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              {lang === 'es' ? 'Ver el marketplace' : 'Browse marketplace'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
