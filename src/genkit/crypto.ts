import {openAI} from '@genkit-ai/compat-oai/openai';
import {z} from 'zod';
import {ai} from './genkit';

const CRYPTO_HEADER = {
  'Authorization': `Bearer ${process.env['CRYPTO_API_KEY']}`,
};

const getDataByCryptoTool = ai.defineTool(
  {
    name: 'getDataByCrypto',
    description: 'Get current crypto price for a coin',
    inputSchema: z.object({
      coin: z.string().describe('The coin symbol to get price for (e.g., BTC, ETH)'),
    }),
    outputSchema: z.object({
      symbol: z.string().describe('The symbol of the coin'),
      last: z.string().describe('The current price of the coin'),
      dailyChangePercentage: z.string().optional().describe('24h price change percentage'),
      price: z.string().optional().describe('Market capitalization'),
    }),
  },
  async ({ coin }) => {
    try {
      const response = await fetch(
        `https://api.freecryptoapi.com/v1/getData?symbol=${coin.toUpperCase()}`,
        {
          headers: CRYPTO_HEADER,
        }
      );
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      console.log('data', data);
      return {
        symbol: data.symbols[0].symbol,
        last: data.symbols[0].last,
        dailyChangePercentage: data.symbols[0].daily_change_percentage,
        price: data.symbols[0].price
      };
    } catch (error) {
      console.error('Failed to fetch crypto data:', error);
      throw error;
    }
  }
);

const getTopCryptoTool = ai.defineTool(
  {
    name: 'getTopCrypto',
    description: 'Get the top crypto coins by market cap',
    inputSchema: z.object({ top: z.number().describe('The number of top crypto coins to get') }),
    outputSchema: z.object({
      coins: z.array(
        z.object({
          name: z.string().describe('The name of the coin'),
          symbol: z.string().describe('The symbol of the coin'),
        })
      ),
    }),
  },
  async ({ top }) => {
    try {
    const response = await fetch(`https://api.freecryptoapi.com/v1/getCryptoList`, {
      headers: CRYPTO_HEADER,
    });
      const data = await response.json();
      console.log('data', data);
      return { coins: data.result.slice(0, top) };
    } catch (error) {
      console.error('Failed to fetch crypto list:', error);
      throw error;
    }
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
      - You can use the tool getDataByCrypto to get the price of a crypto.
      - You can use the tool getTopCrypto to get the top crypto coins by market cap.
      - If none of the tools are relevant, you can answer the question yourself.
      You answer in English.
    `,
  tools: [getDataByCryptoTool, getTopCryptoTool],
});
