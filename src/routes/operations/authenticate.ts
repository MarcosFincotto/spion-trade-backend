import { Router, Request, Response } from 'express';

import { Bot } from '../../classes/bot';

import { BROKERS } from '../../types/broker';

const authentication = Router();

import { z } from 'zod';

const schema = z.object({
  broker: z.enum(BROKERS),
  email: z.string().min(1),
  password: z.string().min(1),
});

authentication.post('/authenticate', async (req: Request, res: Response) => {
  const validation = schema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      message: validation.error.issues,
    });
  }

  const { broker, email, password } = validation.data;

  const auth = await Bot.authenticate(email, password, broker);

  return res.status(200).json(auth);
});

export default authentication;
