import {googleAI} from '@genkit-ai/googleai';
import {genkit} from 'genkit';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env['GOOGLE_API_KEY']}), ],
});
