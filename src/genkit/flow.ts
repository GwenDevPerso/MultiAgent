import 'dotenv/config';
import {z} from 'zod';
import {ai} from './genkit';
import {getWeatherTool} from './tools';

export const flow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.object({ message: z.string() }),
    outputSchema: z.object({ response: z.string() }),
    streamSchema: z.string(),
  },
  async ({ message }, { sendChunk }) => {
    console.log('=== FLOW DEBUG ===');
    console.log('Input message:', message);

    try {
      const { stream, response } = ai.generateStream({
        model: 'googleai/gemini-2.5-flash',
        tools: [getWeatherTool],
        system: `Tu es un assistant IA polyvalent.

- Si c'est une question sur la météo, les vêtements à porter, ou le temps qu'il fait → utilise le tool getWeather
- Pour toute autre question → réponds directement de manière utile et concise

Sois toujours poli et serviable. Réponds en français.`,
        prompt: message,
      });

      console.log('Stream created successfully');

      for await (const chunk of stream) {
        console.log('Chunk received:', chunk.text);
        sendChunk(chunk.text);
      }

      const result = await response;
      console.log('Final result:', result.text);
      return { response: result.text };
    } catch (error) {
      console.error('Error in flow:', error);
      throw error;
    }
  }
);