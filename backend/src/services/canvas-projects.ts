import { mysqlExec } from '../repositories/runtime.js'

export async function ensureCanvasProjectsSchema() {
  await mysqlExec(`
    CREATE TABLE IF NOT EXISTS canvas_projects (
      id VARCHAR(64) NOT NULL COMMENT '画布项目ID',
      user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
      name VARCHAR(255) NOT NULL COMMENT '项目名称',
      thumbnail VARCHAR(1000) NULL COMMENT '项目缩略图',
      canvas_data LONGTEXT NULL COMMENT '画布节点连线和视口数据',
      created_by VARCHAR(64) NULL COMMENT '创建人',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_by VARCHAR(64) NULL COMMENT '修改人',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
      deleted_by VARCHAR(64) NULL COMMENT '删除人',
      deleted_at DATETIME NULL COMMENT '删除时间',
      is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
      PRIMARY KEY (id),
      KEY idx_canvas_projects_user_updated (user_id, is_deleted, updated_at),
      KEY idx_canvas_projects_deleted (is_deleted)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='无限画布项目'
  `)
}
