import { useState, useEffect } from 'react';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Mail, Phone, Save } from 'lucide-react';
import { toast } from 'sonner';

const AccountProfile = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      const nameChanged = fullName !== (profile.full_name || '');
      const phoneChanged = phone !== (profile.phone || '');
      setHasChanges(nameChanged || phoneChanged);
    }
  }, [fullName, phone, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateProfile.mutateAsync({
        full_name: fullName,
        phone: phone || null,
      });
      toast.success('Perfil actualizado correctamente');
      setHasChanges(false);
    } catch (error) {
      toast.error('Error al actualizar el perfil');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Datos personales</h1>
        <p className="text-muted-foreground mt-1">Gestiona la información de tu cuenta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Información personal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El email no puede ser modificado desde aquí
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono (opcional)
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
              />
            </div>

            <Button 
              type="submit" 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!hasChanges || updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información de la cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID de usuario</span>
              <span className="font-mono text-xs text-muted-foreground">{user?.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cuenta creada</span>
              <span className="text-foreground">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-ES') : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última actualización</span>
              <span className="text-foreground">
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('es-ES') : '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountProfile;
