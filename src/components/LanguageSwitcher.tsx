import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface LanguageSwitcherProps {
  variant?: 'default' | 'footer';
}

const LanguageSwitcher = ({ variant = 'default' }: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const isFooter = variant === 'footer';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={isFooter 
            ? "hover:bg-primary-foreground/10 text-primary-foreground/60 hover:text-primary-foreground/80 h-8 px-2" 
            : "hover:bg-secondary text-primary"
          }
        >
          <Globe className={isFooter ? "h-4 w-4" : "h-5 w-5"} />
          <span className={`ml-1.5 uppercase text-xs ${isFooter ? "inline" : "hidden sm:inline"}`}>
            {i18n.language.slice(0, 2)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => changeLanguage('es')}
          className={i18n.language === 'es' ? 'bg-secondary' : ''}
        >
          🇪🇸 {t('language.es')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeLanguage('en')}
          className={i18n.language === 'en' ? 'bg-secondary' : ''}
        >
          🇬🇧 {t('language.en')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
