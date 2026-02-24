import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';

const AccountSecurity = () => {
  const { updatePassword, signOut } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-danger';
    if (passwordStrength <= 2) return 'bg-caution';
    if (passwordStrength <= 3) return 'bg-warning';
    return 'bg-success';
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return 'Débil';
    if (passwordStrength <= 2) return 'Regular';
    if (passwordStrength <= 3) return 'Buena';
    return 'Fuerte';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    const { error } = await updatePassword(newPassword);
    
    if (error) {
      setError(error.message);
    } else {
      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    
    setLoading(false);
  };

  const handleLogoutAll = async () => {
    await signOut();
    toast.success('Sesión cerrada en todos los dispositivos');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Seguridad</h1>
        <p className="text-muted-foreground mt-1">Gestiona la seguridad de tu cuenta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${
                          i <= passwordStrength ? getStrengthColor() : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fortaleza: <span className="font-medium">{getStrengthLabel()}</span>
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className={`flex items-center gap-1 ${newPassword.length >= 6 ? 'text-success' : ''}`}>
                      {newPassword.length >= 6 && <Check className="h-3 w-3" />}
                      Al menos 6 caracteres
                    </li>
                    <li className={`flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-success' : ''}`}>
                      {/[A-Z]/.test(newPassword) && <Check className="h-3 w-3" />}
                      Una letra mayúscula
                    </li>
                    <li className={`flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-success' : ''}`}>
                      {/[0-9]/.test(newPassword) && <Check className="h-3 w-3" />}
                      Un número
                    </li>
                    <li className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(newPassword) ? 'text-success' : ''}`}>
                      {/[^A-Za-z0-9]/.test(newPassword) && <Check className="h-3 w-3" />}
                      Un carácter especial
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading || !newPassword || newPassword !== confirmPassword}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Actualizar contraseña
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sesiones activas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Si sospechas que alguien más tiene acceso a tu cuenta, puedes cerrar sesión en todos los dispositivos.
          </p>
          <Button 
            variant="outline" 
            className="text-destructive border-destructive/20 hover:bg-destructive/5"
            onClick={handleLogoutAll}
          >
            Cerrar sesión en todos los dispositivos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSecurity;
