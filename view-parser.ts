import fs from 'fs';
import path from 'path';
import { NfceParser } from './parser'; // ajuste o caminho se necessário

const arquivoHtml = path.resolve(__dirname, '../assets/exemplo-nfce.html'); // caminho do seu HTML

try {
  const htmlContent = fs.readFileSync(arquivoHtml, 'utf-8');

  const parser = new NfceParser(htmlContent);
  const resultado = parser.parse();

  console.log('================ EMITENTE ================');
  console.log(resultado.emitente);

  console.log('\n================ DADOS DA NOTA ================');
  console.log(resultado.dadosNfe);

  console.log('\n================ PRODUTOS ================');
  resultado.produtos.forEach((produto, i) => {
    console.log(`Produto ${i + 1}:`, produto);
  });

} catch (error) {
  console.error('Erro ao ler ou processar o HTML:', error);
}
