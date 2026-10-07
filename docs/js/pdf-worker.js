import { inspectPdf, mergePdfs } from './pdf-service.js';
self.onmessage = async ({ data }) => {
  const { id, operation, files } = data;
  try {
    if (operation === 'inspect') {
      self.postMessage({ id, result: await inspectPdf(files[0]) });
    } else if (operation === 'merge') {
      const result = await mergePdfs(files, value => self.postMessage({ id, progress: value }));
      self.postMessage({ id, result }, [result.bytes.buffer]);
    } else throw new Error('Operação desconhecida.');
  } catch (error) {
    self.postMessage({ id, error: error.message || 'Não foi possível processar o PDF.' });
  }
};
