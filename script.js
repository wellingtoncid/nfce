document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('nfceFile');
    const parseBtn = document.getElementById('parseBtn');
    const exportXmlBtn = document.getElementById('exportXml');
    const exportCsvBtn = document.getElementById('exportCsv');
    const exportExcelBtn = document.getElementById('exportExcel');
    const resultsDiv = document.getElementById('results');
    
    let parsedData = null;

    parseBtn.addEventListener('click', function() {
        if (!fileInput.files.length) {
            alert('Por favor, selecione um arquivo NFC-e');
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const parser = new NfceParser(e.target.result);
                parsedData = parser.parse();
                displayResults(parsedData);
            } catch (error) {
                resultsDiv.innerHTML = `<p class="error">Erro ao processar o arquivo: ${error.message}</p>`;
                console.error(error);
            }
        };
        
        reader.readAsText(file);
    });

    function displayResults(data) {
        let html = `
            <h3>Dados da NFC-e</h3>
            <table>
                <tr><th>Chave:</th><td>${data.dadosNfe.chave}</td></tr>
                <tr><th>Número:</th><td>${data.dadosNfe.numero}</td></tr>
                <tr><th>Data Emissão:</th><td>${data.dadosNfe.dataEmissao}</td></tr>
                <tr><th>Valor Total:</th><td>${data.dadosNfe.valorTotal}</td></tr>
                <tr><th>Protocolo:</th><td>${data.dadosNfe.protocolo}</td></tr>
            </table>
            
            <h3>Emitente</h3>
            <table>
                <tr><th>Nome:</th><td>${data.emitente.nome}</td></tr>
                <tr><th>CNPJ:</th><td>${data.emitente.cnpj}</td></tr>
                <tr><th>IE:</th><td>${data.emitente.ie}</td></tr>
                <tr><th>Endereço:</th><td>${data.emitente.endereco}</td></tr>
                <tr><th>Município/UF:</th><td>${data.emitente.municipio} / ${data.emitente.uf}</td></tr>
            </table>
            
            <h3>Produtos (${data.produtos.length} itens)</h3>
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>NCM</th>
                        <th>Quant.</th>
                        <th>Unid.</th>
                        <th>Valor Unit.</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.produtos.forEach(prod => {
            html += `
                <tr>
                    <td>${prod.numero}</td>
                    <td>${prod.codigo}</td>
                    <td>${prod.descricao}</td>
                    <td>${prod.ncm}</td>
                    <td>${prod.quantidade}</td>
                    <td>${prod.unidade}</td>
                    <td>${prod.valorUnitario}</td>
                    <td>${prod.valorTotal}</td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        resultsDiv.innerHTML = html;
    }

    exportXmlBtn.addEventListener('click', function() {
        if (!parsedData) {
            alert('Nenhum dado para exportar. Processe uma NFC-e primeiro.');
            return;
        }
        
        const xml = generateXml(parsedData);
        downloadFile('nfe_erp.xml', xml, 'application/xml');
    });

    exportCsvBtn.addEventListener('click', function() {
        if (!parsedData) {
            alert('Nenhum dado para exportar. Processe uma NFC-e primeiro.');
            return;
        }
        
        const csv = generateCsv(parsedData);
        downloadFile('produtos_nfe.csv', csv, 'text/csv');
    });

    exportExcelBtn.addEventListener('click', function() {
    if (!parsedData || !parsedData.produtos || parsedData.produtos.length === 0) {
        alert('Nenhum dado de produto para exportar. Processe uma NFC-e primeiro.');
        return;
    }
    
    try {
        // Prepara os dados para a planilha
        const produtosData = parsedData.produtos.map(prod => ({
            'Item': prod.numero,
            'Código': prod.codigo,
            'Descrição': prod.descricao,
            'NCM': prod.ncm,
            'Quantidade': formatNumber(prod.quantidade),
            'Unidade': prod.unidade,
            'Valor Unitário': formatNumber(prod.valorUnitario),
            'Valor Total': formatNumber(prod.valorTotal)
        }));
        
        // Cria a planilha
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(produtosData);
        
        // Adiciona cabeçalhos
        XLSX.utils.book_append_sheet(wb, ws, "Produtos");
        
        // Adiciona uma segunda aba com dados da nota
        const notaData = [
            ['Número NFC-e', parsedData.dadosNfe.numero],
            ['Chave de Acesso', parsedData.dadosNfe.chave],
            ['Data Emissão', parsedData.dadosNfe.dataEmissao],
            ['Valor Total', formatNumber(parsedData.dadosNfe.valorTotal)],
            ['Protocolo', parsedData.dadosNfe.protocolo],
            [],
            ['Emitente', parsedData.emitente.nome],
            ['CNPJ', parsedData.emitente.cnpj],
            ['Inscrição Estadual', parsedData.emitente.ie],
            ['Endereço', parsedData.emitente.endereco],
            ['Município/UF', `${parsedData.emitente.municipio}/${parsedData.emitente.uf}`]
        ];
        
        const wsNota = XLSX.utils.aoa_to_sheet(notaData);
        XLSX.utils.book_append_sheet(wb, wsNota, "Dados NFC-e");
        
        // Gera o arquivo
        XLSX.writeFile(wb, 'nfe_produtos.xlsx');
    } catch (error) {
        console.error('Erro ao gerar Excel:', error);
        alert('Ocorreu um erro ao gerar a planilha. Verifique o console para detalhes.');
    }
});

    function generateXml(data) {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<NotaFiscal>
    <Cabecalho>
        <Numero>${data.dadosNfe.numero}</Numero>
        <Chave>${data.dadosNfe.chave}</Chave>
        <DataEmissao>${data.dadosNfe.dataEmissao}</DataEmissao>
        <ValorTotal>${data.dadosNfe.valorTotal}</ValorTotal>
        <Emitente>
            <Nome>${data.emitente.nome}</Nome>
            <CNPJ>${data.emitente.cnpj}</CNPJ>
            <IE>${data.emitente.ie}</IE>
            <Endereco>${data.emitente.endereco}</Endereco>
            <Municipio>${data.emitente.municipio}</Municipio>
            <UF>${data.emitente.uf}</UF>
        </Emitente>
    </Cabecalho>
    <Produtos>
`;
        
        data.produtos.forEach(prod => {
            xml += `        <Produto>
            <Item>${prod.numero}</Item>
            <Codigo>${prod.codigo}</Codigo>
            <Descricao>${escapeXml(prod.descricao)}</Descricao>
            <NCM>${prod.ncm}</NCM>
            <Quantidade>${prod.quantidade}</Quantidade>
            <Unidade>${prod.unidade}</Unidade>
            <ValorUnitario>${prod.valorUnitario}</ValorUnitario>
            <ValorTotal>${prod.valorTotal}</ValorTotal>
        </Produto>
`;
        });
        
        xml += `    </Produtos>
</NotaFiscal>`;
        
        return xml;
    }

    function generateCsv(data) {
        let csv = 'Item;Código;Descrição;NCM;Quantidade;Unidade;Valor Unitário;Valor Total\n';
        
        data.produtos.forEach(prod => {
            csv += `${prod.numero};${prod.codigo};"${prod.descricao.replace(/"/g, '""')}";${prod.ncm};${prod.quantidade};${prod.unidade};${prod.valorUnitario};${prod.valorTotal}\n`;
        });
        
        return csv;
    }

    function downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }
});

function formatNumber(value) {
    if (typeof value === 'string') {
        // Remove pontos como separador de milhar e substitui vírgula por ponto
        return parseFloat(value.replace(/\./g, '').replace(',', '.'));
    }
    return value;
}