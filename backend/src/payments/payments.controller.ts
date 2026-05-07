import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { DexPayService } from './dexpay.service.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import {
  appendAppRows,
  listAppRows,
  patchAppRows,
  persistAppStoreToDatabase,
  syncAppStoreFromDatabase,
} from '../data/data.controller.js';
import type { Row } from '../data/mock-store.js';
import { PrismaService } from '../database/prisma.service.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  dexpayCheckoutSchema,
  dexpaySyncSchema,
  type DexPayCheckoutDto,
  type DexPaySyncDto,
} from './dto/dexpay.dto.js';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly dexPayService: DexPayService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dexpay/status')
  async getDexPayStatus(@Req() request: AuthenticatedRequest) {
    this.getActor(request);
    return this.dexPayService.getStatus();
  }

  @Get('dexpay/banks')
  async getDexPayBanks(@Req() request: AuthenticatedRequest) {
    this.getActor(request);
    return this.dexPayService.getBanks();
  }

  @Post('dexpay/checkout')
  async createDexPayCheckout(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(dexpayCheckoutSchema)) payload: DexPayCheckoutDto,
  ) {
    const actor = this.getActor(request);
    await syncAppStoreFromDatabase(this.prisma);

    const checkout = await this.dexPayService.createCheckout(payload);
    const transaction = {
      id: `trx-dxp-${Date.now()}`,
      user_id: actor.id,
      type: payload.direction === 'onramp' ? 'deposit' : 'withdrawal',
      amount: Number(checkout.order.fiatAmount ?? checkout.quote.fiatAmount ?? payload.fiatAmount ?? 0),
      currency: 'XAF',
      method: 'dexpay',
      status: this.mapStatus(checkout.order.status),
      description: payload.direction === 'onramp'
        ? `DexPay on-ramp ${payload.asset}/${payload.chain}`
        : `DexPay off-ramp ${payload.asset}/${payload.chain}`,
      date: checkout.order.createdAt ?? new Date().toISOString(),
      reference: checkout.order.id,
      provider: 'dexpay',
      provider_quote_id: checkout.quote.id,
      provider_order_id: checkout.order.id,
      provider_status: checkout.order.status ?? 'PENDING',
      payment_account: checkout.order.paymentAccount ?? null,
      deposit_address: checkout.order.address ?? null,
      asset: payload.asset,
      chain: payload.chain,
      direction: payload.direction,
      settled_to_wallet: false,
    } satisfies Row;

    appendAppRows('payment_transactions', [transaction]);
    await persistAppStoreToDatabase(this.prisma);

    return {
      transaction,
      quote: checkout.quote,
      order: checkout.order,
    };
  }

  @Post('dexpay/orders/:orderId/sync')
  async syncDexPayOrder(
    @Req() request: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(dexpaySyncSchema)) payload: DexPaySyncDto,
  ) {
    const actor = this.getActor(request);
    await syncAppStoreFromDatabase(this.prisma);

    const order = await this.dexPayService.getOrder(orderId);
    const status = this.mapStatus(order.status);
    const matchingTransaction = listAppRows('payment_transactions').find((row) => (
      String(row.user_id) === actor.id
      && String(row.provider_order_id ?? row.reference) === orderId
      && (!payload.transactionId || String(row.id) === payload.transactionId)
    ));

    if (!matchingTransaction) {
      throw new UnauthorizedException('Transaction DexPay introuvable pour cet utilisateur.');
    }

    const updatedRows = patchAppRows(
      'payment_transactions',
      (row) => String(row.id) === String(matchingTransaction.id),
      (row) => ({
        ...row,
        status,
        provider_status: order.status ?? row.provider_status,
        payment_account: order.paymentAccount ?? row.payment_account ?? null,
        deposit_address: order.address ?? row.deposit_address ?? null,
      }),
    );

    const updatedTransaction = updatedRows[0] as (Row & {
      id?: string;
      type?: string;
      amount?: number | string;
      settled_to_wallet?: boolean;
    }) | undefined;
    if (updatedTransaction && status === 'completed' && updatedTransaction.type === 'deposit' && !updatedTransaction.settled_to_wallet) {
      this.creditWallet(actor.id, Number(updatedTransaction.amount ?? 0));
      patchAppRows('payment_transactions', (row) => String(row.id) === String(updatedTransaction.id), {
        settled_to_wallet: true,
      });
    }

    await persistAppStoreToDatabase(this.prisma);
    const currentTransaction = listAppRows('payment_transactions').find((row) => String(row.id) === String(matchingTransaction.id));
    return {
      order,
      transaction: currentTransaction ?? matchingTransaction,
    };
  }

  private getActor(request: AuthenticatedRequest) {
    if (!request.auth?.user) {
      throw new UnauthorizedException('Authentification requise.');
    }
    return request.auth.user;
  }

  private mapStatus(status?: string) {
    const normalized = String(status ?? '').trim().toUpperCase();
    if (['COMPLETED', 'SUCCESS', 'SETTLED'].includes(normalized)) return 'completed';
    if (['FAILED', 'ERROR', 'REJECTED', 'EXPIRED'].includes(normalized)) return 'failed';
    if (['CANCELLED', 'CANCELED'].includes(normalized)) return 'cancelled';
    return 'pending';
  }

  private creditWallet(userId: string, amount: number) {
    if (amount <= 0) return;
    const wallet = listAppRows('wallet_accounts').find((row) => String(row.user_id) === userId);
    if (!wallet) {
      appendAppRows('wallet_accounts', [{
        id: `wallet-${userId}`,
        user_id: userId,
        balance: amount,
        currency: 'XAF',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      return;
    }

    patchAppRows('wallet_accounts', (row) => String(row.id) === String(wallet.id), {
      balance: Number(wallet.balance ?? 0) + amount,
      updated_at: new Date().toISOString(),
    });
  }
}
