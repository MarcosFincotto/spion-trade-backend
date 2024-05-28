export const BROKERS = ['exnova', 'bullex'] as const;

export type Broker = (typeof BROKERS)[number];
