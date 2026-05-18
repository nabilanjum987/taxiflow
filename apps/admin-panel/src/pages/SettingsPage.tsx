// src/pages/SettingsPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Save, Key, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const API_PROVIDERS = [
  { key: 'GOOGLE_MAPS', label: 'Google Maps API Key', hint: 'Required for mapping and routing' },
  { key: 'STRIPE_PUBLISHABLE', label: 'Stripe Publishable Key', hint: 'pk_live_...' },
  { key: 'STRIPE_SECRET', label: 'Stripe Secret Key', hint: 'sk_live_... — stored encrypted' },
  { key: 'TWILIO_ACCOUNT_SID', label: 'Twilio Account SID', hint: 'For SMS OTP delivery' },
  { key: 'TWILIO_AUTH_TOKEN', label: 'Twilio Auth Token', hint: 'Stored encrypted' },
] as const;

type Provider = typeof API_PROVIDERS[number]['key'];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});

  const { data: tenant } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => api.get('/tenants/me').then(r => r.data.data),
  });

  const { data: apiKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/tenants/me/api-keys').then(r => r.data.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => api.get('/tenants/me').then(r => r.data.data),
  });

  const brandingForm = useForm({ defaultValues: { name: tenant?.name ?? '', primaryColor: tenant?.primaryColor ?? '#f59e0b', secondaryColor: tenant?.secondaryColor ?? '#1F2937' } });

  const brandingMutation = useMutation({
    mutationFn: (data: { name?: string; primaryColor?: string; secondaryColor?: string }) => api.patch('/tenants/me/branding', data),
    onSuccess: () => { toast.success('Branding updated'); void qc.invalidateQueries({ queryKey: ['tenant-me'] }); },
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: ({ provider, key }: { provider: string; key: string }) => api.post('/tenants/me/api-keys', { provider, key }),
    onSuccess: () => { toast.success('API key saved securely'); void qc.invalidateQueries({ queryKey: ['api-keys'] }); setKeyValues({}); },
  });

  const settingsMutation = useMutation({
    mutationFn: (data: Record<string, boolean | number>) => api.patch('/tenants/me/settings', data),
    onSuccess: () => toast.success('Settings saved'),
  });

  const apiKeyMap = Object.fromEntries((apiKeys ?? []).map((k: { provider: string; isConfigured: boolean }) => [k.provider, k.isConfigured]));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="text-gray-500 text-sm mt-0.5">Manage your platform configuration</p></div>

      {/* Branding */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-5">Branding</h2>
        <form onSubmit={brandingForm.handleSubmit(d => brandingMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Company Name</label>
            <input {...brandingForm.register('name')} className="input" placeholder="Your Company Name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Primary Colour</label>
              <div className="flex items-center gap-3">
                <input {...brandingForm.register('primaryColor')} type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200" />
                <input {...brandingForm.register('primaryColor')} className="input flex-1" placeholder="#f59e0b" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Secondary Colour</label>
              <div className="flex items-center gap-3">
                <input {...brandingForm.register('secondaryColor')} type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200" />
                <input {...brandingForm.register('secondaryColor')} className="input flex-1" placeholder="#1F2937" />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="btn-primary">
              <Save size={15} /> Save Branding
            </button>
          </div>
        </form>
      </div>

      {/* API Keys */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Key size={16} className="text-amber-500" />
          <h2 className="font-semibold text-gray-900">API Keys</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">All keys are encrypted with AES-256-GCM before storage. We never see your plain keys.</p>
        <div className="space-y-4">
          {API_PROVIDERS.map(({ key, label, hint }) => (
            <div key={key} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-gray-800">{label}</div>
                  <div className="text-xs text-gray-400">{hint}</div>
                </div>
                {apiKeyMap[key] && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle size={13} /> Configured
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKeys[key] ? 'text' : 'password'}
                    value={keyValues[key] ?? ''}
                    onChange={e => setKeyValues(v => ({ ...v, [key]: e.target.value }))}
                    placeholder={apiKeyMap[key] ? '••••••••••••••••' : `Enter ${label}`}
                    className="input pr-10 text-sm"
                  />
                  <button type="button" onClick={() => setShowKeys(v => ({ ...v, [key]: !v[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showKeys[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button
                  onClick={() => { if (keyValues[key]) saveApiKeyMutation.mutate({ provider: key, key: keyValues[key] }); }}
                  disabled={!keyValues[key]}
                  className="btn-primary text-sm py-2 px-4 disabled:opacity-40">
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Settings */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-5">Booking Settings</h2>
        <div className="space-y-4">
          {[
            { key: 'allowCashPayments', label: 'Allow Cash Payments', desc: 'Passengers can pay drivers in cash' },
            { key: 'allowCardPayments', label: 'Allow Card Payments', desc: 'Stripe card payments via app' },
            { key: 'allowScheduledBookings', label: 'Scheduled Bookings', desc: 'Passengers can book in advance' },
            { key: 'autoAssignDriver', label: 'Auto-Assign Driver', desc: 'Automatically find nearest driver' },
            { key: 'ratingEnabled', label: 'Ratings Enabled', desc: 'Passengers and drivers can rate each other' },
            { key: 'corporateEnabled', label: 'Corporate Accounts', desc: 'Enable corporate billing module' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-medium text-gray-800">{label}</div>
                <div className="text-xs text-gray-400">{desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer"
                  defaultChecked={settings?.[key]}
                  onChange={e => settingsMutation.mutate({ [key]: e.target.checked })} />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-amber-500 transition-colors
                  after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4
                  after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Info */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="space-y-2 text-sm">
          {[
            { l: 'Tenant ID', v: tenant?.id, mono: true },
            { l: 'Slug', v: tenant?.slug },
            { l: 'Status', v: tenant?.status },
            { l: 'Currency', v: tenant?.currency },
            { l: 'Timezone', v: tenant?.timezone },
            { l: 'Country', v: tenant?.country },
          ].map(({ l, v, mono }) => (
            <div key={l} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-500">{l}</span>
              <span className={`font-medium text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{v ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
