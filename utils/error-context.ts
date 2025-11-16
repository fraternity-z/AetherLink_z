/**
 * 错误上下文收集工具
 *
 * 收集错误发生时的环境信息、设备信息和应用状态，用于错误追踪和调试
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

/**
 * 用户环境信息
 */
export interface UserEnvironment {
  /** 设备品牌（如 Apple、Samsung） */
  brand?: string | null;
  /** 设备型号（如 iPhone 14 Pro） */
  modelName?: string | null;
  /** 操作系统名称（iOS、Android、web） */
  osName?: string | null;
  /** 操作系统版本 */
  osVersion?: string | null;
  /** 平台（ios、android、web） */
  platform: string;
  /** 应用版本 */
  appVersion?: string | null;
  /** 应用构建号 */
  buildNumber?: string | null;
  /** 是否为真机 */
  isDevice?: boolean | null;
}

/**
 * 路由上下文信息
 */
export interface RouterContext {
  /** 当前路由路径 */
  currentRoute?: string;
  /** 路由参数 */
  params?: Record<string, unknown>;
  /** 路由栈深度 */
  stackDepth?: number;
}

/**
 * 应用状态上下文
 */
export interface AppStateContext {
  /** 应用是否在前台 */
  isActive?: boolean;
  /** 内存使用情况（MB） */
  memoryUsage?: number;
  /** 网络状态 */
  networkState?: 'online' | 'offline' | 'unknown';
}

/**
 * 完整的错误上下文
 */
export interface ErrorContext {
  /** 用户环境信息 */
  environment: UserEnvironment;
  /** 路由上下文 */
  router?: RouterContext;
  /** 应用状态 */
  appState?: AppStateContext;
  /** 自定义额外数据 */
  extra?: Record<string, unknown>;
}

/**
 * 错误上下文收集器
 */
class ErrorContextCollector {
  private routerContext: RouterContext = {};
  private appStateContext: AppStateContext = { networkState: 'unknown' };

  /**
   * 获取用户环境信息
   */
  async getUserEnvironment(): Promise<UserEnvironment> {
    try {
      const [brand, modelName, osName, osVersion, isDevice] = await Promise.all([
        Device.brand,
        Device.modelName,
        Device.osName,
        Device.osVersion,
        Device.isDevice,
      ]);

      return {
        brand,
        modelName,
        osName,
        osVersion,
        platform: Platform.OS,
        appVersion: Application.nativeApplicationVersion,
        buildNumber: Application.nativeBuildVersion,
        isDevice,
      };
    } catch (error) {
      // 如果获取环境信息失败，返回基本信息
      return {
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version || 'unknown',
        buildNumber: Constants.expoConfig?.extra?.buildNumber || 'unknown',
      };
    }
  }

  /**
   * 设置路由上下文（由路由监听器调用）
   */
  setRouterContext(context: RouterContext): void {
    this.routerContext = context;
  }

  /**
   * 获取路由上下文
   */
  getRouterContext(): RouterContext {
    return this.routerContext;
  }

  /**
   * 设置应用状态上下文（由状态监听器调用）
   */
  setAppStateContext(context: Partial<AppStateContext>): void {
    this.appStateContext = {
      ...this.appStateContext,
      ...context,
    };
  }

  /**
   * 获取应用状态上下文
   */
  getAppStateContext(): AppStateContext {
    return this.appStateContext;
  }

  /**
   * 收集完整的错误上下文
   *
   * @param extra - 自定义额外数据
   * @returns 完整的错误上下文
   */
  async collect(extra?: Record<string, unknown>): Promise<ErrorContext> {
    const environment = await this.getUserEnvironment();

    return {
      environment,
      router: this.routerContext,
      appState: this.appStateContext,
      extra,
    };
  }
}

/**
 * 全局错误上下文收集器实例
 */
export const errorContextCollector = new ErrorContextCollector();

/**
 * 导出默认实例
 */
export default errorContextCollector;
