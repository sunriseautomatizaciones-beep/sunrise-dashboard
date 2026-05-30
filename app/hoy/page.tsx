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
  const [kpis, setKpis] = useState({ revenue: 0, leads: 0, streak: 0 });
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

    const todayTasks = (tasksRes.data || []) as Task[];
    setTasks(todayTasks);

    const totalRevenue = (revenueRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
    setKpis({
      revenue: totalRevenue,
      leads: (leadsRes.data || []).length,
      streak: 0, // streak calculation omitted for now
    });

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Confetti when all tasks done
  useEffect(() => {
    if (!loading && tasks.length > 0 && tasks.every(t => t.done) && !confettiDone) {
      import('canvas-confetti').then(m => {
        m.default({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      });
      setConfettiDone(true);
    }
  }, [tasks, loading, confettiDone]);

  const toggleTask = async (task: Task) => {
    const { error } = await supabase
      .from('tasks')
      .update({ done: !task.done })
      .eq('id', task.id);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
      setConfettiDone(false);
    }
  };

  const addTask = async (cat: Category) => {
    const text = newTask[cat].trim();
    if (!text) return;
    const { data, error } = await supabase
      .from('tasks')
      .insert({ text, category: cat, done: false, date: today() })
      .select()
      .single();
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

  const date = new Date();
  const dateStr = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{getGreeting()}, Massin</h1>
        <p className="text-[#64748B] text-sm capitalize mt-1">{dateStr}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Revenue mes"
          value={`${kpis.revenue.toLocaleString('es-ES')}€`}
          emoji="💰"
          color="text-[#10B981]"
          loading={loading}
        />
        <KpiCard
          label="Leads hoy"
          value={String(kpis.leads)}
          emoji="🎯"
          color="text-[#6366F1]"
          loading={loading}
        />
        <KpiCard
          label="Tareas hoy"
          value={`${doneTasks}/${totalTasks}`}
          emoji="✅"
          color="text-[#F59E0B]"
          loading={loading}
        />
        <KpiCard
          label="Progreso día"
          value={`${pct}%`}
          emoji="📊"
          color={pct === 100 ? 'text-[#10B981]' : 'text-white'}
          loading={loading}
        />
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-[#64748B] mb-2">
            <span>Progreso del día</span>
            <span>{doneTasks} de {totalTasks} tareas</span>
          </div>
          <div className="h-2 bg-[#1E293B] rounded-full overflow-hidden">
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
        </div>
      )}

      {/* Task categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIES.map(cat => {
          const catTasks = tasks.filter(t => t.category === cat);
          const catDone = catTasks.filter(t => t.done).length;
          return (
            <div key={cat} className={`bg-[#1E293B] rounded-xl p-4 border-l-4 ${CAT_COLORS[cat]}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm text-white flex items-center gap-2">
                  {CAT_ICONS[cat]} {cat}
                </span>
                <span className="text-xs text-[#64748B]">{catDone}/{catTasks.length}</span>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1,2].map(i => <div key={i} className="h-5 bg-[#263348] rounded animate-pulse"/>)}
                </div>
              ) : (
                <ul className="space-y-2">
                  {catTasks.map(task => (
                    <li key={task.id} className={`flex items-center gap-2 ${task.done ? 'task-done' : ''}`}>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task)}
                        className="w-4 h-4 accent-[#6366F1] cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm text-[#CBD5E1]">{task.text}</span>
                    </li>
                  ))}
                  {catTasks.length === 0 && (
                    <li className="text-xs text-[#475569] italic">Sin tareas</li>
                  )}
                </ul>
              )}

              {/* Add task */}
              {adding === cat ? (
                <div className="mt-3 flex gap-2">
                  <input
                    autoFocus
                    value={newTask[cat]}
                    onChange={e => setNewTask(prev => ({ ...prev, [cat]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addTask(cat); if (e.key === 'Escape') setAdding(null); }}
                    placeholder="Nueva tarea..."
                    className="flex-1 bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#6366F1]"
                  />
                  <button
                    onClick={() => addTask(cat)}
                    className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm rounded-lg transition-colors"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setAdding(null)}
                    className="px-2 py-1.5 text-[#64748B] hover:text-white text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAdding(cat)}
                  className="mt-3 text-xs text-[#475569] hover:text-[#6366F1] transition-colors flex items-center gap-1"
                >
                  + Añadir tarea
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
    <div className="bg-[#1E293B] rounded-xl p-4 border border-[#334155]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#64748B]">{label}</span>
        <span className="text-lg">{emoji}</span>
      </div>
      {loading ? (
        <div className="h-7 bg-[#263348] rounded animate-pulse"/>
      ) : (
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      )}
    </div>
  );
}
