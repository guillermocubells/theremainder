import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PlantsGrid from "@/components/PlantsGrid";
import Footer from "@/components/Footer";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import { useReferralTracking, cleanExpiredReferral } from "@/hooks/useReferralTracking";
import { useEffect } from "react";

const Index = () => {
  useReferralTracking();
  
  useEffect(() => {
    cleanExpiredReferral();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SectionErrorBoundary fallbackTitle="Error en la cabecera" minimal>
        <Header />
      </SectionErrorBoundary>
      <SectionErrorBoundary fallbackTitle="Error en el hero">
        <HeroSection />
      </SectionErrorBoundary>
      <SectionErrorBoundary fallbackTitle="Error en el catálogo">
        <PlantsGrid />
      </SectionErrorBoundary>
      <SectionErrorBoundary fallbackTitle="Error en el pie de página" minimal>
        <Footer />
      </SectionErrorBoundary>
    </div>
  );
};
export default Index;
