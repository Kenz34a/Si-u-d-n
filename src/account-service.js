import { parseSave } from './game.js';

export function createAccountService({ changed, loaded }) {
  const service = { user: null, revision: 0, csrf: '', status: 'local', error: '', cacheId: null };
  let pending = null, sending = null, timer, epoch = 0;
  const metadataKey = id => `anime-nexus-account-${id}-sync`;
  service.storageKey = () => service.cacheId ? `anime-nexus-account-${service.cacheId}` : 'anime-nexus-v1';
  const metadata = dirty => { try { if (service.cacheId) localStorage.setItem(metadataKey(service.cacheId), JSON.stringify({ revision: service.revision, dirty })); } catch {} };
  const status = (value, error = '') => { service.status = value; service.error = error; changed('status'); };
  service.request = async (path, method = 'GET', body) => {
    let response;
    try { response = await fetch(path, { method, credentials: 'same-origin', headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(service.csrf ? { 'X-CSRF-Token': service.csrf } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
    catch { const error = new Error('Không kết nối được máy chủ. Bản chơi vẫn được giữ trên thiết bị.'); error.status = 0; throw error; }
    let data;
    try { data = await response.json(); } catch { const error = new Error('Máy chủ tài khoản chưa sẵn sàng.'); error.status = response.status; throw error; }
    if (!response.ok) {
      const error = new Error(data.error ?? 'Thao tác không thành công.'); error.status = response.status;
      if (response.status === 401 && service.user) { service.user = null; pending = null; epoch++; status('expired', error.message); changed('session'); }
      throw error;
    }
    return data;
  };
  service.adopt = (data, recoverCache = false) => {
    epoch++; pending = null; clearTimeout(timer);
    service.user = data.user ?? service.user; service.revision = data.revision; service.csrf = data.csrf ?? service.csrf; service.cacheId = service.user.id;
    let state = parseSave(JSON.stringify(data.state));
    if (!state) throw new Error('Bản lưu trên máy chủ không hợp lệ.');
    let cached, meta;
    if (recoverCache) { try { cached = parseSave(localStorage.getItem(service.storageKey())); meta = JSON.parse(localStorage.getItem(metadataKey(service.cacheId))); } catch {} }
    if (cached && meta?.dirty) {
      loaded(cached); changed('session');
      if (meta.revision === service.revision) { status('saved'); service.enqueue(cached); }
      else status('conflict', 'Máy chủ và bản chưa lưu trên thiết bị đều đã thay đổi. Tải bản lưu trước khi chọn bản máy chủ.');
    } else { loaded(state); metadata(false); status('saved'); changed('session'); }
  };
  service.initialize = async () => {
    try { const data = await service.request('/api/auth/session'); if (data.user) service.adopt(data, true); }
    catch (error) { service.error = error.message; changed('status'); }
  };
  service.login = async (kind, body) => { const data = await service.request(`/api/auth/${kind}`, 'POST', body); service.adopt(data, true); return data; };
  service.enqueue = state => {
    if (!service.user || ['conflict', 'expired'].includes(service.status)) return;
    pending = structuredClone(state); metadata(true); status('saving');
    if (!timer && !sending) timer = setTimeout(() => { timer = null; service.flush(); }, 200);
  };
  service.flush = async () => {
    clearTimeout(timer); timer = null;
    if (sending) { await sending; if (pending && !['conflict', 'expired', 'offline'].includes(service.status)) return service.flush(); return service.status === 'saved'; }
    if (!pending || !service.user || ['conflict', 'expired'].includes(service.status)) return !pending && service.status !== 'conflict';
    const activeEpoch = epoch;
    sending = (async () => {
      while (pending && service.user && epoch === activeEpoch) {
        const snapshot = pending; pending = null;
        try {
          const data = await service.request('/api/save', 'PUT', { revision: service.revision, state: snapshot });
          if (epoch !== activeEpoch) return;
          service.revision = data.revision; service.user = data.user ?? service.user; metadata(Boolean(pending)); status(pending ? 'saving' : 'saved');
        } catch (error) {
          if (epoch !== activeEpoch) return;
          pending ??= snapshot;
          status(error.status === 409 ? 'conflict' : 'offline', error.message); return;
        }
      }
    })();
    await sending; sending = null;
    return service.status === 'saved';
  };
  service.reload = async () => {
    try { localStorage.setItem(service.storageKey() + '-backup', localStorage.getItem(service.storageKey())); } catch {}
    const data = await service.request('/api/save'); service.adopt({ ...data, user: service.user });
  };
  service.replace = async state => {
    if (!await service.flush()) throw new Error('Chưa đồng bộ xong. Hãy xử lý bản lưu đang chờ trước.');
    const data = await service.request('/api/save', 'PUT', { revision: service.revision, state }); service.adopt({ ...data, user: service.user });
  };
  service.changePassword = async body => {
    if (!await service.flush()) throw new Error('Hãy đồng bộ bản lưu trước khi đổi mật khẩu.');
    const data = await service.request('/api/auth/password', 'POST', body); service.adopt(data);
  };
  service.logout = async () => {
    if (service.user) { await service.flush(); await service.request('/api/auth/logout', 'POST', {}); }
    epoch++; pending = null; clearTimeout(timer); service.user = null; service.csrf = ''; service.cacheId = null; status('local'); changed('logout');
  };
  return service;
}
