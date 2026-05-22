#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const Database = require('../backend/node_modules/better-sqlite3')

const root = path.resolve(__dirname, '..')
const dbPath = process.env.DB_PATH || path.join(root, 'data/huobao_drama.db')
const profilesSqlPath = path.join(root, 'model_parameter_profiles.sql')
const itemsSqlPath = path.join(root, 'model_parameter_profile_items.sql')

function splitTuples(valuesSql) {
  const tuples = []
  let current = ''
  let depth = 0
  let inString = false
  let escape = false

  for (const ch of valuesSql) {
    if (inString) {
      current += ch
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === "'") {
        inString = false
      }
      continue
    }

    if (ch === "'") {
      inString = true
      current += ch
      continue
    }
    if (ch === '(') {
      depth += 1
      if (depth === 1) {
        current = ''
        continue
      }
    }
    if (ch === ')') {
      depth -= 1
      if (depth === 0) {
        tuples.push(current)
        current = ''
        continue
      }
    }
    if (depth > 0) current += ch
  }

  return tuples
}

function splitFields(tupleSql) {
  const fields = []
  let current = ''
  let inString = false
  let escape = false

  for (const ch of tupleSql) {
    if (inString) {
      current += ch
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === "'") {
        inString = false
      }
      continue
    }

    if (ch === "'") {
      inString = true
      current += ch
      continue
    }
    if (ch === ',') {
      fields.push(parseValue(current))
      current = ''
      continue
    }
    current += ch
  }

  fields.push(parseValue(current))
  return fields
}

function parseValue(raw) {
  const value = raw.trim()
  if (/^null$/i.test(value)) return null
  if (value.startsWith("'") && value.endsWith("'")) {
    return value
      .slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)
  return value
}

function parseInserts(filePath, tableName) {
  const sql = fs.readFileSync(filePath, 'utf8')
  const pattern = new RegExp(
    String.raw`INSERT INTO \`${tableName}\` \(([^)]+)\) VALUES \(([\s\S]*?)\);`,
    'g',
  )
  const rows = []
  let match
  while ((match = pattern.exec(sql))) {
    const columns = match[1].split(',').map(col => col.trim().replace(/^`|`$/g, ''))
    const tuples = splitTuples(`(${match[2]})`)
    for (const tuple of tuples) {
      const values = splitFields(tuple)
      const row = {}
      columns.forEach((column, index) => {
        row[column] = values[index]
      })
      rows.push(row)
    }
  }
  return rows
}

function serviceTypeFromModelType(modelType) {
  const value = String(modelType || '').toUpperCase()
  if (value === 'CHAT' || value === 'TEXT') return 'text'
  if (value === 'VIDEO') return 'video'
  if (value === 'AUDIO') return 'audio'
  if (value === 'EMBEDDING' || value === 'EMBEDDINGS') return 'embedding'
  return 'image'
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString()
  return String(value).replace(' ', 'T') + (String(value).includes('Z') ? '' : 'Z')
}

const profiles = parseInserts(profilesSqlPath, 'model_parameter_profiles')
const items = parseInserts(itemsSqlPath, 'model_parameter_profile_items')

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 30000')

const run = db.transaction(() => {
  db.prepare('DELETE FROM ai_model_configs').run()
  db.prepare('DELETE FROM ai_model_parameter_profile_items').run()
  db.prepare('DELETE FROM ai_model_parameter_profiles').run()
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('ai_model_configs', 'ai_model_parameter_profiles', 'ai_model_parameter_profile_items')").run()

  const insertProfile = db.prepare(`
    INSERT INTO ai_model_parameter_profiles
      (key, name, service_type, description, parameters, is_builtin, is_active, created_at, updated_at)
    VALUES
      (@key, @name, @serviceType, @description, NULL, @isBuiltin, @isActive, @createdAt, @updatedAt)
  `)
  const insertItem = db.prepare(`
    INSERT INTO ai_model_parameter_profile_items
      (profile_id, type, label, value, config, rank, created_at, updated_at)
    VALUES
      (@profileId, @type, @label, @value, @config, @rank, @createdAt, @updatedAt)
  `)

  const profileIdMap = new Map()
  for (const profile of profiles) {
    const result = insertProfile.run({
      key: profile.key,
      name: profile.name,
      serviceType: serviceTypeFromModelType(profile.model_type),
      description: profile.description || '',
      isBuiltin: Number(Boolean(profile.is_built_in)),
      isActive: Number(Boolean(profile.is_active)),
      createdAt: normalizeDate(profile.created_at),
      updatedAt: normalizeDate(profile.updated_at || profile.created_at),
    })
    profileIdMap.set(profile.id, Number(result.lastInsertRowid))
  }

  let skippedItems = 0
  for (const item of items) {
    const profileId = profileIdMap.get(item.profile_id)
    if (!profileId) {
      skippedItems += 1
      continue
    }
    insertItem.run({
      profileId,
      type: item.type,
      label: item.label,
      value: item.value == null ? '' : String(item.value),
      config: item.config || null,
      rank: Number(item.rank || 0),
      createdAt: normalizeDate(item.created_at),
      updatedAt: normalizeDate(item.updated_at || item.created_at),
    })
  }

  return {
    profiles: profiles.length,
    items: items.length - skippedItems,
    skippedItems,
  }
})

const result = run()
const counts = {
  ai_model_configs: db.prepare('SELECT count(*) AS count FROM ai_model_configs').get().count,
  ai_model_parameter_profiles: db.prepare('SELECT count(*) AS count FROM ai_model_parameter_profiles').get().count,
  ai_model_parameter_profile_items: db.prepare('SELECT count(*) AS count FROM ai_model_parameter_profile_items').get().count,
}

console.log(JSON.stringify({ dbPath, imported: result, counts }, null, 2))
