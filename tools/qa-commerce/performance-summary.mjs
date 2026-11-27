import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [folder] = process.argv.slice(2);
const pages = [['vitrine', 'Vitrine'], ['fatias', 'Fatias Artesanais']];
const phases = [['antes', 'Referência'], ['depois', 'Candidato']];
const read = file => readFile(path.join(folder, file), 'utf8').then(JSON.parse);
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

function resources(report, type) {
  return report.audits['network-requests'].details.items
    .filter(item => item.resourceType === type)
    .reduce((total, item) => total + (item.transferSize || 0), 0);
}

const results = {};
for (const [phase] of phases) {
  const mobile = await read(`${phase}/rede-movel.json`);
  results[phase] = {};
  for (const [page] of pages) {
    const lighthouse = await Promise.all([1, 2, 3].map(run => read(`${phase}/${page}-${run}.report.json`)));
    const values = audit => lighthouse.map(report => report.audits[audit].numericValue);
    const mobileRuns = mobile.records.filter(record => record.name === page);
    if (mobileRuns.length !== 3 || mobileRuns.some(record => !record.largest || record.cls === undefined)) {
      throw new Error(`Medição incompleta para ${phase}/${page}`);
    }
    results[phase][page] = {
      lighthouse: {
        lcpMs: median(values('largest-contentful-paint')),
        cls: median(values('cumulative-layout-shift')),
        totalBytes: median(values('total-byte-weight')),
        imageBytes: median(lighthouse.map(report => resources(report, 'Image'))),
        cssBytes: median(lighthouse.map(report => resources(report, 'Stylesheet'))),
        jsBytes: median(lighthouse.map(report => resources(report, 'Script'))),
        score: median(lighthouse.map(report => report.categories.performance.score)),
      },
      mobile: {
        lcpMs: median(mobileRuns.map(record => record.largest.time)),
        cls: median(mobileRuns.map(record => record.cls)),
        lcpElements: mobileRuns.map(record => record.largest.url ? 'Foto' : record.largest.element),
        initialTitle: mobileRuns[0].first.title,
        initialOrderActions: mobileRuns[0].first.enabledOrderButtons,
      },
    };
  }
}
await writeFile(path.join(folder, 'comparativo.json'), JSON.stringify(results, null, 2));

const number = (value, digits) => value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
const seconds = ms => `${number(ms / 1000, 2)} s`;
const kib = bytes => `${number(bytes / 1024, 0)} KiB`;
const sections = pages.map(([page, title]) => `<section><h2>${title}</h2><div class="scroll"><table>
  <thead><tr><th scope="col">Versão</th><th scope="col">LCP Lighthouse</th><th scope="col">CLS Lighthouse</th><th scope="col">Lighthouse</th><th scope="col">Recursos</th><th scope="col">Imagens</th><th scope="col">LCP móvel</th><th scope="col">CLS móvel</th></tr></thead>
  <tbody>${phases.map(([phase, name]) => {
    const { lighthouse: lh, mobile } = results[phase][page];
    return `<tr><th scope="row">${name}</th><td>${seconds(lh.lcpMs)}</td><td>${number(lh.cls, 3)}</td><td>${Math.round(lh.score * 100)}</td><td>${kib(lh.totalBytes)}</td><td>${kib(lh.imageBytes)}</td><td>${seconds(mobile.lcpMs)}</td><td>${number(mobile.cls, 3)}</td></tr>`;
  }).join('')}</tbody></table></div>
  <p>Elementos de LCP móvel · ${phases.map(([phase, name]) => `${name} ${results[phase][page].mobile.lcpElements.join(', ')}`).join(' / ')}</p>
  <p>Relatórios Lighthouse · ${phases.map(([phase, name]) => `${name} ${[1, 2, 3].map(run => `<a href="${phase}/${page}-${run}.report.html">${run}</a>`).join(' · ')}`).join(' / ')}</p>
  <div class="pairs">${['inicio', 'pronto'].flatMap((state, index) => phases.map(([phase, name]) => `<figure><figcaption>${name} · ${index ? 'Cardápio pronto' : 'Consulta em curso'}</figcaption><a href="${phase}/${page}-${state}.png"><img src="${phase}/${page}-${state}.png" alt="${title} · ${name}" loading="lazy"></a></figure>`)).join('')}</div>
  </section>`).join('');
await writeFile(path.join(folder, 'relatorio.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Desempenho · Luciane Oliveira Doces</title>
  <style>body{max-width:66rem;margin:auto;padding:1.25rem;background:#f9f3ed;color:#37241a;font:1rem/1.55 system-ui,sans-serif}h1,h2{font-family:Georgia,serif;line-height:1.2;font-weight:500}section{margin:2rem 0}a{color:#70432a}.scroll{overflow:auto}table{border-collapse:collapse;min-width:100%;white-space:nowrap}th,td{padding:.5rem;text-align:left;border-bottom:1px solid #dbc6b4}.pairs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}figure{margin:0}figcaption{font-size:.9rem;margin-bottom:.25rem}img{display:block;width:100%;max-width:390px;height:auto;border-radius:.5rem}</style>
  <main><h1>Desempenho do cardápio</h1><p>Medianas de três execuções por página e condição. Os testes usaram a mesma prévia local com dados simulados e recursos HTTP sem compressão.</p><p><a href="comparativo.json">Métricas em JSON</a> · <a href="antes/rede-movel.json">Rede móvel na referência</a> · <a href="depois/rede-movel.json">Rede móvel no candidato</a></p>${sections}</main></html>`);
