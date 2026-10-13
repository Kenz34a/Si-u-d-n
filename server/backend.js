import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { freshState, parseSave } from '../src/game.js';

const SESSION_MS = 12 * 60 * 60 * 1000;
const digest = value => createHash('sha256').update(value).digest('hex');
const hashPassword = password => { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; };
const verifyPassword = (password, stored) => { const [salt, key] = stored.split(':'); const candidate = scryptSync(password, salt, 64); const expected = Buffer.from(key, 'hex'); return candidate.length === expected.length && timingSafeEqual(candidate, expected); };
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new ApiError(status, message); };
const number = (value, max = 1_000_000_000) => Number.isSafeInteger(value) && value >= 0 && value <= max;
const cleanUsername = value => typeof value === 'string' && /^[a-zA-Z0-9_.-]{3,24}$/.test(value) ? value.toLowerCase() : fail(400, 'Tên đăng nhập cần 3–24 chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang.');
const validPassword = value => typeof value === 'string' && value.length >= 8 && value.length <= 128 ? value : fail(400, 'Mật khẩu cần từ 8 đến 128 ký tự.');
const cleanName = value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 24 ? value.trim() : fail(400, 'Tên hiển thị cần từ 1 đến 24 ký tự.');
const validState = value => {
  const text = JSON.stringify(value);
  if (!text || Buffer.byteLength(text) > 200_000) fail(400, 'Bản lưu vượt quá kích thước cho phép.');
  const parsed = parseSave(text, { refreshDay: false });
  if (!parsed || !number(parsed.gold) || !number(parsed.gems) || !number(parsed.potions, 100_000) || !number(parsed.adventure.shards)) fail(400, 'Tiến trình không hợp lệ.');
  return parsed;
};
const publicUser = row => ({ id: row.id, username: row.username, name: row.display_name, role: row.role, status: row.status, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at, lastLogin: row.last_login });
const summary = state => ({ level: state.level, gold: state.gold, gems: state.gems, potions: state.potions, shards: state.adventure.shards, heroes: state.unlocked.length, chapters: Object.values(state.adventure.story).reduce((a, b) => a + b, 0) });

