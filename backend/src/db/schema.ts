import { bigint, boolean, double, int, longtext, mysqlTable, primaryKey, text, varchar } from 'drizzle-orm/mysql-core'

const audit = {
  createdBy: varchar('created_by', { length: 64 }),
  createdAt: varchar('created_at', { length: 32 }).notNull(),
  updatedBy: varchar('updated_by', { length: 64 }),
  updatedAt: varchar('updated_at', { length: 32 }).notNull(),
  deletedBy: varchar('deleted_by', { length: 64 }),
  deletedAt: varchar('deleted_at', { length: 32 }),
  isDeleted: boolean('is_deleted').notNull().default(false),
}

const id = bigint('id', { mode: 'number' }).primaryKey().autoincrement()
const bool = (name: string, value = false) => boolean(name).notNull().default(value)
const str = (name: string, length = 255) => varchar(name, { length })
const long = (name: string) => text(name)
const veryLong = (name: string) => longtext(name)

export const dramas = mysqlTable('dramas', {
  id, title: str('title').notNull(), description: long('description'), genre: str('genre'), style: str('style').default('realistic'),
  totalEpisodes: int('total_episodes').default(1), totalDuration: int('total_duration').default(0), status: str('status').notNull().default('draft'),
  thumbnail: str('thumbnail', 1000), tags: long('tags'), metadata: long('metadata'), ...audit,
})

export const episodes = mysqlTable('episodes', {
  id, dramaId: bigint('drama_id', { mode: 'number' }).notNull(), episodeNumber: int('episode_number').notNull(), title: str('title').notNull(),
  content: long('content'), scriptContent: long('script_content'), description: long('description'), duration: int('duration').default(0),
  status: str('status').default('draft'), videoUrl: str('video_url', 1000), thumbnail: str('thumbnail', 1000),
  imageConfigId: bigint('image_config_id', { mode: 'number' }), videoConfigId: bigint('video_config_id', { mode: 'number' }), audioConfigId: bigint('audio_config_id', { mode: 'number' }),
  ...audit,
})

export const characters = mysqlTable('characters', {
  id, dramaId: bigint('drama_id', { mode: 'number' }).notNull(), name: str('name').notNull(), age: str('age'), gender: str('gender'), role: str('role'),
  description: long('description'), appearance: long('appearance'), personality: long('personality'), voiceStyle: str('voice_style'),
  imageUrl: str('image_url', 1000), referenceImages: long('reference_images'), seedValue: str('seed_value'), sortOrder: int('sort_order'),
  localPath: str('local_path', 1000), voiceSampleUrl: str('voice_sample_url', 1000), voiceProvider: str('voice_provider'), ...audit,
})

export const characterLibrary = mysqlTable('character_library', {
  id, name: str('name').notNull(), age: str('age'), gender: str('gender'), role: str('role'), description: long('description'),
  appearance: long('appearance'), personality: long('personality'), voiceStyle: str('voice_style'), imageUrl: str('image_url', 1000),
  referenceImages: long('reference_images'), sourceCharacterId: bigint('source_character_id', { mode: 'number' }), ...audit,
})

export const episodeCharacters = mysqlTable('episode_characters', {
  id, episodeId: bigint('episode_id', { mode: 'number' }).notNull(), characterId: bigint('character_id', { mode: 'number' }).notNull(), ...audit,
})

export const episodeScenes = mysqlTable('episode_scenes', {
  id, episodeId: bigint('episode_id', { mode: 'number' }).notNull(), sceneId: bigint('scene_id', { mode: 'number' }).notNull(), ...audit,
})

export const scenes = mysqlTable('scenes', {
  id, dramaId: bigint('drama_id', { mode: 'number' }).notNull(), episodeId: bigint('episode_id', { mode: 'number' }),
  location: str('location').notNull(), time: str('time').notNull(), prompt: long('prompt').notNull(), storyboardCount: int('storyboard_count').default(1),
  imageUrl: str('image_url', 1000), status: str('status').default('pending'), localPath: str('local_path', 1000), ...audit,
})

export const sceneLibrary = mysqlTable('scene_library', {
  id, location: str('location').notNull(), time: str('time'), prompt: long('prompt'), imageUrl: str('image_url', 1000),
  sourceSceneId: bigint('source_scene_id', { mode: 'number' }), ...audit,
})

