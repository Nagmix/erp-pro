/**
 * طباعة ESC/POS عبر Web Serial (Chrome/Edge، غالباً HTTPS).
 * النص العربي يعتمد على دعم الطابعة لـ UTF-8؛ عند التشويه استخدم إيصال المتصفح.
 */

function encLatinLines(lines: string[]): Uint8Array[] {
  const enc = new TextEncoder();
  const out: Uint8Array[] = [new Uint8Array([0x1b, 0x40])]; // ESC @ init
  for (const line of lines) {
    out.push(enc.encode(`${line}\n`));
  }
  out.push(new Uint8Array([0x1d, 0x56, 0x00])); // GS V 0 partial cut
  return out;
}

export function canUseWebSerialPrint(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export async function printEscPosSerial(lines: string[]): Promise<void> {
  const SerialPort = (navigator as Navigator & { serial?: { requestPort: (opts?: object) => Promise<unknown> } }).serial;
  if (!SerialPort?.requestPort) {
    throw new Error('المتصفح لا يدعم Web Serial (جرّب Chrome أو Edge)');
  }
  const port = (await SerialPort.requestPort()) as {
    open: (o: { baudRate: number }) => Promise<void>;
    close: () => Promise<void>;
    writable: WritableStream<Uint8Array> | null;
  };
  await port.open({ baudRate: 9600 });
  try {
    const chunks = encLatinLines(lines);
    const writer = port.writable!.getWriter();
    for (const c of chunks) {
      await writer.write(c);
    }
    writer.releaseLock();
  } finally {
    await port.close();
  }
}
