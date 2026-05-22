import { mysqlTable, bigint, boolean, datetime, double, int, json, text, varchar, index, uniqueIndex } from 'drizzle-orm/mysql-core'

export const auditFields = {
  createdBy: varchar('created_by', { length: 64 }),
  createdAt: datetime('created_at', { mode: 'string' }).notNull(),
  updatedBy: varchar('updated_by', { length: 64 }),
  updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
  deletedBy: varchar('deleted_by', { length: 64 }),
  deletedAt: datetime('deleted_at', { mode: 'string' }),
  isDeleted: boolean('is_deleted').notNull().default(false),
}

export const aiUsers = mysqlTable('ai_users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  account: varchar('account', { length: 120 }),
  phone: varchar('phone', { length: 32 }),
  email: varchar('email', { length: 160 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  inviteCode: varchar('invite_code', { length: 64 }),
  credits: int('credits').notNull().default(0),
  membershipCredits: int('membership_credits').notNull().default(0),
  membershipPeriodCredits: int('membership_period_credits').notNull().default(0),
  membershipPlanId: bigint('membership_plan_id', { mode: 'number' }),
  membershipStatus: varchar('membership_status', { length: 32 }).notNull().default('none'),
  membershipStartedAt: datetime('membership_started_at', { mode: 'string' }),
  membershipExpiresAt: datetime('membership_expires_at', { mode: 'string' }),
  membershipNextGrantAt: datetime('membership_next_grant_at', { mode: 'string' }),
  membershipLastGrantAt: datetime('membership_last_grant_at', { mode: 'string' }),
  wxOpenid: varchar('wx_openid', { length: 128 }),
  wxUnionid: varchar('wx_unionid', { length: 128 }),
  wxNickname: varchar('wx_nickname', { length: 120 }),
  wxAvatar: varchar('wx_avatar', { length: 500 }),
  wxBoundAt: datetime('wx_bound_at', { mode: 'string' }),
  lastLoginAt: datetime('last_login_at', { mode: 'string' }),
  lastLoginIp: varchar('last_login_ip', { length: 64 }),
  loginChannel: varchar('login_channel', { length: 32 }).notNull().default('password'),
  resourceMode: varchar('resource_mode', { length: 32 }).notNull().default('unset'),
  onboardingCompletedAt: datetime('onboarding_completed_at', { mode: 'string' }),
  role: varchar('role', { length: 32 }).notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  ...auditFields,
}, (table) => ({
  accountIdx: uniqueIndex('uk_ai_users_account').on(table.account),
  phoneIdx: index('idx_ai_users_phone').on(table.phone),
}))

export const aiServiceProviders = mysqlTable('ai_service_providers', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  name: varchar('name', { length: 120 }).notNull(),
  displayName: varchar('display_name', { length: 120 }),
  serviceType: varchar('service_type', { length: 32 }).notNull(),
  provider: varchar('provider', { length: 80 }).notNull(),
  defaultUrl: varchar('default_url', { length: 500 }),
  icon: varchar('icon', { length: 500 }),
  website: varchar('website', { length: 500 }),
  rank: int('rank').notNull().default(0),
  isThirdParty: boolean('is_third_party').notNull().default(false),
  supportOpenAI: boolean('support_open_ai').notNull().default(false),
  presetModels: json('preset_models'),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  ...auditFields,
}, (table) => ({
  providerIdx: uniqueIndex('uk_ai_service_providers_provider').on(table.provider),
  serviceIdx: index('idx_ai_service_providers_service').on(table.serviceType),
}))

