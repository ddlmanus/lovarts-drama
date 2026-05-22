<template>
  <template v-if="admin.dialog === 'membership'">
    <label>套餐名称<input v-model="admin.membershipForm.name" required /></label>
    <label>Code<input v-model="admin.membershipForm.code" placeholder="pro_monthly" /></label>
    <label>说明<textarea v-model="admin.membershipForm.description" rows="3" /></label>
    <div class="form-grid">
      <label>版本类型<select v-model="admin.membershipForm.plan_type"><option value="creator">创作会员</option><option value="team">团队版会员</option></select></label>
      <label>计费周期<select v-model="admin.membershipForm.billing_cycle"><option value="yearly">按年/连续包年</option><option value="monthly">按月/连续包月</option></select></label>
    </div>
    <div class="form-grid">
      <label>价格<input v-model.number="admin.membershipForm.price" type="number" step="0.01" /></label>
      <label>原价<input v-model.number="admin.membershipForm.original_price" type="number" step="0.01" /></label>
    </div>
    <div class="form-grid">
      <label>积分/月<input v-model.number="admin.membershipForm.credits" type="number" /></label>
      <label>折扣角标<input v-model="admin.membershipForm.badge" placeholder="限时 37 折" /></label>
    </div>
    <div class="form-grid">
      <label>有效天数<input v-model.number="admin.membershipForm.duration_days" type="number" /></label>
      <label>排序<input v-model.number="admin.membershipForm.sort_order" type="number" /></label>
    </div>
    <label>副标题/续费文案<input v-model="admin.membershipForm.subtitle" placeholder="次年续费 ¥599 可随时取消" /></label>
    <div class="form-grid">
      <label>价格单位<input v-model="admin.membershipForm.unit" placeholder="年 / 月" /></label>
      <label>卡片色调<select v-model="admin.membershipForm.tone"><option value="">默认黑灰</option><option value="blue">蓝紫</option><option value="gold">金色</option><option value="cyan">青蓝</option><option value="purple">紫色</option></select></label>
    </div>
    <label>价格下方说明（每行一条）<textarea v-model="admin.membershipForm.sub_text" rows="3" placeholder="47元/月&#10;1积分=0.032元" /></label>
    <label>生成能力说明<input v-model="admin.membershipForm.generation" placeholder="最多生成约 6000 张图片 ｜ 300 个视频 ⓘ" /></label>
    <label>积分下拉文案<input v-model="admin.membershipForm.dropdown" placeholder="16300 积分/月" /></label>
    <label>限时活动（每行一条）<textarea v-model="admin.membershipForm.activity_text" rows="4" placeholder="× Seedance 2.0 VIP 无赠送&#10;✦ Happy Horse 1.0 限时4折 ⓘ" /></label>
    <template v-if="admin.membershipForm.plan_type === 'team'">
      <div class="form-grid">
        <label>默认席位数<input v-model.number="admin.membershipForm.seats" type="number" /></label>
        <label>合计金额<input v-model.number="admin.membershipForm.total" type="number" /></label>
      </div>
      <label>团队积分说明<input v-model="admin.membershipForm.team_credits_line" placeholder="团队内每月共 3000 积分 ⓘ" /></label>
      <label>席位赠送说明（每行一条）<textarea v-model="admin.membershipForm.seat_gift_text" rows="4" /></label>
      <label>协作效率（每行一条）<textarea v-model="admin.membershipForm.feature_efficiency_text" rows="4" /></label>
      <label>管理权益（每行一条）<textarea v-model="admin.membershipForm.feature_management_text" rows="4" /></label>
      <label>安全与其他（每行一条）<textarea v-model="admin.membershipForm.feature_security_text" rows="4" /></label>
      <label>独家功能（每行一条）<textarea v-model="admin.membershipForm.feature_exclusive_text" rows="3" /></label>
    </template>
    <template v-else>
      <label>会员权益（每行一条）<textarea v-model="admin.membershipForm.feature_default_text" rows="8" placeholder="8个并发任务&#10;云端存储空间60GB&#10;去除品牌水印 商用无忧" /></label>
    </template>
    <label class="check"><input v-model="admin.membershipForm.is_active" type="checkbox" /> 启用</label>
  </template>
</template>

<script setup lang="ts">
defineProps<{ admin: any }>()
</script>
