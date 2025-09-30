import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { NavItem, getBreadcrumbs } from './config';

interface BreadcrumbsProps {
  items: NavItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const location = useLocation();
  const { i18n } = useTranslation();
  const locale = (i18n.language === 'es' ? 'es' : 'en') as 'en' | 'es'; // Fallback to 'en'

  const breadcrumbs = getBreadcrumbs(items, location.pathname);

  if (breadcrumbs.length === 0) return null;

  return (
    <div className="bg-card/50 backdrop-blur-sm border-b px-6 py-3 animate-fade-in">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            
            return (
              <div key={item.id} className="flex items-center">
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="font-medium">{item.label[locale]}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink 
                      href={item.route}
                      className="transition-all duration-200 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
                    >
                      {item.label[locale]}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && (
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </BreadcrumbSeparator>
                )}
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
