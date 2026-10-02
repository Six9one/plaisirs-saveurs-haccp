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

// Impression directe via iframe invisible (spéciale imprimante thermique)
export function printTicketHtml(htmlContent: string, format: ThermalPaperFormat = '58mm', is2cmSticker: boolean = false) {
  playPrintBeep();

  let iframe = document.getElementById('thermal-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) return;

  const widthMm = format === '80mm' ? '76mm' : '52mm';
  const pageHeight = is2cmSticker ? '25mm' : 'auto';

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Ticket HACCP Plaisirs & Saveurs</title>
        <style>
          @page {
            size: ${format === '80mm' ? '80mm auto' : `58mm ${pageHeight}`};
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
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 50);
          };
        </script>
      </body>
    </html>
  `);
  iframeDoc.close();
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
