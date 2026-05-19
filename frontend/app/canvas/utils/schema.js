/**
 * API Utils | API 工具函数
 * Simplified for open source version | 开源版简化版
 */

/**
 * Get nested value from object | 获取嵌套对象的值
 * @param {Object} obj - Source object
 * @param {string} path - Path like "data.url" or "choices.0.message"
 * @returns {*} Value at path
 */
export const getNestedValue = (obj, path) => {
  if (!obj || !path) return obj
  const paths = path.split('.')
  let value = obj
  for (const p of paths) {
    value = value?.[p]
  }
  return value
}

/**
 * Build request body with FormData support | 构建请求体，支持 FormData
 * @param {Object} params - Request parameters
 * @param {string} requestType - 'json' or 'formdata'
 * @returns {Object|FormData} Request body
 */
export const buildRequestBody = (params, requestType = 'json') => {
  if (requestType !== 'formdata') {
    return params
  }

  const fd = new FormData()
  
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        if (item instanceof File) {
          fd.append(`${key}[${idx}]`, item, item.name)
        } else if (typeof item === 'object' && item !== null) {
          fd.append(`${key}[${idx}]`, JSON.stringify(item))
        } else {
          fd.append(`${key}[${idx}]`, item)
        }
      })
    } else if (value instanceof File) {
      fd.append(key, value, value.name)
    } else if (typeof value === 'object' && value !== null) {
      fd.append(key, JSON.stringify(value))
    } else if (value !== undefined && value !== null && value !== '') {
      fd.append(key, value)
    }
  }
  
  return fd
}

/**
 * Parse API result based on output schema | 根据输出 schema 解析 API 结果
 * @param {Object} result - API response
 * @param {Object} outputSchema - Output schema with displayField
 * @param {string} resultType - Result type: 'image', 'video', 'chat'
 * @returns {Array} Parsed results
 */
export const parseApiResult = (result, outputSchema, resultType = 'image') => {
  if (!result) return []
  
  // Default field based on result type
  const defaultField = resultType === 'video' ? 'video_url' : (resultType === 'image' ? 'data' : null)
  const displayField = outputSchema?.displayField || defaultField
  
  // No displayField, try default parsing
  if (!displayField) {
    if (result?.data) {
      return Array.isArray(result.data) ? result.data : [result.data]
    }
    return [result]
  }
  
  // Parse displayField path
  // Supports: "data", "data[].url", "choices[].message.content"
  if (displayField.includes('[]')) {
    // Array path like data[].url
    const [arrayPath, ...rest] = displayField.split('[]')
    const fieldPath = rest.join('[]').replace(/^\./, '') // Remove leading dot
    
    // Get array
    let data = arrayPath ? getNestedValue(result, arrayPath) : result
    
    if (!Array.isArray(data)) {
      data = data ? [data] : []
    }
    
    // Extract field from each element if fieldPath exists
    if (fieldPath) {
      return data.map(item => getNestedValue(item, fieldPath)).filter(Boolean)
    }
    
    return data
  } else {
    // Simple path like "data"
    const data = getNestedValue(result, displayField)
    return Array.isArray(data) ? data : (data ? [data] : [])
  }
}
