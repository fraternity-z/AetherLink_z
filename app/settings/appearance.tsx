/**
 * 🎨 外观设置页面
 *
 * 功能：
 * - 预设风格选择（主题卡片）
 * - 全局字体大小调节
 * - 界面定制选项
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text, Divider, useTheme } from 'react-native-paper';
import Slider from '@react-native-community/slider';

// 预设主题数据
const PRESET_THEMES = [
  { id: 'default', name: '默认主题', colors: ['#9333EA', '#754AB4'] },
  { id: 'claude', name: 'Claude 风格', colors: ['#F97316', '#EA580C'] },
  { id: 'minimal', name: '极简风格', colors: ['#000000', '#404040'] },
  { id: 'ocean', name: '海洋风格', colors: ['#06B6D4', '#0891B2'] },
  { id: 'forest', name: '森林风格', colors: ['#10B981', '#059669'] },
  { id: 'warmth', name: '暖橙色', colors: ['#F59E0B', '#D97706'] },
  { id: 'sunset', name: '日落橙', colors: ['#EF4444', '#DC2626'] },
  { id: 'tech', name: '科技蓝', colors: ['#3B82F6', '#2563EB'] },
  { id: 'neon', name: '霓虹紫', colors: ['#A855F7', '#9333EA'] },
];

export default function AppearanceSettings() {
  const theme = useTheme();
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [fontSize, setFontSize] = useState(16);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 设置内容 */}
      <ScrollView style={styles.scrollView}>
        {/* 主题和字体标题 */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            主题和字体
          </Text>
          <Text variant="bodyMedium" style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>
            自定义应用的外观的界面上部呈现您常见的小设置
          </Text>
        </View>

        {/* 预设系统选择器 */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.subsectionTitle}>
            主题
          </Text>
          <TouchableOpacity style={[styles.selector, { borderColor: theme.colors.outline }]}>
            <Text>跟随系统</Text>
          </TouchableOpacity>
        </View>

        {/* 预设风格 */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.subsectionTitle}>
            预设风格
          </Text>
          <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
            📌 提示：主题将根据系统呈现的深浅模式自动调整颜色，预设按钮样式设置您所偏好的标识性配色，而已
          </Text>

          {/* 主题卡片网格 */}
          <View style={styles.themeGrid}>
            {PRESET_THEMES.map((themeItem) => (
              <TouchableOpacity
                key={themeItem.id}
                style={[
                  styles.themeCard,
                  {
                    borderColor: selectedTheme === themeItem.id ? theme.colors.primary : theme.colors.outline,
                    borderWidth: selectedTheme === themeItem.id ? 2 : 1,
                  }
                ]}
                onPress={() => setSelectedTheme(themeItem.id)}
              >
                {/* 卡片顶部颜色条 */}
                <View style={styles.colorBar}>
                  <View style={[styles.colorDot, { backgroundColor: themeItem.colors[0] }]} />
                  <View style={[styles.colorDot, { backgroundColor: themeItem.colors[1] }]} />
                  <View style={[styles.colorDot, { backgroundColor: themeItem.colors[0] }]} />
                </View>
                {/* 卡片内容预览 */}
                <View style={styles.cardContent}>
                  <View style={[styles.previewBar, { backgroundColor: theme.colors.surfaceVariant }]} />
                  <View style={[styles.previewBar, { backgroundColor: theme.colors.surfaceVariant, width: '60%' }]} />
                </View>
                {/* 卡片底部名称 */}
                <Text variant="bodySmall" style={styles.themeName}>
                  {themeItem.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 全局字体大小 */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.subsectionTitle}>
            全局字体大小
          </Text>
          <View style={styles.sliderContainer}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>较小</Text>
            <Slider
              style={styles.slider}
              minimumValue={12}
              maximumValue={24}
              step={1}
              value={fontSize}
              onValueChange={setFontSize}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.surfaceVariant}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>较大</Text>
          </View>
          <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
            调整应用内所有文本的基础字体大小，影响消息、菜单及设置页面的可读性。
          </Text>
        </View>

        {/* 界面定制 */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.subsectionTitle}>
            界面定制
          </Text>

          {/* 顶栏工具栏设置 */}
          <View style={styles.listItem}>
            <View>
              <Text variant="bodyMedium">顶栏工具栏设置</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                自定义顶栏工具栏的可用功能，支持快捷启动和管理
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={{ color: theme.colors.primary }}>›</Text>
            </TouchableOpacity>
          </View>

          <Divider />

          {/* 聊天界面显示 */}
          <View style={styles.listItem}>
            <View>
              <Text variant="bodyMedium">聊天界面显示</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                自定义聊天框架元素和相关信息提示
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={{ color: theme.colors.primary }}>›</Text>
            </TouchableOpacity>
          </View>

          <Divider />

          {/* 服务过程设置 */}
          <View style={styles.listItem}>
            <View>
              <Text variant="bodyMedium">服务过程设置</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                自定义人声告警及状态反馈的方式和用户反馈内容
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={{ color: theme.colors.primary }}>›</Text>
            </TouchableOpacity>
          </View>

          <Divider />

          {/* 信息气泡管理 */}
          <View style={styles.listItem}>
            <View>
              <Text variant="bodyMedium">信息气泡管理</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                调整消息提示呈现方式和助手标识性样式
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={{ color: theme.colors.primary }}>›</Text>
            </TouchableOpacity>
          </View>

          <Divider />

          {/* 输入框工具栏定 */}
          <View style={styles.listItem}>
            <View>
              <Text variant="bodyMedium">输入框工具栏定</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                自定义输入区域可以默认配置到功能列表
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={{ color: theme.colors.primary }}>›</Text>
            </TouchableOpacity>
          </View>

          <Divider />

          {/* 输入框管理设置 */}
          <View style={styles.listItem}>
            <View>
              <Text variant="bodyMedium">输入框管理设置</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                自定义输入行的自动扩展和默认输入样式
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={{ color: theme.colors.primary }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDesc: {
    lineHeight: 20,
  },
  subsectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  hint: {
    marginTop: 8,
    lineHeight: 18,
  },
  selector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  themeCard: {
    width: '30%',
    minWidth: 100,
    aspectRatio: 1,
    borderRadius: 12,
    padding: 8,
    justifyContent: 'space-between',
  },
  colorBar: {
    flexDirection: 'row',
    gap: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardContent: {
    gap: 4,
    marginTop: 8,
  },
  previewBar: {
    height: 8,
    borderRadius: 4,
    width: '100%',
  },
  themeName: {
    marginTop: 4,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
});
