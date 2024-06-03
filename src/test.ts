import { BullexBinary } from './api/bullex/binary';
import { BullexDigital } from './api/bullex/digital';

const email = 'srcanaloficial@gmail.com';
const password = 'samsung2674';

export async function test() {
  const API = new BullexDigital(email, password);

  const isConnected = await API.establishConnection();

  if (!isConnected) {
    return "Couldn't connect";
  }

  console.log({ isConnected: API.isConnected() });

  const trade = await API.buyAndCheckWin({
    active: 'EURUSD-OTC',
    price: 100,
    direction: 'call',
    duration: 1,
    mode: 'demo',
  });

  return trade;
}

test().then(console.log);
