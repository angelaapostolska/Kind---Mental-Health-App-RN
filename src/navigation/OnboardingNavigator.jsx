import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '@/constants/theme';
import { useAppDispatch } from '@/store/store';
import { setHideOnboarding, setUserName, setSelectedAnimal } from '@/store/commonSlices/appSlice';

const ANIMALS = [
  { id: 'cat', name: 'Mochi', emoji: '🐱', desc: 'Calm & curious' },
  { id: 'dog', name: 'Buddy', emoji: '🐶', desc: 'Loyal & cheerful' },
  { id: 'bunny', name: 'Luna', emoji: '🐰', desc: 'Gentle & kind' },
];

const FEATURES = [
  { icon: 'star-four-points', label: 'Track your mood daily' },
  { icon: 'heart', label: 'Build healthy habits' },
  { icon: 'weather-windy', label: 'Guided breathing & meditation' },
  { icon: 'notebook-outline', label: 'Reflective journaling prompts' },
];

const OnboardingNavigator = () => {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState(0);
  const [selectedAnimal, setSelectedAnimalLocal] = useState('cat');
  const [name, setName] = useState('');

  const selectedAnimalData = ANIMALS.find((a) => a.id === selectedAnimal);

  const complete = () => {
    const trimmedName = name.trim() || 'Friend';
    dispatch(setUserName(trimmedName));
    dispatch(setSelectedAnimal(selectedAnimal));
    dispatch(setHideOnboarding(true));
  };

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      {step === 0 && (
        <ScrollView contentContainerStyle={styles.stepContent}>
          <Text style={styles.bigEmoji}>🧠</Text>
          <Text style={styles.stepTitle}>Welcome to Kind</Text>
          <Text style={styles.stepSub}>
            Your personal wellness companion. Track moods, build habits, and find your calm.
          </Text>

          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons name={f.icon} size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(1)}>
            <Text style={styles.nextBtnText}>Get Started</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Choose Your Guide</Text>
          <Text style={styles.stepSub}>Pick a companion for your wellness journey</Text>

          <View style={styles.animalRow}>
            {ANIMALS.map((animal) => (
              <TouchableOpacity
                key={animal.id}
                onPress={() => setSelectedAnimalLocal(animal.id)}
                style={[styles.animalCard, selectedAnimal === animal.id && styles.animalCardActive]}
              >
                <Text style={styles.animalEmoji}>{animal.emoji}</Text>
                <Text style={styles.animalName}>{animal.name}</Text>
                <Text style={styles.animalDesc}>{animal.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
            <Text style={styles.nextBtnText}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.bigEmoji}>{selectedAnimalData.emoji}</Text>
          <Text style={styles.stepTitle}>What's your name?</Text>
          <Text style={styles.stepSub}>{selectedAnimalData.name} wants to get to know you!</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={theme.colors.text.secondary}
            style={styles.nameInput}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.nextBtn, !name.trim() && { opacity: 0.5 }]}
            onPress={() => { if (name.trim()) complete(); }}
            disabled={!name.trim()}
          >
            <Text style={styles.nextBtnText}>Let's Begin</Text>
            <MaterialCommunityIcons name="star-four-points" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface.two,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
  },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.surface.three },
  dotActive: { width: 24, backgroundColor: theme.colors.primary },
  stepContent: { flex: 1, alignItems: 'center' },
  bigEmoji: { fontSize: 64, marginBottom: theme.spacing.md },
  stepTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text.primary, textAlign: 'center' },
  stepSub: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  featureList: { width: '100%', gap: 10, marginBottom: 32 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface.one,
    borderRadius: 16,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surface.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text.primary },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingVertical: 16,
    width: '100%',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 'auto',
    marginBottom: 24,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  animalRow: { flexDirection: 'row', gap: 10, marginBottom: 24, width: '100%' },
  animalCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 20,
    backgroundColor: theme.colors.surface.one,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  animalCardActive: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface.brandPrimary,
  },
  animalEmoji: { fontSize: 40, marginBottom: 6 },
  animalName: { fontSize: 14, fontWeight: '700', color: theme.colors.text.primary },
  animalDesc: { fontSize: 10, color: theme.colors.text.secondary, textAlign: 'center' },
  nameInput: {
    width: '100%',
    backgroundColor: theme.colors.surface.one,
    borderRadius: 16,
    padding: theme.spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border.one,
    marginBottom: 24,
  },
});

export default OnboardingNavigator;
