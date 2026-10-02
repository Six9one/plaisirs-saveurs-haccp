import { isQzReady, qzPrintImage, qzWarmUp } from './qzPrinter';
// Service d'impression directe pour imprimante thermique (58mm / 80mm / étiquettes 2cm)

export interface IngredientPrintData {
  productName: string;
  category: string;
  prepDate: Date;
  expiryDate: Date;
  operator: string;
  lotNumber?: string;
  storageTemp?: string;
}

export interface FrozenDessertPrintData {
  dessertName: string;
  thawDate: Date;
  expiryDate: Date;
  operator: string;
  lotNumber?: string;
}

export type ThermalPaperFormat = '58mm' | '80mm' | 'sticker_2cm';

// Bip sonore discret de confirmation caisse/imprimante (Web Audio API)
export function playPrintBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // Note La5 (880Hz)
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Audio non supporté ou bloqué, pas grave
  }
}

// Logo flocon de neige SVG vectoriel haute définition optimisé tête d'impression thermique monochrome
export const SNOWFLAKE_SVG = `
<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;">
  <line x1="2" y1="12" x2="22" y2="12"></line>
  <line x1="12" y1="2" x2="12" y2="22"></line>
  <path d="m20 16-4-4 4-4"></path>
  <path d="m4 8 4 4-4 4"></path>
  <path d="m16 4-4 4-4-4"></path>
  <path d="m8 20 4-4 4 4"></path>
</svg>
`;

