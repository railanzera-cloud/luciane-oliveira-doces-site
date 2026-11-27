import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [folder] = process.argv.slice(2);
const pages = [['vitrine', 'Vitrine'], ['fatias', 'Fatias Artesanais']];
const profiles = [['referencia', 'identity', 'Checkpoint sem compressão'], ['referencia', 'pages', 'Checkpoint no perfil Pages'],
  ['candidato', 'pages', 'CSS separado no perfil Pages'], ['oficial', 'oficial', 'Site oficial']];
const median = values => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};

async function samples(phase) {
  try { return JSON.parse(await readFile(path.join(folder, phase, 'medicoes.json'), 'utf8')).measurements; }
  catch (error) { if (error.code === 'ENOENT' && ['oficial', 'pareado'].includes(phase)) return []; throw error; }
}

if ((await samples('pareado')).length) {
  profiles.push(['pareado', 'referencia', 'Checkpoint · rodada intercalada'], ['pareado', 'candidato', 'CSS separado · rodada intercalada']);
}

function summarize(records, scenario) {
  const values = records.map(record => record[scenario]);
  const metric = extract => median(values.map(extract));
  const typeResources = (record, type) => record.resources.filter(resource => resource.type === type);
  const bytes = (sample, resources = sample.resources) => resources.reduce((sum, request) => sum + (request.bytes ?? 0), 0);
  const menu = sample => sample.resources.filter(resource => resource.publicMenu && resource.method === 'GET');
  return {
    samples: records.length,
    lcpMs: metric(sample => sample.lcp?.ms),
    cls: metric(sample => sample.cls),
    fcpMs: metric(sample => sample.fcp),
    firstPhotoMs: metric(sample => sample.photoMs),
    catalogMs: metric(sample => sample.catalogMs),
    scriptMs: metric(sample => sample.scriptMs),
    mainThreadMs: metric(sample => sample.mainThreadMs),
    cssBytes: metric(sample => bytes(sample, typeResources(sample, 'Stylesheet'))),
    cssEndMs: metric(sample => Math.max(...typeResources(sample, 'Stylesheet').map(resource => resource.endMs ?? 0))),
    cssEncodings: [...new Set(values.flatMap(sample => typeResources(sample, 'Stylesheet').map(resource => resource.encoding)))],
    jsBytes: metric(sample => bytes(sample, typeResources(sample, 'Script'))),
    jsEndMs: metric(sample => Math.max(...typeResources(sample, 'Script').map(resource => resource.endMs ?? 0))),
    imageBytes: metric(sample => bytes(sample, typeResources(sample, 'Image'))),
    fontRequests: metric(sample => typeResources(sample, 'Font').length),
    totalBytes: metric(sample => bytes(sample)),
    menuStartMs: metric(sample => Math.min(...menu(sample).map(resource => resource.startMs))),
    menuEndMs: metric(sample => Math.max(...menu(sample).map(resource => resource.endMs ?? 0))),
    browserCacheHits: metric(sample => sample.resources.filter(resource => resource.cache).length),
    lcpElements: values.map(sample => sample.lcp?.url ? 'foto' : sample.lcp?.tag),
  };
}

const results = [];
for (const [phase, mode, label] of profiles) {
  const measurements = await samples(phase);
  for (const [page, title] of pages) {
    const records = measurements.filter(record => record.mode === mode && record.name === page);
    if (records.length !== 3 && phase !== 'oficial') throw new Error(`Medição incompleta para ${phase}/${mode}/${page}`);
    results.push({ phase, mode, label, page, title, frio: summarize(records, 'frio'), revisita: summarize(records, 'revisita') });
  }
}
await writeFile(path.join(folder, 'comparativo.json'), JSON.stringify(results, null, 2));

const format = (value, digits = 2) => value == null ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
const seconds = ms => ms == null ? '—' : `${format(ms / 1000)} s`;
const kib = bytes => bytes == null ? '—' : `${format(bytes / 1024, 0)} KiB`;
const sections = pages.map(([page, title]) => {
  const runs = results.filter(result => result.page === page);
  return `<section><h2>${title}</h2><div class="scroll"><table><thead><tr>${['Perfil', 'Amostras', 'LCP frio', 'LCP revisita', 'CLS frio', 'Primeira foto', 'CSS frio', 'JS frio', 'Total frio', 'Total revisita'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>
  ${runs.map(({ label, frio, revisita }) => `<tr><th scope="row">${label}</th><td>${frio.samples}</td><td>${seconds(frio.lcpMs)}</td><td>${seconds(revisita.lcpMs)}</td><td>${format(frio.cls, 3)}</td><td>${seconds(frio.firstPhotoMs)}</td><td>${kib(frio.cssBytes)}</td><td>${kib(frio.jsBytes)}</td><td>${kib(frio.totalBytes)}</td><td>${kib(revisita.totalBytes)}</td></tr>`).join('')}
  </tbody></table></div><div class="pictures">${runs.filter(row => row.frio.samples > 0 && row.mode !== 'identity' && row.phase !== 'pareado').map(row => `<figure><figcaption>${row.label}</figcaption><a href="${row.phase}/${row.mode}-${page}.png"><img src="${row.phase}/${row.mode}-${page}.png" alt="${title} · ${row.label}" loading="lazy"></a></figure>`).join('')}</div></section>`;
}).join('');
await writeFile(path.join(folder, 'relatorio.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Distribuição e desempenho · Luciane Oliveira Doces</title>
<style>body{max-width:72rem;margin:auto;padding:1.25rem;background:#f9f3ed;color:#37241a;font:1rem/1.55 system-ui,sans-serif}h1,h2{font-family:Georgia,serif;line-height:1.2;font-weight:500}a{color:#70432a}.scroll{overflow:auto}table{border-collapse:collapse;min-width:100%;white-space:nowrap}th,td{padding:.5rem;text-align:left;border-bottom:1px solid #dbc6b4}.pictures{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-top:1rem}figure{margin:0}img{display:block;width:100%;max-width:390px;height:auto}</style>
<main><h1>Distribuição e desempenho</h1><p>Medianas no Chromium mobile a 390 × 844 px, 150 ms de latência, 1,64 Mbps de download e CPU 4× mais lenta. Na leitura do site oficial, a navegação permitiu somente recursos públicos e consultas de disponibilidade. A prévia usa dados simulados.</p><p><a href="comparativo.json">Métricas e fases de carregamento</a> · <a href="referencia/medicoes.json">Amostras do checkpoint</a> · <a href="candidato/medicoes.json">Amostras do candidato</a> · <a href="oficial/medicoes.json">Amostras oficiais</a> · <a href="cabecalhos-publicos.txt">Cabeçalhos oficiais</a>${profiles.some(([phase]) => phase === 'pareado') ? ' · <a href="pareado/medicoes.json">Amostras intercaladas</a>' : ''}</p>${sections}</main></html>`);
