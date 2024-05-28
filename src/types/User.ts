import { Timestamp } from 'firebase-admin/firestore';

type Operation = {
  active: string;
  entry: number;
  profit: number;
  time: string;
  win: boolean | null;
};

type BalanceTrack = {
  balance: number;
  time: string;
};

export type User = {
  id: string;

  email: string;
  transacted: number;

  licenseUntil: Timestamp;

  broker: {
    name: 'exnova' | 'bullex';
    email: string;
    password: string;
    ssid: string;
  };

  status: string;

  isActive: boolean;

  balance: number;
  realBalance: number;
  demoBalance: number;

  config: {
    mode: 'real' | 'demo';

    strategy: string;

    entry: number;

    gales: number;
    galeMultiplier: number;

    stopWin: number;
    stopLoss: number;
  };

  operations: Operation[];
  balanceTrack: BalanceTrack[];
};
