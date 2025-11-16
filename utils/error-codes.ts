/**
 * 应用错误码枚举
 *
 * 统一的错误码定义，便于错误分类、日志记录和错误追踪
 *
 * 错误码格式：{模块代码}{错误类型}{序号}
 * - 模块代码：DB(数据库)、AI(AI服务)、NET(网络)、VAL(验证)、PERM(权限)、BIZ(业务)
 * - 错误类型：ERR(错误)、WARN(警告)
 * - 序号：001-999
 */
export enum ErrorCode {
  // ========== 数据库错误 (DB_ERR_xxx) ==========
  /** 数据库连接失败 */
  DB_ERR_CONNECTION = 'DB_ERR_001',
  /** 数据库查询失败 */
  DB_ERR_QUERY = 'DB_ERR_002',
  /** 数据库插入失败 */
  DB_ERR_INSERT = 'DB_ERR_003',
  /** 数据库更新失败 */
  DB_ERR_UPDATE = 'DB_ERR_004',
  /** 数据库删除失败 */
  DB_ERR_DELETE = 'DB_ERR_005',
  /** 数据库事务失败 */
  DB_ERR_TRANSACTION = 'DB_ERR_006',
  /** 数据库迁移失败 */
  DB_ERR_MIGRATION = 'DB_ERR_007',
  /** 数据库约束冲突 */
  DB_ERR_CONSTRAINT = 'DB_ERR_008',

  // ========== AI 服务错误 (AI_ERR_xxx) ==========
  /** AI 服务不可用 */
  AI_ERR_UNAVAILABLE = 'AI_ERR_001',
  /** AI API 认证失败 */
  AI_ERR_AUTH = 'AI_ERR_002',
  /** AI API 限流 */
  AI_ERR_RATE_LIMIT = 'AI_ERR_003',
  /** AI API 配额不足 */
  AI_ERR_QUOTA = 'AI_ERR_004',
  /** AI 模型不支持 */
  AI_ERR_MODEL_UNSUPPORTED = 'AI_ERR_005',
  /** AI 流式响应错误 */
  AI_ERR_STREAM = 'AI_ERR_006',
  /** AI 图片生成失败 */
  AI_ERR_IMAGE_GENERATION = 'AI_ERR_007',
  /** AI 内容违规 */
  AI_ERR_CONTENT_POLICY = 'AI_ERR_008',
  /** AI MCP 工具调用失败 */
  AI_ERR_MCP_TOOL = 'AI_ERR_009',

  // ========== 网络错误 (NET_ERR_xxx) ==========
  /** 网络请求失败 */
  NET_ERR_REQUEST = 'NET_ERR_001',
  /** 网络请求超时 */
  NET_ERR_TIMEOUT = 'NET_ERR_002',
  /** 网络连接失败 */
  NET_ERR_CONNECTION = 'NET_ERR_003',
  /** 网络中断 */
  NET_ERR_ABORT = 'NET_ERR_004',
  /** HTTP 4xx 错误 */
  NET_ERR_CLIENT = 'NET_ERR_005',
  /** HTTP 5xx 错误 */
  NET_ERR_SERVER = 'NET_ERR_006',
  /** 网络不可用 */
  NET_ERR_OFFLINE = 'NET_ERR_007',

  // ========== 验证错误 (VAL_ERR_xxx) ==========
  /** 数据验证失败 */
  VAL_ERR_INVALID_DATA = 'VAL_ERR_001',
  /** 必填字段缺失 */
  VAL_ERR_REQUIRED_FIELD = 'VAL_ERR_002',
  /** 字段格式错误 */
  VAL_ERR_INVALID_FORMAT = 'VAL_ERR_003',
  /** 字段值超出范围 */
  VAL_ERR_OUT_OF_RANGE = 'VAL_ERR_004',
  /** Schema 验证失败 */
  VAL_ERR_SCHEMA = 'VAL_ERR_005',

  // ========== 权限错误 (PERM_ERR_xxx) ==========
  /** 权限被拒绝 */
  PERM_ERR_DENIED = 'PERM_ERR_001',
  /** 麦克风权限被拒绝 */
  PERM_ERR_MICROPHONE = 'PERM_ERR_002',
  /** 存储权限被拒绝 */
  PERM_ERR_STORAGE = 'PERM_ERR_003',
  /** 相机权限被拒绝 */
  PERM_ERR_CAMERA = 'PERM_ERR_004',
  /** 位置权限被拒绝 */
  PERM_ERR_LOCATION = 'PERM_ERR_005',

  // ========== 业务逻辑错误 (BIZ_ERR_xxx) ==========
  /** 资源未找到 */
  BIZ_ERR_NOT_FOUND = 'BIZ_ERR_001',
  /** 资源已存在 */
  BIZ_ERR_ALREADY_EXISTS = 'BIZ_ERR_002',
  /** 操作不允许 */
  BIZ_ERR_NOT_ALLOWED = 'BIZ_ERR_003',
  /** 状态冲突 */
  BIZ_ERR_CONFLICT = 'BIZ_ERR_004',
  /** 业务规则违反 */
  BIZ_ERR_BUSINESS_RULE = 'BIZ_ERR_005',

