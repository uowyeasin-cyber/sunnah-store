import 'server-only';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

// QR (links to the receipt) and Code 128 barcode (the order number), as inline SVG.
export const qrSvg = (text: string) => QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
export const barcodeSvg = (text: string) => bwipjs.toSVG({ bcid: 'code128', text, height: 12, includetext: true, textxalign: 'center', textsize: 9 });
