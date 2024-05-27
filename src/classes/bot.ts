import { admin, db } from '../database/admin';

import { Exnova } from '../api/exnova';
import { Bullex } from '../api/bullex';

import { currentTime, waitForTime } from '../helpers/time';

import type { User } from '../types/User';
import type { Operation } from '../types/Operation';
import type { Trader } from '../types/Trader';

interface OperationResponse {
  success: boolean;
}

export class Bot {
  private API: Exnova | Bullex;

  private readonly query = db.collection('users').doc(this.user.id);

  private async getUser(): Promise<User> {
    const doc = await this.query.get();

    return {
      id: doc.id,
      ...doc.data(),
    } as User;
  }

  private async updateUser(data: Partial<Omit<User, 'id'>>): Promise<void> {
    await this.query.update(data);
  }

  private mode: 'real' | 'demo';

  public constructor(private user: User) {
    const { email, password, ssid } = user.broker;

    this.API = new Bullex(email, password, ssid);

    this.mode = this.user.config.mode;
  }

  public static async authenticate(email: string, password: string) {
    const API = new Exnova(email, password);

    const success = await API.establishConnection();

    API.disconnect();

    return {
      success,
      ssid: API.SSID(),
      realBalance: API.realBalance(),
      demoBalance: API.demoBalance(),
    };
  }

  public async init(): Promise<boolean> {
    const connected = await this.API.establishConnection();

    if (!connected) {
      await this.updateUser({
        isActive: false,
        status: 'Bot desligado: erro ao conectar',
      });

      return false;
    }

    console.log({
      index: 1,
      balance: this.getBalance(),
      APIBalance: this.API.realBalance(),
    });

    await this.updateUser({
      balance: this.API.realBalance(),
      realBalance: this.API.realBalance(),
      demoBalance: this.API.demoBalance(),
      broker: {
        ...this.user.broker,
        ssid: this.API.SSID()!,
      },
    });

    return true;
  }

  public async isActive(): Promise<boolean> {
    const user = await this.getUser();
    return user.isActive;
  }

  private _real_balance: number = this.user.realBalance;

  private _demo_balance: number = this.user.demoBalance;

  private getBalance(mode: 'real' | 'demo' = this.mode): number {
    return {
      real: this._real_balance,
      demo: this._demo_balance,
    }[mode];
  }

  private changeBalance(change: number): void {
    console.log({ called: true, change, mode: this.mode });

    if (this.mode === 'real') {
      this._real_balance += change;
    }

    if (this.mode === 'demo') {
      this._demo_balance += change;
    }
  }

  private _operations = this.user.operations;

  private get operations() {
    return this._operations;
  }

  private async addOperation(
    operation: User['operations'][number]
  ): Promise<void> {
    const user = await this.getUser();

    const operations = user.operations;
    operations.push(operation);

    this._operations = operations;
  }

  private _balance_track = this.user.balanceTrack;

  get balanceTrack() {
    return this._balance_track;
  }

  private async addBalanceTrack(
    track: User['balanceTrack'][number]
  ): Promise<void> {
    const user = await this.getUser();

    const balanceTrack = user.balanceTrack;
    balanceTrack.push(track);

    this._balance_track = balanceTrack;
  }

  private async removeBalanceTrack(
    track: User['balanceTrack'][number]
  ): Promise<void> {
    const user = await this.getUser();

    const balanceTrack = user.balanceTrack;

    if (balanceTrack.includes(track)) {
      this._balance_track = balanceTrack.filter((track) => track !== track);
    }
  }

  private checkStop(): 'stop-win' | 'stop-loss' | 'no-balance' | null {
    const balance = this.getBalance();

    if (balance >= this.user.config.stopWin) {
      return 'stop-win';
    }

    if (balance <= this.user.config.stopLoss) {
      return 'stop-loss';
    }

    if (balance < this.user.config.entry) {
      return 'no-balance';
    }

    return null;
  }

