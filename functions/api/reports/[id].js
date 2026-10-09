function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function validId(id) {
  return /^relatorio-(?:dados-persistentes|\d{4}-\d{2}-\d{2})$/.test(id);
}

export async function onRequestGet({ env, params, request }) {
  const id = String(params.id || '');
  if (!validId(id)) return json({ error: 'Identificador inválido.' }, 400);
  const metaOnly = new URL(request.url).searchParams.get('meta') === '1';
  const columns = metaOnly ? 'id, atualizado_em, versao' : 'id, dados, atualizado_em, versao';
  const row = await env.DB.prepare(`SELECT ${columns} FROM relatorios_exibicao WHERE id = ?1`)
    .bind(id)
    .first();
  if (!row) return json({ error: 'Relatório não encontrado.' }, 404);
  if (!metaOnly) row.dados = JSON.parse(row.dados);
  return json(row);
}

export async function onRequestPut({ env, params, request }) {
  const id = String(params.id || '');
  if (!validId(id)) return json({ error: 'Identificador inválido.' }, 400);
  const body = await request.json().catch(() => null);
  if (!body?.dados || typeof body.dados !== 'object') return json({ error: 'Dados inválidos.' }, 400);

  const current = await env.DB.prepare('SELECT atualizado_em, versao FROM relatorios_exibicao WHERE id = ?1')
    .bind(id)
    .first();
  if (current && body.expectedUpdatedAt) {
    const expected = Date.parse(body.expectedUpdatedAt);
    const actual = Date.parse(current.atualizado_em);
    if (Number.isFinite(expected) && Number.isFinite(actual) && expected !== actual) {
      return json({ error: 'O relatório foi alterado por outro usuário.', atualizado_em: current.atualizado_em }, 409);
    }
  }

  const atualizadoEm = body.dados?._meta?.updatedAt || new Date().toISOString();
  const dados = JSON.stringify(body.dados);
  await env.DB.prepare(`
    INSERT INTO relatorios_exibicao (id, dados, atualizado_em, versao)
    VALUES (?1, ?2, ?3, 1)
    ON CONFLICT(id) DO UPDATE SET
      dados = excluded.dados,
      atualizado_em = excluded.atualizado_em,
      versao = relatorios_exibicao.versao + 1
  `).bind(id, dados, atualizadoEm).run();

  const saved = await env.DB.prepare('SELECT id, atualizado_em, versao FROM relatorios_exibicao WHERE id = ?1')
    .bind(id)
    .first();
  return json(saved);
}