export const storyboards = mysqlTable('storyboards', {
  id, episodeId: bigint('episode_id', { mode: 'number' }).notNull(), sceneId: bigint('scene_id', { mode: 'number' }),
  storyboardNumber: int('storyboard_number').notNull(), title: str('title'), location: str('location'), time: str('time'),
  shotType: str('shot_type'), angle: str('angle'), movement: str('movement'), action: long('action'), result: long('result'),
  atmosphere: long('atmosphere'), imagePrompt: long('image_prompt'), videoPrompt: long('video_prompt'), bgmPrompt: long('bgm_prompt'),
  soundEffect: long('sound_effect'), dialogue: long('dialogue'), description: long('description'), duration: int('duration').default(0),
  composedImage: str('composed_image', 1000), firstFrameImage: str('first_frame_image', 1000), lastFrameImage: str('last_frame_image', 1000),
  referenceImages: long('reference_images'), videoUrl: str('video_url', 1000), ttsAudioUrl: str('tts_audio_url', 1000),
  subtitleUrl: str('subtitle_url', 1000), composedVideoUrl: str('composed_video_url', 1000), status: str('status').default('pending'), ...audit,
})

export const storyboardCharacters = mysqlTable('storyboard_characters', {
  storyboardId: bigint('storyboard_id', { mode: 'number' }).notNull(),
  characterId: bigint('character_id', { mode: 'number' }).notNull(),
}, (table) => [primaryKey({ columns: [table.storyboardId, table.characterId] })])

export const aiServiceConfigs = mysqlTable('ai_service_configs', {
  id, serviceType: str('service_type', 32).notNull(), provider: str('provider', 80), name: str('name').notNull(),
  baseUrl: str('base_url', 1000).notNull(), apiKey: str('api_key', 1000).notNull(), model: long('model'), endpoint: str('endpoint', 1000),
  queryEndpoint: str('query_endpoint', 1000), priority: int('priority').default(0), isDefault: bool('is_default'), isActive: bool('is_active', true),
  settings: long('settings'), ...audit,
})

export const aiServiceProviders = mysqlTable('ai_service_providers', {
  id, name: str('name').notNull(), displayName: str('display_name'), serviceType: str('service_type', 32).notNull(), provider: str('provider', 80).notNull(),
  defaultUrl: str('default_url', 1000), icon: str('icon', 1000), website: str('website', 1000), rank: int('rank').default(0),
  isThirdParty: bool('is_third_party'), supportOpenAI: bool('support_open_ai'), presetModels: long('preset_models'),
  description: long('description'), isActive: bool('is_active', true), ...audit,
})

export const aiModelConfigs = mysqlTable('ai_model_configs', {
  id, userId: str('user_id', 64), providerId: bigint('provider_id', { mode: 'number' }), sourceModelId: bigint('source_model_id', { mode: 'number' }),
  parameterProfileId: bigint('parameter_profile_id', { mode: 'number' }), serviceType: str('service_type', 32).notNull(), provider: str('provider', 80).notNull(),
  modelId: str('model_id').notNull(), name: str('name').notNull(), description: long('description'), baseUrl: str('base_url', 1000),
  endpoint: str('endpoint', 1000), queryEndpoint: str('query_endpoint', 1000), parameters: long('parameters'), defaults: long('defaults'),
  capabilities: long('capabilities'), cost: double('cost').default(0), isFree: bool('is_free'), memberOnly: bool('member_only'),
  imageCreditByResolution: long('image_credit_by_resolution'), videoCreditPerSecondByResolution: long('video_credit_per_second_by_resolution'),
  billingConfig: long('billing_config'), priority: int('priority').default(0), isDefault: bool('is_default'), isActive: bool('is_active', true), ...audit,
})

export const aiModelBillingRules = mysqlTable('ai_model_billing_rules', {
  id, modelConfigId: bigint('model_config_id', { mode: 'number' }).notNull(), serviceType: str('service_type', 32).notNull(),
  parameterType: str('parameter_type', 64).notNull(), parameterValue: str('parameter_value').notNull(), credits: int('credits').default(0),
  unit: str('unit').default('request'), ...audit,
})

export const aiModelParameterProfiles = mysqlTable('ai_model_parameter_profiles', {
  id, key: str('profile_key').notNull(), name: str('name').notNull(), serviceType: str('service_type', 32).notNull(),
  description: long('description'), parameters: long('parameters'), isBuiltin: bool('is_builtin'), isActive: bool('is_active', true), ...audit,
})

