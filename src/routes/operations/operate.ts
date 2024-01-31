import { Router, Request, Response } from 'express';

import { Bot } from '../../classes/bot';

import type { User } from '../../types/User';
import type { Operation } from '../../types/Operation';

type RequestBody = {
  user: User;
  operation: Operation;
};

const operation = Router();

operation.post('/operate', async (req: Request, res: Response) => {
  const { user, operation }: RequestBody = req.body;

  console.log({
    user: user.email,
    balance: user.balance,
    realBalance: user.realBalance,
    operation: operation.active,
  });

  const bot = new Bot(user);

  const connected = await bot.init();

  console.log({ user: user.email, connected });

  if (!connected) {
    return res.status(200).json({ success: false });
  }

  const trade = await bot.operate(operation).catch((err) => console.log(err));

  console.log({ user: user.email, trade });

  return res.status(200).json(trade);
});

export default operation;
