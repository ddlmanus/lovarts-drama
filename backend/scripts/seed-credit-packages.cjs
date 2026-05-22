const mysql = require('mysql2/promise')

function createPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'huobao',
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  })
}

const now = new Date().toISOString()
const packages = [
  { name: '体验包', code: 'trial_pack', description: '适合新用户体验', price: 50, credits: 5000, bonusCredits: 0, sortOrder: 10 },
  { name: '基础包', code: 'basic_pack', description: '适合日常创作', price: 200, credits: 20000, bonusCredits: 400, sortOrder: 20 },
  { name: '专业包', code: 'pro_pack', description: '适合专业创作', price: 1000, credits: 100000, bonusCredits: 5000, sortOrder: 30 },
  { name: '高级包', code: 'advanced_pack', description: '适合高频创作', price: 5000, credits: 500000, bonusCredits: 40000, sortOrder: 40 },
  { name: '至尊包', code: 'ultimate_pack', description: '适合资深用户', price: 10000, credits: 1000000, bonusCredits: 100000, sortOrder: 50 },
]

async function main() {
  const db = createPool()
  await db.query(`
  CREATE TABLE IF NOT EXISTS credit_packages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(120) NOT NULL,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    credits INT NOT NULL DEFAULT 0,
    bonus_credits INT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(64) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_by VARCHAR(64) NULL,
    deleted_at DATETIME NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    UNIQUE KEY uk_credit_packages_code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`)

  const sql = `
    INSERT INTO credit_packages
      (name, code, description, price, credits, bonus_credits, sort_order, is_active, created_by, created_at, updated_by, updated_at, is_deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'system', ?, 'system', ?, 0)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      description = VALUES(description),
      price = VALUES(price),
      credits = VALUES(credits),
      bonus_credits = VALUES(bonus_credits),
      sort_order = VALUES(sort_order),
      is_active = 1,
      updated_by = 'system',
      updated_at = VALUES(updated_at),
      is_deleted = 0,
      deleted_at = NULL,
      deleted_by = NULL
  `
  try {
    for (const item of packages) {
      await db.execute(sql, [
        item.name,
        item.code,
        item.description,
        item.price,
        item.credits,
        item.bonusCredits,
        item.sortOrder,
        now,
        now,
      ])
    }
    console.log(`Seeded ${packages.length} credit packages into MySQL`)
  } finally {
    await db.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