// Construit le document HTML complet du ticket
function buildTicketDoc(htmlContent: string, is2cmSticker: boolean, pageHeightMm?: number): string {
  // Imprimante Star TSP143 : rouleau 80 mm, zone imprimable 72 mm
  const widthMm = '72mm';
  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Ticket HACCP Plaisirs & Saveurs</title>
        <style>
          @page {
            size: 80mm ${pageHeightMm ? pageHeightMm + 'mm' : '100mm'};
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 11px;
            line-height: 1.25;
          }
          .ticket-wrapper {
            width: ${widthMm};
            margin: 0 auto;
            padding: ${is2cmSticker ? '1.5mm 2mm' : '3mm 2.5mm'};
            background: #ffffff;
            color: #000000;
          }
          .bold { font-weight: 800; }
          .black { font-weight: 900; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .uppercase { text-transform: uppercase; }
          .border-b { border-bottom: 1.5px solid #000; }
          .border-t { border-top: 1.5px solid #000; }
          .border-dashed { border-bottom: 1px dashed #000; }
          .border-box { border: 2px solid #000; padding: 2.5px; margin: 3px 0; }
          .badge-black {
            background: #000;
            color: #fff !important;
            padding: 2px 4px;
            font-weight: 900;
            display: inline-block;
            border-radius: 2px;
          }
        </style>
      </head>
      <body>
        <div class="ticket-wrapper">
          ${htmlContent}
        </div>
      </body>
    </html>
  `;
}

// Connexion QZ Tray dès le chargement de l'app
qzWarmUp();

function getPrintFrame(): HTMLIFrameElement {
  let iframe = document.getElementById('thermal-print-iframe') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '80mm';
    iframe.style.height = '400mm';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
  }
  return iframe;
}

// Dessine le ticket (déjà mis en page dans l'iframe) en image PNG noir & blanc 576 points (72 mm à 203 dpi)
async function renderTicketPng(doc: Document, wrapper: HTMLElement): Promise<string> {
  const rect = wrapper.getBoundingClientRect();
  const css = Array.from(doc.querySelectorAll('style'))
    .map((st) => st.textContent || '')
    .join('\n')
    .replace(/@page\s*\{[^}]*\}/g, '');
  const xhtml = new XMLSerializer().serializeToString(wrapper);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">` +
    `<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">` +
    `<style><![CDATA[${css}]]></style>${xhtml}</div></foreignObject></svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const scale = 576 / rect.width;
  const canvas = document.createElement('canvas');
  canvas.width = 576;
  canvas.height = Math.ceil(rect.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // Seuil noir/blanc : texte net sur papier thermique
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const v = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11 < 170 ? 0 : 255;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png').split(',')[1];
}

let printQueue: Promise<void> = Promise.resolve();

// Impression : 1) QZ Tray → image directe vers l'imprimante (instantané, sans fenêtre, coupe à la fin)
//              2) sinon impression Chrome (fenêtre) avec page à la hauteur exacte du ticket
export function printTicketHtml(htmlContent: string, _format: ThermalPaperFormat = '80mm', is2cmSticker: boolean = false) {
  void _format;
  playPrintBeep();
  printQueue = printQueue
    .then(() => doPrint(htmlContent, is2cmSticker))
    .catch((e) => console.error('Impression', e));
}

async function doPrint(htmlContent: string, is2cmSticker: boolean): Promise<void> {
  // Le flocon devient un dessin vectoriel intégré (pas de chargement d'image)
  const html = htmlContent.replace(/<img[^>]*snowflake[^>]*>/g, SNOWFLAKE_SVG);
  const iframe = getPrintFrame();
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(buildTicketDoc(html, is2cmSticker));
  doc.close();
  const wrapper = doc.querySelector('.ticket-wrapper') as HTMLElement | null;
  if (!wrapper) return;
  const heightPx = wrapper.getBoundingClientRect().height;
  const heightMm = Math.max(is2cmSticker ? 25 : 30, Math.ceil((heightPx * 25.4) / 96) + 3);

  if (isQzReady()) {
    try {
      const png = await renderTicketPng(doc, wrapper);
      if (await qzPrintImage(png, 80, heightMm)) return;
    } catch (e) {
      console.error('Rendu ticket', e);
    }
  } else {
    qzWarmUp();
  }

  // Repli : impression Chrome
  const style = doc.createElement('style');
  style.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0; }`;
  doc.head.appendChild(style);
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
}

// 1. Génération du ticket pour Ingrédient / Préparation (DLC Secondaire)
export function printIngredientTicket(data: IngredientPrintData, format: ThermalPaperFormat = '58mm') {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const html = `
    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 3px; margin-bottom: 4px;">
      <div style="font-size: 13px; font-weight: 900; letter-spacing: 0.5px;">PLAISIRS &amp; SAVEURS</div>
      <div style="font-size: 9px; font-weight: 700;">TRAÇABILITÉ HACCP • CUISINE &amp; LABO</div>
    </div>

    <div style="text-align: center; padding: 4px 0; border-bottom: 1.5px dashed #000;">
      <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">[ ${data.category} ]</div>
      <div style="font-size: 15px; font-weight: 900; text-transform: uppercase; margin: 2px 0; line-height: 1.15;">
        ${data.productName}
      </div>
    </div>

    <div style="padding: 4px 0; font-size: 10px; border-bottom: 1.5px dashed #000;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span style="font-weight: 700;">OUVERT / FAIT LE :</span>
        <span style="font-weight: 900;">${formatDate(data.prepDate)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="font-weight: 700;">PAR OPÉRATEUR :</span>
        <span style="font-weight: 800;">${data.operator}</span>
      </div>
    </div>

    <div style="border: 2px solid #000; padding: 4px; margin: 4px 0; text-align: center; background: #fff;">
      <div style="font-size: 9px; font-weight: 900; letter-spacing: 0.5px;">À CONSOMMER JUSQU'AU (DLC) :</div>
      <div style="font-size: 14px; font-weight: 900; margin-top: 2px;">
        ${formatDate(data.expiryDate)}
      </div>
    </div>

    <div style="font-size: 8.5px; padding-top: 2px; text-align: center;">
      ${data.storageTemp ? `<div>Conservation : <strong>${data.storageTemp}</strong></div>` : ''}
      ${data.lotNumber ? `<div>N° Lot : <strong>${data.lotNumber}</strong></div>` : ''}
      <div style="font-size: 7.5px; margin-top: 2px; font-style: italic;">Conserver couvert &amp; hermétique</div>
    </div>
  `;

  printTicketHtml(html, format, false);
}

// 2. Génération du TICKET 2 CM pour Produit/Dessert Décongelé (avec Logo Flocon + Mention légale HACCP)
export function printFrozenDessertTicket(data: FrozenDessertPrintData, format: ThermalPaperFormat = 'sticker_2cm') {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDateShort = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const html = `
    <div style="border: 1.5px solid #000; padding: 2.5px 3px; border-radius: 2px; text-align: center; background: #fff;">
      
      <!-- LIGNE 1 : LOGO FLOCON DE NEIGE + NOM DU DESSERT -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 2px;">
        <span style="display: inline-block; vertical-align: middle; line-height: 1;">
          <img src="/snowflake.png" alt="Flocon" style="width: 18px; height: 18px; object-fit: contain; vertical-align: middle;" onerror="this.outerHTML='❄️'" />
        </span>
        <span style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.1;">
          ${data.dessertName}
        </span>
      </div>

      <!-- LIGNE 2 : MENTION SANITAIRE LÉGALE OBLIGATOIRE ENCADRÉE / FOND NOIR HAUTE VISIBILITÉ -->
      <div style="background: #000; color: #fff; padding: 1.5px 2px; font-size: 8.5px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase; margin: 2px 0;">
        PRODUIT DÉCONGELÉ • NE PAS RECONGELER
      </div>

      <!-- LIGNE 3 : DATE DÉCONGÉLATION ET DLC LIMITE -->
      <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: 800; margin-top: 2px; padding: 0 1px;">
        <span>Décongelé : <strong>${formatDateShort(data.thawDate)}</strong></span>
        <span>DLC : <strong style="font-size: 9px; text-decoration: underline;">${formatDateShort(data.expiryDate)}</strong></span>
      </div>

      <!-- LIGNE 4 : BAS DE TICKET DISCRET -->
      <div style="display: flex; justify-content: space-between; font-size: 7px; font-weight: 700; color: #111; margin-top: 1.5px; border-top: 0.5px solid #000; padding-top: 1px;">
        <span>Plaisirs &amp; Saveurs</span>
        <span>Stockage : +4°C max</span>
      </div>

    </div>
  `;

  printTicketHtml(html, format, true);
}
