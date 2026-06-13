import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { EmailService } from '../communications/email.service.js';
import { ConfigService } from '../config/config.service.js';

type AlertRecord = {
  status?: unknown;
  labels?: unknown;
  annotations?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
};

@Injectable()
export class AlertmanagerNotificationService {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async notify(payload: unknown) {
    const recipient = this.configService.emailReplyTo ?? this.configService.emailFrom;
    if (!recipient) {
      throw new ServiceUnavailableException('Destinataire des alertes non configure.');
    }

    const record = this.asRecord(payload);
    const status = this.text(record.status, 'unknown');
    const alerts = Array.isArray(record.alerts)
      ? record.alerts.slice(0, 20).map((alert) => this.formatAlert(this.asRecord(alert)))
      : ['Aucun detail d alerte fourni.'];

    await this.emailService.send({
      to: recipient,
      subject: `[C2P][${status.toUpperCase()}] Alerte infrastructure`,
      text: [
        `Statut: ${status}`,
        `Groupe: ${this.text(record.groupKey, 'non renseigne')}`,
        '',
        ...alerts,
      ].join('\n'),
      purpose: 'infrastructure-alert',
    });
  }

  private formatAlert(alert: AlertRecord) {
    const labels = this.asRecord(alert.labels);
    const annotations = this.asRecord(alert.annotations);
    const name = this.text(labels.alertname, 'Alerte sans nom');
    const severity = this.text(labels.severity, 'unknown');
    const summary = this.text(annotations.summary ?? annotations.description, 'Aucun resume');
    return [
      `- ${name} (${severity})`,
      `  Statut: ${this.text(alert.status, 'unknown')}`,
      `  Resume: ${summary}`,
      `  Debut: ${this.text(alert.startsAt, 'non renseigne')}`,
      `  Fin: ${this.text(alert.endsAt, 'non renseigne')}`,
    ].join('\n');
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private text(value: unknown, fallback: string) {
    const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, 500) : fallback;
  }
}
