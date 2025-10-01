import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, User, Globe, Zap, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [appTheme, setAppTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('gm:appTheme') as any) || 'system';
  });

  const applyAppTheme = (value: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const enableDark = value === 'dark' || (value === 'system' && systemDark);
    root.classList.toggle('dark', enableDark);
  };

  useEffect(() => {
    applyAppTheme(appTheme);
  }, [appTheme]);

  useEffect(() => {
    if (appTheme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyAppTheme('system');
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [appTheme]);

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setAppTheme(value);
    localStorage.setItem('gm:appTheme', value);
  };

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
    setCurrentLang(newLang);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const quickActions = [
    { label: 'New Unit', route: '/backoffice/inventory/new' },
    { label: 'New Lead', route: '/backoffice/crm/leads/new' },
    { label: 'New Deal', route: '/backoffice/deals/new' },
  ];

  return (
    <header className="h-16 bg-card/95 backdrop-blur-sm border-b shadow-sm flex items-center px-6 gap-4 sticky top-0 z-40">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden transition-all duration-200 hover:bg-accent hover:rotate-90 focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {/* Notification Center */}
      <NotificationCenter />

      {/* Global Theme Toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 transition-all duration-200 hover:shadow-md hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {appTheme === 'light' ? (
                    <Sun className="h-4 w-4" />
                  ) : appTheme === 'dark' ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{currentLang === 'es' ? 'Tema' : 'Theme'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 bg-card shadow-lg animate-scale-in">
          <DropdownMenuLabel>{currentLang === 'es' ? 'Tema' : 'Theme'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleThemeChange('light')}
            className="cursor-pointer transition-colors duration-150 focus:bg-accent"
          >
            <Sun className="h-4 w-4 mr-2" />
            {currentLang === 'es' ? 'Claro' : 'Light'}
            {appTheme === 'light' && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleThemeChange('dark')}
            className="cursor-pointer transition-colors duration-150 focus:bg-accent"
          >
            <Moon className="h-4 w-4 mr-2" />
            {currentLang === 'es' ? 'Oscuro' : 'Dark'}
            {appTheme === 'dark' && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleThemeChange('system')}
            className="cursor-pointer transition-colors duration-150 focus:bg-accent"
          >
            <Monitor className="h-4 w-4 mr-2" />
            {currentLang === 'es' ? 'Sistema' : 'System'}
            {appTheme === 'system' && ' ✓'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="transition-all duration-200 hover:shadow-md hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Zap className="h-4 w-4 mr-2" />
            Quick Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card shadow-lg animate-scale-in">
          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {quickActions.map((action) => (
            <DropdownMenuItem
              key={action.route}
              onClick={() => navigate(action.route)}
              className="cursor-pointer transition-colors duration-150 focus:bg-accent"
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Language Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleLanguage}
        className="gap-2 transition-all duration-200 hover:shadow-md hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Globe className="h-4 w-4" />
        {currentLang.toUpperCase()}
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="transition-all duration-200 hover:shadow-md hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <User className="h-4 w-4 mr-2" />
            {user?.name}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-card shadow-lg animate-scale-in">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="cursor-pointer transition-colors duration-150 focus:bg-accent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
