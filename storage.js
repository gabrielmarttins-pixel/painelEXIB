(() => {
const {
  DATA_BACKEND,
  HISTORY_LIMIT,
  SUPABASE_KEY,
  SUPABASE_TABLE,
  SUPABASE_URL,
  sections
} = window.GloboConfig;

function createSupabaseClient() {
  if (window.location.protocol === 'file:') return null;
  if (DATA_BACKEND === 'cloudflare') return { provider: 'cloudflare' };
  return window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY) || null;
}

function cloudflareEndpoint(reportDate, meta = false) {
  const suffix = meta ? '?meta=1' : '';
  return `/api/reports/${encodeURIComponent(getReportId(reportDate))}${suffix}`;
}

async function cloudflareResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (response.ok) return { body, error: null };
  if (response.status === 404) return { body: null, error: null };
  const error = new Error(body.error || `Falha na API (${response.status})`);
  error.status = response.status;
  return { body: null, error };
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
  if (data.strategyTabs && typeof data.strategyTabs === 'object') {
    clean.strategyTabs = ['weekday', 'saturday', 'sunday'].reduce((tabs, key) => {
      tabs[key] = Array.isArray(data.strategyTabs[key]) ? data.strategyTabs[key] : [];
      return tabs;
    }, {});
  }
  if (data._persistentSnapshots && typeof data._persistentSnapshots === 'object') {
    clean._persistentSnapshots = data._persistentSnapshots;
  }
  if (data._persistentVersion) clean._persistentVersion = data._persistentVersion;
  if (Array.isArray(data._persistentClearedSections)) {
    clean._persistentClearedSections = data._persistentClearedSections;
  }
  if (data._persistentHandoffInitialized === true) {
    clean._persistentHandoffInitialized = true;
  }
  if (data._persistentStrategyInitialized === true) clean._persistentStrategyInitialized = true;
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
  if (supabaseClient.provider === 'cloudflare') {
    try {
      const { body, error } = await cloudflareResponse(await fetch(cloudflareEndpoint(reportDate), { cache: 'no-store' }));
      return { payload: body?.dados || null, row: body || null, error };
    } catch (error) {
      return { payload: null, row: null, error };
    }
  }
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

async function fetchRemoteReportMeta(supabaseClient, reportDate) {
  if (!supabaseClient || !reportDate) return { row: null, error: null };
  if (supabaseClient.provider === 'cloudflare') {
    try {
      const { body, error } = await cloudflareResponse(await fetch(cloudflareEndpoint(reportDate, true), { cache: 'no-store' }));
      return { row: body || null, error };
    } catch (error) {
      return { row: null, error };
    }
  }
  try {
    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLE)
      .select('id, atualizado_em')
      .eq('id', getReportId(reportDate))
      .maybeSingle();
    return { row: data || null, error };
  } catch (error) {
    return { row: null, error };
  }
}

async function saveRemoteReport(supabaseClient, data, previousPayload) {
  if (!supabaseClient) return { payload: null, row: null, error: null };
  const payload = buildPayload(data, previousPayload);
  if (supabaseClient.provider === 'cloudflare') {
    try {
      const response = await fetch(cloudflareEndpoint(data.reportDate), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          dados: payload,
          expectedUpdatedAt: previousPayload?._meta?.updatedAt || null
        })
      });
      const { body, error } = await cloudflareResponse(response);
      return { payload, row: body || null, error };
    } catch (error) {
      return { payload, row: null, error };
    }
  }
  try {
    const { data: row, error } = await supabaseClient
      .from(SUPABASE_TABLE)
      .upsert({ id: getReportId(data.reportDate), dados: payload, atualizado_em: payload._meta.updatedAt }, { onConflict: 'id' })
      .select('id, atualizado_em')
      .single();

    return { payload, row, error };
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
  fetchRemoteReportMeta,
  fetchRemoteReport,
  saveRemoteReport
};
})();

