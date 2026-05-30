'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase, Lead } from '@/lib/supabase';

const COLUMNS: { id: Lead['status']; label: string; color: string }[] = [
  { id: 'Nuevo',        label: '🌱 Nuevo',        color: '#6366F1' },
  { id: 'Contactado',   label: '📞 Contactado',   color: '#8B5CF6' },
  { id: 'Demo',         label: '🎥 Demo',         color: '#F59E0B' },
  { id: 'Propuesta',    label: '📄 Propuesta',    color: '#EC4899' },
  { id: 'Negociación',  label: '🤝 Negociación',  color: '#14B8A6' },
  { id: 'Cerrado',      label: '🏆 Cerrado',      color: '#10B981' },
];

const CHANNELS = ['Instagram', 'LinkedIn', 'Referido', 'Frío', 'Web', 'Otro'];
const SERVICES = ['Automatización', 'Web', 'Combo', 'Otro'];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLead, setShowNewLead] = useState(false);
  const [closedModal, setClosedModal] = useState<Lead | null>(null);
  const [closedAmount, setClosedAmount] = useState('');
  const [form, setForm] = useState({ name: '', company: '', channel: 'Instagram', service: 'Automatización', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    setLeads((data || []) as Lead[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as Lead['status'];
    const lead = leads.find(l => l.id === draggableId);
    if (!lead) return;

    // Update local state optimistically
    setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, status: newStatus } : l));

    // If moved to Cerrado, ask for amount
    if (newStatus === 'Cerrado') {
      setClosedModal({ ...lead, status: 'Cerrado' });
      return;
    }

    await supabase.from('leads').update({ status: newStatus }).eq('id', draggableId);
  };

  const confirmClosed = async () => {
    if (!closedModal) return;
    const amount = parseFloat(closedAmount);

    await supabase.from('leads').update({
      status: 'Cerrado',
      amount: isNaN(amount) ? undefined : amount,
    }).eq('id', closedModal.id);

    if (!isNaN(amount) && amount > 0) {
      const month = new Date().toISOString().substring(0, 7);
      await supabase.from('revenue').insert({
        amount,
        description: `${closedModal.service} — Pipeline`,
        client: closedModal.name,
        month,
      });
    }

    setClosedModal(null);
    setClosedAmount('');
    loadLeads();
  };

  const createLead = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('leads').insert({
      ...form,
      status: 'Nuevo',
      last_contact: new Date().toISOString().split('T')[0],
    });
    if (!error) {
      setForm({ name: '', company: '', channel: 'Instagram', service: 'Automatización', notes: '' });
      setShowNewLead(false);
      await loadLeads();
    }
    setSaving(false);
  };

  const byStatus = (status: Lead['status']) => leads.filter(l => l.status === status);

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">🚀 Pipeline</h1>
          <p className="text-[#64748B] text-sm mt-1">{leads.length} prospectos en total</p>
        </div>
        <button
          onClick={() => setShowNewLead(true)}
          className="px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Nuevo lead
        </button>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {COLUMNS.map(col => {
            const colLeads = byStatus(col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-56">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#94A3B8]">{col.label}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: col.color + '33', color: col.color }}
                  >
                    {colLeads.length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] rounded-xl p-2 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-[#263348]' : 'bg-[#1E293B]'
                      } border border-[#334155]`}
                    >
                      {loading ? (
                        <div className="space-y-2">
                          {[1,2].map(i => <div key={i} className="h-16 bg-[#263348] rounded-lg animate-pulse"/>)}
                        </div>
                      ) : (
                        colLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-[#0F172A] rounded-lg p-3 mb-2 border border-[#334155] cursor-grab select-none transition-shadow ${
                                  snapshot.isDragging ? 'shadow-xl rotate-1 border-[#6366F1]' : 'hover:border-[#475569]'
                                }`}
                              >
                                <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                                {lead.company && (
                                  <p className="text-xs text-[#64748B] truncate">{lead.company}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] bg-[#1E293B] border border-[#334155] text-[#94A3B8] px-2 py-0.5 rounded-full">
                                    {lead.channel}
                                  </span>
                                  <span className="text-[10px] bg-[#1E293B] border border-[#334155] text-[#94A3B8] px-2 py-0.5 rounded-full">
                                    {lead.service}
                                  </span>
                                </div>
                                {lead.amount && (
                                  <p className="text-xs font-bold text-[#10B981] mt-1">{lead.amount.toLocaleString('es-ES')}€</p>
                                )}
                                <p className="text-[10px] text-[#475569] mt-1">
                                  {new Date(lead.last_contact).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* New lead modal */}
      {showNewLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] rounded-2xl p-6 w-full max-w-md border border-[#334155]">
            <h3 className="text-lg font-bold text-white mb-5">Nuevo lead</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] mb-1 block">Nombre *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Carlos García"
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748B] mb-1 block">Empresa</label>
                  <input
                    value={form.company}
                    onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                    placeholder="Empresa SL"
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] mb-1 block">Canal</label>
                  <select
                    value={form.channel}
                    onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6366F1]"
                  >
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] mb-1 block">Servicio</label>
                  <select
                    value={form.service}
                    onChange={e => setForm(p => ({ ...p, service: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6366F1]"
                  >
                    {SERVICES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748B] mb-1 block">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Contexto del lead..."
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6366F1] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewLead(false)}
                className="flex-1 px-4 py-2.5 border border-[#334155] text-[#94A3B8] text-sm rounded-lg hover:border-[#475569] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createLead}
                disabled={saving || !form.name.trim()}
                className="flex-1 px-4 py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Creando...' : 'Crear lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closed deal modal */}
      {closedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] rounded-2xl p-6 w-full max-w-sm border border-[#334155]">
            <p className="text-2xl mb-3">🏆</p>
            <h3 className="text-lg font-bold text-white mb-2">¡Deal cerrado!</h3>
            <p className="text-sm text-[#64748B] mb-5">
              {closedModal.name} — ¿cuánto vale este contrato?
            </p>
            <input
              type="number"
              value={closedAmount}
              onChange={e => setClosedAmount(e.target.value)}
              placeholder="1500"
              className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#10B981] mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setClosedModal(null); loadLeads(); }}
                className="flex-1 px-4 py-2.5 border border-[#334155] text-[#94A3B8] text-sm rounded-lg"
              >
                Sin importe
              </button>
              <button
                onClick={confirmClosed}
                className="flex-1 px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
