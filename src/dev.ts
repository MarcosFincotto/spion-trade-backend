import { db } from './database/admin';

import { Bot } from './classes/bot';

import type { User } from './types/User';

async function main() {
  const query = db.collection('users').doc('');

  const doc = await query.get();

  const user = {
    id: doc.id,
    ...doc.data(),
  } as User;

  const bot = new Bot(user);

  const connected = await bot.init();

  console.log({ connected });

  const result = await bot.operate({
    active: 'EURUSD',
    direction: 'call',
    duration: 1,
  });

  console.log({ result });
}
