import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// WhatsApp icon SVG
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface WhatsAppButtonProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

const WhatsAppButton = ({ 
  phoneNumber = "34912345678", // Default placeholder - user should change this
  defaultMessage 
}: WhatsAppButtonProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    const text = message.trim() || defaultMessage || t("whatsapp.defaultMessage");
    const encodedMessage = encodeURIComponent(text);
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
    
    window.open(
      `https://wa.me/${cleanNumber}?text=${encodedMessage}`,
      "_blank",
      "noopener,noreferrer"
    );
    
    setMessage("");
    setIsOpen(false);
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-[#075E54] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <WhatsAppIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Frondaprima</h3>
              <p className="text-white/80 text-xs">{t("whatsapp.online")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Chat Body */}
          <div className="p-4 bg-[#ECE5DD] min-h-[120px]">
            {/* Welcome Message Bubble */}
            <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%] relative">
              <p className="text-sm text-foreground">
                {t("whatsapp.greeting")}
              </p>
              <span className="text-[10px] text-muted-foreground mt-1 block text-right">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 bg-[#F0F0F0] border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={t("whatsapp.placeholder")}
                className="flex-1 px-4 py-2 text-sm rounded-full border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"
              />
              <Button
                onClick={handleSendMessage}
                className="rounded-full bg-[#25D366] hover:bg-[#128C7E] h-10 w-10 p-0"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110"
        aria-label="Chat on WhatsApp"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <WhatsAppIcon className="w-7 h-7" />
        )}
        
        {/* Pulse animation */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
        )}
      </button>

      {/* Tooltip on hover (only when closed) */}
      {!isOpen && (
        <div className="fixed bottom-7 right-24 z-50 bg-card border border-border rounded-lg px-3 py-2 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity hidden sm:block">
          <p className="text-sm text-foreground whitespace-nowrap">
            {t("whatsapp.tooltip")}
          </p>
        </div>
      )}
    </>
  );
};

export default WhatsAppButton;
