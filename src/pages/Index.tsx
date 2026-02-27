import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PlantsGrid from "@/components/PlantsGrid";
import Footer from "@/components/Footer";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import { useReferralTracking, cleanExpiredReferral } from "@/hooks/useReferralTracking";
import { useEffect } from "react";
import { PageSEO } from "@/components/seo";
import { STORE_BRAND } from "@/config/store";

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: STORE_BRAND.name,
  url: STORE_BRAND.url,
  logo: `${STORE_BRAND.url}/pwa-512x512.png`,
  description: STORE_BRAND.tagline,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["Spanish", "English"],
  },
};

const webSiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: STORE_BRAND.name,
  url: STORE_BRAND.url,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${STORE_BRAND.url}/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const Index = () => {
  useReferralTracking();
  
  useEffect(() => {
    cleanExpiredReferral();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Plantas de altura — Catálogo"
        description="Catálogo de árboles y plantas de alta montaña. Especies raras germinadas y compartidas una vez. Envío a España y Europa."
        path="/"
        jsonLd={[organizationLd, webSiteLd]}
      />
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
      <ScrollToTopButton />
    </div>
  );
};
export default Index;
