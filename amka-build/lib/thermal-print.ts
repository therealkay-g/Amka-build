const CENTER_NAME = "AMKA Kindu";
const CENTER_ADDR = "Kindu, RDC";
const CENTER_TEL = "+243815615323";
const WIDTH = 32;

function padCenter(text: string): string {
  const clean = text.replace(/[^\x20-\x7E\u00C0-\u024F]/g, "");
  const pad = Math.max(0, Math.floor((WIDTH - clean.length) / 2));
  return " ".repeat(pad) + clean;
}

function padRight(text: string): string {
  return text.substring(0, WIDTH);
}

function dashes(): string {
  return "-".repeat(WIDTH);
}

function buildReceiptText(params: {
  receiptNumber: string;
  patientName: string;
  patientDossier: string;
  type: string;
  mode: string;
  amount: number;
  date: string;
  time: string;
  notes?: string;
}): string {
  const L: string[] = [];
  L.push(padCenter(CENTER_NAME));
  L.push(padCenter(CENTER_ADDR));
  L.push(padCenter(`Tel: ${CENTER_TEL}`));
  L.push("");
  L.push(dashes());
  L.push(padCenter("RECU DE PAIEMENT"));
  L.push(padCenter(`N° ${params.receiptNumber}`));
  L.push(dashes());
  L.push("");
  L.push(padRight(`Patient: ${params.patientName}`));
  L.push(padRight(`Dossier: ${params.patientDossier}`));
  L.push(padRight(`Date: ${params.date}  ${params.time}`));
  L.push("");
  L.push(dashes());
  L.push(padRight(`Service: ${params.type}`));
  L.push(padRight(`Mode: ${params.mode}`));
  L.push("");
  L.push(dashes());
  L.push(padCenter("MONTANT RECU"));
  L.push(padCenter(`${params.amount.toLocaleString("fr-FR")} CDF`));
  L.push("");
  L.push(dashes());
  L.push(padCenter("PAYE"));
  L.push("");
  if (params.notes) {
    L.push(padRight(`Notes: ${params.notes}`));
    L.push("");
  }
  L.push(padCenter("Merci pour votre confiance"));
  L.push(padCenter(params.date));
  L.push("");
  L.push("");
  L.push("");
  return L.join("\n");
}

function getCapacitorPlugin(): any {
  try {
    const cap = (window as any).Capacitor;
    if (cap?.Plugins?.ThermalPrinter) return cap.Plugins.ThermalPrinter;
  } catch {}
  return null;
}

function printViaVbtPrinter(text: string): boolean {
  try {
    const w = window as any;
    if (w.vBtPrinter) {
      if (typeof w.vBtPrinter.print === "function") { w.vBtPrinter.print(text); return true; }
      if (typeof w.vBtPrinter.printText === "function") { w.vBtPrinter.printText(text); return true; }
    }
    if (w.BTPRINT && typeof w.BTPRINT.print === "function") { w.BTPRINT.print(text); return true; }
    if (w.AndroidPrint && typeof w.AndroidPrint.print === "function") { w.AndroidPrint.print(text); return true; }
    if (w.PrinterBridge && typeof w.PrinterBridge.print === "function") { w.PrinterBridge.print(text); return true; }
  } catch {}
  return false;
}

function printViaIframe(text: string): boolean {
  try {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
@page{size:72mm auto;margin:0;padding:0;}
*{margin:0;padding:0;box-sizing:border-box;}
body{
  font-family:'Courier New',monospace;
  font-size:12px;line-height:1.2;
  width:72mm;padding:2mm 3mm;
  color:#000;background:#fff;
  white-space:pre-wrap;word-break:break-all;
}
@media print{
  @page{size:72mm auto;margin:0;padding:0;}
  body{padding:1mm 2mm;font-size:11px;}
}
</style></head><body>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:0;left:0;width:72mm;height:100mm;opacity:0.01;z-index:9999;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) { document.body.removeChild(iframe); return false; }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try { iframe.contentWindow?.print(); } catch {}
      setTimeout(() => { document.body.removeChild(iframe); }, 2000);
    }, 500);

    return true;
  } catch {
    return false;
  }
}

async function printViaCapacitor(text: string): Promise<boolean> {
  const plugin = getCapacitorPlugin();
  if (!plugin) return false;

  try {
    const st = await plugin.isConnected();
    if (st?.connected) {
      await plugin.print({ text });
      return true;
    }
  } catch {}

  try {
    await plugin.requestPermission();
  } catch { return false; }

  try {
    const raw = await plugin.listDevices();

    let devices: any[] = [];
    let devs = raw?.devices;

    if (typeof devs === "string") {
      try { devs = JSON.parse(devs); } catch {}
    }

    if (Array.isArray(devs)) {
      devices = devs;
    } else if (raw && typeof raw === "object") {
      for (const v of Object.values(raw)) {
        if (Array.isArray(v)) { devices = v; break; }
        if (typeof v === "string" && v.startsWith("[")) {
          try { devices = JSON.parse(v); break; } catch {}
        }
      }
    }

    if (devices.length > 0) {
      const dev = devices[0];
      const conn = await plugin.connect({ address: dev.address });
      if (conn?.connected) {
        await plugin.print({ text });
        return true;
      }
    }
  } catch {}

  return false;
}

export async function listPrinters(): Promise<{ name: string; address: string }[]> {
  const plugin = getCapacitorPlugin();
  if (!plugin) return [];
  try {
    const r = await plugin.listDevices();
    return r?.devices ?? [];
  } catch { return []; }
}

export async function connectPrinter(address: string): Promise<boolean> {
  const plugin = getCapacitorPlugin();
  if (!plugin) return false;
  try {
    const r = await plugin.connect({ address });
    return r?.connected === true;
  } catch { return false; }
}

export async function printThermalReceipt(params: {
  receiptNumber: string;
  patientName: string;
  patientDossier: string;
  type: string;
  mode: string;
  amount: number;
  date: string;
  time: string;
  notes?: string;
}): Promise<{ success: boolean; method: string }> {
  const text = buildReceiptText(params);

  if (printViaVbtPrinter(text)) {
    return { success: true, method: "vbtprinter" };
  }

  if (await printViaCapacitor(text)) {
    return { success: true, method: "capacitor" };
  }

  if (printViaIframe(text)) {
    return { success: true, method: "window_print" };
  }

  return { success: false, method: "none" };
}

export async function disconnectPrinter() {
  const plugin = getCapacitorPlugin();
  if (plugin) { try { await plugin.disconnect(); } catch {} }
}
