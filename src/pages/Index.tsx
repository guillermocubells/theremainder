import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PlantsGrid from "@/components/PlantsGrid";
import Footer from "@/components/Footer";
import { useReferralTracking, cleanExpiredReferral } from "@/hooks/useReferralTracking";
import { useEffect } from "react";

const Index = () => {
  useReferralTracking();
  
  useEffect(() => {
    cleanExpiredReferral();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <PlantsGrid />
      <Footer />
    </div>
  );
};
export default Index;
