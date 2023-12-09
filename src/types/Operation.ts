import { Active } from '../api/dayprofit/utils/actives';

export type Operation = {
  time?: string;
  active: Active;
  direction: 'call' | 'put';
  duration: number;
};
