import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { theme } from '@/constants/theme';

const hideToast = () => Toast.hide();

export const toastConfig = {
  error: ({ text1, text2 }) => (
    <View style={styles.container}>
      <View style={styles.toastWrapper}>
        <View style={styles.leftContent}>
          <MaterialIcons name="warning" size={20} color={theme.colors.icon.error} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{text1}</Text>
            {text2 && <Text style={styles.message}>{text2}</Text>}
          </View>
        </View>
        <MaterialIcons name="close" size={20} color={theme.colors.icon.onAction} onPress={hideToast} />
      </View>
    </View>
  ),
  success: ({ text1, text2 }) => (
    <View style={styles.container}>
      <View style={styles.toastWrapper}>
        <View style={styles.leftContent}>
          <MaterialIcons name="check-circle" size={20} color={theme.colors.icon.success} onPress={hideToast} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{text1}</Text>
            {text2 && <Text style={styles.message}>{text2}</Text>}
          </View>
        </View>
        <MaterialIcons name="close" size={20} color={theme.colors.icon.onAction} onPress={hideToast} />
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface.inverse,
    padding: theme.spacing.md,
    borderRadius: 16,
    marginHorizontal: theme.spacing.md,
    width: '93%',
  },
  toastWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    flex: 1,
  },
  textContainer: {
    marginHorizontal: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text.onAction,
    fontWeight: theme.typography.fontVariants.secondary.regular,
    fontSize: theme.typography.fontSize.paragraph.md,
  },
  message: {
    color: theme.colors.text.onAction,
    fontWeight: theme.typography.fontVariants.secondary.regular,
    fontSize: theme.typography.fontSize.paragraph.sm,
  },
});