export const aiModelParameterProfileItems = mysqlTable('ai_model_parameter_profile_items', {
  id, profileId: bigint('profile_id', { mode: 'number' }).notNull(), type: str('type', 32).notNull(), label: str('label').notNull(),
  value: str('value').notNull(), config: long('config'), minValue: double('min_value'), maxValue: double('max_value'), stepValue: double('step_value'),
  unit: str('unit', 32), placeholder: str('placeholder'), optionsSource: str('options_source'), rank: int('rank').default(0), ...audit,
})

export const aiUsers = mysqlTable('ai_users', {
  id: str('id', 64).primaryKey(), name: str('name').notNull(), account: str('account'), phone: str('phone', 32), email: str('email'),
  passwordHash: str('password_hash'), inviteCode: str('invite_code', 64), credits: int('credits').default(0), balance: double('balance').default(0),
  membershipCredits: int('membership_credits').default(0), membershipPeriodCredits: int('membership_period_credits').default(0),
  membershipPlanId: bigint('membership_plan_id', { mode: 'number' }), membershipStatus: str('membership_status', 32).default('none'),
  membershipStartedAt: str('membership_started_at', 32), membershipExpiresAt: str('membership_expires_at', 32),
  membershipNextGrantAt: str('membership_next_grant_at', 32), membershipLastGrantAt: str('membership_last_grant_at', 32),
  wxOpenid: str('wx_openid', 128), wxUnionid: str('wx_unionid', 128), wxNickname: str('wx_nickname'), wxAvatar: str('wx_avatar', 1000),
  wxBoundAt: str('wx_bound_at', 32), lastLoginAt: str('last_login_at', 32), lastLoginIp: str('last_login_ip', 64),
  loginChannel: str('login_channel', 32).default('password'), resourceMode: str('resource_mode', 32).default('unset'),
  onboardingCompletedAt: str('onboarding_completed_at', 32), role: str('role', 32).default('user'), isActive: bool('is_active', true), ...audit,
})

export const pointsLogs = mysqlTable('points_logs', {
  id, userId: str('user_id', 64).notNull(), amount: int('amount').notNull(), balance: int('balance').default(0), type: str('type', 32).notNull(),
  description: str('description', 1000), relatedOrderId: bigint('related_order_id', { mode: 'number' }), relatedTaskId: str('related_task_id'),
  taskType: str('task_type'), model: str('model'), status: str('status', 32).default('completed'), metadata: long('metadata'), ...audit,
})

export const aiUserProviderConfigs = mysqlTable('ai_user_provider_configs', {
  id, userId: str('user_id', 64), providerId: bigint('provider_id', { mode: 'number' }).notNull(), provider: str('provider', 80).notNull(),
  name: str('name').notNull(), baseUrl: str('base_url', 1000).notNull(), apiKey: str('api_key', 1000).notNull(), isActive: bool('is_active', true), ...audit,
})

export const membershipPlans = mysqlTable('membership_plans', {
  id, name: str('name').notNull(), code: str('code').notNull(), description: long('description'), planType: str('plan_type').default('creator'),
  billingCycle: str('billing_cycle').default('yearly'), price: double('price').default(0), originalPrice: double('original_price').default(0),
  credits: int('credits').default(0), durationDays: int('duration_days').default(30), badge: str('badge'), subtitle: str('subtitle'),
  metadata: long('metadata'), sortOrder: int('sort_order').default(0), isActive: bool('is_active', true), ...audit,
})

export const creditPackages = mysqlTable('credit_packages', {
  id, name: str('name').notNull(), code: str('code').notNull(), description: long('description'), price: double('price').default(0),
  credits: int('credits').default(0), bonusCredits: int('bonus_credits').default(0), sortOrder: int('sort_order').default(0), isActive: bool('is_active', true), ...audit,
})

export const orders = mysqlTable('orders', {
  id, orderNo: str('order_no').notNull(), userId: str('user_id', 64).notNull(), type: str('type', 32).notNull(), itemId: bigint('item_id', { mode: 'number' }),
  itemName: str('item_name'), amount: double('amount').default(0), credits: int('credits').default(0), status: str('status', 32).default('pending'),
  paymentProvider: str('payment_provider'), paymentChannel: str('payment_channel'), transactionId: str('transaction_id'), metadata: long('metadata'),
  paidAt: str('paid_at', 32), expiresAt: str('expires_at', 32), offlineVoucherUrl: str('offline_voucher_url', 1000), offlineRemark: long('offline_remark'), ...audit,
})

