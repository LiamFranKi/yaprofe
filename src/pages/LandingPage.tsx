import { ArrowRight, BookOpen, Award, Globe, Users, Shield, Bell, Calculator, FlaskConical, Palette, Monitor, Star, TrendingUp, Upload, DollarSign, CheckCircle, Play } from 'lucide-react';
import { useLang } from '../context/LangContext';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'matematicas': <Calculator className="w-6 h-6" />,
  'ciencias': <FlaskConical className="w-6 h-6" />,
  'lengua': <BookOpen className="w-6 h-6" />,
  'historia': <Globe className="w-6 h-6" />,
  'arte': <Palette className="w-6 h-6" />,
  'tecnologia': <Monitor className="w-6 h-6" />,
  'idiomas': <Globe className="w-6 h-6" />,
  'educacion-inicial': <Star className="w-6 h-6" />,
};

const categoryColors: Record<string, string> = {
  'matematicas': 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  'ciencias': 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
  'lengua': 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
  'historia': 'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400',
  'arte': 'bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400',
  'tecnologia': 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400',
  'idiomas': 'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400',
  'educacion-inicial': 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400',
};

const staticCategories = [
  { slug: 'matematicas', name_es: 'Matemáticas', name_en: 'Mathematics' },
  { slug: 'ciencias', name_es: 'Ciencias', name_en: 'Science' },
  { slug: 'lengua', name_es: 'Lengua y Literatura', name_en: 'Language Arts' },
  { slug: 'historia', name_es: 'Historia y Geografía', name_en: 'History & Geography' },
  { slug: 'arte', name_es: 'Arte y Música', name_en: 'Art & Music' },
  { slug: 'tecnologia', name_es: 'Tecnología', name_en: 'Technology' },
  { slug: 'idiomas', name_es: 'Idiomas', name_en: 'Languages' },
  { slug: 'educacion-inicial', name_es: 'Educación Inicial', name_en: 'Early Education' },
];

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const { t, lang } = useLang();

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center bg-white dark:bg-gray-950 pt-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 dark:bg-blue-950 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 -left-20 w-80 h-80 bg-sky-100 dark:bg-sky-950 rounded-full blur-3xl opacity-40" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-50 dark:bg-teal-950 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100 dark:border-blue-900">
                <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" />
                {t('hero.eyebrow')}
              </div>

              <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
                <span className="block">{t('hero.title1')}</span>
                <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  {t('hero.title2')}
                </span>
              </h1>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-10 max-w-lg">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-14">
                <button
                  onClick={() => onNavigate('marketplace')}
                  className="flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 active:scale-[0.98]"
                >
                  {t('hero.cta.explore')}
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="flex items-center justify-center gap-2 px-7 py-3.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl transition-all active:scale-[0.98]"
                >
                  {t('hero.cta.sell')}
                </button>
              </div>

              <div className="flex items-center gap-8">
                {[
                  { value: '2.4K+', label: t('hero.stats.sellers') },
                  { value: '18K+', label: t('hero.stats.resources') },
                  { value: '45K+', label: t('hero.stats.buyers') },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{stat.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="/hero-panel.webp"
                  alt={lang === 'es' ? 'Docentes y educación' : 'Teachers and education'}
                  className="w-full h-[520px] object-cover object-center"
                />
              </div>

              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-gray-100 dark:border-gray-800">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Esta semana' : 'This week'}</p>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">+S/ 1,240</p>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[140px]">
                  {lang === 'es' ? '"Excelente recurso para mi clase"' : '"Excellent resource for my class"'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{t('features.title')}</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">{t('features.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: <Users className="w-6 h-6" />, color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900', title: t('features.portal.title'), desc: t('features.portal.desc') },
              { icon: <Bell className="w-6 h-6" />, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900', title: t('features.pwa.title'), desc: t('features.pwa.desc') },
              { icon: <DollarSign className="w-6 h-6" />, color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900', title: t('features.earnings.title'), desc: t('features.earnings.desc') },
              { icon: <Globe className="w-6 h-6" />, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900', title: t('features.bilingual.title'), desc: t('features.bilingual.desc') },
              { icon: <Award className="w-6 h-6" />, color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900', title: t('features.community.title'), desc: t('features.community.desc') },
              { icon: <Shield className="w-6 h-6" />, color: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900', title: t('features.secure.title'), desc: t('features.secure.desc') },
            ].map((f) => (
              <div key={f.title} className="bg-white dark:bg-gray-800 rounded-2xl p-7 border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">{f.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">{t('categories.title')}</h2>
              <p className="text-gray-600 dark:text-gray-400">{t('categories.subtitle')}</p>
            </div>
            <button
              onClick={() => onNavigate('marketplace')}
              className="hidden sm:flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm hover:gap-3 transition-all"
            >
              {t('categories.viewAll')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {staticCategories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => onNavigate('marketplace')}
                className="group flex flex-col items-center gap-3 p-6 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${categoryColors[cat.slug] || 'bg-gray-100 text-gray-600'}`}>
                  {categoryIcons[cat.slug]}
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">
                  {lang === 'es' ? cat.name_es : cat.name_en}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{t('howItWorks.title')}</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">{t('howItWorks.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[33%] right-[33%] h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 dark:from-blue-900 dark:via-blue-600 dark:to-blue-900" />
            {[
              { num: '01', icon: <Users className="w-7 h-7" />, title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.desc') },
              { num: '02', icon: <Upload className="w-7 h-7" />, title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.desc') },
              { num: '03', icon: <DollarSign className="w-7 h-7" />, title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.desc') },
            ].map((step) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900 mb-6 text-white">
                  {step.icon}
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-white dark:bg-gray-900 border-2 border-blue-600 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    {step.num.slice(1)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seller showcase */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-amber-100 dark:border-amber-900">
                <TrendingUp className="w-3.5 h-3.5" />
                {lang === 'es' ? 'Para vendedores' : 'For sellers'}
              </div>
              <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-6">
                {lang === 'es' ? 'Tu portal de ventas, tu marca' : 'Your sales portal, your brand'}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                {lang === 'es'
                  ? 'Cada vendedor obtiene su perfil personalizado con banner, bio y catálogo completo. Comparte tu enlace y construye tu audiencia de docentes.'
                  : 'Every seller gets their own personalized profile with banner, bio and full catalog. Share your link and build your audience of teachers.'}
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  lang === 'es' ? 'Portal con URL personalizada (/profe/tu-nombre)' : 'Portal with custom URL (/profe/your-name)',
                  lang === 'es' ? 'Sube cursos, fichas, plantillas y más' : 'Upload courses, worksheets, templates and more',
                  lang === 'es' ? 'Dashboard con estadísticas y ganancias' : 'Dashboard with stats and earnings',
                  lang === 'es' ? 'Notificaciones push de nuevas ventas' : 'Push notifications for new sales',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onNavigate('register')}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900"
              >
                {t('cta.seller.btn')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl">
                <div className="relative h-40 rounded-2xl overflow-hidden mb-4">
                  <img
                    src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=600"
                    alt="Seller banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="flex items-end gap-4 px-4 mb-4" style={{ marginTop: '-32px' }}>
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-800 border-4 border-white dark:border-gray-900 overflow-hidden shadow-lg flex-shrink-0 relative z-10">
                    <img
                      src="https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=100"
                      alt="Seller avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-white">Prof. Ana García</h4>
                      <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500" />
                    </div>
                    <p className="text-xs text-gray-500">@anaprofe · {lang === 'es' ? 'Matemáticas' : 'Mathematics'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 px-1">
                  {['42', '1.2K', 'S/8.4K'].map((val, i) => (
                    <div key={i} className="text-center py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="font-bold text-gray-900 dark:text-white text-lg">{val}</p>
                      <p className="text-xs text-gray-500">{[t('seller.products'), t('seller.sales'), lang === 'es' ? 'Ganancias' : 'Earnings'][i]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">{t('cta.seller.title')}</h2>
          <p className="text-blue-100 text-lg mb-10">{t('cta.seller.subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('register')}
              className="px-8 py-4 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
            >
              {t('cta.seller.btn')}
            </button>
            <button
              onClick={() => onNavigate('marketplace')}
              className="flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              <Play className="w-5 h-5" />
              {lang === 'es' ? 'Explorar primero' : 'Explore first'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
