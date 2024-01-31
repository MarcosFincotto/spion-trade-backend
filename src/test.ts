import { Bot } from './classes/bot';

const email = 'samuel.rochaat@gmail.com';
const password = 'samsung2674';

export async function test() {
  const auth = await Bot.authenticate(email, password);

  console.log(auth);

  return 'done';
}

test().then(console.log);
