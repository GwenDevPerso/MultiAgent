import {z} from 'zod';
import {ai} from './genkit';
import {routerAgent} from './triage.agent';

export const chatbotFlow = ai.defineFlow(
  {
    name: "chatbotFlow",
    inputSchema: z.object({
      message: z.string(),
    }),
    outputSchema: z.object({
      response: z.string(),
    }),
  },
  async ({ message }) => {
    // Utilise routerAgent directement comme prompt
    const response = await routerAgent({ request: message });
    return { response: response.text };
  }
);