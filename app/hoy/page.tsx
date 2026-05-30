'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, Task } from '@/lib/supabase';

const CATEGORIES = ['Prospección', 'Contenido', 'Ventas', 'Automatización', 'Admin'] as const;
type Category = typeof CATEGORIES[number];

const CAT_ICONS: Record<Category, string> = {
  'Prospección': '🎯',
  'Contenido':   '✍️',
  'Ventas':      '💰',
  'Automatización': '⚙️',
  'Admin':       '📋',
};

const CAT_COLORS: Record<Category, string> = {
  'Prospección':    'border-[#6366F1]',
  'Contenido':      'border-[#F59E0B]',
  'Ventas':         'border-[#10B981]',
  'Automatización': 'border-[#8B5CF6]',
  'Admin':          'border-[#64748B]',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 13) return '☀️ Buenos días';
  if (h < 20) return '🌤️ Buenas tardes';
  return '🌙 Buenas noches';
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function HoyPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kpis, setKpis] = useState({ revenue: 0, leads: 0 });
  const [newTask, setNewTask] = useState<Record<Category, string>>({
    'Prospección': '', 'Contenido': '', 'Ventas': '', 'Automatización': '', 'Admin': ''
  });
  const [adding, setAdding] = useState<Category | null>(null);
  const [confettiDone, setConfettiDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const todayStr = today();
    const [tasksRes, revenueRes, leadsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('date', todayStr).order('created_at'),
      supabase.from('revenue').select('amount').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('leads').select('id').eq('last_contact', todayStr),
    ]);
    setTasks((tasksRes.data || []) as Task[]);
    setKpis({
      revenue: (revenueRes.data || []).reduce((s, r) => s + Number(r.amount), 0),
      leads: (leadsRes.data || []).length,
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!loading && tasks.length > 0 && tasks.every(t => t.done) && !confettiDone) {
      import('canvas-confetti').then(m => {
        m.default({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      });
      setConfettiDone(true);
    }
  }, [tasks, loading, confettiDone]);

  const toggleTask = async (task: Task) => {
    const { error } = await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
      setConfettiDone(false);
    }
  };

  const addTask = async (cat: Category) => {
    const text = newTask[cat].trim();
    if (!text) return;
    const { data, error } = await supabase
      .from('tasks').insert({ text, category: cat, done: false, date: today() }).select().single();
    if (!error && data) {
      setTasks(prev => [...prev, data as Task]);
      setNewTask(prev => ({ ...prev, [cat]: '' }));
      setAdding(null);
      setConfettiDone(false);
    }
  };

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="px-4 pt-5 pb-4 md:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">{getGreeting()}, Massin</h1>
        <p className="text-[#64748B] text-xs capitalize mt-0.5">{dateStr}</p>
      </div>

      {/* KPI strip — 2x2 en móvil, 4 en desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        <KpiCard label="Revenue mes" value={`${kpis.revenue.toLocaleString('es-ES')}€`} emoji="💰" color="text-[#10B981]" loading={loading} />
        <KpiCard label="Leads hoy"   value={String(kpis.leads)}                          emoji="🎯" color="text-[#6366F1]" loading={loading} />
        <KpiCard label="Tareas"      value={`${doneTasks}/${totalTasks}`}                emoji="✅" color="text-[#F59E0B]" loading={loading} />
        <KpiCard label="Progreso"    value={`${pct}%`} emoji="📊" color={pct === 100 ? 'text-[#10B981]' : 'text-white'} loading={loading} />
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-[#64748B] mb-1.5">
            <span>Progreso del día</span>
            <span className="font-medium text-white">{pct}%</span>
          </div>
          <div className="h-2.5 bg-[#1E293B] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: pct === 100
                  ? 'linear-gradient(90deg, #10B981, #34D399)'
                  : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
              }}
            />
          </div>
          <p className="text-[11px] text-[#475569] mt-1">{doneTasks} de {totalTasks} tareas completadas</p>
        </div>
      )}

      {/* Task categories — 1 col móvil, 2 col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CATEGORIES.map(cat => {
          const catTasks = tasks.filter(t => t.category === cat);
          const catDone = catTasks.filter(t => t.done).length;
          return (
            <div key={cat} className={`bg-[#1E293B] rounded-xl p-3.5 border-l-4 ${CAT_COLORS[cat]}`}>
              {/* Category header */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-semibold text-sm text-white flex items-center gap-1.5">
                  {CAT_ICONS[cat]} {cat}
                </span>
                <span className="text-xs text-[#64748B] bg-[#0F172A] px-1.5 py-0.5 rounded-md">
                  {catDone}/{catTasks.length}
                </span>
              </div>

              {/* Tasks */}
              {loading ? (
                <div className="space-y-2">
                  {[1,2].map(i => <div key={i} className="h-5 bg-[#263348] rounded animate-pulse"/>)}
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {catTasks.map(task => (
                    <li
                      key={task.id}
                      className={`flex items-start gap-3 py-2 px-1 rounded-lg active:bg-[#263348] transition-colors ${task.done ? 'task-done' : ''}`}
                      onClick={() => toggleTask(task)}
                    >
                      {/* Custom checkbox — larger touch target */}
                      <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                        task.done ? 'bg-[#6366F1] border-[#6366F1]' : 'border-[#475569]'
                      }`}>
                        {task.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                      </span>
                      <span className={`text-sm leading-snug ${task.done ? 'text-[#475569] line-through' : 'text-[#CBD5E1]'}`}>
                        {task.text}
                      </span>
                    </li>
                  ))}
                  {catTasks.length === 0 && (
                    <li className="text-xs text-[#475569] italic py-1 px-1">Sin tareas</li>
                  )}
                </ul>
              )}

              {/* Add task */}
              {adding === cat ? (
                <div className="mt-2.5 flex gap-2">
                  <input
                    autoFocus
                    value={newTask[cat]}
                    onChange={e => setNewTask(prev => ({ ...prev, [cat]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addTask(cat); if (e.key === 'Escape') setAdding(null); }}
                    placeholder="Nueva tarea..."
                    className="flex-1 bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#6366F1]"
                  />
                  <button onClick={() => addTask(cat)} className="px-3 py-2 bg-[#6366F1] text-white text-sm rounded-lg">✓</button>
                  <button onClick={() => setAdding(null)} className="px-2 py-2 text-[#64748B] text-sm">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setAdding(cat)}
                  className="mt-2.5 w-full text-left text-xs text-[#475569] hover:text-[#6366F1] transition-colors flex items-center gap-1 py-1"
                >
                  <span className="text-base leading-none">+</span> Añadir tarea
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({ label, value, emoji, color, loading }: {
  label: string; value: string; emoji: string; color: string; loading: boolean;
}) {
  return (
    <div className="bg-[#1E293B] rounded-xl p-3 md:p-4 border border-[#334155]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-[#64748B] leading-tight">{label}</span>
        <span className="text-base md:text-lg">{emoji}</span>
      </div>
      {loading ? (
        <div className="h-6 bg-[#263348] rounded animate-pulse"/>
      ) : (
        <p className={`text-xl md:text-2xl font-bold ${color}`}>{value}</p>
      )}
    </div>
  );
}
