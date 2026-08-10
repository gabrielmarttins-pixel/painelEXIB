(() => {
const {
  HISTORY_LIMIT,
  SUPABASE_KEY,
  SUPABASE_TABLE,
  SUPABASE_URL,
  sections
} = window.GloboConfig;

function createSupabaseClient() {
  if (window.location.protocol === 'file:') return null;
  return window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY) || null;
}

function getReportId(reportDate) {
  return `relatorio-${reportDate || new Date().toISOString().slice(0, 10)}`;
}

function cleanReportData(data = {}) {
  const clean = {
    reportDate: data.reportDate || '',
    weekday: data.weekday || '',
    serviceHandoffHtml: data.serviceHandoffHtml || ''
  };
  Object.keys(sections).forEach(section => {
    clean[section] = Array.isArray(data[section]) ? data[section] : [];
  });
  if (data._persistentVersion) clean._persistentVersion = data._persistentVersion;
  if (Array.isArray(data._persistentClearedSections)) {
    clean._persistentClearedSections = data._persistentClearedSections;
  }
  return clean;
}

function getReportSignature(data) {
  return JSON.stringify(cleanReportData(data));
}

function formatLastUpdate(meta) {
  if (!meta?.updatedAt) return 'Última atualização: ainda não sincronizado';
  const date = new Date(meta.updatedAt);
  return `Última atualização: ${date.toLocaleString('pt-BR')}`;
}

function buildPayload(data, previousPayload) {
  const clean = cleanReportData(data);
  const previousHistory = Array.isArray(previousPayload?._history) ? previousPayload._history : [];
  const previousMeta = previousPayload?._meta;
  const history = previousMeta
    ? [{ at: previousMeta.updatedAt, by: previousMeta.updatedBy, signature: getReportSignature(previousPayload) }, ...previousHistory].slice(0, HISTORY_LIMIT)
    : previousHistory.slice(0, HISTORY_LIMIT);

  return {
    ...clean,
    _meta: {
      updatedAt: new Date().toISOString(),
      updatedBy: 'Sistema',
      reportId: getReportId(clean.reportDate)
    },
    _history: history
  };
}

async function fetchRemoteReport(supabaseClient, reportDate) {
  if (!supabaseClient || !reportDate) return { payload: null, row: null, error: null };
  try {
    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLE)
      .select('id, dados, atualizado_em')
      .eq('id', getReportId(reportDate))
      .maybeSingle();

    return { payload: data?.dados || null, row: data || null, error };
  } catch (error) {
    return { payload: null, row: null, error };
  }
}

async function saveRemoteReport(supabaseClient, data, previousPayload) {
  if (!supabaseClient) return { payload: null, row: null, error: null };
  const payload = buildPayload(data, previousPayload);
  try {
    const { data: row, error } = await supabaseClient
      .from(SUPABASE_TABLE)
      .upsert({ id: getReportId(data.reportDate), dados: payload, atualizado_em: payload._meta.updatedAt }, { onConflict: 'id' })
      .select('id, atualizado_em, dados')
      .single();

    return { payload: row?.dados || payload, row, error };
  } catch (error) {
    return { payload, row: null, error };
  }
}

window.GloboStorage = {
  createSupabaseClient,
  getReportId,
  cleanReportData,
  getReportSignature,
  formatLastUpdate,
  buildPayload,
  fetchRemoteReport,
  saveRemoteReport
};
})();

