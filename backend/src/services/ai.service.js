import { env } from '../config/env.js';

export const parseBookingIntent = async (prompt) => {
  if (!env.ANTHROPIC_API_KEY) {
    return {
      parsed: null,
      message: 'AI booking assistant is not configured on this instance. Please use the filters above.',
    };
  }

  try {
    // Dynamic import to avoid hard dependency if not installed
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.AI_MODEL || 'claude-haiku-5-5',
        max_tokens: 300,
        system:
          'You extract campus room search parameters from natural language. Output JSON with: date (YYYY-MM-DD), startHour (integer 0-23), capacity (integer), equipment (array of strings: computers, projector, whiteboard, ac), roomName (string or null).',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API returned status ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const parsed = JSON.parse(content);
    return { parsed, message: 'Intent parsed successfully' };
  } catch (error) {
    return {
      parsed: null,
      message: 'Unable to parse natural language query. Please use manual filters.',
    };
  }
};
