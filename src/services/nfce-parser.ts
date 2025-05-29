export class NfceParser {
  doc: Document;

  constructor(htmlContent: string) {
    const parser = new DOMParser();
    this.doc = parser.parseFromString(htmlContent, 'text/html');
  }

  getEmitente() {
    const fieldsets = this.doc.querySelectorAll('fieldset');
    let emitenteSection: Element | null = null;

    fieldsets.forEach(fieldset => {
      const legend = fieldset.querySelector('legend');
      if (legend && legend.textContent && legend.textContent.trim().includes('Emitente')) {
        emitenteSection = fieldset;
      }
    });

    if (!emitenteSection) return {};

    const getField = (labelText: string) => {
      if (!emitenteSection) return '';
      const label = Array.from(emitenteSection.querySelectorAll('label'))
        .find(el => el.textContent && el.textContent.includes(labelText));
      return label && label.nextElementSibling
        ? (label.nextElementSibling.textContent ?? '').trim()
        : '';
    };

    return {
      nome: getField('Nome / Razão Social'),
      cnpj: getField('CNPJ'),
      ie: getField('Inscrição Estadual'),
      endereco: getField('Endereço'),
      municipio: getField('Município'),
      uf: getField('UF')
    };
  }

  getDadosNfe() {
    const chaveRow = Array.from(this.doc.querySelectorAll('tr'))
      .find(row => row.textContent?.includes('Chave de acesso'));

    return {
      chave: chaveRow ? (chaveRow.querySelector('td:nth-child(2)')?.textContent?.trim() ?? '') : '',
      numero: this.getTextAfterLabel('Número NFC-e'),
      dataEmissao: this.getTextAfterLabel('Data de Emissão'),
      valorTotal: this.getTextAfterLabel('Valor Total'),
      protocolo: this.getTextAfterLabel('Protocolo de autorização')
    };
  }

  getProdutos() {
    const produtos: any[] = [];

    const productRows = Array.from(this.doc.querySelectorAll('table.box tr'))
      .filter((row) => (row as Element).querySelector('.fixo-prod-serv-numero'));

    for (const row of productRows as Element[]) {
      const numero = row.querySelector('.fixo-prod-serv-numero')?.textContent?.trim() ?? '';
      const descricao = row.querySelector('.fixo-prod-serv-descricao')?.textContent?.trim() ?? '';
      const quantidadeText = row.querySelector('.fixo-prod-serv-qtd')?.textContent?.trim() ?? '0';
      const unidade = row.querySelector('.fixo-prod-serv-uc')?.textContent?.trim() ?? '';
      const valorText = row.querySelector('.fixo-prod-serv-vb')?.textContent?.trim() ?? '0';

      const quantidade = parseFloat(quantidadeText.replace('.', '').replace(',', '.'));
      const valorTotal = parseFloat(valorText.replace('.', '').replace(',', '.'));
      const valorUnitario = quantidade ? valorTotal / quantidade : 0;

      const detalhesRow = row.nextElementSibling;
      let codigoProduto = '';
      let codigoNcm = '';

      if (detalhesRow) {
        const spans = detalhesRow.querySelectorAll('td span');
        for (let i = 0; i < spans.length; i++) {
          const label = spans[i].previousElementSibling?.textContent?.trim();
          if (label?.includes('Código do Produto')) {
            codigoProduto = spans[i].textContent?.trim() ?? '';
          } else if (label?.includes('Código NCM')) {
            codigoNcm = spans[i].textContent?.trim() ?? '';
          }
        }
      }

      produtos.push({
        numero,
        descricao,
        codigo: codigoProduto,
        ncm: codigoNcm,
        quantidade: quantidade.toFixed(4),
        unidade,
        valorUnitario: valorUnitario.toFixed(2),
        valorTotal: valorTotal.toFixed(2)
      });
    }

    return produtos;
  }

  getTextAfterLabel(labelText: string) {
    const labels = Array.from(this.doc.querySelectorAll('label'));
    const label = labels.find((l) => !!l && typeof l.textContent === 'string' && l.textContent.includes(labelText));
    return label && label.nextElementSibling
      ? (label.nextElementSibling.textContent ?? '').trim()
      : '';
  }

  parse() {
    return {
      emitente: this.getEmitente(),
      dadosNfe: this.getDadosNfe(),
      produtos: this.getProdutos()
    };
  }
}
