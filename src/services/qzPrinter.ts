// Impression silencieuse vers une imprimante choisie, via QZ Tray (https://qz.io)
// QZ Tray doit être installé et lancé sur le PC. Sans lui, l'app retombe sur l'impression Chrome.
// @ts-expect-error : pas de types fournis par qz-tray
import qz from 'qz-tray';

// Certificat auto-signé de l'app : à ajouter UNE fois dans QZ Tray
// (icône QZ → Advanced → Site Manager → + → kiosk/qz-certificat.crt) pour ne plus avoir de fenêtre « Allow ».
const CERT = `-----BEGIN CERTIFICATE-----
MIIDeTCCAmGgAwIBAgIUXJtWOqvLGKU6DqPqtTtIqR61KxcwDQYJKoZIhvcNAQEL
BQAwTDEfMB0GA1UEAwwWUGxhaXNpcnMgU2F2ZXVycyBIQUNDUDEcMBoGA1UECgwT
UGxhaXNpcnMgZXQgU2F2ZXVyczELMAkGA1UEBhMCRlIwHhcNMjYxMDAyMTE1MjEz
WhcNNDYwOTI3MTE1MjEzWjBMMR8wHQYDVQQDDBZQbGFpc2lycyBTYXZldXJzIEhB
Q0NQMRwwGgYDVQQKDBNQbGFpc2lycyBldCBTYXZldXJzMQswCQYDVQQGEwJGUjCC
ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKFTiIch2U8rxaPU1eDVPUf5
C/VAowBnQaUmaeFwQpOY0R5i5u7XVWqLWFobqO43mhts1FAM1QLFeQmecOaJis4Y
mupL+x5ngfJMeyd+eUXG8BUyVusZgoNYvRHZJGrOqX+UfDjmz9f6jpP/aEL10fNN
uR1Fa2ipaVhxFizYoauF0Nro4liQY/AADEGUjaKQrz4daLS1zmoNBnFjj7CPn6LJ
JrUefxFfLN72HreAzk/idFa6hmRRVO9fYCcDXnExFznLH/OgKAdsJB6SfSvMEdkR
XAYTZpj9X82f9CQWLF5PAqsvOGKnHTes1Bt+Q2EcRYpCJNvQVAlr+fzB0cf94A0C
AwEAAaNTMFEwHQYDVR0OBBYEFHj8WZRaaltSilY+x6hxXUn95UQaMB8GA1UdIwQY
MBaAFHj8WZRaaltSilY+x6hxXUn95UQaMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZI
hvcNAQELBQADggEBABi6wISEQdAkoO+LL/JcAZ9jFuth1PQbmXM1Q6LxUDu4RtvL
wy2hB8Fq23b0wmsVgAElYWPN5w5MsRkK0yKkb4wEn07V5euoDVBA+isRfjZMAtf/
q+WNDrFwEiygo4YZ1esBU0S1H03KzPQd23Ov3yHskaSdx0nspduNF5UYX6rYe8W2
kz4SvMqknyX1sNAwICRxIgF7Hb97LcGxCrPuRZk/dKVezLhz1j0CylgenFQA2IBD
PH0fg9BsjNK8nz4Ncu3g7Q77PG9BwnTKGsSoQoG3hf3Do2c+7Cj9tDg1qCg4cl4l
XLkkwuZTIyUwMAWUXPIe4dQ3Efx4SfabTiuH0+c=
-----END CERTIFICATE-----`;
const KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQChU4iHIdlPK8Wj
1NXg1T1H+Qv1QKMAZ0GlJmnhcEKTmNEeYubu11Vqi1haG6juN5obbNRQDNUCxXkJ
nnDmiYrOGJrqS/seZ4HyTHsnfnlFxvAVMlbrGYKDWL0R2SRqzql/lHw45s/X+o6T
/2hC9dHzTbkdRWtoqWlYcRYs2KGrhdDa6OJYkGPwAAxBlI2ikK8+HWi0tc5qDQZx
Y4+wj5+iySa1Hn8RXyze9h63gM5P4nRWuoZkUVTvX2AnA15xMRc5yx/zoCgHbCQe
kn0rzBHZEVwGE2aY/V/Nn/QkFixeTwKrLzhipx03rNQbfkNhHEWKQiTb0FQJa/n8
wdHH/eANAgMBAAECggEADmqZEj5XnYgTVtMfs8JKgiKCy41Vo6UWjCwVHSS7hlYL
JfR/n4tVojpGkHLVU0hbuKSuimLDLEa6TL5AZ5GV+lnfih11GN/2EFF+Veaq7q3a
6YIAm2zBqXwmFTC63OKP6gs6WJljrHDDCf2ycv1loCDrcG6yLP2qoNEmQqavN9UO
jTQV7TICSbRjDS6fRVHlnSUMowSyfiwTCqXnFsmjzrhYI2GNsN+tZJN/0Tk7Rrn+
LYdxr8WJmPQzWHkCFHGcf4GD8Tww1bXHotVdG1GNfXn6Zmm+vcCUCJn/HK//JjhH
3GOh5yUXfHmD5vVpr3YxH4t+pIRpxT2/xgbERKvjYQKBgQDaWQ1YvpjHcdIVSrvv
N1XYxkEC7OxU6dYqUnVVq0U2bn9QRXgjLQ0BabKgVNwBVYhyxJZiDd1hH+7zYBfz
uxPiyJjI5Ed+V3TMUBuRsJJGhat9J8rckqhKjtgIM4Tlwh82BZxOAoreRvtvS2tL
e3TTQJ4zQZ+i5BGvVK2pVOoeUQKBgQC9JUTxjvRgmROjiWIpOq4hoR43OVu8H7Hs
BbYL1Jty9UrqLyTsmqDL06SPpFGunygGh/6gpUGO24jNnRfvcgCTcgE1vYiGSO6F
FllfgddXUAL6MXB2o3akMqZGnMnYr8A+GBmUbN/fqrAcE7RvQi0XrxdQTdg0wZ9m
W6V3TxLK/QKBgH5EX0aBugIkXTP46uN0YY2hYHkbn7OfIj2JP9dR2w2WKsO12Lqm
082MXUMAr9WJrAWKj9iWYf5HpDxTxqYo+l/8VvZdpMZ4Ns/sR3Uh4gUsSbZvq42Q
tgefwWhEusbPUpM//VrTd5EBBWgf+iVFeJKt3I6RlYpyT5PP6TlyJI1xAoGAKFj2
6AByqNh+k/gOdHUMCChyZZ1asDqinZJqTwO/VTp2DJaZ7c7eVhyDkhCfS/yvcRU5
f9NAtNSnzhSgsndDIDDFiU0w/lQ4bTNjRThRU1LCD9TUBLrB6CzVw2JWvF5hR92k
N0EyUGf8wUCC0Ojw7YhwFLVGVZqoAhGyrkyz2ZECgYEAvJiZWLSHZNNgsTAWYCRo
/sUDz3y4VuG7+P8+Whm6bt4du/JHdYxuH9ziFWTnGgDnE6mACNqBW1zMs5Lt3UW1
BNfsxKGlZaHq8wHTKaBpXcfmZEf2KGXYoyCf3/NWkTjE0DxNfUPlSfj/gEXcWWXm
O6qANExSYF2A0HD5XDksIPg=
-----END PRIVATE KEY-----`;

const STORAGE_KEY = 'sp_qz_printer';

let securityReady = false;
function setupSecurity() {
  if (securityReady) return;
  securityReady = true;
  qz.security.setCertificatePromise((resolve: (c: string) => void) => resolve(CERT));
  qz.security.setSignatureAlgorithm('SHA512');
  qz.security.setSignaturePromise((toSign: string) => (resolve: (s: string) => void, reject: (e: unknown) => void) => {
    sign(toSign).then(resolve).catch(reject);
  });
}

async function sign(data: string): Promise<string> {
  const b64 = KEY.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(data)));
  let bin = '';
  sig.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export async function qzConnect(): Promise<boolean> {
  setupSecurity();
  if (qz.websocket.isActive()) return true;
  try {
    await qz.websocket.connect({ retries: 0, delay: 0 });
    return true;
  } catch {
    return false;
  }
}

export async function qzListPrinters(): Promise<string[] | null> {
  if (!(await qzConnect())) return null;
  try {
    const list = await qz.printers.find();
    return Array.isArray(list) ? list : [list];
  } catch {
    return null;
  }
}

export function getSelectedPrinter(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSelectedPrinter(name: string | null) {
  try {
    if (name) localStorage.setItem(STORAGE_KEY, name);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// Imprime un document HTML complet. Renvoie false si QZ n'est pas utilisable (pas d'imprimante choisie / QZ absent).
// Imprimante de la boutique, choisie automatiquement si aucune n'est sélectionnée
const DEFAULT_PRINTER_MATCH = /TSP\s*1|TSP143|Star/i;

export async function qzPrintHtml(html: string, widthMm: number, heightMm?: number): Promise<boolean> {
  if (!(await qzConnect())) return false;
  let printer = getSelectedPrinter();
  if (!printer) {
    const list = await qzListPrinters();
    printer = list?.find((p) => DEFAULT_PRINTER_MATCH.test(p)) ?? null;
    if (!printer) return false;
    setSelectedPrinter(printer);
  }
  const inch = (mm: number) => Math.round((mm / 25.4) * 1000) / 1000;
  const config = qz.configs.create(printer, {
    units: 'in',
    size: heightMm ? { width: inch(widthMm), height: inch(heightMm) } : { width: inch(widthMm) },
    margins: 0,
    scaleContent: true,
    rasterize: true,
    colorType: 'blackwhite',
  });
  try {
    await qz.print(config, [
      {
        type: 'pixel',
        format: 'html',
        flavor: 'plain',
        data: html,
        options: heightMm ? { pageWidth: inch(widthMm), pageHeight: inch(heightMm) } : { pageWidth: inch(widthMm) },
      },
    ]);
    return true;
  } catch (e) {
    console.error('QZ print error', e);
    return false;
  }
}
