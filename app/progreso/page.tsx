'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, Revenue } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const GOAL = 10000;

const MILESTONES = [
  { pct: 10,  label: '10%',  emoji: '🌱', reward: 'Primer cliente' },
  { pct: 25,  label: '25%',  emoji: '⚡', reward: '2.500€ recurrentes' },
  { pct: 50,  label: '50%',  emoji: '🔥', reward: 'Mitad del camino' },
  { pct: 75,  label: '75%',  emoji: '💎', reward: 'Sprint final' },
  { pct: 90,  label: '90%',  emoji: '🚀', reward: 'Casi en la cima' },
  { pct: 100, label: '100%', emoji: '🏆', reward: '¡Objetivo logrado!' },
];

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function ProgresoPage() {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ amount: '', description: '', client: '' });
  const [saving, setSaving] = useState(false);

  const loadRevenues = useCallback(async () => {
    setLoading(true);
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from('revenue').select('*').gte('created_at', `${year}-01-01`)
      .order('created_at', { ascending: false });
    setRevenues((data || []) as Revenue[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadRevenues(); }, [loadRevenues]);

  const totalRevenue = revenues.reduce((s, r) => s + Number(r.amount), 0);
  const pct = Math.min(100, (totalRevenue / GOAL) * 100);

  const monthlyData = MONTHS_ES.map((name, i) => {
    const month = `${new Date().getFullYear()}-${String(i + 1).padStart(2, '0')}`;
    const total = revenues.filter(r => r.created_at.startsWith(month)).reduce((s, r) => s + Number(r.amount), 0);
    return { name, total };
  });

  const saveRevenue = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || isNaN(amount)) return;
    setSaving(true);
    const month = new Date().toISOString().substring(0, 7);
    const { error } = await supabase.from('revenue').insert({ amount, description: form.description, client: form.client, month });
    if (!error) {
      setForm({ amount: '', description: '', client: '' });
      setShowModal(false);
      await loadRevenues();
    }
    setSaving(false);
  };

  return (
    <div className="px-4 pt-5 pb-4 md:p-6 max-w-4xl mx-auto">

      {/* Header — stacks on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">📈 Progreso</h1>
          <p className="text-[#64748B] text-xs mt-0.5">Objetivo: 10.000€/mes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-xl transition-colors"
        >
          + Registrar ingreso
        </button>
      </div>

      {/* Big progress card */}
      <div className="bg-[#1E293B] rounded-2xl p-4 md:p-6 mb-5 border border-[#334155]">
        <p className="text-[#64748B] text-xs mb-2">Revenue acumulado</p>
        <div className="flex items-end justify-between mb-4 gap-2">
          {loading ? (
            <div className="h-9 w-36 bg-[#263348] rounded animate-pulse"/>
          ) : (
            <p className="text-3xl md:text-4xl font-bold text-white leading-none">
              {totalRevenue.toLocaleString('es-ES')}€
            </p>
          )}
          <p className={`text-2xl md:text-3xl font-bold flex-shrink-0 ${pct >= 100 ? 'text-[#10B981]' : 'text-[#6366F1]'}`}>
            {loading ? '—' : `${pct.toFixed(1)}%`}
          </p>
        </div>

        <div className="h-3 bg-[#0F172A] rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: pct >= 80
                ? 'linear-gradient(90deg, #6366F1, #8B5CF6, #F59E0B, #FBBF24)'
                : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
            }}
          />
        </div>
        <p className="text-xs text-[#64748B]">
          Faltan <strong className="text-white">{Math.max(0, GOAL - totalRevenue).toLocaleString('es-ES')}€</strong> para el objetivo · meta {GOAL.toLocaleString('es-ES')}€
        </p>
      </div>

      {/* Milestones — 2 cols mobile, 3 cols sm, 6 cols desktop */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {MILESTONES.map(m => {
          const unlocked = pct >= m.pct;
          return (
            <div
              key={m.pct}
              className={`rounded-xl p-2 md:p-3 text-center border transition-all ${
                unlocked
                  ? 'bg-[#1E293B] border-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'bg-[#1E293B] border-[#334155] opacity-40'
              }`}
              title={m.reward}
            >
              <p className="text-xl md:text-2xl mb-0.5">{m.emoji}</p>
              <p className="text-[11px] font-bold text-white">{m.label}</p>
              {unlocked && <p className="text-[9px] text-[#6366F1] mt-0.5">✓</p>}
            </div>
          );
        })}
      </div>

      {/* Monthly chart */}
      <div className="bg-[#1E293B] rounded-2xl p-4 md:p-6 mb-5 border border-[#334155]">
        <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Ingresos por mes</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyData} barSize={16} margin={{ left: -20, right: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9', fontSize: 12 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${Number(v).toLocaleString('es-ES')}€`, 'Ingresos']}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {monthlyData.map((_, i) => (
                <Cell key={i} fill={i === new Date().getMonth() ? '#6366F1' : '#334155'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue list */}
      <div className="bg-[#1E293B] rounded-2xl border border-[#334155]">
        <div className="px-4 py-3 border-b border-[#334155]">
          <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Ingresos registrados</h2>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-[#263348] rounded animate-pulse"/>)}
          </div>
        ) : revenues.length === 0 ? (
          <div className="p-8 text-center text-[#475569] text-sm">Sin ingresos registrados aún</div>
        ) : (
          <div className="divide-y divide-[#334155]">
            {revenues.map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 mr-3">
                  <p className="text-sm text-white font-medium truncate">{r.client || 'Cliente'}</p>
                  <p className="text-xs text-[#64748B] truncate">{r.description || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-[#10B981]">+{Number(r.amount).toLocaleString('es-ES')}€</p>
                  <p className="text-xs text-[#64748B]">{new Date(r.created_at).toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#1E293B] rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md border border-[#334155] sm:m-4">
            <h3 className="text-base font-bold text-white mb-4">Registrar ingreso</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#64748B] mb-1 block">Importe (€) *</label>
                <input type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="1500"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-3 text-white text-base focus:outline-none focus:border-[#6366F1]"
                />
              </div>
              <div>
                <label className="text-xs text-[#64748B] mb-1 block">Cliente</label>
                <input type="text" value={form.client}
                  onChange={e => setForm(p => ({ ...p, client: e.target.value }))}
                  placeholder="Nombre del cliente"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-3 text-white text-base focus:outline-none focus:border-[#6366F1]"
                />
              </div>
              <div>
                <label className="text-xs text-[#64748B] mb-1 block">Descripción</label>
                <input type="text" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Automatización CRM, web landing..."
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-3 text-white text-base focus:outline-none focus:border-[#6366F1]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 border border-[#334155] text-[#94A3B8] text-sm rounded-xl">
                Cancelar
              </button>
              <button onClick={saveRevenue} disabled={saving || !form.amount}
                className="flex-1 px-4 py-3 bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