export const paymentConfigs = mysqlTable('payment_configs', {
  id, provider: str('provider', 80).notNull(), name: str('name').notNull(), appId: str('app_id'), merchantId: str('merchant_id'),
  apiKey: str('api_key', 1000), apiSecret: str('api_secret', 1000), notifyUrl: str('notify_url', 1000), returnUrl: str('return_url', 1000),
  config: long('config'), isDefault: bool('is_default'), isActive: bool('is_active', true), ...audit,
})

export const systemSettings = mysqlTable('system_settings', {
  id, key: str('setting_key').notNull(), value: long('setting_value'), group: str('group_name', 64).notNull().default('system'),
  label: str('label'), valueType: str('value_type', 32).notNull().default('string'), isSecret: bool('is_secret'), ...audit,
})

export const aiVoices = mysqlTable('ai_voices', {
  id, voiceId: str('voice_id').notNull(), voiceName: str('voice_name').notNull(), description: long('description'),
  language: str('language'), provider: str('provider', 80).notNull(), ...audit,
})

export const agentConfigs = mysqlTable('agent_configs', {
  id, agentType: str('agent_type').notNull(), name: str('name').notNull(), description: long('description'), model: str('model'),
  systemPrompt: long('system_prompt'), temperature: double('temperature'), maxTokens: int('max_tokens'), maxIterations: int('max_iterations'),
  isActive: bool('is_active', true), ...audit,
})

export const imageGenerations = mysqlTable('image_generations', {
  id, storyboardId: bigint('storyboard_id', { mode: 'number' }), dramaId: bigint('drama_id', { mode: 'number' }), sceneId: bigint('scene_id', { mode: 'number' }),
  characterId: bigint('character_id', { mode: 'number' }), propId: bigint('prop_id', { mode: 'number' }), imageType: str('image_type'), frameType: str('frame_type'),
  provider: str('provider', 80), prompt: long('prompt'), negativePrompt: long('negative_prompt'), model: str('model'), size: str('size'), sampleImageSize: str('sample_image_size'),
  quality: str('quality'), style: str('style'), steps: int('steps'), cfgScale: double('cfg_scale'), seed: bigint('seed', { mode: 'number' }),
  outputFormat: str('output_format'), responseFormat: str('response_format'), watermark: boolean('watermark'), stream: boolean('stream'),
  officialFallback: boolean('official_fallback'), outputCompression: int('output_compression'), background: str('background'), moderation: str('moderation'),
  inputFidelity: str('input_fidelity'), partialImages: int('partial_images'),
  googleSearch: boolean('google_search'), googleImageSearch: boolean('google_image_search'),
  sequentialImageGeneration: str('sequential_image_generation'), sequentialImageGenerationOptions: long('sequential_image_generation_options'),
  optimizePromptOptions: long('optimize_prompt_options'), tools: long('tools'),
  imageUrl: str('image_url', 1000), minioUrl: str('minio_url', 1000), localPath: str('local_path', 1000), status: str('status', 32).default('pending'),
  taskId: str('task_id'), errorMsg: long('error_msg'), width: int('width'), height: int('height'), referenceImages: long('reference_images'),
  mask: long('mask'), completedAt: str('completed_at', 32), ...audit,
})

