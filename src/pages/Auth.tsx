import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scissors, User, Mail, Lock, ArrowRight, Phone, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const EMAIL_DOMAINS = ['@gmail.com', '@hotmail.com', '@outlook.com', '@yahoo.com', '@icloud.com'];

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<'barber' | 'client'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const emailPrefix = email.split('@')[0];
  const emailSuggestions = emailPrefix && !email.includes('@')
    ? EMAIL_DOMAINS.map(d => emailPrefix + d)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success('Login realizado com sucesso!');
        navigate('/');
      } else {
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
          toast.error('Informe um telefone válido');
          setIsLoading(false);
          return;
        }
        await signUp(email, password, fullName, selectedRole, phone);
        setShowEmailConfirmation(true);
      }
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        toast.error('Limite de envio de emails atingido. Aguarde alguns minutos e tente novamente.');
      } else {
        toast.error(msg || 'Erro ao autenticar');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-display mb-3">Verifique seu email</h2>
          <p className="text-muted-foreground mb-2">
            Enviamos um email de confirmação para:
          </p>
          <p className="text-foreground font-semibold text-lg mb-6">{email}</p>
          <div className="bg-card border border-border rounded-2xl p-5 mb-6 text-left">
            <p className="text-sm text-muted-foreground leading-relaxed">
              📩 Abra seu email e clique no link de confirmação. Depois volte aqui e faça login na sua conta.
            </p>
          </div>
          <Button
            onClick={() => {
              setShowEmailConfirmation(false);
              setIsLogin(true);
              setPassword('');
            }}
            className="w-full h-12 rounded-xl text-base font-semibold animate-press"
          >
            Já verifiquei, ir para login
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Não recebeu? Verifique sua caixa de spam.
          </p>
        </div>
      </div>
    );
  }

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
          {!isLogin && (
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className="pl-10 h-12 bg-card border-border rounded-xl"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={emailRef}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setShowEmailSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 150)}
              onFocus={() => setShowEmailSuggestions(true)}
              className="pl-10 h-12 bg-card border-border rounded-xl"
              required
            />
            {showEmailSuggestions && emailSuggestions.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-xl overflow-hidden shadow-lg">
                {emailSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-foreground"
                    onMouseDown={() => { setEmail(suggestion); setShowEmailSuggestions(false); }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
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
