/**
 * 🔍 MathJax 诊断测试页面
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { MathJaxDebugger } from '@/components/chat/message/MathJaxDebugger';

export default function DebugMathJaxScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'MathJax 诊断',
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <MathJaxDebugger />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
