import React, { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { theme } from '@/constants/theme';

const ThemeInput = forwardRef(
  ({ value, placeholder, onChangeText, containerStyle, inputStyle, placeholderStyle, isValid = true, isSuccess = false, errorMessage, ...props }, ref) => {
    return (
      <View>
        <View style={[styles.container, containerStyle, !isValid && styles.containerError, isSuccess && styles.containerSuccess]}>
          {!value ? <Text style={[styles.placeholder, placeholderStyle]}>{placeholder}</Text> : null}
          <TextInput ref={ref} value={value} onChangeText={onChangeText} style={[styles.input, inputStyle]} {...props} />
        </View>
        {errorMessage && <Text style={styles.errorMessage}>{errorMessage}</Text>}
      </View>
    );
  },
);

ThemeInput.displayName = 'ThemeInput';

ThemeInput.propTypes = {
  value: PropTypes.string,
  placeholder: PropTypes.string,
  onChangeText: PropTypes.func.isRequired,
  containerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  inputStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  placeholderStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  isValid: PropTypes.bool,
  isSuccess: PropTypes.bool,
  errorMessage: PropTypes.string,
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: theme.colors.surface.one,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.three,
    paddingVertical: theme.spacing.xxs,
  },
  containerError: {
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.text.error,
  },
  containerSuccess: {
    borderBottomWidth: 3,
    borderBottomColor: '#27ae60',
  },
  input: {
    fontSize: theme.typography.fontSize.paragraph.md,
    fontWeight: theme.typography.fontVariants.secondary.regular,
    color: theme.colors.text.secondary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  placeholder: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.paragraph.md,
    fontWeight: theme.typography.fontVariants.secondary.regular,
    lineHeight: theme.typography.lineHeight.paragraph.md,
  },
  errorMessage: {
    fontWeight: theme.typography.fontVariants.secondary.semibold,
    fontSize: theme.typography.fontSize.label.xs,
    color: theme.colors.text.error,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
});

export default ThemeInput;