export const videoGenerations = mysqlTable('video_generations', {
  id, storyboardId: bigint('storyboard_id', { mode: 'number' }), dramaId: bigint('drama_id', { mode: 'number' }), provider: str('provider', 80),
  prompt: long('prompt'), model: str('model'), imageGenId: bigint('image_gen_id', { mode: 'number' }), referenceMode: str('reference_mode'),
  imageUrl: str('image_url', 1000), firstFrameUrl: str('first_frame_url', 1000), lastFrameUrl: str('last_frame_url', 1000), referenceImageUrls: long('reference_image_urls'),
  referenceVideoUrls: long('reference_video_urls'), referenceAudioUrls: long('reference_audio_urls'),
  duration: int('duration'), fps: int('fps'), resolution: str('resolution'), aspectRatio: str('aspect_ratio'), style: str('style'),
  frames: int('frames'), generateAudio: boolean('generate_audio'), cameraFixed: boolean('camera_fixed'), watermark: boolean('watermark'),
  returnLastFrame: boolean('return_last_frame'), serviceTier: str('service_tier'), executionExpiresAfter: int('execution_expires_after'),
  callbackUrl: str('callback_url', 1000), draft: boolean('draft'), draftTaskId: str('draft_task_id'), tools: long('tools'),
  motionLevel: int('motion_level'), cameraMotion: str('camera_motion'), seed: bigint('seed', { mode: 'number' }), videoUrl: str('video_url', 1000),
  minioUrl: str('minio_url', 1000), localPath: str('local_path', 1000), status: str('status', 32).default('pending'), taskId: str('task_id'),
  errorMsg: long('error_msg'), width: int('width'), height: int('height'), completedAt: str('completed_at', 32), ...audit,
})

export const videoMerges = mysqlTable('video_merges', {
  id, episodeId: bigint('episode_id', { mode: 'number' }), dramaId: bigint('drama_id', { mode: 'number' }), title: str('title'),
  provider: str('provider', 80), model: str('model'), status: str('status', 32).default('pending'), scenes: long('scenes'),
  mergedUrl: str('merged_url', 1000), duration: int('duration'), taskId: str('task_id'), errorMsg: long('error_msg'),
  completedAt: str('completed_at', 32), ...audit,
})

export const props = mysqlTable('props', {
  id, dramaId: bigint('drama_id', { mode: 'number' }).notNull(), name: str('name').notNull(), type: str('type'), description: long('description'),
  prompt: long('prompt'), imageUrl: str('image_url', 1000), referenceImages: long('reference_images'), localPath: str('local_path', 1000), ...audit,
})

export const assets = mysqlTable('assets', {
  id, dramaId: bigint('drama_id', { mode: 'number' }), episodeId: bigint('episode_id', { mode: 'number' }), storyboardId: bigint('storyboard_id', { mode: 'number' }),
  storyboardNum: int('storyboard_num'), name: str('name'), description: long('description'), type: str('type'), category: str('category'),
  url: str('url', 1000), thumbnailUrl: str('thumbnail_url', 1000), localPath: str('local_path', 1000), fileSize: bigint('file_size', { mode: 'number' }),
  mimeType: str('mime_type'), width: int('width'), height: int('height'), duration: int('duration'), format: str('format'),
  imageGenId: bigint('image_gen_id', { mode: 'number' }), videoGenId: bigint('video_gen_id', { mode: 'number' }),
  isFavorite: bool('is_favorite'), viewCount: int('view_count').default(0), ...audit,
})

export const creationTasks = mysqlTable('creation_tasks', {
  id, userId: str('user_id', 64), type: str('type', 32).notNull().default('image'), provider: str('provider', 80), model: str('model'),
  prompt: long('prompt').notNull(), status: str('status', 32).notNull().default('pending'), progress: int('progress').default(0),
  expectedCount: int('expected_count').default(1), completedCount: int('completed_count').default(0), aspectRatio: str('aspect_ratio'),
  resolution: str('resolution'), referenceImages: long('reference_images'), requestPayload: long('request_payload'), errorMsg: long('error_msg'),
  completedAt: str('completed_at', 32), ...audit,
})

export const creationHistory = mysqlTable('creation_history', {
  id, taskId: bigint('task_id', { mode: 'number' }).notNull(), userId: str('user_id', 64), type: str('type', 32).notNull().default('image'),
  provider: str('provider', 80), model: str('model'), prompt: long('prompt').notNull(), resultUrl: str('result_url', 1000),
  localPath: str('local_path', 1000), mimeType: str('mime_type'), width: int('width'), height: int('height'), duration: int('duration'),
  sortOrder: int('sort_order').default(0), status: str('status', 32).notNull().default('completed'), errorMsg: long('error_msg'), metadata: long('metadata'), ...audit,
})

export const canvasProjects = mysqlTable('canvas_projects', {
  id: str('id', 64).primaryKey(), userId: str('user_id', 64).notNull(), name: str('name').notNull(),
  thumbnail: str('thumbnail', 1000), canvasData: veryLong('canvas_data'), ...audit,
})
