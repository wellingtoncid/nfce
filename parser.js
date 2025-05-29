class NfceParser {
    constructor(htmlContent) {
        this.htmlContent = htmlContent;
        this.parser = new DOMParser();
        this.doc = this.parser.parseFromString(htmlContent, "text/html");
    }

    getEmitente() {
        // Método mais robusto para encontrar os dados do emitente
        const emitenteSection = this.doc.querySelector('fieldset:has(legend:contains("Emitente"))');
        if (!emitenteSection) return {};
        
        const getField = (labelText) => {
            const label = Array.from(emitenteSection.querySelectorAll('label'))
                .find(el => el.textContent.includes(labelText));
            return label ? label.nextElementSibling.textContent.trim() : '';
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
        // Extrai os dados principais da NFC-e
        const chaveRow = Array.from(this.doc.querySelectorAll('tr'))
            .find(row => row.textContent.includes('Chave de acesso'));
        
        const dados = {
            chave: chaveRow ? chaveRow.querySelector('td:nth-child(2)').textContent.trim() : '',
            numero: this.getTextContent('//td[contains(., "Número NFC-e")]/following-sibling::td'),
            dataEmissao: this.getTextContent('//label[contains(., "Data de Emissão")]/following-sibling::span'),
            valorTotal: this.getTextContent('//label[contains(., "Valor Total")]/following-sibling::span'),
            protocolo: this.getTextContent('//span[contains(@id, "nProt")]')
        };
        
        return dados;
    }

    getProdutos() {
        const produtos = [];
        // Encontra todas as linhas de produtos
        const productRows = Array.from(this.doc.querySelectorAll('table.box tr'))
            .filter(row => row.querySelector('.fixo-prod-serv-numero'));
        
        for (const row of productRows) {
            const numero = row.querySelector('.fixo-prod-serv-numero').textContent.trim();
            const descricao = row.querySelector('.fixo-prod-serv-descricao').textContent.trim();
            const quantidadeText = row.querySelector('.fixo-prod-serv-qtd').textContent.trim();
            const unidade = row.querySelector('.fixo-prod-serv-uc').textContent.trim();
            const valorText = row.querySelector('.fixo-prod-serv-vb').textContent.trim();
            
            // Converte valores para formato numérico
            const quantidade = parseFloat(quantidadeText.replace('.', '').replace(',', '.'));
            const valorTotal = parseFloat(valorText.replace('.', '').replace(',', '.'));
            const valorUnitario = valorTotal / quantidade;
            
            // Encontra a tabela de detalhes seguinte
            let detalhesRow = row.nextElementSibling;
            let ncm = '', codigo = '';
            
            while (detalhesRow && !detalhesRow.classList.contains('toggle')) {
                detalhesRow = detalhesRow.nextElementSibling;
            }
            
            if (detalhesRow && detalhesRow.classList.contains('toggable')) {
                // Extrai NCM e código do produto
                const ncmMatch = detalhesRow.textContent.match(/Código NCM\s*:\s*([0-9]+)/) || 
                                detalhesRow.textContent.match(/Código NCM\s*([0-9]+)/);
                ncm = ncmMatch ? ncmMatch[1] : '';
                
                const codigoMatch = detalhesRow.textContent.match(/Código do Produto\s*:\s*([^\s]+)/) || 
                                   detalhesRow.textContent.match(/Código do Produto\s*([^\s]+)/);
                codigo = codigoMatch ? codigoMatch[1] : '';
            }
            
            produtos.push({
                numero,
                codigo,
                descricao,
                ncm,
                quantidade: quantidade.toFixed(4),
                unidade,
                valorUnitario: valorUnitario.toFixed(2),
                valorTotal: valorTotal.toFixed(2)
            });
        }
        
        return produtos;
    }

    getTextContent(xpath) {
        try {
            const result = document.evaluate(xpath, this.doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            return result.singleNodeValue ? result.singleNodeValue.textContent.trim() : '';
        } catch (e) {
            console.error('XPath error:', e);
            return '';
        }
    }

    parse() {
        return {
            emitente: this.getEmitente(),
            dadosNfe: this.getDadosNfe(),
            produtos: this.getProdutos()
        };
    }
}