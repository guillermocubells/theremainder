import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TreePalm, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';

const Auth = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  
  const emailSchema = z.string().email(t('common.form.invalidEmail'));
  const passwordSchema = z.string().min(6, t('auth.errors.passwordLength'));
  
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot' | 'reset'>(
    mode === 'reset' ? 'reset' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signIn, signUp, resetPassword, updatePassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/account';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const validateForm = () => {
    setError(null);
    
    try {
      emailSchema.parse(email);
    } catch {
      setError(t('common.form.invalidEmail'));
      return false;
    }

    if (activeTab === 'login' || activeTab === 'register' || activeTab === 'reset') {
      try {
        passwordSchema.parse(password);
      } catch {
        setError(t('auth.errors.passwordLength'));
        return false;
      }
    }

    if (activeTab === 'register' && password !== confirmPassword) {
      setError(t('auth.errors.passwordMismatch'));
      return false;
    }

    if (activeTab === 'reset' && password !== confirmPassword) {
      setError(t('auth.errors.passwordMismatch'));
      return false;
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError(t('auth.errors.invalidCredentials'));
      } else if (error.message.includes('Email not confirmed')) {
        setError(t('auth.errors.emailNotConfirmed'));
      } else {
        setError(error.message);
      }
    }
    
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      if (error.message.includes('User already registered')) {
        setError(t('auth.errors.userExists'));
      } else {
        setError(error.message);
      }
    } else {
      setSuccess(t('auth.success.emailSent'));
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      emailSchema.parse(email);
    } catch {
      setError(t('common.form.invalidEmail'));
      return;
    }

    setLoading(true);

    const { error } = await resetPassword(email);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess(t('auth.success.passwordResetSent'));
    }
    
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    const { error } = await updatePassword(password);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess(t('auth.success.passwordUpdated'));
      setTimeout(() => {
        setActiveTab('login');
        setSuccess(null);
      }, 2000);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border p-4">
        <div className="container mx-auto">
          <Link to="/" className="flex items-center gap-2 text-primary hover:text-primary/80 w-fit">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">{t('common.backToStore')}</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary p-3 rounded-full">
                <TreePalm className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl text-foreground">Frondaprima</CardTitle>
            <CardDescription>
              {activeTab === 'login' && t('auth.accessAccount')}
              {activeTab === 'register' && t('auth.createYourAccount')}
              {activeTab === 'forgot' && t('auth.recoverPassword')}
              {activeTab === 'reset' && t('auth.setNewPassword')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-primary/20 bg-secondary">
                <AlertDescription className="text-foreground">{success}</AlertDescription>
              </Alert>
            )}

            {activeTab === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">{t('common.form.email')}</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('common.form.emailPlaceholder')}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.sendInstructions')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setActiveTab('login');
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  {t('auth.backToLogin')}
                </Button>
              </form>
            ) : activeTab === 'reset' ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">{t('auth.confirmNewPassword')}</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.updatePassword')}
                </Button>
              </form>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v as 'login' | 'register');
                setError(null);
                setSuccess(null);
              }}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                  <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">{t('common.form.email')}</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('common.form.emailPlaceholder')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('auth.passwordPlaceholder')}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.login')}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-primary"
                      onClick={() => {
                        setActiveTab('forgot');
                        setError(null);
                        setSuccess(null);
                      }}
                    >
                      {t('auth.forgotPassword')}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">{t('common.form.fullName')}</Label>
                      <Input
                        id="register-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t('common.form.fullNamePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">{t('common.form.email')}</Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('common.form.emailPlaceholder')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('auth.minCharacters')}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">{t('auth.confirmPassword')}</Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('auth.repeatPassword')}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.createAccount')}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
