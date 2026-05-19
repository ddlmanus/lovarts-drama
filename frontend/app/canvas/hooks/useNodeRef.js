/**
 * 节点引用解析 Hook
 * 用于解析文本中的 @[nodeId] 引用格式
 */

/**
 * 解析文本中的 @ 引用
 * @param {string} text - 待解析的文本
 * @returns {Array<{nodeId: string, name?: string, order: number}>} 解析出的引用列表
 */
export function parseMentions(text) {
  if (!text) return []

  const mentions = []
  // 匹配 @[nodeId] 或 @[nodeId|name] 格式
  const regex = /@\[([^\]|]+)(?:\|([^\]]+))?\]/g
  let match
  let order = 0

  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      nodeId: match[1],
      name: match[2] || null,
      order: order++
    })
  }

  return mentions
}

/**
 * 检查文本是否包含对指定节点的 @ 引用
 * @param {string} text - 待检查的文本
 * @param {string} nodeId - 节点ID
 * @returns {boolean} 是否包含引用
 */
export function hasMention(text, nodeId) {
  const mentions = parseMentions(text)
  return mentions.some(m => m.nodeId === nodeId)
}

/**
 * 从文本中提取对指定节点的引用
 * @param {string} text - 待解析的文本
 * @param {string} nodeId - 节点ID
 * @returns {Array<{nodeId: string, name?: string, order: number}>} 匹配的引用
 */
export function getMentionsToNode(text, nodeId) {
  const mentions = parseMentions(text)
  return mentions.filter(m => m.nodeId === nodeId)
}

/**
 * 清理文本中的 @ 引用标记，保留引用名称（如果有）
 * @param {string} text - 待清理的文本
 * @param {string} placeholder - 替换引用的占位符，默认空字符串
 * @returns {string} 清理后的文本
 */
export function cleanMentions(text, placeholder = '') {
  if (!text) return ''
  return text.replace(/@\[([^\]|]+)(?:\|([^\]]+))?\]/g, (_, nodeId, name) => {
    return name || placeholder
  })
}

/**
 * 在文本中插入 @ 引用
 * @param {string} text - 原文本
 * @param {string} nodeId - 节点ID
 * @param {string} name - 显示名称（可选）
 * @param {number} position - 插入位置（默认末尾）
 * @returns {string} 插入引用后的文本
 */
export function insertMention(text, nodeId, name = null, position = -1) {
  const mention = name ? `@[${nodeId}|${name}]` : `@[${nodeId}]`

  if (position < 0 || position >= text.length) {
    return text + mention
  }

  return text.slice(0, position) + mention + text.slice(position)
}

/**
 * 从文本中移除指定节点的 @ 引用
 * @param {string} text - 原文本
 * @param {string} nodeId - 节点ID
 * @returns {string} 移除引用后的文本
 */
export function removeMention(text, nodeId) {
  if (!text) return ''
  return text.replace(new RegExp(`@\\[${nodeId}(?:\\|[^\\]]+)?\\]`, 'g'), '')
}

/**
 * 获取文本中所有 @ 引用的节点ID列表（去重）
 * @param {string} text - 待解析的文本
 * @returns {string[]} 节点ID列表
 */
export function getMentionedNodeIds(text) {
  const mentions = parseMentions(text)
  return [...new Set(mentions.map(m => m.nodeId))]
}
