export function createAdminController(account, updated) {
  const model = { dashboard: null, players: [], selected: null, backups: [], draft: null, search: '', page: 1, total: 0, error: '', busy: false };
  const controller = { model };
  const run = async operation => {
    if (model.busy) return;
    model.busy = true; updated();
    try { return await operation(); }
    finally { model.busy = false; updated(); }
  };
  const refresh = async () => {
    const [dashboard, list] = await Promise.all([account.request('/api/admin/dashboard'), account.request(`/api/admin/players?search=${encodeURIComponent(model.search)}&page=${model.page}`)]);
    model.dashboard = dashboard; model.players = list.players; model.total = list.total; model.error = '';
  };
  const select = async id => {
    const [detail, backups] = await Promise.all([account.request(`/api/admin/players/${id}`), account.request(`/api/admin/players/${id}/backups`)]);
    model.selected = detail; model.backups = backups.backups; model.draft = null; model.error = '';
  };
  controller.refresh = () => run(refresh);
  controller.select = id => run(() => select(id));
  const accept = async data => {
    model.selected = data; model.draft = null;
    if (data.user.id === account.user?.id) account.adopt(data);
    await refresh(); await select(data.user.id);
  };
  controller.resources = async draft => {
    model.draft = draft;
    return run(async () => {
      const selected = model.selected;
      if (selected.user.id === account.user.id && !await account.flush()) throw new Error('Hãy đồng bộ tiến trình của bạn trước.');
      await accept(await account.request(`/api/admin/players/${selected.user.id}`, 'PATCH', { revision: selected.revision, name: draft.name, resources: Object.fromEntries(['gold','gems','potions','shards'].map(key => [key, Number(draft[key])])) }));
    });
  };
  controller.execute = context => run(async () => {
    const { operation, target, backupId } = context;
    if (target.user.id === account.user.id && !await account.flush()) throw new Error('Hãy đồng bộ tiến trình của bạn trước.');
    const body = operation === 'status' ? { status: target.user.status === 'active' ? 'banned' : 'active' } : { revision: target.revision, ...(backupId ? { backupId: Number(backupId) } : {}) };
    const data = await account.request(`/api/admin/players/${target.user.id}/${operation}`, 'POST', body);
    if (operation === 'status') { await refresh(); await select(target.user.id); }
    else await accept(data);
  });
  controller.password = password => run(async () => { await account.request(`/api/admin/players/${model.selected.user.id}/password`, 'POST', { password }); await refresh(); });
  controller.report = error => { model.error = error.message; updated(); };
  return controller;
}
