import mysql from 'mysql2/promise';

let pool!: mysql.Pool;

async function initDB() {
  const initConn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  });

  await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE || 'lexia'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await initConn.query(`USE \`${process.env.MYSQL_DATABASE || 'lexia'}\``);

  await initConn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await initConn.query(`
    CREATE TABLE IF NOT EXISTS chats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      response TEXT NOT NULL,
      type VARCHAR(30) DEFAULT NULL,
      status VARCHAR(20) DEFAULT 'activa',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try {
    await initConn.query(`ALTER TABLE chats ADD COLUMN type VARCHAR(30) DEFAULT NULL AFTER response`);
  } catch { /* column already exists */ }

  try {
    await initConn.query(`ALTER TABLE chats ADD COLUMN status VARCHAR(20) DEFAULT 'activa' AFTER type`);
  } catch { /* column already exists */ }

  await initConn.end();

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'lexia',
    waitForConnections: true,
    connectionLimit: 10,
  });
}

const poolPromise = initDB().catch(err => {
  console.error('Error inicializando base de datos:', err);
  throw err;
});

// Inicializar documentos legales después de la BD
poolPromise.then(() => {
  import('@/backend/rag/loader').then(({ ensureLegalDocuments }) => {
    ensureLegalDocuments().catch(err => console.error('Error cargando documentos legales:', err));
  });
});

export async function query(sql: string, params?: any[]) {
  await poolPromise;
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export default pool;
