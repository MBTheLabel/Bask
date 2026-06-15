import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ─── Connection Pool ──────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'bask_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bask_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  charset: 'utf8mb4',
});

export default pool;

// ─── Helper: Execute query ────────────────────────────────────
export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

// ─── Helper: Get single row ───────────────────────────────────
export async function queryOne<T = mysql.RowDataPacket>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const [rows] = await pool.execute(sql, params);
  const result = rows as T[];
  return result.length > 0 ? result[0] : null;
}

// ─── Test connection ──────────────────────────────────────────
export async function testConnection(): Promise<void> {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err);
    throw err;
  }
}
