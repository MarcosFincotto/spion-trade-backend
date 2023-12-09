import { Timestamp } from 'firebase-admin/firestore';

import { Active } from '../api/dayprofit/utils/actives';

export const traders = ['Gregório H.'] as const;

export type Trade = {
  performedAt: Timestamp;
  active: Active;
  direction: 'call' | 'put';
  duration: number;
  win: boolean | null;
};

export type Trader = {
  id: string;
  name: (typeof traders)[number];
  trades: Trade[];
  gales: number;
};
