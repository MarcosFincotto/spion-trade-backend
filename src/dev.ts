import { db } from './database/admin';

import type { User } from './types/User';
import type { Operation } from './types/Operation';
import axios from 'axios';

// samuel.rochaat@gmail.com
// samsung2674

async function main() {
  const query = db.collection('users').doc('IDu821BRUCC091gEmjE9');

  const doc = await query.get();

  const user = {
    id: doc.id,
    ...doc.data(),
  } as User;

  const operation: Operation = {
    active: 'EURUSD-OTC',
    direction: 'call',
    duration: 1,
    time: '10:00',
  };

  return await axios.post('http://localhost:6969/operate', {
    user,
    operation,
  });
}

main();
