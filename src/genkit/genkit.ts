import {openAI} from '@genkit-ai/compat-oai/openai';
import {genkit} from 'genkit';

import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env['GOOGLE_API_KEY']}), openAI({apiKey: process.env['OPENAI_API_KEY']})],
});
