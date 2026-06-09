import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { theme } from '@/constants/theme';

const ThemeButton = ({ title, onPress, type = 'fill', titleStyle, containerStyle, disabled = false, loading = false }) => {
  const isOutline = type === 'outline';

  const getContainerStyle = () => {
    if (disabled) return { backgroundColor: theme.colors.surface.disabled };
    if (isOutline) return {
      backgroundColor: theme.colors.white,
      borderColor: theme.colors.border.action,
      borderWidth: 1,
    };
    return { backgroundColor: theme.colors.primary };
  };

  const getTitleStyle = () => {
    if (disabled) return { color: theme.colors.text.onDisabled };
    return { color: isOutline ? theme.colors.text.action : theme.colors.text.onAction };
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, getContainerStyle(), containerStyle]}
      disabled={disabled || loading}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.white} />
        ) : (
          <Text style={[styles.title, getTitleStyle(), titleStyle]}>{title}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

ThemeButton.propTypes = {
  title: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['outline', 'fill']),
  titleStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  containerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: theme.typography.fontVariants.brand.medium,
    fontSize: theme.typography.fontSize.paragraph.md,
    lineHeight: theme.typography.lineHeight.paragraph.md,
  },
});

export default ThemeButton;
