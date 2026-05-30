import Anthropic from '@anthropic-ai/sdk';
import { getAgent, AgentKey } from '@/lib/agents';

export const runtime = 'nodejs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { messages, agentKey } = await req.json();

    if (!messages || !agentKey) {
      return new Response('Missing messages or agentKey', { status: 400 });
    }

    const agent = getAgent(agentKey as AgentKey);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const messageStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: agent.systemPrompt,
          messages: messages,
        });

        for await (const chunk of messageStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
