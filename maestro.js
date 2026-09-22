(() => {
function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ';' && !quoted) {
      row.push(field); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); field = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = (rows.shift() || []).map(header => header.replace(/^\uFEFF/, ''));
  return rows.map(values => headers.reduce((item, header, index) => {
    item[header] = values[index] || '';
    return item;
  }, {}));
}

function seconds(value) {
  const parts = String(value || '').split(':').map(Number);
  return parts.length === 3 && parts.every(Number.isFinite) ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0;
}

function duration(total) {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return [hours, minutes, secs].map(value => String(value).padStart(2, '0')).join(':');
}

function isoDate(value) {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function newsName(row) {
  const name = normalize(row.Apresenta || row.Titulo);
  if (name === 'BOM DIA DF') return 'BOM DIA DF';
  if (name === 'DF1') return 'DF1';
  if (name.includes('GLOBO ESPORTE')) return 'GLOBO ESPORTE';
  if (name === 'DF2') return 'DF2';
  return '';
}

function parseMaestroFile(text) {
  const rows = parseCsv(text);
  if (!rows.length || !Object.prototype.hasOwnProperty.call(rows[0], 'Programa')) {
    throw new Error('O arquivo não possui o formato esperado da Consulta Analítica do Maestro.');
  }
  const date = isoDate(rows.find(row => row.DataExibicao)?.DataExibicao);
  if (!date) throw new Error('Não foi possível identificar a data de exibição do arquivo.');
  const programBlocks = rows.filter(row => /^PD\d*/i.test(String(row.Segmento || '').trim()));
  const newsGroups = new Map();
  programBlocks.forEach(row => {
    const name = newsName(row);
    if (!name) return;
    if (!newsGroups.has(name)) newsGroups.set(name, []);
    newsGroups.get(name).push(row);
  });
  const expectedNews = ['BOM DIA DF', 'DF1', 'GLOBO ESPORTE', 'DF2'];
  const news = expectedNews.filter(name => newsGroups.has(name)).map(name => {
    const blocks = newsGroups.get(name).sort((a, b) => a.HoraInicio.localeCompare(b.HoraInicio));
    return {
      name,
      start: blocks[0].HoraInicio.slice(0, 5),
      production: duration(blocks.reduce((total, block) => total + seconds(block.Duracao), 0)),
      blocks: blocks.length,
      notes: 'Importado do Maestro'
    };
  });
  const groups = new Map();
  programBlocks.forEach(row => {
    const key = normalize(row.Programa);
    if (!key || newsName(row)) return;
    if (!groups.has(key)) groups.set(key, { name: row.Programa, rows: [] });
    groups.get(key).rows.push(row);
  });
  const strategy = [...groups.values()].map(group => {
    const ids = [...new Set(group.rows.map(row => String(row.Id || '').trim()).filter(Boolean))];
    const networkIds = ids.filter(id => ['REDE-1', 'SAT-SP'].includes(normalize(id)));
    const localIds = ids.filter(id => !['REDE-1', 'SAT-SP'].includes(normalize(id)));
    return {
      name: group.name,
      network: networkIds.length > 0,
      local: localIds.length > 0,
      observation: localIds.length ? `IDs locais: ${localIds.join(', ')}` : ''
    };
  });
  return { date, news, strategy, rowCount: rows.length };
}

window.GloboMaestro = { parseMaestroFile };
})();
