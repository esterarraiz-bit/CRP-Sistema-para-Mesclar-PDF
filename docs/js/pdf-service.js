// Executado somente no Web Worker. A biblioteca é servida junto ao site.
import '../vendor/pdf-lib.min.js';
const { PDFDocument } = globalThis.PDFLib;

async function readPdf(file) {
  try {
    const doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
    if (!doc.getPageCount()) throw new Error('empty');
    return doc;
  } catch (error) {
    if (String(error).toLowerCase().includes('encrypted')) {
      throw new Error(`${file.name}: PDF protegido. Selecione uma cópia sem senha.`);
    }
    throw new Error(`${file.name}: não foi possível ler este PDF. Verifique se o arquivo está completo e possui páginas.`);
  }
}
export async function inspectPdf(file) {
  const doc = await readPdf(file);
  return { pages: doc.getPageCount() };
}
export async function mergePdfs(files, onProgress = () => {}) {
  if (files.length < 2) throw new Error('Adicione pelo menos 2 PDFs.');
  const output = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const source = await readPdf(files[i]);
    const pages = await output.copyPages(source, source.getPageIndices());
    for (const page of pages) output.addPage(page);
    onProgress(Math.round((i + 1) / files.length * 90));
  }
  output.setProducer('CRP Tecnologia — Mesclar PDF');
  output.setCreator('CRP Tecnologia');
  const bytes = await output.save();
  return { bytes, pages: output.getPageCount() };
}
