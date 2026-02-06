/**
 * WhatsApp Share Utility
 * Generates pre-filled WhatsApp messages for PDP (product) and PLP (search/listing) contexts.
 */

export interface WhatsAppProductData {
  name: string;
  price?: number;
  variety?: string;
  containerSize?: string;
  quantity?: number;
  description?: string;
  imageUrl?: string;
  productUrl: string;
  id?: string;
}

export interface WhatsAppSearchData {
  query?: string;
  filters?: Record<string, string>;
  sort?: string;
  listingUrl: string;
  resultsCount?: number;
  firstResultName?: string;
}

function cleanHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}

function formatPrice(price: number): string {
  return price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function buildProductMessage(data: WhatsAppProductData): string {
  const lines: string[] = [];

  lines.push(`🪴 ${data.name}`);

  if (data.price !== undefined) {
    lines.push(`💶 ${formatPrice(data.price)}`);
  }

  const variants: string[] = [];
  if (data.variety) variants.push(data.variety);
  if (data.containerSize) variants.push(data.containerSize);
  if (variants.length > 0) {
    lines.push(`🧩 ${variants.join(' · ')}`);
  }

  if (data.quantity !== undefined) {
    lines.push(`📦 ${data.quantity > 0 ? `${data.quantity} disponible${data.quantity !== 1 ? 's' : ''}` : 'Agotado'}`);
  }

  if (data.description) {
    const clean = truncate(cleanHtml(data.description), 240);
    if (clean) {
      lines.push('');
      lines.push(`📝 ${clean}`);
    }
  }

  lines.push('');

  if (data.imageUrl) {
    lines.push(`🖼️ Imagen: ${data.imageUrl}`);
  }

  lines.push(`🔗 Link: ${data.productUrl}`);

  return lines.join('\n');
}

export function buildSearchMessage(data: WhatsAppSearchData): string {
  const lines: string[] = [];

  if (data.query) {
    lines.push(`🔎 Búsqueda: ${data.query}`);
  }

  if (data.filters && Object.keys(data.filters).length > 0) {
    const summary = Object.entries(data.filters)
      .filter(([, v]) => v && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    if (summary) {
      lines.push(`🎛️ Filtros: ${summary}`);
    }
  }

  if (data.sort) {
    lines.push(`↕️ Orden: ${data.sort}`);
  }

  if (data.resultsCount !== undefined) {
    lines.push(`📊 ${data.resultsCount} resultado${data.resultsCount !== 1 ? 's' : ''}`);
  }

  if (data.firstResultName) {
    lines.push(`🌱 Primer resultado: ${data.firstResultName}`);
  }

  lines.push('');
  lines.push(`🔗 Link: ${data.listingUrl}`);

  return lines.join('\n');
}

/**
 * Opens WhatsApp with a pre-filled message.
 * Uses whatsapp:// on mobile with fallback to wa.me on desktop.
 */
export function openWhatsAppShare(message: string): void {
  const encoded = encodeURIComponent(message);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // Try native protocol first
    window.location.href = `whatsapp://send?text=${encoded}`;
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }
}
