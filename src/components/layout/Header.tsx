import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Phone, Menu, X, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

export function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/inventory', label: t('nav.inventory') },
    { href: '/sell-trade', label: t('nav.sellTrade') },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img src={logo} alt="Guardian Marine" className="h-12 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2">
          {/* Phone */}
          <a
            href={`tel:${t('common.phone')}`}
            className="hidden lg:flex items-center space-x-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>{t('common.phone')}</span>
          </a>

          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="text-foreground/80 hover:text-primary"
            aria-label="Toggle language"
          >
            <Languages className="h-5 w-5" />
          </Button>

          {/* Backoffice Link */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/backoffice')}
            className="hidden md:inline-flex"
          >
            {t('nav.backoffice')}
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <a
              href={`tel:${t('common.phone')}`}
              className="flex items-center space-x-2 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>{t('common.phone')}</span>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate('/backoffice');
                setMobileMenuOpen(false);
              }}
              className="w-full"
            >
              {t('nav.backoffice')}
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
