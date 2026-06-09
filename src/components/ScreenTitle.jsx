import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { theme } from '@/constants/theme';

const ScreenTitle = ({ title, containerStyle }) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

ScreenTitle.propTypes = {
  title: PropTypes.string.isRequired,
  containerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

const styles = StyleSheet.create({
  container: {},
  title: {
    fontWeight: theme.typography.fontVariants.secondary.semibold,
    fontSize: theme.typography.fontSize.heading.sm,
    color: theme.colors.text.actionHover,
  },
});

export default ScreenTitle;
