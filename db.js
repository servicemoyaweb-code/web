const Database = require('better-sqlite3');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const usePostgres = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));

let sqliteDb;
let pgPool;

if (usePostgres) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
} else {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
}

function formatQuery(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function ensureColumnSqlite(tableName, columnName, definition) {
  const columns = sqliteDb.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    sqliteDb.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
}

async function exec(sql) {
  if (usePostgres) {
    await pgPool.query(sql);
    return;
  }

  sqliteDb.exec(sql);
}

async function all(sql, params = []) {
  if (usePostgres) {
    const result = await pgPool.query(formatQuery(sql), params);
    return result.rows;
  }

  return sqliteDb.prepare(sql).all(...params);
}

async function get(sql, params = []) {
  if (usePostgres) {
    const result = await pgPool.query(formatQuery(sql), params);
    return result.rows[0];
  }

  return sqliteDb.prepare(sql).get(...params);
}

async function run(sql, params = []) {
  if (usePostgres) {
    const normalizedSql = formatQuery(sql);
    const finalSql = normalizedSql.match(/^INSERT\s+/i) && !normalizedSql.toLowerCase().includes('returning')
      ? `${normalizedSql} RETURNING id`
      : normalizedSql;

    const result = await pgPool.query(finalSql, params);
    const lastInsertRowid = result.rows[0]?.id ?? null;
    return {
      changes: result.rowCount || 0,
      lastInsertRowid,
    };
  }

  const result = sqliteDb.prepare(sql).run(...params);
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  };
}

async function initializeDb() {
  if (usePostgres) {
    await exec(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        dni TEXT NOT NULL UNIQUE,
        telefono TEXT,
        direccion TEXT,
        numero_cliente INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS electrodomesticos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        descripcion TEXT,
        modelo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS eventos (
        id SERIAL PRIMARY KEY,
        electrodomestico_id INTEGER NOT NULL,
        texto TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (electrodomestico_id) REFERENCES electrodomesticos(id) ON DELETE CASCADE
      );
    `);

    await exec('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero_cliente INTEGER;');
    await exec('ALTER TABLE electrodomesticos ADD COLUMN IF NOT EXISTS modelo TEXT;');
    await exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_numero_cliente ON clientes(numero_cliente);');
    return;
  }

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      dni TEXT NOT NULL UNIQUE,
      telefono TEXT,
      direccion TEXT,
      numero_cliente INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS electrodomesticos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      descripcion TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      electrodomestico_id INTEGER NOT NULL,
      texto TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (electrodomestico_id) REFERENCES electrodomesticos(id) ON DELETE CASCADE
    );
  `);

  ensureColumnSqlite('clientes', 'numero_cliente', 'numero_cliente INTEGER');
  ensureColumnSqlite('electrodomesticos', 'modelo', 'modelo TEXT');
  sqliteDb.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_numero_cliente ON clientes(numero_cliente);');
}

module.exports = {
  db: { all, get, run, exec },
  initializeDb,
};
