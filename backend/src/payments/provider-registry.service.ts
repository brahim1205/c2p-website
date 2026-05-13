import { Injectable } from '@nestjs/common';
import { DexPayService } from './dexpay.service.js';

export type SupportedPaymentProvider = 'dexpay';

@Injectable()
export class ProviderRegistryService {
  constructor(private readonly dexPayService: DexPayService) {}

  get(provider: SupportedPaymentProvider) {
    switch (provider) {
      case 'dexpay':
      default:
        return this.dexPayService;
    }
  }

  getDexPay() {
    return this.dexPayService;
  }
}
