import * as net from 'net';

const CLAMD_INSTREAM = Buffer.from('zINSTREAM\0');
const CHUNK_SIZE = 64 * 1024;

export type ClamavVerdict = 'clean' | 'malicious' | 'error';

export interface ClamavScanOptions {
  host: string;
  port: number;
  timeout: number;
  retries?: number;
  retryDelay?: number;
}

function parseClamdResponse(raw: Buffer): ClamavVerdict {
  const text = raw.toString('utf8').replace(/\0/g, '').trim();
  if (text === 'stream: OK' || text.endsWith(': OK')) {
    return 'clean';
  }
  if (text.includes(' FOUND')) {
    return 'malicious';
  }
  return 'error';
}

function scanBufferAttempt(buffer: Buffer, options: ClamavScanOptions): Promise<ClamavVerdict> {
  const { host, port, timeout } = options;

  return new Promise((resolve, reject) => {
    const conn = net.createConnection({ host, port });
    const chunks: Buffer[] = [];
    let settled = false;

    const settle = <T>(fn: (value: T) => void, value: T) => {
      if (settled) return;
      settled = true;
      conn.destroy();
      fn(value);
    };

    conn.setTimeout(timeout);
    conn.on('timeout', () =>
      settle(reject, new Error(`clamd connection timed out after ${timeout}ms`)),
    );
    conn.on('error', (err) => settle(reject, err));
    conn.on('data', (chunk) => chunks.push(chunk));
    conn.on('end', () => settle(resolve, parseClamdResponse(Buffer.concat(chunks))));

    conn.on('connect', () => {
      conn.write(CLAMD_INSTREAM);

      let offset = 0;
      while (offset < buffer.length) {
        const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
        const header = Buffer.allocUnsafe(4);
        header.writeUInt32BE(chunk.length, 0);
        conn.write(header);
        conn.write(chunk);
        offset += chunk.length;
      }

      conn.write(Buffer.alloc(4));
      conn.end();
    });
  });
}

export async function scanBufferViaClamd(
  buffer: Buffer,
  options: ClamavScanOptions,
): Promise<ClamavVerdict> {
  const retries = options.retries ?? 0;
  const retryDelay = options.retryDelay ?? 1000;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await scanBufferAttempt(buffer, options);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError;
}
