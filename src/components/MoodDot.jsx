import React from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { moodColor } from '@/utils';

const MoodDot = ({ level, size = 12 }) => (
  <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: moodColor(level) }]} />
);

MoodDot.propTypes = {
  level: PropTypes.number.isRequired,
  size: PropTypes.number,
};

const styles = StyleSheet.create({
  dot: {},
});

export default MoodDot;