  public async operate({
    time,
    active,
    direction,
    duration,
  }: Operation): Promise<OperationResponse> {
    if (time) {
      await waitForTime(time);
    }

    let transacted = 0;

    const gales = this.user.config.gales;

    for (let gale = 0; gale <= gales; gale++) {
      const isActive = await this.isActive();

      if (!isActive) {
        console.log({ stoped: true, reason: 'bot is not active', isActive });

        return {
          success: false,
        };
      }

      const price =
        this.user.config.galeMultiplier ** gale * this.user.config.entry;

      if (this.getBalance() < price) {
        console.log({
          stoped: true,
          reason: 'Saldo insuficiente',
          balance: this.getBalance(),
          price,
        });

        await this.updateUser({
          isActive: false,
          status: 'Bot desligado: saldo insuficiente',
        });

        return {
          success: false,
        };
      }

      console.log({ balance: this.getBalance(), price });

      this.changeBalance(-price);

      console.log({ newBalance: this.getBalance() });

      const now = currentTime();

      const track = {
        balance: this.getBalance(),
        time: now,
      };

      await this.addBalanceTrack(track);

      await this.updateUser({
        status: 'Realizando operação',
        balance: this.getBalance(),
        realBalance: this.getBalance('real'),
        demoBalance: this.getBalance('demo'),
        balanceTrack: this.balanceTrack,
      });

      const result = await this.API.buyAndCheckWin({
        active,
        price,
        direction,
        duration,
        mode: this.mode,
      });

      console.log({ user: this.user.email, result });

      if (!result.bought) {
        console.log({
          stoped: true,
          reason: 'compra não realizada',
          bought: result.bought,
        });

        this.changeBalance(price);
        await this.removeBalanceTrack(track);

        await this.updateUser({
          status: 'Analisando possível entrada',
          balance: this.getBalance('real'),
          realBalance: this.getBalance('real'),
          demoBalance: this.getBalance('demo'),
          balanceTrack: this.balanceTrack,
        });

        return {
          success: false,
        };
      }

      transacted += price;

      const { win, gains } = result;

      this.changeBalance(result.gains);

      if (result.win !== false) {
        await this.addBalanceTrack({
          balance: this.getBalance(),
          time: currentTime(),
        });
      }

      await this.addOperation({
        active,
        entry: price,
        profit: gains - price,
        time: now,
        win,
      });

      const stop = this.checkStop();
      const toStop = win || !!stop;

      let is_active = !stop;
      let status = toStop
        ? 'Analisando possível entrada'
        : 'Realizando operação';

      if (!win && gale === gales) {
        status = 'Analisando possível entrada';
      }

      if (!is_active) {
        status = {
          'stop-win': 'Bot desligado: stop win atingido',
          'stop-loss': 'Bot desligado: stop loss atingido',
          'no-balance': 'Bot desligado: saldo insuficiente',
        }[stop!];
      }

      const manuallyDeactivated = !(await this.isActive());
      is_active = is_active && !manuallyDeactivated;

      if (manuallyDeactivated) {
        status = 'Bot desligado';
      }

      await this.updateUser({
        isActive: is_active,
        status,
        balance: this.getBalance(),
        realBalance: this.getBalance('real'),
        demoBalance: this.getBalance('demo'),
        operations: this.operations,
        ...(win !== false && { balanceTrack: this.balanceTrack }),
      });

      if (toStop) {
        break;
      }
    }

    this.API.disconnect();

    await this.query.update({
      transacted: admin.firestore.FieldValue.increment(transacted),
    });

    return {
      success: true,
    };
  }

  static async trade(
    trader: Trader,
    operation: Operation
  ): Promise<{ success: boolean }> {
    const credentials = Object.freeze<{ email: string; password: string }>({
      email: 'brunalobodias@hotmail.com',
      password: '@H213p9cr',
    });

    const API = new Exnova(credentials.email, credentials.password);

    const connected = await API.establishConnection();

    if (!connected) {
      return { success: false };
    }

    if (operation.time) {
      await waitForTime(operation.time);
    }

    let operationResult: boolean | null;

    for (let gale = 0; gale <= trader.gales; gale++) {
      const result = await API.buyAndCheckWin({
        active: operation.active,
        price: 5,
        direction: operation.direction,
        duration: operation.duration,
        mode: 'demo',
      });

      if (!result.bought) {
        return { success: false };
      }

      const { win } = result;

      operationResult = win;

      if (win) {
        break;
      }
    }

    API.disconnect();

    const trade = {
      performedAt: admin.firestore.Timestamp.now(),
      active: operation.active,
      direction: operation.direction,
      duration: operation.duration,
      win: operationResult!,
    };

    const query = db.collection('traders').doc(trader.id);

    await query.update({
      trades: admin.firestore.FieldValue.arrayUnion(trade),
    });

    return { success: true };
  }
}
