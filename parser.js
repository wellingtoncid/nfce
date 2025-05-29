import { JSDOM } from 'jsdom';

export class NfceParser {
    doc;

    constructor(htmlContent) {
        const dom = new JSDOM(htmlContent);
        this.doc = dom.window.document;
    }

    getEmitente() {
        const fieldsets = this.doc.querySelectorAll('fieldset');
        let emitenteSection = null;

        fieldsets.forEach(fieldset => {
            const legend = fieldset.querySelector('legend');
            if (legend && legend.textContent.trim().includes('Emitente')) {
                emitenteSection = fieldset;
            }
        });

        if (!emitenteSection) return {};

        const getField = (labelText) => {
            const label = Array.from(emitenteSection.querySelectorAll('label'))
                .find(el => el.textContent.includes(labelText));
            return label && label.nextElementSibling
                ? label.nextElementSibling.textContent.trim()
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
            .find(row => row.textContent.includes('Chave de acesso'));

        return {
            chave: chaveRow ? chaveRow.querySelector('td:nth-child(2)')?.textContent.trim() : '',
            numero: this.getTextAfterLabel('Número NFC-e'),
            dataEmissao: this.getTextAfterLabel('Data de Emissão'),
            valorTotal: this.getTextAfterLabel('Valor Total'),
            protocolo: this.getTextAfterLabel('Protocolo de autorização')
        };
    }

    getProdutos() {
        const produtos = [];
        const productRows = Array.from(this.doc.querySelectorAll('table.box tr'))
            .filter(row => row.querySelector('.fixo-prod-serv-numero'));

        for (const row of productRows) {
            const numero = row.querySelector('.fixo-prod-serv-numero')?.textContent.trim() ?? '';
            const descricao = row.querySelector('.fixo-prod-serv-descricao')?.textContent.trim() ?? '';
            const quantidadeText = row.querySelector('.fixo-prod-serv-qtd')?.textContent.trim() ?? '0';
            const unidade = row.querySelector('.fixo-prod-serv-uc')?.textContent.trim() ?? '';
            const valorText = row.querySelector('.fixo-prod-serv-vb')?.textContent.trim() ?? '0';

            const quantidade = parseFloat(quantidadeText.replace('.', '').replace(',', '.'));
            const valorTotal = parseFloat(valorText.replace('.', '').replace(',', '.'));
            const valorUnitario = quantidade ? valorTotal / quantidade : 0;

            // Pega linha seguinte para buscar Código/NCM
            const detalhesRow = row.nextElementSibling;
            const spanMap = {};

            if (detalhesRow) {
                const labels = detalhesRow.querySelectorAll('label');
                labels.forEach(label => {
                    const labelText = label.textContent.trim();
                    const span = label.nextElementSibling;
                    if (span && span.tagName.toLowerCase() === 'span') {
                        spanMap[labelText] = span.textContent.trim();
                    }
                });
            }

            produtos.push({
                numero,
                descricao,
                codigo: spanMap['Código do Produto'] || '',
                ncm: spanMap['Código NCM'] || '',
                quantidade: quantidade.toFixed(4),
                unidade,
                valorUnitario: valorUnitario.toFixed(2),
                valorTotal: valorTotal.toFixed(2)
            });
        }

        return produtos;
    }

    getTextAfterLabel(labelText) {
        const labels = Array.from(this.doc.querySelectorAll('label'));
        const label = labels.find(l => l.textContent.includes(labelText));
        return label && label.nextElementSibling
            ? label.nextElementSibling.textContent.trim()
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
