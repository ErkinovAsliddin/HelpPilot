// src/routes/chat.ts
// Feature: helppilot — Admin AI Assistant route

import { Router } from 'express';
import { answerAdminQuestion } from '../services/adminChatService.js';
import { log } from '../utils/logger.js';

const router = Router();

router.post('/api/chat/admin', async (req, res) => {
  const body = req.body as Record<string, string>;
  const message = body['message'];

  if (!message || !message.trim()) {
    res.status(400).json({ error: '"message" is required.' });
    return;
  }
  if (message.length > 2000) {
    res.status(400).json({ error: '"message" must not exceed 2000 characters.' });
    return;
  }

  try {
    const { reply, mock } = await answerAdminQuestion(message.trim());
    res.json({ reply, mock });
  } catch (err) {
    log({ level: 'error', eventType: 'chat.admin.route.error', message: String(err) });
    res.status(500).json({ error: 'Failed to get a response from the assistant.' });
  }
});

export default router;