export function createBackend(options = {}) {
  const databasePath = options.databasePath ?? (process.env.ANIME_DATABASE_PATH || resolve('.data/nexus.sqlite'));
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('player','admin')), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','banned')),
      display_name TEXT NOT NULL, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, last_login INTEGER);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL REFERENCES users(id),
      target_id TEXT REFERENCES users(id), action TEXT NOT NULL, details TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id),
      state TEXT NOT NULL, revision INTEGER NOT NULL, created_at INTEGER NOT NULL);
  `);
  const bootstrapFile = options.bootstrapFile === false ? null : options.bootstrapFile ?? (databasePath === ':memory:' ? null : resolve(dirname(databasePath), 'admin-bootstrap.txt'));
  if (!db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get()) {
    const username = cleanUsername(options.initialAdmin?.username ?? (process.env.ANIME_ADMIN_USERNAME || 'admin'));
    const password = options.initialAdmin?.password ?? (process.env.ANIME_ADMIN_PASSWORD || randomBytes(24).toString('base64url'));
    validPassword(password);
    const state = freshState(); state.name = 'Quản trị viên';
    db.prepare('INSERT INTO users(id,username,password_hash,role,display_name,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), username, hashPassword(password), 'admin', state.name, JSON.stringify(state), Date.now(), Date.now());
    if (bootstrapFile && !process.env.ANIME_ADMIN_PASSWORD && !options.initialAdmin?.password) writeFileSync(bootstrapFile, `Tên đăng nhập: ${username}\nMật khẩu: ${password}\nĐổi mật khẩu trong Tài khoản sau khi đăng nhập.\n`, { mode: 0o600, flag: 'wx' });
  }
  const dummyHash = hashPassword(randomBytes(24).toString('hex'));
  const failures = new Map();
  const transaction = fn => { db.exec('BEGIN IMMEDIATE'); try { const value = fn(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; } };
  const audit = (actor, target, action, details = {}) => db.prepare('INSERT INTO audit(actor_id,target_id,action,details,created_at) VALUES(?,?,?,?,?)').run(actor, target, action, JSON.stringify(details), Date.now());
  const userById = id => db.prepare('SELECT * FROM users WHERE id=?').get(id) ?? fail(404, 'Không tìm thấy tài khoản.');
  const sessionFrom = req => {
    const token = /(?:^|;\s*)nexus_session=([a-zA-Z0-9_-]+)/.exec(req.headers.cookie ?? '')?.[1];
    if (!token) return null;
    return db.prepare("SELECT users.*, sessions.csrf FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>? AND users.status='active'").get(digest(token), Date.now()) ?? null;
  };
  const cookie = (res, token, maxAge = SESSION_MS / 1000) => res.setHeader('Set-Cookie', `nexus_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${options.secureCookie ?? process.env.ANIME_SECURE_COOKIE === 'true' ? '; Secure' : ''}`);
  const openSession = (res, user) => {
    const token = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
    db.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').run(digest(token), user.id, csrf, Date.now() + SESSION_MS);
    cookie(res, token);
    return { user: publicUser(user), state: JSON.parse(user.state), revision: user.revision, csrf };
  };
  const requireSession = (req, mutation = false) => {
    const user = sessionFrom(req);
    if (!user) fail(401, 'Phiên đăng nhập đã hết hạn hoặc tài khoản bị khóa.');
    if (mutation && (typeof req.headers['x-csrf-token'] !== 'string' || req.headers['x-csrf-token'] !== user.csrf)) fail(403, 'Yêu cầu xác thực không hợp lệ. Hãy tải lại trang.');
    return user;
  };
  const save = (id, revision, state, actor, action) => transaction(() => {
    const previous = userById(id);
    if (!number(revision) || previous.revision !== revision) fail(409, 'Tiến trình đã thay đổi trên máy chủ. Hãy tải bản mới trước khi tiếp tục.');
    if (actor) {
      db.prepare('INSERT INTO backups(user_id,state,revision,created_at) VALUES(?,?,?,?)').run(id, previous.state, revision, Date.now());
      db.prepare('DELETE FROM backups WHERE user_id=? AND id NOT IN (SELECT id FROM backups WHERE user_id=? ORDER BY id DESC LIMIT 10)').run(id, id);
    }
    const result = db.prepare('UPDATE users SET state=?,display_name=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').run(JSON.stringify(state), state.name, Date.now(), id, revision);
    if (result.changes !== 1) fail(409, 'Tiến trình đã thay đổi.');
    if (actor) audit(actor, id, action, { before: summary(JSON.parse(previous.state)), after: summary(state) });
    return { user: publicUser(userById(id)), state, revision: revision + 1 };
  });
  const readBody = async req => {
    if (!(req.headers['content-type'] ?? '').startsWith('application/json')) fail(415, 'Yêu cầu cần dùng JSON.');
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += Buffer.byteLength(chunk); if (size > 220_000) fail(413, 'Yêu cầu quá lớn.'); chunks.push(Buffer.from(chunk)); }
    try { const body = JSON.parse(Buffer.concat(chunks).toString()); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error(); return body; }
    catch { fail(400, 'Dữ liệu JSON không hợp lệ.'); }
  };

  async function route(req, res) {
    const url = new URL(req.url, 'http://localhost'), path = url.pathname, method = req.method;
    const mutation = !['GET', 'HEAD'].includes(method);
    if (mutation) {
      const expectedOrigin = options.origin ?? (process.env.ANIME_APP_ORIGIN || undefined) ?? `http${options.secureCookie ?? process.env.ANIME_SECURE_COOKIE === 'true' ? 's' : ''}://${req.headers.host}`;
      if (req.headers.origin !== expectedOrigin) fail(403, 'Nguồn yêu cầu không hợp lệ.');
    }
    if (method === 'GET' && path === '/api/health') return { status: 'ok' };
    if (method === 'GET' && path === '/api/auth/session') {
      const user = sessionFrom(req);
      return user ? { user: publicUser(user), state: JSON.parse(user.state), revision: user.revision, csrf: user.csrf } : { user: null };
    }
    if (method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(path)) {
      const body = await readBody(req), username = cleanUsername(body.username), password = validPassword(body.password);
      const rateKey = `${req.socket?.remoteAddress ?? 'local'}:${username}`, now = Date.now(), attempts = failures.get(rateKey);
      if (attempts && attempts.until > now && attempts.count >= 5) fail(429, 'Thử đăng nhập quá nhiều lần. Hãy chờ 15 phút.');
      if (path.endsWith('/register')) {
        if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) fail(409, 'Tên đăng nhập đã được sử dụng.');
        const state = freshState(); state.name = cleanName(body.name ?? username);
        const id = randomUUID();
        db.prepare('INSERT INTO users(id,username,password_hash,role,display_name,state,created_at,updated_at,last_login) VALUES(?,?,?,?,?,?,?,?,?)').run(id, username, hashPassword(password), 'player', state.name, JSON.stringify(state), now, now, now);
        return openSession(res, userById(id));
      }
      const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
      const correct = verifyPassword(password, user?.password_hash ?? dummyHash);
      if (!correct || !user || user.status !== 'active') {
        failures.set(rateKey, { count: attempts?.until > now ? attempts.count + 1 : 1, until: now + 15 * 60 * 1000 });
        for (const [key, attempt] of failures) if (attempt.until <= now) failures.delete(key);
        fail(401, 'Tên đăng nhập, mật khẩu không đúng hoặc tài khoản bị khóa.');
      }
      failures.delete(rateKey);
      db.prepare('UPDATE users SET last_login=? WHERE id=?').run(now, user.id);
      return openSession(res, userById(user.id));
    }
    if (method === 'POST' && path === '/api/auth/logout') {
      const user = requireSession(req, true);
      const token = /nexus_session=([a-zA-Z0-9_-]+)/.exec(req.headers.cookie)?.[1];
      db.prepare('DELETE FROM sessions WHERE token_hash=? AND user_id=?').run(digest(token), user.id); cookie(res, '', 0); return { ok: true };
    }
    if (method === 'POST' && path === '/api/auth/password') {
      const user = requireSession(req, true), body = await readBody(req);
      validPassword(body.currentPassword); validPassword(body.password);
      if (!verifyPassword(body.currentPassword, user.password_hash)) fail(400, 'Mật khẩu hiện tại không đúng.');
      transaction(() => { db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(body.password), user.id); db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id); });
      if (user.role === 'admin' && bootstrapFile) { try { unlinkSync(bootstrapFile); } catch {} }
      return openSession(res, userById(user.id));
    }
    if (path === '/api/save') {
      const user = requireSession(req, mutation);
      if (method === 'GET') return { state: JSON.parse(user.state), revision: user.revision };
      if (method === 'PUT') { const body = await readBody(req); return save(user.id, body.revision, validState(body.state)); }
    }
    if (path.startsWith('/api/admin/')) {
      const admin = requireSession(req, mutation);
      if (admin.role !== 'admin') fail(403, 'Chỉ quản trị viên được phép thực hiện thao tác này.');
      if (method === 'GET' && path === '/api/admin/dashboard') return {
        total: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
        players: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='player'").get().n,
        banned: db.prepare("SELECT COUNT(*) AS n FROM users WHERE status='banned'").get().n,
        online: db.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM sessions JOIN users ON users.id=sessions.user_id WHERE expires_at>? AND status='active'").get(Date.now()).n,
        audit: db.prepare('SELECT audit.id,action,details,audit.created_at AS date,actor.username AS actor,target.username AS target FROM audit JOIN users actor ON actor.id=actor_id LEFT JOIN users target ON target.id=target_id ORDER BY audit.id DESC LIMIT 40').all().map(row => ({ ...row, details: JSON.parse(row.details) })),
      };
      if (method === 'GET' && path === '/api/admin/players') {
        const search = (url.searchParams.get('search') ?? '').slice(0, 64), page = Math.max(1, Math.min(100000, Number(url.searchParams.get('page')) || 1));
        const match = `%${search}%`, total = db.prepare('SELECT COUNT(*) AS n FROM users WHERE username LIKE ? OR display_name LIKE ?').get(match, match).n;
        const rows = db.prepare('SELECT * FROM users WHERE username LIKE ? OR display_name LIKE ? ORDER BY created_at DESC,id LIMIT 20 OFFSET ?').all(match, match, (Math.floor(page) - 1) * 20);
        return { total, page: Math.floor(page), players: rows.map(row => ({ ...publicUser(row), ...summary(JSON.parse(row.state)) })) };
      }
      const match = /^\/api\/admin\/players\/([a-zA-Z0-9-]+)(?:\/(status|password|reset|backups|restore))?$/.exec(path);
      if (match) {
        const target = userById(match[1]), operation = match[2];
        if (method === 'GET' && !operation) return { user: publicUser(target), state: JSON.parse(target.state), revision: target.revision };
        if (method === 'GET' && operation === 'backups') return { backups: db.prepare('SELECT id,revision,created_at AS date FROM backups WHERE user_id=? ORDER BY id DESC').all(target.id) };
        if (method === 'PATCH' && !operation) {
          const body = await readBody(req), state = JSON.parse(target.state);
          if (Object.keys(body).some(key => !['revision', 'resources', 'name'].includes(key))) fail(400, 'Trường cập nhật không được hỗ trợ.');
          if (body.name !== undefined) state.name = cleanName(body.name);
          if (body.resources) {
            if (Object.keys(body.resources).some(key => !['gold', 'gems', 'potions', 'shards'].includes(key))) fail(400, 'Tài nguyên không hợp lệ.');
            for (const [key, value] of Object.entries(body.resources)) {
              if (!number(value, key === 'potions' ? 100_000 : 1_000_000_000)) fail(400, 'Tài nguyên phải là số nguyên trong giới hạn.');
              if (key === 'shards') state.adventure.shards = value; else state[key] = value;
            }
          }
          return save(target.id, body.revision, validState(state), admin.id, 'Cập nhật người chơi');
        }
        if (method === 'POST' && operation === 'status') {
          const body = await readBody(req);
          if (!['active', 'banned'].includes(body.status)) fail(400, 'Trạng thái không hợp lệ.');
          if (target.role === 'admin') fail(400, 'Không thể khóa tài khoản quản trị viên.');
          transaction(() => { db.prepare('UPDATE users SET status=?,updated_at=? WHERE id=?').run(body.status, Date.now(), target.id); if (body.status === 'banned') db.prepare('DELETE FROM sessions WHERE user_id=?').run(target.id); audit(admin.id, target.id, body.status === 'banned' ? 'Khóa tài khoản' : 'Mở tài khoản'); });
          return { user: publicUser(userById(target.id)) };
        }
        if (method === 'POST' && operation === 'password') {
          const body = await readBody(req); validPassword(body.password);
          if (target.id === admin.id) fail(400, 'Đổi mật khẩu của bạn trong mục Tài khoản.');
          transaction(() => { db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(body.password), target.id); db.prepare('DELETE FROM sessions WHERE user_id=?').run(target.id); audit(admin.id, target.id, 'Đặt lại mật khẩu'); });
          return { ok: true };
        }
        if (method === 'POST' && operation === 'reset') {
          const body = await readBody(req), state = freshState(); state.name = target.display_name;
          return save(target.id, body.revision, state, admin.id, 'Đặt lại tiến trình');
        }
        if (method === 'POST' && operation === 'restore') {
          const body = await readBody(req);
          if (!number(body.backupId) || body.backupId < 1) fail(400, 'Bản sao lưu không hợp lệ.');
          const backup = db.prepare('SELECT state FROM backups WHERE id=? AND user_id=?').get(body.backupId, target.id);
          if (!backup) fail(404, 'Không tìm thấy bản sao lưu.');
          return save(target.id, body.revision, validState(JSON.parse(backup.state)), admin.id, 'Khôi phục tiến trình');
        }
      }
    }
    fail(404, 'Không tìm thấy chức năng.');
  }
  return {
    async handle(req, res) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
      try { const body = await route(req, res); res.statusCode = 200; res.end(JSON.stringify(body)); }
      catch (error) { res.statusCode = error.status ?? 500; if (!error.status) console.error('API error:', error.message); res.end(JSON.stringify({ error: error.status ? error.message : 'Máy chủ gặp lỗi. Hãy thử lại.' })); }
    },
    close() { db.close(); },
  };
}
