class OpenAIClient {
  constructor(options = {}) {
    const { apiKey, baseURL, fetch: customFetch } = options;
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.baseURL = (baseURL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.fetchImpl = customFetch ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);

    if (!this.fetchImpl) {
      throw new Error('Fetch implementation is required to use the OpenAI client.');
    }

    this.moderations = {
      create: (params) => this.createModeration(params),
    };
  }

  async createModeration(params) {
    if (!params) {
      throw new TypeError('Moderation parameters are required.');
    }

    const { model, input } = params;

    if (!model) {
      throw new TypeError('The moderation request must include a model.');
    }

    if (typeof input === 'undefined' || input === null) {
      throw new TypeError('The moderation request must include an input.');
    }

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const response = await this.fetchImpl(`${this.baseURL}/moderations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, input }),
    });

    if (!response.ok) {
      const message = await this.#safeReadError(response);
      throw new Error(`OpenAI moderation request failed with status ${response.status}: ${message}`);
    }

    return response.json();
  }

  async #safeReadError(response) {
    try {
      const data = await response.json();
      if (data && typeof data === 'object' && 'error' in data) {
        const err = data.error;
        if (typeof err === 'string') {
          return err;
        }
        if (err && typeof err === 'object' && 'message' in err) {
          return err.message;
        }
      }
      return JSON.stringify(data);
    } catch (_error) {
      try {
        return await response.text();
      } catch (error) {
        return String(error);
      }
    }
  }
}

export default OpenAIClient;
export { OpenAIClient as OpenAI };
