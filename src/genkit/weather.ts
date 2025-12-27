import {openAI} from '@genkit-ai/compat-oai/openai';
import {z} from 'zod';
import {ai} from './genkit';

interface GeocodingResult {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    country: string;
  }>;
}

interface WeatherResponse {
  current_weather: {
    temperature: number;
    weathercode: number;
    windspeed: number;
  };
}

const weatherCodeToCondition = (code: number): string => {
  const conditions: Record<number, string> = {
    0: 'ensoleillé',
    1: 'principalement dégagé',
    2: 'partiellement nuageux',
    3: 'couvert',
    45: 'brouillard',
    48: 'brouillard givrant',
    51: 'bruine légère',
    53: 'bruine modérée',
    55: 'bruine dense',
    61: 'pluie légère',
    63: 'pluie modérée',
    65: 'pluie forte',
    71: 'neige légère',
    73: 'neige modérée',
    75: 'neige forte',
    80: 'averses légères',
    81: 'averses modérées',
    82: 'averses violentes',
    95: 'orage',
    96: 'orage avec grêle légère',
    99: 'orage avec grêle forte',
  };
  return conditions[code] ?? 'inconnu';
};

const getWeatherTool = ai.defineTool(
  {
    name: 'getWeather',
    description: 'Get current weather for a city including temperature and conditions',
    inputSchema: z.object({ city: z.string().describe('The city name to get weather for') }),
    outputSchema: z.object({
      temp: z.number().describe('Temperature in Celsius'),
      condition: z.string().describe('Weather condition description'),
      windspeed: z.number().describe('Wind speed in km/h'),
      city: z.string().describe('Resolved city name'),
      country: z.string().describe('Country of the city'),
    }),
  },
  async ({ city }) => {
    console.log('city', city);
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1&language=fr`
    );
    const geoData: GeocodingResult = await geoResponse.json();

    if (!geoData.results?.length) {
      throw new Error(`Ville "${city}" non trouvée`);
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // 2. Météo: récupérer les conditions actuelles
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    const weatherData: WeatherResponse = await weatherResponse.json();

    const { temperature, weathercode, windspeed } = weatherData.current_weather;

    return {
      temp: temperature,
      condition: weatherCodeToCondition(weathercode),
      windspeed,
      city: name,
      country,
    };
  }
);

export const weatherAgent = ai.definePrompt({
  name: 'weatherAgent',
  model: openAI.model('gpt-4o-mini'),
  description: 'AI agent answering questions about the weather.',
  input: {
    schema: z.object({
      query: z.string().describe('The weather question to answer'),
    }),
  },
  tools: [getWeatherTool],
  system: `You are an AI agent answering questions about the weather.
      You can use the tool getWeather to get the weather conditions of a city.
      You answer in English.
    `,
});
