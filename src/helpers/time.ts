import { format, utcToZonedTime } from 'date-fns-tz';

import { differenceInMilliseconds } from 'date-fns';

const timezone = 'America/Sao_Paulo';

export function currentTime(): string {
  const now = new Date();

  const zonedTime = utcToZonedTime(now, timezone);

  return format(zonedTime, 'HH:mm', { timeZone: timezone });
}

export async function waitForTime(targetTime: string): Promise<void> {
  const now = new Date();
  const zonedNow = utcToZonedTime(now, timezone);

  const targetTimeString = `${format(zonedNow, 'yyyy-MM-dd')}T${targetTime}`;
  const targetDateTime = new Date(targetTimeString);

  if (targetDateTime <= zonedNow) {
    return;
  }

  const timeDifference = differenceInMilliseconds(targetDateTime, zonedNow);

  return await new Promise((resolve) => setTimeout(resolve, timeDifference));
}
