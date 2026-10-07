export const MAX_FILES = 50;
export const MAX_BYTES = 100 * 1024 * 1024;
export function formatSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
    : `${Math.ceil(bytes / 1024).toLocaleString('pt-BR')} KB`;
}
export function outputName(value) {
  const name = value.trim().replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/[. ]+$/, '').slice(0, 100);
  return `${name || 'documentos_mesclados'}.pdf`;
}
export function moveItem(items, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length) throw new Error('Posição inválida.');
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
}
