import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSellerProfile } from '@/hooks/useSellerProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, ExternalLink, Loader2, Shield } from 'lucide-react';

const sellerSchema = z.object({
  legal_name: z.string().min(2, 'Nombre obligatorio').max(200),
  document_type: z.enum(['nif', 'dni', 'nie', 'cif']),
  document_number: z.string().min(5, 'Documento obligatorio').max(20),
  tax_id: z.string().max(20).optional(),
  tax_address_street: z.string().max(200).optional(),
  tax_address_city: z.string().max(100).optional(),
  tax_address_postal_code: z.string().max(10).optional(),
  tax_address_province: z.string().max(100).optional(),
});

type SellerFormData = z.infer<typeof sellerSchema>;

const SellerOnboardingForm = () => {
  const { profile, isLoading, createProfile, startOnboarding, checkStatus } = useSellerProfile();
  const [step, setStep] = useState<'form' | 'stripe'>('form');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      document_type: 'nif',
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Already has profile — show status
  if (profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estado de verificación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Nombre legal</span>
            <span className="font-medium">{profile.legal_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Documento</span>
            <span className="font-medium">{profile.document_type.toUpperCase()} {profile.document_number}</span>
          </div>
          {profile.tax_id && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">NIF/CIF fiscal</span>
              <span className="font-medium">{profile.tax_id}</span>
            </div>
          )}

          <hr className="border-border" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Verificación KYC</span>
            <VerificationBadge status={profile.verification_status} />
          </div>

          {profile.verification_status === 'not_started' && (
            <Button
              onClick={() => startOnboarding.mutate()}
              disabled={startOnboarding.isPending}
              className="w-full"
            >
              {startOnboarding.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Iniciar verificación con Stripe
            </Button>
          )}

          {profile.verification_status === 'pending' && (
            <div className="space-y-2">
              <Button
                onClick={() => startOnboarding.mutate()}
                disabled={startOnboarding.isPending}
                className="w-full"
              >
                {startOnboarding.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Continuar verificación
              </Button>
              <Button
                variant="outline"
                onClick={() => checkStatus.mutate()}
                disabled={checkStatus.isPending}
                className="w-full"
              >
                {checkStatus.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Comprobar estado
              </Button>
            </div>
          )}

          {profile.verification_status === 'verified' && (
            <p className="text-sm text-muted-foreground">
              Tu cuenta está verificada. Ya puedes crear subastas.
            </p>
          )}

          {profile.verification_status === 'rejected' && profile.rejection_reason && (
            <p className="text-sm text-destructive">{profile.rejection_reason}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // No profile — show form
  const onSubmit = async (data: SellerFormData) => {
    await createProfile.mutateAsync({
      legal_name: data.legal_name,
      document_type: data.document_type,
      document_number: data.document_number,
      tax_id: data.tax_id,
      tax_address_street: data.tax_address_street,
      tax_address_city: data.tax_address_city,
      tax_address_postal_code: data.tax_address_postal_code,
      tax_address_province: data.tax_address_province,
      tax_address_country: 'ES',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro como vendedor</CardTitle>
        <CardDescription>
          Completa tus datos de identidad y fiscales para poder crear subastas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legal_name">Nombre legal completo *</Label>
            <Input id="legal_name" {...register('legal_name')} placeholder="Juan García López" />
            {errors.legal_name && <p className="text-sm text-destructive">{errors.legal_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de documento *</Label>
              <Select defaultValue="nif" onValueChange={(v) => setValue('document_type', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nif">NIF</SelectItem>
                  <SelectItem value="dni">DNI</SelectItem>
                  <SelectItem value="nie">NIE</SelectItem>
                  <SelectItem value="cif">CIF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_number">Número *</Label>
              <Input id="document_number" {...register('document_number')} placeholder="12345678A" />
              {errors.document_number && <p className="text-sm text-destructive">{errors.document_number.message}</p>}
            </div>
          </div>

          <hr className="border-border" />
          <p className="text-sm font-medium text-foreground">Datos fiscales</p>

          <div className="space-y-2">
            <Label htmlFor="tax_id">NIF/CIF fiscal</Label>
            <Input id="tax_id" {...register('tax_id')} placeholder="B12345678" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_address_street">Dirección fiscal</Label>
            <Input id="tax_address_street" {...register('tax_address_street')} placeholder="Calle Mayor 1" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax_address_city">Ciudad</Label>
              <Input id="tax_address_city" {...register('tax_address_city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_address_postal_code">C.P.</Label>
              <Input id="tax_address_postal_code" {...register('tax_address_postal_code')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_address_province">Provincia</Label>
              <Input id="tax_address_province" {...register('tax_address_province')} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createProfile.isPending}>
            {createProfile.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Crear perfil de vendedor
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

function VerificationBadge({ status }: { status: string }) {
  switch (status) {
    case 'verified':
      return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Verificado</Badge>;
    case 'pending':
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
    case 'rejected':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>;
    default:
      return <Badge variant="outline">Sin iniciar</Badge>;
  }
}

export default SellerOnboardingForm;
