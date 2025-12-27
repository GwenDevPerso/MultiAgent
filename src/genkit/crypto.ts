import {openAI} from '@genkit-ai/compat-oai/openai';
import {z} from 'zod';
import {ai} from './genkit';

const getCryptoTool = ai.defineTool(
  {
    name: 'getCrypto',
    description: 'Get current crypto price for a coin',
    inputSchema: z.object({ coin: z.string().describe('The coin name to get price for') }),
    outputSchema: z.object({ price: z.number().describe('The current price of the coin') }),
  },
  async ({ coin }) => {
    console.log('coin', coin);
    return { price: 100 };
  }
);

export const cryptoAgent = ai.definePrompt({
  name: 'cryptoAgent',
  model: openAI.model('gpt-4o-mini'),
  description: 'AI agent answering questions about the crypto.',
  input: {
    schema: z.object({
      query: z.string().describe('The crypto question to answer'),
    }),
  },
  system: `You are an AI agent answering questions about the crypto.
      You can use the tool getCrypto to get the price of a crypto.
      You answer in English.
    `,
  tools: [getCryptoTool],
});
