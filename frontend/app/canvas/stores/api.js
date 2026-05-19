/**
 * API Store | API 状态存储
 * Pure global state - logic moved to hooks/useApiConfig.js
 * 纯全局状态 - 逻辑已移至 hooks/useApiConfig.js
 */

// Re-export from hook for backward compatibility | 为向后兼容重新导出
export { useApiConfig } from '../hooks/useApiConfig'

// For components that need direct access to config state | 用于需要直接访问配置状态的组件
// Use the hook instead: const { isConfigured, apiKey } = useApiConfig()
// 请使用 hook: const { isConfigured, apiKey } = useApiConfig()
