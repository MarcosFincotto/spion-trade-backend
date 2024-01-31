import WebSocket from 'ws';
import axios from 'axios';

import { useEvent } from '../hooks/useEvent';

import { ACTIVES, Active } from './utils/actives';
import { getExpirationTime } from './utils/expiration';

interface Balance {
  id: string;
  amount: number;
}

type AuthSuccess = {
  success: true;
  ssid: string;
};

type AuthFailure = {
  success: false;
};

interface SSIDResponse {
  balances: [real: Balance, demo: Balance];
}

interface BuyProps {
  active: Active;
  price: number;
  direction: 'call' | 'put';
  duration: number;
  mode: 'real' | 'demo';
}

interface BuyResponse {
  id: number;
}

type BuySuccess = {
  bought: true;
  id: number;
};

type BuyFailure = {
  bought: false;
};

interface BuyAndCheckWinResponse {
  id: number;
  win: 'win' | 'equal' | 'loose';
  profit_amount: string;
}

type BuyAndCheckWinSuccess = {
  bought: true;
  win: boolean | null;
  gains: number;
};

type BuyAndCheckWinFailure = {
  bought: false;
};

const DEBUG = true;

const UNINSTERESTED = [
  'timeSync',
  'heartbeat',
  'front',
  'profile',
  'balance-changed',
  'chat-state-updated',
  'option-archived',
  'option-changed',
  'user-settings-changed',
];

export class Exnova {
  private static readonly TIMEOUT = 30 * 1000;

  private static readonly HOST = 'trade.exnova.com';

  private static readonly HTTPS_URL = `https://api.${this.HOST}/v2`;
  private static readonly WWS_URL = `wss://${this.HOST}/echo/websocket`;

  private serverTimestamp: number | null = null;

  private readonly event = useEvent();

  private socket?: WebSocket;

  public balances?: { real: Balance; demo: Balance };

  public realBalance(): number | undefined {
    return this.balances?.real.amount;
  }

  public demoBalance(): number | undefined {
    return this.balances?.demo.amount;
  }

  public SSID(): string | undefined {
    return this.ssid;
  }

  public constructor(
    private email: string,
    private password: string,
    private ssid?: string
  ) {}

  private onMessage(data: WebSocket.RawData): void {
    const datum: { name: string; msg: any } = JSON.parse(
      data.toString('utf-8')
    );

    if (DEBUG && !UNINSTERESTED.includes(datum.name)) {
      console.log({ name: datum.name, msg: datum.msg });
    }

    if (datum.name === 'timeSync') {
      this.serverTimestamp = Math.floor(datum.msg / 1000);
    }

    this.event.listen(datum.name, datum.msg);
  }

  private sendMessage(name: string, data: any): boolean {
    if (!this.isConnected()) {
      return false;
    }

    const id = new Date().getMilliseconds();

    const message = JSON.stringify({
      name,
      msg: data,
      request_id: id,
    });

    this.socket?.send(message);

    return true;
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public async connect(): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }

    let timeoutId: NodeJS.Timeout;

    const timeout = new Promise<void>((resolve) => {
      timeoutId = setTimeout(resolve, Exnova.TIMEOUT * 1000);
    });

    const connection = new Promise<void>((resolve) => {
      this.socket = new WebSocket(Exnova.WWS_URL);

      this.socket.on('message', (data) => this.onMessage(data));

      this.socket.on('close', () => {
        if (DEBUG) {
          console.log('Connection closed at', new Date().toISOString());
        }
      });

      this.socket.on('error', (error: string | symbol) => {
        if (DEBUG) {
          console.error(error);
        }
      });

      this.socket.on('open', () => {
        if (DEBUG) {
          console.info('Connection opened at', new Date().toISOString());
        }

        clearTimeout(timeoutId);
        resolve();
      });
    });

    await Promise.race([timeout, connection]);

    return this.isConnected();
  }

  public disconnect(): void {
    if (!this.isConnected()) {
      return;
    }

    this.socket?.close(1000, 'Closing connection normally');
  }

  public static async authenticate(
    email: string,
    password: string
  ): Promise<AuthSuccess | AuthFailure> {
    try {
      const { data } = await axios.post<{ code: string; ssid: string }>(
        `${this.HTTPS_URL}/login`,
        {
          identifier: email,
          password,
        }
      );

      return {
        success: data.code === 'success',
        ssid: data.ssid,
      };
    } catch (err) {
      return {
        success: false,
      };
    }
  }

  private async validateSSID(): Promise<boolean> {
    if (!this.ssid) {
      return false;
    }

    const response = await this.event.waitForEvent<SSIDResponse | false>(
      'profile',
      Exnova.TIMEOUT,
      () => this.sendMessage('ssid', this.ssid)
    );

    if (!response) {
      return false;
    }

    const [real, demo] = response.balances;

    this.balances = { real, demo };

    return true;
  }

  public async establishConnection(): Promise<boolean> {
    const connected = await this.connect();

    if (!connected) {
      return false;
    }

    await this.event.waitForEvent<number>('timeSync', Exnova.TIMEOUT);

    if (!this.serverTimestamp) {
      return false;
    }

    const validated = await this.validateSSID();

    if (validated) {
      return true;
    }

    const auth = await Exnova.authenticate(this.email, this.password);

    console.log({ ref: 'Exnova.authenticate', auth });

    if (!auth.success) {
      return false;
    }

    this.ssid = auth.ssid;

    return await this.establishConnection();
  }

  public async buy({
    active,
    price,
    direction,
    duration,
    mode,
  }: BuyProps): Promise<BuySuccess | BuyFailure> {
    if (!this.serverTimestamp || !this.balances) {
      console.log({
        serverTimestamp: this.serverTimestamp,
        balances: this.balances,
      });

      throw new Error('API connection is not established');
    }

    const [expired, option] = getExpirationTime(this.serverTimestamp, duration);

    const data = {
      name: 'binary-options.open-option',
      version: '1.0',
      body: {
        price,
        active_id: ACTIVES[active],
        expired,
        direction: direction.toLocaleLowerCase(),
        option_type_id: option,
        user_balance_id: this.balances[mode].id,
      },
    };

    const response = await this.event.waitForEvent<BuyResponse>(
      'socket-option-opened',
      Exnova.TIMEOUT,
      () => this.sendMessage('sendMessage', data)
    );

    if (!response) {
      return {
        bought: false,
      };
    }

    return {
      bought: true,
      id: response.id,
    };
  }

  public async buyAndCheckWin({
    active,
    price,
    direction,
    duration,
    mode,
  }: BuyProps): Promise<BuyAndCheckWinSuccess | BuyAndCheckWinFailure> {
    const result = await this.buy({ active, price, direction, duration, mode });

    if (!result.bought) {
      return result;
    }

    const response = await this.event.waitForEvent<BuyAndCheckWinResponse>(
      'socket-option-closed',
      duration * 60 * 1000 + Exnova.TIMEOUT,
      () => {},
      (data) => data.id === result.id
    );

    if (!response) {
      return {
        bought: false,
      };
    }

    const win = { win: true, equal: null, loose: false }[response.win];
    const gains = parseFloat(response.profit_amount);

    return { bought: true, win, gains };
  }
}
