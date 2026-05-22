<template>
  <form class="system-settings-form" @submit.prevent="admin.saveSystemSettings">
    <section class="settings-section">
      <h3>网站信息</h3>
      <div class="form-grid">
        <label>网站名称<input v-model="admin.systemSettingsForm.site_name" placeholder="Lovarts.短剧" /></label>
        <label>网站标题<input v-model="admin.systemSettingsForm.site_title" placeholder="Lovarts.短剧" /></label>
      </div>
      <label>网站描述<textarea v-model="admin.systemSettingsForm.site_description" rows="3" /></label>
      <label>网站关键词<input v-model="admin.systemSettingsForm.site_keywords" placeholder="AI短剧,短剧创作" /></label>
    </section>

    <section class="settings-section">
      <h3>品牌图片</h3>
      <div class="asset-grid">
        <div class="asset-card">
          <div class="asset-preview">
            <img v-if="admin.systemSettingsForm.site_logo_url" :src="admin.systemSettingsForm.site_logo_url" alt="" />
            <span v-else>Logo</span>
          </div>
          <label>网站 Logo<input v-model="admin.systemSettingsForm.site_logo_url" placeholder="/static/uploads/logo.png" /></label>
          <label class="upload-btn">
            {{ admin.systemAssetUploading === 'site_logo_url' ? '上传中...' : '上传 Logo' }}
            <input type="file" accept="image/*" :disabled="!!admin.systemAssetUploading" @change="onUpload('site_logo_url', $event)" />
          </label>
        </div>
        <div class="asset-card">
          <div class="asset-preview avatar-preview">
            <img v-if="admin.systemSettingsForm.default_avatar_url" :src="admin.systemSettingsForm.default_avatar_url" alt="" />
            <span v-else>头像</span>
          </div>
          <label>用户默认头像<input v-model="admin.systemSettingsForm.default_avatar_url" placeholder="/static/uploads/avatar.png" /></label>
          <label class="upload-btn">
            {{ admin.systemAssetUploading === 'default_avatar_url' ? '上传中...' : '上传头像' }}
            <input type="file" accept="image/*" :disabled="!!admin.systemAssetUploading" @change="onUpload('default_avatar_url', $event)" />
          </label>
        </div>
      </div>
    </section>

    <section class="settings-section">
      <h3>文件存储</h3>
      <div class="form-grid">
        <label>存储方式
          <select v-model="admin.systemSettingsForm.storage_driver">
            <option value="local">本地存储</option>
            <option value="aliyun_oss">阿里云 OSS</option>
            <option value="s3">S3 兼容存储</option>
          </select>
        </label>
        <label>公网访问域名<input v-model="admin.systemSettingsForm.oss_public_base_url" placeholder="https://cdn.example.com" /></label>
      </div>
      <div class="form-grid">
        <label>Region<input v-model="admin.systemSettingsForm.oss_region" placeholder="oss-cn-hangzhou" /></label>
        <label>Bucket<input v-model="admin.systemSettingsForm.oss_bucket" placeholder="bucket-name" /></label>
      </div>
      <label>Endpoint<input v-model="admin.systemSettingsForm.oss_endpoint" placeholder="https://oss-cn-hangzhou.aliyuncs.com" /></label>
      <div class="form-grid">
        <label>AccessKey ID<input v-model="admin.systemSettingsForm.oss_access_key_id" autocomplete="off" /></label>
        <label>AccessKey Secret<input v-model="admin.systemSettingsForm.oss_access_key_secret" type="password" autocomplete="new-password" placeholder="留空则不修改" /></label>
      </div>
    </section>

    <div class="settings-actions">
      <button class="btn ghost" type="button" :disabled="admin.systemSettingsLoading" @click="admin.loadSystemSettings">重新加载</button>
      <button class="btn primary" type="submit" :disabled="admin.systemSettingsSaving">{{ admin.systemSettingsSaving ? '保存中...' : '保存设置' }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{ admin: any }>()

function onUpload(field: 'site_logo_url' | 'default_avatar_url', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  props.admin.uploadSystemAsset(field, file)
}
</script>
