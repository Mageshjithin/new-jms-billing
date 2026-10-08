import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export const STOCK_PRESETS = [
  { name: 'Saree', category: 'Saree', code: 'SAREE' },
  { name: 'Silk Saree', category: 'Saree', code: 'SILK' },
  { name: 'Cotton Saree', category: 'Saree', code: 'CTSAREE' },
  { name: 'Kurthi', category: 'Kurthi', code: 'KURTHI' },
  { name: 'Churidar', category: 'Churidar', code: 'CHURI' },
  { name: 'Salwar Set', category: 'Salwar', code: 'SALWAR' },
  { name: 'Lehenga', category: 'Lehenga', code: 'LEHENGA' },
  { name: 'Blouse', category: 'Blouse', code: 'BLOUSE' },
  { name: 'Dupatta', category: 'Dupatta', code: 'DUPATTA' },
  { name: 'Nighty', category: 'Nightwear', code: 'NIGHTY' },
  { name: 'Leggings', category: 'Bottomwear', code: 'LEGGING' },
  { name: 'Shirt', category: 'Menswear', code: 'SHIRT' },
  { name: 'Pant', category: 'Menswear', code: 'PANT' },
  { name: 'Dhoti', category: 'Menswear', code: 'DHOTI' },
  { name: 'Kids Wear', category: 'Kids', code: 'KIDS' },
  { name: 'Bedsheet', category: 'Home', code: 'BEDSHEET' },
];

export function nextSku(code, products) {
  const prefix = String(code || 'ITEM').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'ITEM';
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const highest = products.reduce((max, p) => {
    const match = String(p.sku || '').match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, '0')}`;
}

export function QrImage({ value, size = 160 }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true;
    if (!value) { setSrc(''); return undefined; }
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#2e2630', light: '#ffffff' } })
      .then((url) => { if (active) setSrc(url); })
      .catch(() => { if (active) setSrc(''); });
    return () => { active = false; };
  }, [value, size]);
  if (!src) return <div className="qr-placeholder" style={{ width: size, height: size }}>QR preview</div>;
  return <img src={src} width={size} height={size} alt={`QR code for ${value}`} className="qr-image" />;
}

export function QrLabel({ product, money }) {
  const value = product.barcode || product.sku;
  return <div className="invoice-paper qr-label">
    <p className="qr-shop">JMS TEXTILES</p>
    <QrImage value={value} size={180} />
    <b className="qr-name">{product.name}</b>
    <span className="qr-sku">{value}</span>
    <strong className="qr-price">{money(product.price)}</strong>
  </div>;
}
