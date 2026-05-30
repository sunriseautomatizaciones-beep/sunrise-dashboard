import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const CAT_MAP: Record<string, string> = {
  prospeccion:     'Prospección',
  contenido:       'Contenido',
  ventas:          'Ventas',
  automatizacion:  'Automatización',
  admin:           'Admin',
};

const DAILY_TASKS = [
  { title: 'Buscar 5 leads nuevos con la automatización n8n',    category: 'prospeccion' },
  { title: 'Enviar 3 DMs de outreach',                           category: 'prospeccion' },
  { title: 'Hacer seguimiento a leads de ayer',                  category: 'prospeccion' },
  { title: 'Publicar el post del día en Instagram',              category: 'contenido' },
  { title: 'Publicar en LinkedIn',                               category: 'contenido' },
  { title: 'Responder comentarios y DMs',                        category: 'contenido' },
  { title: 'Revisar el pipeline de prospectos',                  category: 'ventas' },
  { title: 'Llamar a prospectos calientes',                      category: 'ventas' },
  { title: 'Revisar que los workflows de n8n estén activos',     category: 'automatizacion' },
  { title: 'Verificar llegada de leads desde el formulario web', category: 'automatizacion' },
  { title: 'Revisar emails',                                     category: 'admin' },
  { title: 'Actualizar el pipeline',                             category: 'admin' },
  { title: 'Registrar ingresos del día',                         category: 'admin' },
];

export async function GET(req: NextRequest) {
  // Auth check — Vercel sends this header automatically
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Service role client bypasses RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const today = new Date().toISOString().split('T')[0];

  // ─── A) Recurring tasks ───────────────────────────────────────────────────
  const recurringRows = DAILY_TASKS.map(t => ({
    text: t.title,
    category: CAT_MAP[t.category],
    done: false,
    date: today,
    is_recurring: true,
  }));

  const { error: recurringErr } = await supabase
    .from('tasks')
    .upsert(recurringRows, { onConflict: 'text,date', ignoreDuplicates: true });

  // ─── B) Smart tasks from pipeline ────────────────────────────────────────
  const smartTasks: Array<{ text: string; category: string }> = [];

  // Leads in 'Propuesta' not contacted in 3+ days
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().split('T')[0];
  const { data: staleProposals } = await supabase
    .from('leads')
    .select('name')
    .eq('status', 'Propuesta')
    .lt('last_contact', threeDaysAgo);

  for (const lead of staleProposals ?? []) {
    smartTasks.push({
      text: `Hacer seguimiento a ${lead.name} — propuesta sin respuesta`,
      category: 'Ventas',
    });
  }

  // Leads actively negotiating → call to close
  const { data: negotiating } = await supabase
    .from('leads')
    .select('name')
    .eq('status', 'Negociación');

  for (const lead of negotiating ?? []) {
    smartTasks.push({
      text: `Llamar a ${lead.name} para cerrar`,
      category: 'Ventas',
    });
  }

  // Pending invoices
  const { data: pendingRevenue } = await supabase
    .from('revenue')
    .select('client')
    .eq('status', 'pendiente');

  for (const rev of pendingRevenue ?? []) {
    smartTasks.push({
      text: `Cobrar factura pendiente de ${rev.client || 'cliente'}`,
      category: 'Admin',
    });
  }

  if (smartTasks.length > 0) {
    const smartRows = smartTasks.map(t => ({
      text: t.text,
      category: t.category,
      done: false,
      date: today,
      is_recurring: false,
    }));

    await supabase
      .from('tasks')
      .upsert(smartRows, { onConflict: 'text,date', ignoreDuplicates: true });
  }

  return Response.json({
    ok: true,
    date: today,
    recurring: recurringRows.length,
    smart: smartTasks.length,
    error: recurringErr?.message ?? null,
  });
}
