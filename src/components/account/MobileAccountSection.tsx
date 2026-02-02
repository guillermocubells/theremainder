import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface MobileAccountSectionProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
}

const MobileAccountSection = ({ title, onBack, children }: MobileAccountSectionProps) => {
  return (
    <div className="animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sticky top-0 bg-background/95 backdrop-blur-sm py-2 -mx-2 px-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>

      {/* Content */}
      <div className="pb-6">
        {children}
      </div>
    </div>
  );
};

export default MobileAccountSection;
