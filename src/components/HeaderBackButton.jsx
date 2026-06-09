import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { theme } from '@/constants/theme';

const HeaderBackButton = ({ onPress }) => {
  return (
    <TouchableOpacity activeOpacity={0.6} style={styles.container} onPress={onPress}>
      <MaterialIcons name="arrow-back" size={24} color={theme.colors.icon.primary} />
      <Text style={styles.text}>Back</Text>
    </TouchableOpacity>
  );
};

HeaderBackButton.propTypes = {
  onPress: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  text: {
    fontWeight: theme.typography.fontVariants.brand.semibold,
    fontSize: theme.typography.fontSize.paragraph.md,
    color: theme.colors.text.secondary,
  },
});

export default HeaderBackButton;
