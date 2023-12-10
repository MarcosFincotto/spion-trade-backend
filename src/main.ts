import axios from 'axios';

import schedule from 'node-schedule';

import { db } from './database/admin';

import { parse, addMinutes, format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

import type { User } from './types/User';

interface Operation {
  duration: number;
  active: string;
  time: string;
  direction: string;
}

const SERVER_URL = 'server-typescript-d6268.ondigitalocean.app';

function parseOperations(operations: string): Operation[] {
  const parsed = operations.split(' ').map((operation) => {
    const match = operation.match(/^M(\d+);([^;]+);(\d{2}:\d{2});([^;]+)$/);

    if (!match) {
      return null;
    }

    const [, durationStr, active, time, direction] = match;
    const duration = parseInt(durationStr, 10) * 60;

    return {
      active,
      direction,
      duration,
      time,
    };
  });

  return parsed.filter((val) => val !== null) as Operation[];
}

function isNextMinute(operationTime: string): boolean {
  const timeZone = 'America/Sao_Paulo';
  const currentTime = new Date();

  const currentTimeSaoPaulo = utcToZonedTime(currentTime, timeZone);

  const inputTimeAsDate = parse(operationTime, 'HH:mm', currentTimeSaoPaulo);

  const nextMinute = addMinutes(currentTimeSaoPaulo, 1);

  const formattedInputTime = format(inputTimeAsDate, 'HH:mm');
  const formattedNextMinute = format(nextMinute, 'HH:mm');

  return formattedInputTime === formattedNextMinute;
}

async function triggerOperations(operation: Operation): Promise<void> {
  const snapshot = await db
    .collection('users')
    .where('isActive', '==', true)
    .where('status', '==', 'Analisando o mercado')
    .get();

  const users = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as User)
  );

  const promises = users.map((user) =>
    axios.post(SERVER_URL + '/operation', {
      user,
      operation,
    })
  );

  console.log(`Operating for ${users.length} users.`);

  await Promise.all(promises);
}

schedule.scheduleJob('0 * * * * *', async () => {
  const doc = await db.collection('system').doc('private').get();

  const operations = parseOperations(doc.data()!.operations);

  const operation = operations.find((operation) =>
    isNextMinute(operation.time)
  );

  if (!operation) {
    return;
  }

  console.log('operation match!');
  console.log(operation);

  triggerOperations(operation);
});
