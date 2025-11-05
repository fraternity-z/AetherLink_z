import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, TouchableRipple, useTheme, Avatar } from 'react-native-paper';

export interface ThemePreview {
  header: string;
  track: string;
  body: string;
  accents: string[];
  icon?: string;
}

interface Props {
  title: string;
  selected?: boolean;
  onPress?: () => void;
  preview: ThemePreview;
}

export function ThemeStyleCard({ title, selected, onPress, preview }: Props) {
  const theme = useTheme();
  return (
    <TouchableRipple onPress={onPress} borderless style={{ borderRadius: 12 }}>
      <Card style={[styles.card, selected && { borderColor: theme.colors.primary, borderWidth: 2 }]}
        mode="outlined">
        <View style={styles.previewBox}>
          <View style={[styles.headerBar, { backgroundColor: preview.header }]} />
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: preview.track }]} />
            <View style={[styles.shortBar, { backgroundColor: preview.track }]} />
          </View>
          <View style={[styles.line, { backgroundColor: preview.body }]} />
          <View style={[styles.line, { backgroundColor: preview.body, width: '60%' }]} />
        </View>
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {preview.icon ? (
              <Avatar.Icon size={20} icon={preview.icon as any} style={{ marginRight: 6 }} />
            ) : null}
            <Text variant="bodyMedium">{title}</Text>
          </View>
          <View style={styles.accentsRow}>
            {preview.accents.map((c, i) => (
              <View key={i} style={[styles.accentDot, { backgroundColor: c }]} />
            ))}
          </View>
        </View>
      </Card>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    marginRight: 12,
    borderRadius: 12,
  },
  previewBox: {
    padding: 10,
    paddingBottom: 6,
  },
  headerBar: {
    height: 14,
    borderRadius: 6,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  shortBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
  },
  line: {
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accentsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});

export default ThemeStyleCard;
