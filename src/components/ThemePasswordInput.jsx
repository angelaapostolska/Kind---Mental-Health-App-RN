import React, { forwardRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import PropTypes from 'prop-types';
import { theme } from '@/constants/theme';

const ThemePasswordInput = forwardRef(
  ({ value, onChangeText, placeholder, containerStyle, inputStyle, disabled, isValid = true, isSuccess = false, errorMessage, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <View>
        <View style={[styles.container, containerStyle, !isValid && styles.containerError, isSuccess && styles.containerSuccess]}>
          {!value ? <Text style={styles.placeholder}>{placeholder}</Text> : null}
          <TextInput
            ref={ref}
            secureTextEntry={!isVisible}
            value={value}
            onChangeText={onChangeText}
            style={[styles.input, inputStyle]}
            {...props}
          />
          <TouchableOpacity activeOpacity={0.6} onPress={() => setIsVisible((prev) => !prev)}>
            <MaterialCommunityIcons name={`eye${isVisible ? '-off' : ''}`} size={24} color={theme.colors.text.secondary} style={styles.eye} />
          </TouchableOpacity>
        </View>
        {errorMessage && <Text style={styles.errorMessage}>{errorMessage}</Text>}
      </View>
    );
  },
);

ThemePasswordInput.displayName = 'ThemePasswordInput';

ThemePasswordInput.propTypes = {
  value: PropTypes.string,
  onChangeText: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  containerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  inputStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  disabled: PropTypes.bool,
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
    paddingRight: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flex: 1,
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
  eye: { marginRight: theme.spacing.xxs },
  errorMessage: {
    fontWeight: theme.typography.fontVariants.secondary.semibold,
    fontSize: theme.typography.fontSize.label.xs,
    color: theme.colors.text.error,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
});

export default ThemePasswordInput;
