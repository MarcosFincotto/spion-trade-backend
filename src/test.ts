import { Bot } from './classes/bot';

const email = 'srcanaloficial@gmail.com';
const password = 'samsung2674';

export async function test() {
  const auth = await Bot.authenticate(email, password, 'bullex');

  console.log(auth);

  return 'done';
}

test().then(console.log);
