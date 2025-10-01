import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Command } from 'cmdk';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Home, Truck, Users, ReceiptText, BarChart3, Settings, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: { en: string; es: string };
  shortcut?: string;
  route: string;
  icon: React.ReactNode;
}

const COMMANDS: CommandItem[] = [
  { 
    id: 'dashboard', 
    label: { en: 'Company Dashboard', es: 'Panel de la Empresa' }, 
    shortcut: 'g d',
    route: '/admin', 
    icon: <Home className="h-4 w-4" /> 
  },
  { 
    id: 'inventory', 
    label: { en: 'Inventory', es: 'Inventario' }, 
    shortcut: 'g i',
    route: '/backoffice/inventory', 
    icon: <Truck className="h-4 w-4" /> 
  },
  { 
    id: 'crm', 
    label: { en: 'CRM', es: 'CRM' }, 
    shortcut: 'g c',
    route: '/backoffice/crm/accounts', 
    icon: <Users className="h-4 w-4" /> 
  },
  { 
    id: 'deals', 
    label: { en: 'Deals', es: 'Ventas' }, 
    shortcut: 'g s',
    route: '/backoffice/deals', 
    icon: <ReceiptText className="h-4 w-4" /> 
  },
  { 
    id: 'finance', 
    label: { en: 'Finance', es: 'Finanzas' }, 
    shortcut: 'g f',
    route: '/backoffice/finance/overview', 
    icon: <BarChart3 className="h-4 w-4" /> 
  },
  { 
    id: 'settings', 
    label: { en: 'Admin Settings', es: 'Ajustes' }, 
    route: '/admin/settings/users', 
    icon: <Settings className="h-4 w-4" /> 
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = (i18n.language === 'es' ? 'es' : 'en') as 'en' | 'es';

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd/Ctrl + K to open command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(true);
      return;
    }

    // g + letter shortcuts (when not in input)
    if (e.key === 'g' && !open) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      const handleSecondKey = (secondE: KeyboardEvent) => {
        const cmd = COMMANDS.find(c => c.shortcut === `g ${secondE.key}`);
        if (cmd) {
          secondE.preventDefault();
          navigate(cmd.route);
        }
        window.removeEventListener('keydown', handleSecondKey);
      };
      
      window.addEventListener('keydown', handleSecondKey);
      setTimeout(() => window.removeEventListener('keydown', handleSecondKey), 1000);
    }
  }, [navigate, open]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-2xl">
        <Command className="rounded-lg border-0 shadow-none">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input 
              placeholder={locale === 'es' ? 'Buscar o saltar a...' : 'Search or jump to...'} 
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {locale === 'es' ? 'No se encontraron resultados.' : 'No results found.'}
            </Command.Empty>
            <Command.Group heading={locale === 'es' ? 'Navegación' : 'Navigation'}>
              {COMMANDS.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  onSelect={() => handleSelect(cmd.route)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md px-2 py-2.5 text-sm",
                    "hover:bg-accent aria-selected:bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {cmd.icon}
                    <span>{cmd.label[locale]}</span>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
