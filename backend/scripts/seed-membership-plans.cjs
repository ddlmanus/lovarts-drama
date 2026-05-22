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

const creatorBaseFeatures = [
  '会员专享无限次加速',
  '登录每日赠送20积分',
  '训练专属权益 ⓘ',
  '独家功能',
  '脚本策划',
  '智能分镜（Kling3.0/O3）',
  '9/4/25 宫格生成',
  '宫格切分',
]

const creatorPlans = [
  {
    name: '标准版', code: 'creator_standard_yearly', cycle: 'yearly', price: 569, original: 729, credits: 1500, badge: '限时 78 折', renew: '次年续费 ¥599 可随时取消', unit: '年',
    sub: ['47元/月', '1积分=0.032元'], activity: ['× Seedance 2.0 VIP 无赠送', '× Seedance 2.0 Fast 无赠送', '× Lib Image 无赠送', '✦ Happy Horse 1.0 限时4折 ⓘ'], features: ['8个并发任务', '云端存储空间60GB', '去除品牌水印 商用无忧', ...creatorBaseFeatures],
  },
  {
    name: '进阶版', code: 'creator_pro_yearly', cycle: 'yearly', price: 1099, original: 2199, credits: 4600, badge: '限时 5 折', renew: '次年续费 ¥1799 可随时取消', unit: '年',
    sub: ['92元/月', '1积分=0.02元'], activity: ['× Seedance 2.0 VIP 无赠送', '× Seedance 2.0 Fast 无赠送', '× Lib Image 无赠送', '✦ Happy Horse 1.0 限时4折 ⓘ'], features: ['12个并发任务', '云端存储空间100GB', '去除品牌水印 商用无忧', ...creatorBaseFeatures],
  },
  {
    name: '高级版', code: 'creator_advanced_yearly', cycle: 'yearly', price: 3799, original: 7399, credits: 16300, badge: '限时 51 折', renew: '次年续费 ¥5099 可随时取消', unit: '年',
    sub: ['317元/月', '1积分=0.019元'], dropdown: '16300 积分/月', activity: ['✦ 赠 5条 Seedance 2.0 VIP （720P）', '× Seedance 2.0 Fast 无赠送', '✦ 赠Lib Image 800 专享积分', '✦ Happy Horse 1.0 限时4折 ⓘ'], features: ['20个并发任务', '云端存储空间300GB', '去除品牌水印 商用无忧', ...creatorBaseFeatures],
  },
  {
    name: '豪华版', code: 'creator_luxury_yearly', cycle: 'yearly', price: 6399, original: 14999, credits: 32800, badge: '限时 43 折', renew: '次年续费 ¥7399 可随时取消', unit: '年', tone: 'blue',
    sub: ['533元/月', '1积分=0.016元'], activity: ['✦ 赠 50条 Seedance 2.0 VIP （720P）', '✦ 赠 50条 Seedance 2.0 Fast （720P）', '✦ 赠 Lib Image 3000 专享积分', '✦ Happy Horse 1.0 限时4折 ⓘ'], features: ['无限并发任务', '云端存储空间600GB', '去除品牌水印 商用无忧', ...creatorBaseFeatures],
  },
  {
    name: '至尊版', code: 'creator_ultimate_yearly', cycle: 'yearly', price: 8499, original: 22999, credits: 50500, badge: '限时 37 折', renew: '次年续费 ¥10999 可随时取消', unit: '年', tone: 'gold',
    sub: ['708元/月', '1积分=0.014元'], activity: ['✦ 赠 80条 Seedance 2.0 VIP （720P）', '✦ 赠 80条 Seedance 2.0 Fast （720P）', '✦ 赠Lib Image 4800 专享积分', '✦ Happy Horse 1.0 限时4折 ⓘ'], features: ['无限并发任务', '云端存储空间1000GB', '去除品牌水印 商用无忧', ...creatorBaseFeatures],
  },
  {
    name: '标准版', code: 'creator_standard_monthly', cycle: 'monthly', price: 59, original: 66, credits: 1500, badge: '限时 89 折', renew: '次月续费 ¥66 可随时取消', unit: '月',
    sub: ['积分=0.039元', '买年卡立省20%›'], activity: ['✦ Happy Horse 1.0 限时4折 ⓘ'], features: ['8个并发任务', '云端存储空间60GB', '去除品牌水印 商用无忧', ...creatorBaseFeatures],
  },
  {
    name: '进阶版', code: 'creator_pro_monthly', cycle: 'monthly', price: 169, original: 199, credits: 4600, badge: '限时 85 折', renew: '次月续费 ¥199 可随时取消', unit: '月',
    sub: ['1积分=0.037元', '买年卡立省46%›'], activity: ['✦ Happy Horse 1.0 限时4折 ⓘ'], features: ['12个并发任务', '云端存储空间100GB', '去除品牌水印 商用无忧', ...creatorBaseFeatures],
  },
  {
    name: '高级版', code: 'creator_advanced_monthly', cycle: 'monthly', price: 599, original: 669, credits: 16300, badge: '限时 9 折', renew: '次月续费 ¥669 可随时取消', unit: '月',
    sub: ['1积分=0.037元', '买年卡立省47%›'], dropdown: '16300 积分/月', activity: ['✦ Happy Horse 1.0 限时4折 ⓘ'], features: ['20个并发任务', '云端存储空间300GB', '去除品牌水印 商用无忧', ...creatorBaseFeatures],
  },
  {
    name: '豪华版', code: 'creator_luxury_monthly', cycle: 'monthly', price: 999, original: 1299, credits: 32800, badge: '限时 77 折', renew: '次月续费 ¥1299 可随时取消', unit: '月', tone: 'blue',
    sub: ['1积分=0.03元', '买年卡立省47%›'], activity: ['✦ Happy Horse 1.0 限时4折 ⓘ'], features: ['无限并发任务', '云端存储空间600GB', '去除品牌水印 商用无忧', ...creatorBaseFeatures],
  },
  {
    name: '至尊版', code: 'creator_ultimate_monthly', cycle: 'monthly', price: 1499, original: 1999, credits: 50500, badge: '限时 75 折', renew: '次月续费 ¥1999 可随时取消', unit: '月', tone: 'gold',
    sub: ['1积分=0.03元', '买年卡立省53%›'], activity: ['✦ Happy Horse 1.0 限时4折 ⓘ'], features: ['无限并发任务', '云端存储空间1000GB', '去除品牌水印 商用无忧', ...creatorBaseFeatures],
  },
]

