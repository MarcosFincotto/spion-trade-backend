export function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function getExpirationTime(
  timestamp: number,
  duration: number
): [number, number] {
  let nowDate = new Date(timestamp * 1000);

  let expDate = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
    nowDate.getHours(),
    nowDate.getMinutes(),
    0,
    0
  );

  if (
    dateToTimestamp(new Date(expDate.getTime() + 1 * 60000)) >
    timestamp + 30
  ) {
    expDate = new Date(expDate.getTime() + 1 * 60000);
  } else {
    expDate = new Date(expDate.getTime() + 2 * 60000);
  }

  let expTimes: number[] = [];
  for (let i = 0; i < 6; i++) {
    expTimes.push(dateToTimestamp(new Date(expDate.getTime() + i * 60000)));
  }

  let targetTime = timestamp + duration * 60;
  let potentialExpDate = new Date(expDate.getTime() + 5 * 60000);

  while (dateToTimestamp(potentialExpDate) <= targetTime + 15 * 60) {
    if (potentialExpDate.getMinutes() % 15 === 0) {
      expTimes.push(dateToTimestamp(potentialExpDate));
    }
    potentialExpDate = new Date(potentialExpDate.getTime() + 1 * 60000);
  }

  let closestExpTime = expTimes.reduce((a, b) => {
    return Math.abs(b - targetTime) < Math.abs(a - targetTime) ? b : a;
  });

  let idx = expTimes.indexOf(closestExpTime);
  let option = idx < 5 ? 3 : 1;

  return [Math.floor(closestExpTime), option];
}
