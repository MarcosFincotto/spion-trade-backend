import { Router, Request, Response } from 'express';

import { Bot } from '../../classes/bot';

import { db } from '../../database/admin';

import type { Trader } from '../../types/Trader';
import type { Operation } from '../../types/Operation';

const trader = Router();

type RequestBody = {
  trader: Trader['name'];
  operation: Operation;
};

trader.post('/account-trader', async (req: Request, res: Response) => {
  const { trader, operation }: RequestBody = req.body;

  const snapshot = await db
    .collection('traders')
    .where('name', '==', trader)
    .get();

  const doc = snapshot.docs[0];

  const data = { id: doc.id, ...doc.data() } as Trader;

  const { success } = await Bot.trade(data, operation);

  console.log(`Trader Account - ${data.name} - Accounted: ${success}`);

  return res.status(200).json({ success });
});

export default trader;