const teamFeatures = {
  efficiency: ['多人画布协作 ᴺᴱᵂ ⓘ', '团队共享资产库 ᴺᴱᵂ ⓘ'],
  management: ['团队席位管理 ⓘ', '积分用量管控 ᴺᴱᵂ ⓘ', '项目权限管理 ᴺᴱᵂ ⓘ', '极速开发票'],
  security: ['团队资产隔离 ᴺᴱᵂ ⓘ', '商用无忧 ⓘ'],
  exclusive: ['包含个人版所有功能'],
}

const teamPlans = [
  { name: '标准版', code: 'team_standard_yearly', price: 679, original: 939, credits: 1500, badge: '限时 72 折', sub: ['57元/月/席位', '1积分=0.038元'], seats: 2, total: 1358, activity: ['× 多席赠送 Seedance 2.0 VIP(720P)', '✦ Happy Horse 1.0限时4折 ⓘ'], concurrent: '8个并发任务/席位', storage: '云端存储空间 3 TB' },
  { name: '进阶版', code: 'team_pro_yearly', price: 1299, original: 2799, credits: 4600, badge: '限时 46 折', sub: ['108元/月/席位', '1积分=0.024元'], seats: 2, total: 2598, tone: 'cyan', activity: ['× 多席赠送 Seedance 2.0 VIP(720P)', '✦ Happy Horse 1.0限时4折 ⓘ'], concurrent: '12个并发任务/席位', storage: '云端存储空间 10 TB' },
  { name: '高级版', code: 'team_advanced_yearly', price: 4299, original: 9399, credits: 16300, badge: '限时 46 折', sub: ['358元/月/席位', '1积分=0.022元'], seats: 2, total: 8598, tone: 'cyan', dropdown: '16300 积分/月/席位', activity: ['× 多席赠送 Seedance 2.0 VIP(720P)', '✦ Happy Horse 1.0限时4折 ⓘ'], concurrent: '20个并发任务/席位', storage: '云端存储空间 50 TB' },
  { name: '豪华版', code: 'team_luxury_yearly', price: 7499, original: 16999, credits: 32800, badge: '限时 44 折', sub: ['625元/月/席位', '1积分=0.019元'], seats: 2, total: 14998, tone: 'blue', seatGift: ['2 席共赠送 200 条Seedance 2.0 ⓘ', '1-2 席 100条/席', '3-9 席 110条/席', '10席以上 130条/席'], activity: ['✦ 多席赠送 Seedance 2.0 VIP(720P) ⓘ', '✦ Happy Horse 1.0限时4折 ⓘ'], concurrent: '无限并发任务', storage: '云端存储空间 130 TB' },
  { name: '至尊版', code: 'team_ultimate_yearly', price: 9499, original: 26999, credits: 50500, badge: '限时 35 折', sub: ['792元/月/席位', '1积分=0.016元'], seats: 2, total: 18998, tone: 'purple', seatGift: ['2 席共赠送 320 条Seedance 2.0 ⓘ', '1-2 席 160条/席', '3-9 席 175条/席', '10席以上 200条/席'], activity: ['✦ 多席赠送 Seedance 2.0 VIP(720P) ⓘ', '✦ Happy Horse 1.0限时4折 ⓘ'], concurrent: '无限并发任务', storage: '云端存储空间 300 TB' },
]

