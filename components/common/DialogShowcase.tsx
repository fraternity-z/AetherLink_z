/**
 * 📱 弹窗组件展示页面
 *
 * 用于展示和测试所有弹窗样式
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme, Divider } from 'react-native-paper';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

export function DialogShowcase() {
  const theme = useTheme();
  const { alert, confirmAction, prompt, confirm } = useConfirmDialog();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          弹窗组件展示
        </Text>

        {/* 确认对话框示例 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              ConfirmDialog - 确认对话框
            </Text>
            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              onPress={() => alert('提示', '这是一个简单的提示对话框')}
              style={styles.button}
            >
              简单提示 (Alert)
            </Button>

            <Button
              mode="outlined"
              onPress={() =>
                confirmAction(
                  '删除确认',
                  '确定要删除这个项目吗？删除后不可恢复。',
                  () => console.log('已确认删除'),
                  {
                    confirmText: '删除',
                    cancelText: '取消',
                    destructive: true,
                  }
                )
              }
              style={styles.button}
            >
              危险操作 (Destructive)
            </Button>

            <Button
              mode="outlined"
              onPress={() =>
                confirm({
                  title: '保存更改',
                  message: '您有未保存的更改，是否要保存？',
                  icon: {
                    name: 'content-save',
                    type: 'material-community',
                    color: '#4CAF50',
                  },
                  buttons: [
                    { text: '不保存', style: 'cancel' },
                    { text: '取消', style: 'default' },
                    {
                      text: '保存',
                      style: 'default',
                      onPress: () => console.log('已保存'),
                    },
                  ],
                })
              }
              style={styles.button}
            >
              多按钮对话框
            </Button>

            <Button
              mode="outlined"
              onPress={() =>
                confirm({
                  title: '警告',
                  message: '系统检测到异常活动，请检查您的账户安全。',
                  icon: {
                    name: 'shield-alert',
                    type: 'material-community',
                    color: '#FFA726',
                  },
                  buttons: [
                    { text: '稍后处理', style: 'cancel' },
                    {
                      text: '立即查看',
                      style: 'default',
                      onPress: () => console.log('查看详情'),
                    },
                  ],
                })
              }
              style={styles.button}
            >
              自定义图标和颜色
            </Button>
          </Card.Content>
        </Card>

        {/* 输入对话框示例 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              InputDialog - 输入对话框
            </Text>
            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              onPress={() =>
                prompt({
                  title: '重命名',
                  placeholder: '请输入新名称',
                  defaultValue: '示例项目',
                  onConfirm: (value) => {
                    console.log('新名称:', value);
                    alert('成功', `已重命名为: ${value}`);
                  },
                })
              }
              style={styles.button}
            >
              简单输入
            </Button>

            <Button
              mode="outlined"
              onPress={() =>
                prompt({
                  title: '设置用户名',
                  placeholder: '请输入用户名（3-15个字符）',
                  maxLength: 15,
                  icon: {
                    name: 'account',
                    type: 'material-community',
                    color: theme.colors.primary,
                  },
                  validation: (value) => {
                    if (value.length < 3) {
                      return { valid: false, error: '用户名至少需要3个字符' };
                    }
                    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                      return {
                        valid: false,
                        error: '只能包含字母、数字和下划线',
                      };
                    }
                    return { valid: true };
                  },
                  onConfirm: (value) => {
                    console.log('用户名:', value);
                    alert('成功', `用户名已设置为: ${value}`);
                  },
                })
              }
              style={styles.button}
            >
              带验证的输入
            </Button>

            <Button
              mode="outlined"
              onPress={() =>
                prompt({
                  title: '添加备注',
                  message: '请详细描述您的想法和建议',
                  placeholder: '在此输入备注内容...',
                  multiline: true,
                  maxLength: 200,
                  icon: {
                    name: 'note-text',
                    type: 'material-community',
                    color: '#9C27B0',
                  },
                  onConfirm: (value) => {
                    console.log('备注:', value);
                    alert('成功', '备注已保存');
                  },
                })
              }
              style={styles.button}
            >
              多行输入
            </Button>

            <Button
              mode="outlined"
              onPress={() =>
                prompt({
                  title: '输入邮箱',
                  placeholder: 'your@email.com',
                  icon: {
                    name: 'email',
                    type: 'material-community',
                    color: '#2196F3',
                  },
                  validation: (value) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!value.trim()) {
                      return { valid: false, error: '邮箱不能为空' };
                    }
                    if (!emailRegex.test(value)) {
                      return { valid: false, error: '邮箱格式不正确' };
                    }
                    return { valid: true };
                  },
                  onConfirm: async (email) => {
                    console.log('邮箱:', email);
                    // 模拟异步操作
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    alert('成功', `邮箱 ${email} 已验证`);
                  },
                })
              }
              style={styles.button}
            >
              异步验证和处理
            </Button>
          </Card.Content>
        </Card>

        {/* 组合示例 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              组合示例
            </Text>
            <Divider style={styles.divider} />

            <Button
              mode="contained"
              onPress={() => {
                confirmAction(
                  '删除确认',
                  '确定要删除此项目吗？',
                  () => {
                    prompt({
                      title: '验证操作',
                      message: '请输入项目名称以确认删除',
                      placeholder: '项目名称',
                      validation: (value) => ({
                        valid: value === '示例项目',
                        error: '项目名称不匹配',
                      }),
                      onConfirm: () => {
                        alert('成功', '项目已删除');
                      },
                    });
                  },
                  { destructive: true }
                );
              }}
              style={styles.button}
              buttonColor={theme.colors.error}
            >
              多步骤确认删除
            </Button>
          </Card.Content>
        </Card>

        <Text variant="bodySmall" style={styles.footer}>
          💡 提示：这些弹窗会自动适配应用主题和深色模式
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 12,
  },
  footer: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 8,
    marginBottom: 32,
  },
});
