/**
 * Model API | 模型 API
 */

import { request } from '~/canvas/utils'

// 分页查询模型列表
export const getModelPage = (params) =>
  request({
    url: `/model/page`,
    method: 'get',
    params: { enable: true, size: 1000, current: 1, ...params }
  })

// 根据类型获取模型列表
export const getModelsByType = async (type) => {
  const rsp = await getModelPage({ type, enable: true, size: 1000, current: 1 })
  return rsp?.data?.records || []
}

// 根据全称获取模型详情
export const getModelByFullName = (fullName) =>
  request({
    url: `/model/fullName`,
    method: 'get',
    params: { fullName }
  })

// 获取所有模型类型
export const getModelTypes = () =>
  request({
    url: `/model/types`,
    method: 'get'
  })
