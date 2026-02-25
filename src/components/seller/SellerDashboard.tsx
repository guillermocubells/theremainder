import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSellerProfile } from '@/hooks/useSellerProfile';
import SellerOnboardingForm from './SellerOnboardingForm';
import LotSubmissionForm from './LotSubmissionForm';
import { Shield, Gavel } from 'lucide-react';

const SellerDashboard = () => {
  const { profile } = useSellerProfile();
  const isVerified = profile?.verification_status === 'verified';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Panel de vendedor</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona tu perfil de vendedor y crea lotes para subastar.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            Verificación
          </TabsTrigger>
          <TabsTrigger value="new-lot" className="flex items-center gap-1.5" disabled={!isVerified}>
            <Gavel className="h-4 w-4" />
            Nuevo lote
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <SellerOnboardingForm />
        </TabsContent>

        <TabsContent value="new-lot">
          <LotSubmissionForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SellerDashboard;
