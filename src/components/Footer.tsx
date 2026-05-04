import { useState, useEffect } from 'react';
import { Twitter, Instagram, Facebook, Youtube } from 'lucide-react';
import { useLang } from '../context/LangContext';
import YaProFeLogo from './YaProFeLogo';
import { fetchPublicSocialLinks } from '../lib/api';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const { t, lang } = useLang();
  const [social, setSocial] = useState({
    twitter: '',
    instagram: '',
    facebook: '',
    youtube: '',
  });

  useEffect(() => {
    let cancelled = false;
    fetchPublicSocialLinks()
      .then(data => {
        if (cancelled || data == null || typeof data !== 'object') return;
        setSocial({
          twitter: typeof data.twitter === 'string' ? data.twitter : '',
          instagram: typeof data.instagram === 'string' ? data.instagram : '',
          facebook: typeof data.facebook === 'string' ? data.facebook : '',
          youtube: typeof data.youtube === 'string' ? data.youtube : '',
        });
      })
      .catch(() => {
        /* sin API o error de red: enlaces vacíos */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="bg-gray-950 dark:bg-black text-gray-400 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <button onClick={() => onNavigate('home')} className="flex items-center mb-4">
              <YaProFeLogo height={36} variant="white" />
            </button>
            <p className="text-sm leading-relaxed">{t('footer.tagline')}</p>
            <div className="flex items-center gap-3 mt-6 flex-wrap">
              {social.twitter ? (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                  aria-label="X / Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              ) : null}
              {social.instagram ? (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              ) : null}
              {social.facebook ? (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              ) : null}
              {social.youtube ? (
                <a
                  href={social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{t('footer.links')}</h4>
            <ul className="space-y-3 text-sm">
              <li><button onClick={() => onNavigate('marketplace')} className="hover:text-white transition-colors">{t('nav.marketplace')}</button></li>
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-white transition-colors">{t('nav.howItWorks')}</button></li>
              <li><button onClick={() => onNavigate('register')} className="hover:text-white transition-colors">{lang === 'es' ? 'Vende en YaProfe' : 'Sell on YaProfe'}</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{t('footer.support')}</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">{lang === 'es' ? 'Centro de ayuda' : 'Help center'}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{lang === 'es' ? 'Contacto' : 'Contact'}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{lang === 'es' ? 'Comunidad' : 'Community'}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">{lang === 'es' ? 'Términos de uso' : 'Terms of use'}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{lang === 'es' ? 'Privacidad' : 'Privacy'}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{lang === 'es' ? 'Cookies' : 'Cookies'}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} YaProfe.com — {t('footer.rights')}
          </p>
          <p className="text-xs text-gray-600">
            {lang === 'es' ? 'Hecho con amor para docentes' : 'Made with love for teachers'} 🍎
          </p>
        </div>
      </div>
    </footer>
  );
}
