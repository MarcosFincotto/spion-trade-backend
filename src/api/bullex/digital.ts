import WebSocket from 'ws';
import axios from 'axios';

import { useEvent } from '../hooks/useEvent';

import { ACTIVES, Active } from './utils/actives';
import { getExpirationTime } from './utils/expiration';

interface Balance {
  id: string;
  amount: number;
}

interface Price {
  strike: string;
  call: { symbol: string };
  put: {
    symbol: string;
  };
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
  digital_options_position_changed1: {
    order_ids: [number];
  };
  close_profit: number;
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
  'profile',
  'front',
  // 'balance-changed',
  'user-settings-changed',
  'client-price-generated',
];

export class BullexDigital {
  private static readonly TIMEOUT = 30 * 1000;

  private static readonly HOST = 'trade.bull-ex.com';

  private static readonly HTTPS_URL = `https://api.${this.HOST}/v2`;
  private static readonly WWS_URL = `wss://ws.${this.HOST}/echo/websocket`;

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
      timeoutId = setTimeout(resolve, BullexDigital.TIMEOUT * 1000);
    });

    const connection = new Promise<void>((resolve) => {
      this.socket = new WebSocket(BullexDigital.WWS_URL);

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
      BullexDigital.TIMEOUT,
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

    await this.event.waitForEvent<number>('timeSync', BullexDigital.TIMEOUT);

    if (!this.serverTimestamp) {
      return false;
    }

    const validated = await this.validateSSID();

    if (validated) {
      return true;
    }

    const auth = await BullexDigital.authenticate(this.email, this.password);

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

    const getInstrumentsResponse = await this.event.waitForEvent<{
      instruments: { index: number }[];
    }>('instruments', BullexDigital.TIMEOUT, () => {
      this.sendMessage('sendMessage', {
        name: 'digital-option-instruments.get-instruments',
        version: '1.0',
        body: { instrument_type: 'digital-option', asset_id: ACTIVES[active] },
      });
    });

    if (!getInstrumentsResponse) {
      return {
        bought: false,
      };
    }

    const instrument_index = getInstrumentsResponse.instruments[0].index;

    const generatePriceResponse = await this.event.waitForEvent<{
      prices: Price[];
    }>('client-price-generated', BullexDigital.TIMEOUT, () => {
      this.sendMessage('subscribeMessage', {
        name: 'price-splitter.client-price-generated',
        version: '1.0',
        params: {
          routingFilters: {
            instrument_type: 'digital-option',
            asset_id: ACTIVES[active],
            instrument_index,
          },
        },
      });
    });

    if (!generatePriceResponse) {
      return {
        bought: false,
      };
    }

    this.sendMessage('subscribeMessage', {
      name: 'portfolio.position-changed',
      version: '3.0',
      params: {
        routingFilters: {
          user_id: 166392072,
          user_balance_id: 1150681408,
          instrument_type: 'digital-option',
        },
      },
    });

    this.sendMessage('subscribeMessage', {
      name: 'portfolio.position-changed',
      version: '3.0',
      params: {
        routingFilters: {
          user_id: 166392072,
          user_balance_id: this.balances[mode].id,
          instrument_type: 'exchange-option',
        },
      },
    });

    const len = generatePriceResponse.prices.length;
    const optionPrice = generatePriceResponse.prices[len - 1];

    const [, option] = getExpirationTime(this.serverTimestamp, duration);

    const data = {
      name: 'digital-options.place-digital-option',
      version: '2.0',
      body: {
        amount: price.toString(),
        asset_id: ACTIVES[active],
        option_type_id: option,
        user_balance_id: this.balances[mode].id,
        instrument_id: optionPrice[direction].symbol,
        instrument_index,
      },
    };

    const response = await this.event.waitForEvent<BuyResponse>(
      'digital-option-placed',
      BullexDigital.TIMEOUT,
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

    await new Promise((resolve) => setTimeout(resolve, 10 * 1000));

    const response = await this.event.waitForEvent<BuyAndCheckWinResponse>(
      'position-changed',
      10 * 60 * 1000 + BullexDigital.TIMEOUT,
      () => {}
    );

    console.log({ response });

    if (!response) {
      return {
        bought: false,
      };
    }

    const gains = response.close_profit;
    const win = gains === price ? null : gains > 0;

    return { bought: true, win, gains };
  }
}
