import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { theme } from '@/constants/theme';

const hideToast = () => Toast.hide();

export const toastConfig = {
  error: ({ text1, text2 }) => (
    <View style={[styles.container, styles.errorContainer]}>
      <View style={styles.toastWrapper}>
        <View style={styles.leftContent}>
          <MaterialIcons name="warning" size={20} color={theme.colors.icon.error} />
          <View style={styles.textContainer}>
            <Text style={[styles.title, styles.errorText]}>{text1}</Text>
            {text2 && <Text style={[styles.message, styles.errorText]}>{text2}</Text>}
          </View>
        </View>
        <MaterialIcons name="close" size={20} color={theme.colors.icon.error} onPress={hideToast} />
      </View>
    </View>
  ),
  success: ({ text1, text2 }) => (
    <View style={[styles.container, styles.successContainer]}>
      <View style={styles.toastWrapper}>
        <View style={styles.leftContent}>
          <MaterialIcons name="check-circle" size={20} color={theme.colors.icon.action} onPress={hideToast} />
          <View style={styles.textContainer}>
            <Text style={[styles.title, styles.successText]}>{text1}</Text>
            {text2 && <Text style={[styles.message, styles.successText]}>{text2}</Text>}
          </View>
        </View>
        <MaterialIcons name="close" size={20} color={theme.colors.icon.action} onPress={hideToast} />
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    borderRadius: 16,
    marginHorizontal: theme.spacing.md,
    width: '93%',
    borderWidth: 1,
  },
  successContainer: {
    backgroundColor: theme.colors.surface.brandPrimary,
    borderColor: theme.colors.border.action,
  },
  errorContainer: {
    backgroundColor: theme.colors.surface.error,
    borderColor: theme.colors.border.error,
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
    fontWeight: theme.typography.fontVariants.secondary.regular,
    fontSize: theme.typography.fontSize.paragraph.md,
  },
  message: {
    fontWeight: theme.typography.fontVariants.secondary.regular,
    fontSize: theme.typography.fontSize.paragraph.sm,
  },
  successText: {
    color: theme.colors.text.action,
  },
  errorText: {
    color: theme.colors.text.error,
  },
});