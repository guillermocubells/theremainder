
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PlantsGrid from "@/components/PlantsGrid";
import Footer from "@/components/Footer";

const Index = () => {
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
