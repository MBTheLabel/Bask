import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Crown } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { Button, Alert } from '../components/ui';
import type { AuthUser } from '../../../shared/types';

// ─── LOGIN ────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      const res = await authApi.login(data.email, data.password);
      const { token, user } = res.data.data;
      setAuth(user as AuthUser, token);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="font-display text-4xl font-bold text-bask-terracotta tracking-widest">BASK</span>
          <h1 className="font-display text-2xl text-bask-dark mt-2 mb-1">Welcome back</h1>
          <p className="font-body text-bask-muted text-sm">Sign in to your BASK account</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-8">
          {error && (
            <div className="mb-5">
              <Alert type="error" message={error} onDismiss={() => setError('')} />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                {...register('email')}
                type="email"
                className="input-field"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bask-muted hover:text-bask-dark"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-bask-muted font-body mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-bask-terracotta font-medium hover:underline">Join BASK</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

// ─── REGISTER ─────────────────────────────────────────────────
const registerSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/\d/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type RegisterForm = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('');
      const res = await authApi.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      const { token, user } = res.data.data;
      setAuth(user as AuthUser, token);
      navigate('/select-membership', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-display text-4xl font-bold text-bask-terracotta tracking-widest">BASK</span>
          <h1 className="font-display text-2xl text-bask-dark mt-2 mb-1">Join the community</h1>
          <p className="font-body text-bask-muted text-sm">Create your BASK account — it's free to start</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-8">
          {/* Elite teaser */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
            <Crown className="w-5 h-5 text-bask-terracotta flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-bask-dark font-body">Upgrade to Elite after joining</p>
              <p className="text-xs text-bask-muted font-body mt-0.5">Beach Map, Partner Perks & priority concierge for $120/yr</p>
            </div>
          </div>

          {error && (
            <div className="mb-5">
              <Alert type="error" message={error} onDismiss={() => setError('')} />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name</label>
                <input {...register('firstName')} className="input-field" placeholder="Alex" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">Last name</label>
                <input {...register('lastName')} className="input-field" placeholder="Rivera" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <input {...register('email')} type="email" className="input-field" placeholder="you@example.com" autoComplete="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Min. 8 chars with uppercase & number"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-bask-muted">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input {...register('confirmPassword')} type="password" className="input-field" placeholder="Repeat password" autoComplete="new-password" />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-bask-muted font-body mt-5">
            Already a member?{' '}
            <Link to="/login" className="text-bask-terracotta font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
