import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

// Cloud STT against any OpenAI-compatible /audio/transcriptions endpoint.
// Groq (whisper-large-v3) and OpenAI both speak this protocol, so the
// provider is just a base URL + model + key (PRD Open Question #3: decide
// Groq vs OpenAI on a latency test, not spec sheets — flipping providers
// is a settings change).

export const PROVIDERS = {
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'whisper-large-v3',
    apiKeyEnvVar: 'GROQ_API_KEY',
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'whisper-1',
    apiKeyEnvVar: 'OPENAI_API_KEY',
  },
};

export function cloudTranscriber({
  provider = 'groq',
  apiKey,
  vocabularyHint = [],
  fetchImpl = fetch,
}) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown cloud provider: ${provider}`);

  return {
    async transcribe(audioFilePath) {
      if (!apiKey) {
        throw new Error(
          `Missing API key — set ${config.apiKeyEnvVar} in your environment or .env`);
      }
      const audio = await readFile(audioFilePath);
      const form = new FormData();
      form.append('model', config.model);
      form.append('language', 'en');
      form.append('response_format', 'json');
      form.append('temperature', '0');
      if (vocabularyHint.length > 0) {
        // Whisper's prompt field biases decoding toward these spellings
        // (PRD: static user-editable word list, no learning).
        form.append('prompt', vocabularyHint.join(', '));
      }
      form.append(
        'file',
        new Blob([audio], { type: 'audio/wav' }),
        basename(audioFilePath));

      const res = await fetchImpl(`${config.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        throw new Error(`${provider} STT error ${res.status}: ${await res.text()}`);
      }
      const json = await res.json();
      if (typeof json?.text !== 'string') {
        throw new Error(`Malformed ${provider} STT response`);
      }
      return json.text.trim();
    },
  };
}