export const aiModelParameterProfiles = mysqlTable('ai_model_parameter_profiles', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  key: varchar('profile_key', { length: 120 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  serviceType: varchar('service_type', { length: 32 }).notNull(),
  description: text('description'),
  isBuiltin: boolean('is_builtin').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  ...auditFields,
}, (table) => ({
  keyIdx: uniqueIndex('uk_parameter_profiles_key').on(table.key),
  serviceIdx: index('idx_parameter_profiles_service').on(table.serviceType),
}))

export const aiModelParameterProfileItems = mysqlTable('ai_model_parameter_profile_items', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  profileId: bigint('profile_id', { mode: 'number' }).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  label: varchar('label', { length: 120 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  minValue: double('min_value'),
  maxValue: double('max_value'),
  stepValue: double('step_value'),
  unit: varchar('unit', { length: 32 }),
  placeholder: varchar('placeholder', { length: 255 }),
  optionsSource: varchar('options_source', { length: 120 }),
  rank: int('rank').notNull().default(0),
  ...auditFields,
}, (table) => ({
  profileIdx: index('idx_profile_items_profile').on(table.profileId),
}))

export const aiModelConfigs = mysqlTable('ai_model_configs', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 64 }),
  providerId: bigint('provider_id', { mode: 'number' }),
  sourceModelId: bigint('source_model_id', { mode: 'number' }),
  parameterProfileId: bigint('parameter_profile_id', { mode: 'number' }),
  serviceType: varchar('service_type', { length: 32 }).notNull(),
  provider: varchar('provider', { length: 80 }).notNull(),
  modelId: varchar('model_id', { length: 180 }).notNull(),
  name: varchar('name', { length: 180 }).notNull(),
  description: text('description'),
  baseUrl: varchar('base_url', { length: 500 }),
  endpoint: varchar('endpoint', { length: 500 }),
  queryEndpoint: varchar('query_endpoint', { length: 500 }),
  cost: double('cost').notNull().default(0),
  isFree: boolean('is_free').notNull().default(false),
  memberOnly: boolean('member_only').notNull().default(false),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  priority: int('priority').notNull().default(0),
  ...auditFields,
}, (table) => ({
  serviceDefaultIdx: index('idx_ai_models_service_default').on(table.serviceType, table.isDefault, table.isActive),
  modelIdx: index('idx_ai_models_model').on(table.serviceType, table.modelId),
}))

export const aiModelBillingRules = mysqlTable('ai_model_billing_rules', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  modelConfigId: bigint('model_config_id', { mode: 'number' }).notNull(),
  serviceType: varchar('service_type', { length: 32 }).notNull(),
  parameterType: varchar('parameter_type', { length: 32 }).notNull(),
  parameterValue: varchar('parameter_value', { length: 120 }).notNull(),
  credits: int('credits').notNull().default(0),
  unit: varchar('unit', { length: 32 }).notNull().default('request'),
  ...auditFields,
}, (table) => ({
  modelRuleIdx: uniqueIndex('uk_model_billing_rule').on(table.modelConfigId, table.parameterType, table.parameterValue),
}))

export const systemSettings = mysqlTable('system_settings', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  settingKey: varchar('setting_key', { length: 120 }).notNull(),
  settingValue: text('setting_value'),
  groupName: varchar('group_name', { length: 64 }).notNull().default('system'),
  label: varchar('label', { length: 120 }),
  valueType: varchar('value_type', { length: 32 }).notNull().default('string'),
  isSecret: boolean('is_secret').notNull().default(false),
  ...auditFields,
}, (table) => ({
  keyIdx: uniqueIndex('uk_system_settings_key').on(table.settingKey),
}))

export const pointsLogs = mysqlTable('points_logs', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  amount: int('amount').notNull(),
  balance: int('balance').notNull().default(0),
  type: varchar('type', { length: 32 }).notNull(),
  description: varchar('description', { length: 500 }),
  relatedOrderId: bigint('related_order_id', { mode: 'number' }),
  relatedTaskId: varchar('related_task_id', { length: 120 }),
  taskType: varchar('task_type', { length: 64 }),
  model: varchar('model', { length: 180 }),
  status: varchar('status', { length: 32 }).notNull().default('completed'),
  metadata: json('metadata'),
  ...auditFields,
}, (table) => ({
  userIdx: index('idx_points_logs_user').on(table.userId),
  taskIdx: index('idx_points_logs_task').on(table.relatedTaskId, table.taskType),
}))
