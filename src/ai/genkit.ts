import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// This will initialize the Google AI plugin.
// It will automatically use the GOOGLE_API_KEY environment variable.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  logSinks: [],
  enableTracing: false,
});
