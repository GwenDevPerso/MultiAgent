import {openAI} from '@genkit-ai/compat-oai/openai';
import {z} from 'zod';
import {cryptoAgent} from './crypto';
import {ai} from './genkit';
import {weatherAgent} from './weather';

export const routerAgent = ai.definePrompt({
  name: 'routerAgent',
  model: openAI.model('gpt-4o-mini'),
  description: 'Routes user requests to the correct agent',
  input: {
    schema: z.object({
      request: z.string().describe('The user request to route'),
    }),
  },
  system: `You are a routing AI for ChatAI.
    Based on the user's request, delegate the task to the most appropriate agent:
    - weatherAgent: for questions about weather, temperature, what to wear, etc.
    - cryptoAgent: for questions about cryptocurrency prices

    IMPORTANT: Do not answer directly. Always use the appropriate tool to handle the request.
    If the request doesn't match any available agent, politely explain that you cannot help with that topic.`,
  prompt: '{{request}}',
  tools: [weatherAgent, cryptoAgent],
});
