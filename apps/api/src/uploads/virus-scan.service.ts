import { Injectable, Logger } from '@nestjs/common';
import { scanBufferViaClamd } from './clamav.client';

export type VirusScanFailureCode = 'MALWARE' | 'SCAN_ERROR' | 'UNAVAILABLE';

export class VirusScanFailedError extends Error {
  constructor(
    message: string,
    readonly code: VirusScanFailureCode,
  ) {
    super(message);
    this.name = 'VirusScanFailedError';
  }
}

@Injectable()
export class VirusScanService {
  private readonly logger = new Logger(VirusScanService.name);
  private readonly enabled = process.env.CLAMAV_ENABLED !== 'false';
  private readonly host = process.env.CLAMAV_HOST;
  private readonly port = Number(process.env.CLAMAV_PORT ?? 3310);
  private readonly timeoutMs = Number(process.env.CLAMAV_TIMEOUT_MS ?? 60_000);

  isEnabled(): boolean {
    return this.enabled && Boolean(this.host);
  }

  async scanBuffer(buffer: Buffer): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    if (buffer.length === 0) {
      throw new VirusScanFailedError('Arquivo vazio não pode ser enviado.', 'SCAN_ERROR');
    }

    let verdict: Awaited<ReturnType<typeof scanBufferViaClamd>>;
    try {
      verdict = await scanBufferViaClamd(buffer, {
        host: this.host!,
        port: this.port,
        timeout: this.timeoutMs,
        retries: 2,
        retryDelay: 1000,
      });
    } catch (error) {
      this.logger.error('ClamAV indisponível', error);
      throw new VirusScanFailedError(
        'Verificação de segurança indisponível. Tente novamente em instantes.',
        'UNAVAILABLE',
      );
    }

    if (verdict === 'malicious') {
      throw new VirusScanFailedError(
        'Arquivo rejeitado: possível malware detectado.',
        'MALWARE',
      );
    }

    if (verdict === 'error') {
      this.logger.warn('ClamAV retornou resposta inesperada no scan');
      throw new VirusScanFailedError(
        'Não foi possível verificar o arquivo com segurança.',
        'SCAN_ERROR',
      );
    }
  }
}
