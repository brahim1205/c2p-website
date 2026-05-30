import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EmailService } from '../communications/email.service.js';
import { SmsService } from '../communications/sms.service.js';
import type { StoredUser } from './auth.store.js';

@Injectable()
export class AuthSecurityDeliveryService {
  private readonly logger = new Logger(AuthSecurityDeliveryService.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  async deliverSecurityCode(
    user: StoredUser,
    code: string,
    purpose: 'two-factor' | 'password-reset',
  ) {
    const message = purpose === 'password-reset'
      ? `Votre code de reinitialisation C2P est ${code}. Il expire dans 10 minutes.`
      : `Votre code de verification C2P est ${code}. Il expire dans 10 minutes.`;
    const deliveries: Array<Promise<unknown>> = [];

    if (user.phone) {
      deliveries.push(this.smsService.send({
        phone: user.phone,
        message,
        purpose,
        userId: user.id,
      }));
    }

    if (user.email) {
      deliveries.push(this.emailService.send({
        to: user.email,
        subject: purpose === 'password-reset'
          ? 'Code de reinitialisation C2P'
          : 'Code de verification C2P',
        text: message,
        html: `<p>${message}</p>`,
        purpose,
        userId: user.id,
      }));
    }

    if (deliveries.length === 0) {
      throw new BadRequestException('Aucun canal de verification n est associe a ce compte.');
    }

    const results = await Promise.allSettled(deliveries);
    if (results.some((result) => result.status === 'fulfilled')) {
      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.warn(`Security code secondary delivery failed: ${String(result.reason)}`);
        }
      }
      return;
    }

    throw new ServiceUnavailableException('Aucun canal de verification disponible.');
  }
}