const plans = [
  ...creatorPlans.map((plan, index) => ({
    name: plan.name,
    code: plan.code,
    description: plan.renew,
    planType: 'creator',
    billingCycle: plan.cycle,
    price: plan.price,
    originalPrice: plan.original,
    credits: plan.credits,
    durationDays: plan.cycle === 'monthly' ? 31 : 365,
    badge: plan.badge,
    subtitle: plan.renew,
    sortOrder: (plan.cycle === 'monthly' ? 100 : 0) + index + 1,
    metadata: {
      unit: plan.unit,
      sub: plan.sub,
      dropdown: plan.dropdown || '',
      tone: plan.tone || '',
      generation: `最多生成约 ${plan.credits * 4} 张图片 ｜ ${Math.round(plan.credits * 0.2)} 个视频 ⓘ`,
      activity: plan.activity,
      featureGroups: [{ title: '限时活动', items: plan.activity }, { title: '', items: plan.features }],
    },
  })),
  ...teamPlans.map((plan, index) => ({
    name: plan.name,
    code: plan.code,
    description: `${plan.seats} 席位`,
    planType: 'team',
    billingCycle: 'yearly',
    price: plan.price,
    originalPrice: plan.original,
    credits: plan.credits,
    durationDays: 365,
    badge: plan.badge,
    subtitle: `${plan.seats} 席位`,
    sortOrder: 200 + index + 1,
    metadata: {
      unit: '年',
      sub: plan.sub,
      seats: plan.seats,
      total: plan.total,
      tone: plan.tone || '',
      dropdown: plan.dropdown || '',
      seatGift: plan.seatGift || [],
      teamCreditsLine: `团队内每月共 ${plan.credits * plan.seats} 积分 ⓘ`,
      activity: plan.activity,
      featureGroups: [
        { title: '限时活动', items: plan.activity },
        { title: '协作效率', items: [...teamFeatures.efficiency, plan.concurrent] },
        { title: '管理', items: teamFeatures.management },
        { title: '安全与其他', items: ['团队资产隔离 ᴺᴱᵂ ⓘ', plan.storage, '商用无忧 ⓘ'] },
        { title: '独家功能', items: teamFeatures.exclusive },
      ],
    },
  })),
]

async function main() {
  const db = createPool()
  await db.query(`
    CREATE TABLE IF NOT EXISTS membership_plans (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      code VARCHAR(120) NOT NULL,
      description TEXT NULL,
      plan_type VARCHAR(32) NOT NULL DEFAULT 'creator',
      billing_cycle VARCHAR(32) NOT NULL DEFAULT 'yearly',
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      original_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      credits INT NOT NULL DEFAULT 0,
      duration_days INT NOT NULL DEFAULT 30,
      badge VARCHAR(120) NULL,
      subtitle VARCHAR(255) NULL,
      metadata JSON NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by VARCHAR(64) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by VARCHAR(64) NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_by VARCHAR(64) NULL,
      deleted_at DATETIME NULL,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      UNIQUE KEY uk_membership_plans_code (code),
      KEY idx_membership_plans_type (plan_type, billing_cycle, is_active, is_deleted)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  const sql = `
    INSERT INTO membership_plans
      (name, code, description, plan_type, billing_cycle, price, original_price, credits, duration_days, badge, subtitle, metadata, sort_order, is_active, created_by, created_at, updated_by, updated_at, is_deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, 1, 'system', ?, 'system', ?, 0)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      description = VALUES(description),
      plan_type = VALUES(plan_type),
      billing_cycle = VALUES(billing_cycle),
      price = VALUES(price),
      original_price = VALUES(original_price),
      credits = VALUES(credits),
      duration_days = VALUES(duration_days),
      badge = VALUES(badge),
      subtitle = VALUES(subtitle),
      metadata = VALUES(metadata),
      sort_order = VALUES(sort_order),
      is_active = 1,
      updated_by = 'system',
      updated_at = VALUES(updated_at),
      is_deleted = 0,
      deleted_at = NULL,
      deleted_by = NULL
  `
  try {
    for (const item of plans) {
      await db.execute(sql, [
        item.name,
        item.code,
        item.description,
        item.planType,
        item.billingCycle,
        item.price,
        item.originalPrice,
        item.credits,
        item.durationDays,
        item.badge,
        item.subtitle,
        JSON.stringify(item.metadata),
        item.sortOrder,
        now,
        now,
      ])
    }
    console.log(`Seeded ${plans.length} membership plans into MySQL`)
  } finally {
    await db.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
