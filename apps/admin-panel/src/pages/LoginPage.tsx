// src/pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Car, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import type { AuthUser } from '@taxiflow/shared-types';

const schema = z.object({
  tenantId: z.string().uuid('Invalid Tenant ID'),
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      localStorage.setItem('tenantId', data.tenantId);
      const res = await api.post<{ data: { user: AuthUser; accessToken: string } }>('/auth/login', {
        email: data.email,
        password: data.password,
      });
      setAuth(res.data.data.user, res.data.data.accessToken, data.tenantId);
      toast.success(`Welcome back, ${res.data.data.user.firstName}!`);
      navigate('/dashboard');
    } catch {
      // Error toast handled by axios interceptor
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] p-12 border-r border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <Car size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">TaxiFlow</span>
        </div>
        <div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-4">Platform</div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Manage your<br />fleet with<br />
            <span className="text-amber-400">confidence.</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Full control over bookings, drivers, pricing, and payments — all in one place.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[['Bookings', 'Real-time tracking'], ['Drivers', 'Approve & manage'], ['Payments', 'Stripe integrated'], ['Reports', 'Revenue analytics']].map(([title, sub]) => (
            <div key={title} className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="text-white text-sm font-medium">{title}</div>
              <div className="text-slate-500 text-xs mt-1">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-white text-2xl font-bold mb-1">Sign in</h2>
            <p className="text-slate-400 text-sm">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Tenant ID</label>
              <input
                {...register('tenantId')}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-600 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all font-mono"
              />
              {errors.tenantId && <p className="text-red-400 text-xs mt-1">{errors.tenantId.message}</p>}
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@yourcompany.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-600 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-600 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all pr-11"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60 mt-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
