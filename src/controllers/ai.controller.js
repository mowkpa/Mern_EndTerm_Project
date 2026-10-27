import { parseBookingIntent } from '../services/ai.service.js';
import { httpError } from '../utils/httpError.js';

export const parsePrompt = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw httpError(400, 'Prompt string is required in request body');
  }

  const result = await parseBookingIntent(prompt.trim());
  res.status(200).json(result);
};
