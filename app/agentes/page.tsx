'use client';

import { useState, useRef, useEffect } from 'react';
import { AGENTS, Agent, AgentKey } from '@/lib/agents';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function AgentesPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AGENTS[0]);
  const [conversations, setConversations] = useState<Record<AgentKey, Message[]>>({
    captador: [], ventas: [], contenido: [], analista: [], email: [], seo: [],
  });
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = conversations[selectedAgent.key];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];

    setConversations(prev => ({ ...prev, [selectedAgent.key]: newMessages }));
    setInput('');
    setStreaming(true);

    // Add empty assistant message for streaming
    const assistantMsg: Message = { role: 'assistant', content: '' };
    setConversations(prev => ({
      ...prev,
      [selectedAgent.key]: [...newMessages, assistantMsg],
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentKey: selectedAgent.key,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error('Request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        setConversations(prev => {
          const msgs = [...(prev[selectedAgent.key] || [])];
          const lastIdx = msgs.length - 1;
          msgs[lastIdx] = { role: 'assistant', content: accumulated };
          return { ...prev, [selectedAgent.key]: msgs };
        });
      }
    } catch (err) {
      console.error(err);
      setConversations(prev => {
        const msgs = [...(prev[selectedAgent.key] || [])];
        const lastIdx = msgs.length - 1;
        msgs[lastIdx] = { role: 'assistant', content: 'Error al conectar con el agente. Comprueba la API key.' };
        return { ...prev, [selectedAgent.key]: msgs };
      });
    } finally {
      setStreaming(false);
    }
  };

  const clearChat = () => {
    setConversations(prev => ({ ...prev, [selectedAgent.key]: [] }));
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Agent selector — horizontal scroll on mobile, vertical sidebar on desktop */}
      <div className="md:w-52 flex-shrink-0 bg-[#1E293B] md:border-r border-b md:border-b-0 border-[#334155] flex flex-col">
        <div className="hidden md:block px-4 py-4 border-b border-[#334155]">
          <h2 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Agentes</h2>
        </div>
        {/* Mobile: horizontal scroll */}
        <div className="md:hidden flex overflow-x-auto gap-2 px-3 py-2 scrollbar-none">
          {AGENTS.map(agent => {
            const isActive = selectedAgent.key === agent.key;
            return (
              <button
                key={agent.key}
                onClick={() => setSelectedAgent(agent)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                  isActive ? 'bg-[#263348]' : ''
                }`}
              >
                <span className="text-xl">{agent.emoji}</span>
                <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-[#64748B]'}`}>
                  {agent.name}
                </span>
                {isActive && <span className="w-4 h-0.5 rounded-full" style={{ background: agent.color }} />}
              </button>
            );
          })}
        </div>
        {/* Desktop: vertical list */}
        <div className="hidden md:block flex-1 overflow-y-auto py-2">
          {AGENTS.map(agent => {
            const isActive = selectedAgent.key === agent.key;
            const msgCount = conversations[agent.key].filter(m => m.role === 'user').length;
            return (
              <button
                key={agent.key}
                onClick={() => setSelectedAgent(agent)}
                className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${
                  isActive ? 'bg-[#263348]' : 'hover:bg-[#1A2540]'
                }`}
              >
                <span className="text-xl mt-0.5">{agent.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-[#94A3B8]'}`}>
                    {agent.name}
                  </p>
                  <p className="text-xs text-[#64748B] truncate">{agent.tagline}</p>
                  {msgCount > 0 && (
                    <p className="text-[10px] text-[#475569] mt-0.5">{msgCount} mensajes</p>
                  )}
                </div>
                {isActive && (
                  <div
                    className="w-1 h-5 rounded-full self-center flex-shrink-0"
                    style={{ background: agent.color }}
                  />
                )}
              </button>
            );
          })}
        </div>{/* end desktop list */}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Chat header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-[#334155] bg-[#0F172A] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedAgent.emoji}</span>
            <div>
              <p className="font-semibold text-white">{selectedAgent.name}</p>
              <p className="text-xs text-[#64748B]">{selectedAgent.tagline}</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-[#475569] hover:text-[#94A3B8] transition-colors"
            >
              Limpiar chat
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-5xl mb-4">{selectedAgent.emoji}</span>
              <p className="text-white font-semibold text-lg mb-2">{selectedAgent.name}</p>
              <p className="text-[#64748B] text-sm max-w-sm">{selectedAgent.tagline}</p>
              <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-sm">
                {getPromptSuggestions(selectedAgent.key).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    className="text-sm text-left px-4 py-2.5 bg-[#1E293B] hover:bg-[#263348] border border-[#334155] rounded-xl text-[#94A3B8] hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <span className="text-xl mr-3 mt-1 flex-shrink-0">{selectedAgent.emoji}</span>
              )}
              <div
                className={`max-w-[88%] md:max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#6366F1] text-white rounded-[18px_18px_4px_18px]'
                    : 'bg-[#1E293B] text-[#E2E8F0] border border-[#334155] rounded-[18px_18px_18px_4px]'
                }`}
              >
                {msg.content}
                {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                  <span className="inline-block w-2 h-4 bg-current ml-0.5 animate-pulse"/>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 md:px-6 py-3 md:py-4 border-t border-[#334155] bg-[#0F172A] flex-shrink-0">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={`Pregunta al agente ${selectedAgent.name}...`}
              rows={1}
              className="flex-1 bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#6366F1] resize-none max-h-32 overflow-y-auto"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              className="px-4 py-3 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-40 flex-shrink-0"
              style={{ background: streaming ? '#334155' : selectedAgent.color }}
            >
              {streaming ? '...' : '↑'}
            </button>
          </div>
          <p className="text-[10px] text-[#334155] mt-2 text-center">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}

function getPromptSuggestions(key: AgentKey): string[] {
  const s: Record<AgentKey, string[]> = {
    captador: [
      'Dame 5 nichos de PYMEs para prospectar en Instagram',
      'Escríbeme un DM de outreach para una clínica dental',
      'Cómo identificar empresas que necesitan automatización',
    ],
    ventas: [
      'Cómo manejar "es muy caro, lo pienso"',
      'Dame un script para cerrar la demo en la llamada',
      'Estructura de propuesta comercial para automatización',
    ],
    contenido: [
      'Dame una idea de carrusel para Instagram sobre automatización',
      'Script para un Reel: "automaticé mi negocio en 3 días"',
      'Plan de contenido semanal para LinkedIn',
    ],
    analista: [
      'Tengo 3 leads en demo, 1 en propuesta y 150€ de revenue. Analiza mi pipeline',
      'Cómo calcular el ROI de una automatización para presentarla al cliente',
      'Qué métricas debería trackear para llegar a 10k€/mes',
    ],
    email: [
      'Dame un cold email para una tienda online de moda',
      'Secuencia de 3 emails de follow-up post-demo',
      'Subject lines de alto open rate para cold outreach B2B',
    ],
    seo: [
      'Palabras clave para "automatización para PYMEs España"',
      'Estructura de artículo: "cómo automatizar WhatsApp con n8n"',
      'Estrategia SEO local para captar clientes en Madrid',
    ],
  };
  return s[key] || [];
}
