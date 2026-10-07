# CRP — Mesclar PDF (web)

Versão web modular com a paleta da CRP Tecnologia e o logotipo fornecido.

## Rodar e hospedar

A pasta `dist` é o site completo. Publique seu conteúdo em uma hospedagem estática com HTTPS. Nenhum servidor Python é necessário: a mesclagem ocorre em JavaScript dentro de um Web Worker no navegador. A biblioteca pdf-lib 1.17.1 está incluída localmente com sua licença.

Para testar localmente, a partir da pasta do projeto:

```bash
python -m http.server 8000 --directory dist
```

Abra http://localhost:8000. Não abra `index.html` diretamente por `file://`, pois módulos e workers precisam de um servidor HTTP.

## Arquivos

- `dist/index.html`: estrutura da interface.
- `dist/css/styles.css`: identidade visual e layout responsivo.
- `dist/js/app.js`: seleção, cartões, ordenação, progresso e download.
- `dist/js/state.js`: regras de ordenação, nomes e tamanho.
- `dist/js/pdf-service.js`: leitura e mesclagem.
- `dist/js/pdf-worker.js`: processamento em segundo plano.
- `dist/assets/crp-logo.png`: logotipo fornecido.
- `dist/vendor/`: biblioteca de PDF e licença.

## Uso e limites

Selecione ou arraste no mínimo dois PDFs. Reordene os cartões por arraste ou botões (também disponíveis no celular). Defina o nome, clique em Mesclar PDFs e depois em Baixar PDF.

Limite da interface: 50 arquivos e 100 MB somados. A capacidade real depende da memória do navegador e da complexidade do conteúdo. Arquivos inválidos ou criptografados são rejeitados. Os originais não são alterados. Os PDFs ficam somente na memória da página; não são enviados ao servidor nem persistidos. Ao recarregar, a seleção é perdida.

Esta implementação une páginas; não preserva marcadores, formulários editáveis nem a validade de assinaturas digitais. Converta formulários preenchidos em PDFs estáticos antes de mesclar. A biblioteca Python/Tkinter da versão desktop não é necessária nesta versão.

Paleta: #053F88, #2A4B8D, #6B83B5, #0B1323, #526786, #F6A730, #E6373B, #F3F6FB, #EAF0F8 e #C7D4EA.
