import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '@/assets/logo.png';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <img src={logo} alt="Guardian Marine" className="h-12 w-auto mb-4" />
            <p className="text-sm text-muted-foreground max-w-md">
              Red Oak, TX
              <br />
              Phone: {t('common.phone')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link
                  to="/inventory"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('nav.inventory')}
                </Link>
              </li>
              <li>
                <Link
                  to="/sell-trade"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('nav.sellTrade')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-4">{t('categories.inStock')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/inventory?category=truck"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('categories.trucks')}
                </Link>
              </li>
              <li>
                <Link
                  to="/inventory?category=trailer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('categories.trailers')}
                </Link>
              </li>
              <li>
                <Link
                  to="/inventory?category=equipment"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('categories.equipment')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          © {currentYear} Guardian Marine. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
