import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scissors, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'barber' | 'client'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success('Login realizado com sucesso!');
      } else {
        await signUp(email, password, fullName, selectedRole);
        toast.success('Conta criada com sucesso!');
      }
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao autenticar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Scissors className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-display">BarberPro</h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? 'Faça login na sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Role Selection (signup only) */}
        {!isLogin && (
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => setSelectedRole('client')}
              className={`flex-1 p-4 rounded-2xl border transition-all animate-press ${
                selectedRole === 'client'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <User className={`w-6 h-6 mx-auto mb-2 ${selectedRole === 'client' ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className={`text-sm font-medium ${selectedRole === 'client' ? 'text-primary' : 'text-muted-foreground'}`}>
                Cliente
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('barber')}
              className={`flex-1 p-4 rounded-2xl border transition-all animate-press ${
                selectedRole === 'barber'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <Scissors className={`w-6 h-6 mx-auto mb-2 ${selectedRole === 'barber' ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className={`text-sm font-medium ${selectedRole === 'barber' ? 'text-primary' : 'text-muted-foreground'}`}>
                Barbeiro
              </p>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 h-12 bg-card border-border rounded-xl"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 bg-card border-border rounded-xl"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 bg-card border-border rounded-xl"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl text-base font-semibold animate-press"
          >
            {isLoading ? 'Carregando...' : isLogin ? 'Entrar' : 'Criar conta'}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? 'Criar conta' : 'Fazer login'}
          </button>
        </p>
      </div>
    </div>
  );
}