  // ========== 未知错误 (UNKNOWN_xxx) ==========
  /** 未知错误 */
  UNKNOWN_ERR = 'UNKNOWN_ERR_001',
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  /** 低 - 不影响核心功能 */
  LOW = 'low',
  /** 中 - 影响部分功能 */
  MEDIUM = 'medium',
  /** 高 - 影响核心功能 */
  HIGH = 'high',
  /** 严重 - 导致应用崩溃 */
  CRITICAL = 'critical',
}

/**
 * 错误码到严重级别的映射
 */
export const ERROR_SEVERITY_MAP: Record<ErrorCode, ErrorSeverity> = {
  // 数据库错误 - 高严重级别
  [ErrorCode.DB_ERR_CONNECTION]: ErrorSeverity.CRITICAL,
  [ErrorCode.DB_ERR_QUERY]: ErrorSeverity.HIGH,
  [ErrorCode.DB_ERR_INSERT]: ErrorSeverity.HIGH,
  [ErrorCode.DB_ERR_UPDATE]: ErrorSeverity.HIGH,
  [ErrorCode.DB_ERR_DELETE]: ErrorSeverity.HIGH,
  [ErrorCode.DB_ERR_TRANSACTION]: ErrorSeverity.HIGH,
  [ErrorCode.DB_ERR_MIGRATION]: ErrorSeverity.CRITICAL,
  [ErrorCode.DB_ERR_CONSTRAINT]: ErrorSeverity.MEDIUM,

  // AI 服务错误 - 中到高严重级别
  [ErrorCode.AI_ERR_UNAVAILABLE]: ErrorSeverity.HIGH,
  [ErrorCode.AI_ERR_AUTH]: ErrorSeverity.HIGH,
  [ErrorCode.AI_ERR_RATE_LIMIT]: ErrorSeverity.MEDIUM,
  [ErrorCode.AI_ERR_QUOTA]: ErrorSeverity.MEDIUM,
  [ErrorCode.AI_ERR_MODEL_UNSUPPORTED]: ErrorSeverity.MEDIUM,
  [ErrorCode.AI_ERR_STREAM]: ErrorSeverity.MEDIUM,
  [ErrorCode.AI_ERR_IMAGE_GENERATION]: ErrorSeverity.LOW,
  [ErrorCode.AI_ERR_CONTENT_POLICY]: ErrorSeverity.LOW,
  [ErrorCode.AI_ERR_MCP_TOOL]: ErrorSeverity.MEDIUM,

  // 网络错误 - 中严重级别
  [ErrorCode.NET_ERR_REQUEST]: ErrorSeverity.MEDIUM,
  [ErrorCode.NET_ERR_TIMEOUT]: ErrorSeverity.MEDIUM,
  [ErrorCode.NET_ERR_CONNECTION]: ErrorSeverity.MEDIUM,
  [ErrorCode.NET_ERR_ABORT]: ErrorSeverity.LOW,
  [ErrorCode.NET_ERR_CLIENT]: ErrorSeverity.MEDIUM,
  [ErrorCode.NET_ERR_SERVER]: ErrorSeverity.MEDIUM,
  [ErrorCode.NET_ERR_OFFLINE]: ErrorSeverity.HIGH,

  // 验证错误 - 低到中严重级别
  [ErrorCode.VAL_ERR_INVALID_DATA]: ErrorSeverity.LOW,
  [ErrorCode.VAL_ERR_REQUIRED_FIELD]: ErrorSeverity.LOW,
  [ErrorCode.VAL_ERR_INVALID_FORMAT]: ErrorSeverity.LOW,
  [ErrorCode.VAL_ERR_OUT_OF_RANGE]: ErrorSeverity.LOW,
  [ErrorCode.VAL_ERR_SCHEMA]: ErrorSeverity.MEDIUM,

  // 权限错误 - 中严重级别
  [ErrorCode.PERM_ERR_DENIED]: ErrorSeverity.MEDIUM,
  [ErrorCode.PERM_ERR_MICROPHONE]: ErrorSeverity.MEDIUM,
  [ErrorCode.PERM_ERR_STORAGE]: ErrorSeverity.MEDIUM,
  [ErrorCode.PERM_ERR_CAMERA]: ErrorSeverity.MEDIUM,
  [ErrorCode.PERM_ERR_LOCATION]: ErrorSeverity.LOW,

  // 业务逻辑错误 - 低到中严重级别
  [ErrorCode.BIZ_ERR_NOT_FOUND]: ErrorSeverity.LOW,
  [ErrorCode.BIZ_ERR_ALREADY_EXISTS]: ErrorSeverity.LOW,
  [ErrorCode.BIZ_ERR_NOT_ALLOWED]: ErrorSeverity.MEDIUM,
  [ErrorCode.BIZ_ERR_CONFLICT]: ErrorSeverity.MEDIUM,
  [ErrorCode.BIZ_ERR_BUSINESS_RULE]: ErrorSeverity.MEDIUM,

  // 未知错误 - 高严重级别
  [ErrorCode.UNKNOWN_ERR]: ErrorSeverity.HIGH,
};
