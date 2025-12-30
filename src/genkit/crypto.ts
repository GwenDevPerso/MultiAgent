import {openAI} from '@genkit-ai/compat-oai/openai';
import {z} from 'zod';
import {ai} from './genkit';

const CRYPTO_HEADER = {
  Authorization: `Bearer ${process.env['CRYPTO_API_KEY']}`,
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
      return {
        symbol: data.symbols[0].symbol,
        last: data.symbols[0].last,
        dailyChangePercentage: data.symbols[0].daily_change_percentage,
        price: data.symbols[0].price,
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
      return { coins: data.result.slice(0, top) };
    } catch (error) {
      console.error('Failed to fetch crypto list:', error);
      throw error;
    }
  }
);

const parseInputTool = ai.defineTool(
  {
    name: 'parseInput',
    description:
      'Parse and format user input into structured JSON data for the UI. Extracts numeric values, identifiers and asset names from natural language.',
    inputSchema: z.object({
      value: z.number().describe('The numeric value extracted from user input'),
      identifier: z.string().describe('The alphanumeric identifier/address string'),
      asset: z.string().describe('The asset name or symbol (e.g., SOL, ETH, BTC)'),
    }),
    outputSchema: z.object({
      action: z.string().describe('The parsed action type for UI routing'),
      amount: z.number().describe('The formatted numeric value'),
      to: z.string().describe('The formatted identifier'),
      crypto: z.string().describe('The normalized asset symbol'),
    }),
  },
  async ({ value, identifier, asset }) => {
    console.log('value', value);
    console.log('identifier', identifier);
    console.log('asset', asset);

    return {
      action: 'SEND_TRANSACTION',
      amount: value,
      to: identifier,
      crypto: asset.toUpperCase(),
    };
  }
);

export const cryptoAgent = ai.definePrompt({
  name: 'cryptoAgent',
  model: openAI.model('gpt-4o-mini'),
  description: 'Crypto assistant for wallet UI.',
  input: {
    schema: z.object({
      query: z.string().describe('The user query'),
    }),
  },
  system: `You are a crypto assistant. You MUST use one of the available tools for EVERY request.

  TOOL SELECTION RULES:
  1. If user asks about a crypto PRICE → use getDataByCrypto
  2. If user asks about TOP/BEST cryptos or rankings → use getTopCrypto  
  3. For ANY OTHER request (especially if it contains an address/identifier, amount, or words like send/transfer/envoie) → use parseInput

  FOR PARSE INPUT TOOL:
  - Extract the numeric value, identifier and asset from the user input.
  - The numeric value is the amount of crypto to send.
  - The identifier is the address of the recipient.
  - The asset is the symbol of the crypto to send.

  Example:
  User: "Send 0.5 SOL to 0x1234567890123456789012345678901234567890"
  AI: "I've parsed your request. Here's the formatted data:
    {"action":"SEND_TRANSACTION","amount":0.5,"to":"0x1234567890123456789012345678901234567890","crypto":"SOL"}
  "
    `,
  tools: [getDataByCryptoTool, getTopCryptoTool, parseInputTool],
});
