// Pastel "glass" design system — frosted-glass cards + gradient hero cards.
// Built for the Home screen overhaul; reusable on other screens later.
//
// Requires: expo-linear-gradient
//   npx expo install expo-linear-gradient
//
// CHANGED: dropped expo-blur. Its BlurView falls back to a flat opaque white
// rectangle when real-time blur isn't available on the device (this is exactly
// the bug reported — cards showing a plain white block instead of glass). The
// translucent-gradient fill below gives the same frosted look reliably on every
// platform, with no native blur dependency at all.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// ── Token system ──────────────────────────────────────────────────────────────
// CHANGED: settled on a clear 3-tier saturation hierarchy so nothing reads as
// flatly "white" anymore —
//   1) hero cards (affirmation/mood)  → most vivid, so white text has real contrast
//   2) page background                → clearly colorful, one notch softer than hero
//   3) glass cards (week/habits/med)  → translucent, tinted by what's behind them
export const pastel = {
  pink: '#FF9EBF',
  pinkSoft: '#FFD3E2',
  coral: '#FFB199',
  purple: '#B79CF2',
  purpleDeep: '#9C7BEA',
  blue: '#A8C8F5',
  blueSoft: '#D6E4FB',
  mint: '#5FE3C4',
  mintDeep: '#22B8A0',

  // tier 1 — vivid hero fill, deep/rich enough that white text has real contrast.
  heroPink: '#FF6FA3',
  heroPurple: '#9B6EF0',
  heroBlue: '#5FA0EE',

  // tier 2 — page background, clearly colorful, one notch softer than the hero tier.
  bgTop: '#FFB3D1',
  bgMid: '#CDAEF2',
  bgBottom: '#A6C9F7',

  // CHANGED: light gradient for the floating tab bar — lighter than the page
  // background (so it still reads as a distinct "chrome" element, like a pale
  // glass pill sitting on top), but with enough visible color to actually pop
  // against a plain white bar instead of disappearing into one.
  navPink: '#FFD9EC',
  navPurple: '#E3D2FA',
  navBlue: '#CFE3FC',

  textDeep: '#4A2E7A',
  textMuted: '#7E6FA3',

  glassFill: 'rgba(255,255,255,0.50)',
  glassFillStrong: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.65)',
};

const GLOW = {
  pink: pastel.pink,
  purple: pastel.purpleDeep,
  mint: pastel.mintDeep,
  none: 'transparent',
};

// per-glow pale tint for the GlassCard fill — a translucent wash of the
// background's own hues (rather than flat white), so cards read as genuinely
// "glass" (you can see color through them) and stay thematically tied to their glow.
const TINT = {
  purple: ['rgba(199,168,242,0.68)', 'rgba(255,255,255,0.40)'],
  mint:   ['rgba(150,235,210,0.68)', 'rgba(255,255,255,0.40)'],
  pink:   ['rgba(255,176,205,0.68)', 'rgba(255,255,255,0.40)'],
  none:   ['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.40)'],
};

// ── Screen background ─────────────────────────────────────────────────────────
// CHANGED: was a diagonal from (0.1,0) to (0.9,1) — but on a tall, narrow phone
// screen the vertical distance traveled dwarfs the horizontal one, so a "diagonal"
// in normalized coordinates still reads as almost purely top-to-bottom. This is
// now genuinely left-to-right (y barely moves), matching the reference.
export const ScreenGradientBackground = () => (
  <LinearGradient
    colors={[pastel.bgTop, pastel.bgMid, pastel.bgBottom]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0.12 }}
    style={StyleSheet.absoluteFillObject}
  />
);

// ── Decorative shine ───────────────────────────────────────────────────────────
// Small reusable bits used inside both card types so everything picks up the
// "bubbly/shiny" quality from the reference — a soft round light-bloom tucked in
// a corner, plus a couple of tiny twinkle accents.
const Sparkle = ({ top, left, right, bottom, size = 13, opacity = 0.75 }) => (
  <MaterialCommunityIcons
    name="star-four-points"
    size={size}
    color="#fff"
    style={{ position: 'absolute', top, left, right, bottom, opacity }}
    pointerEvents="none"
  />
);

const GlossBlob = ({ size = 90, top = -28, left = -22, opacity = 0.4 }) => (
  <View
    pointerEvents="none"
    style={{
      position: 'absolute', top, left,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(255,255,255,1)', opacity,
    }}
  />
);

const CardShine = ({ sparkleColorDim }) => (
  <>
    <GlossBlob />
    <Sparkle top={18} right={22} size={14} opacity={sparkleColorDim ? 0.55 : 0.85} />
    <Sparkle bottom={26} right={44} size={9} opacity={sparkleColorDim ? 0.4 : 0.6} />
  </>
);

// ── Glossy icon bubble ──────────────────────────────────────────────────────────
// A round icon badge with a soft highlight peeking from the top-left, instead of
// a flat single-color circle — matches the Journal/Habits icon circles in the
// reference, which have a visible glossy "bubble" highlight rather than flat fill.
export const GlossyCircle = ({ size = 40, backgroundColor, children, style }) => (
  <View
    style={[
      { width: size, height: size, borderRadius: size / 2, backgroundColor, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
      style,
    ]}
  >
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', top: -size * 0.05, left: -size * 0.05,
        width: size * 0.95, height: size * 0.95, borderRadius: size * 0.475,
        backgroundColor: 'rgba(255,255,255,0.55)',
      }}
    />
    {children}
  </View>
);

// ── Frosted glass card ─────────────────────────────────────────────────────────
// Two nested views: outer carries the soft colored glow (shadow), inner clips
// the gradient fill + sheen + content to the rounded corners (overflow:hidden
// would otherwise also clip — and kill — the outer shadow).
// CHANGED: fill is a translucent white→soft-lavender gradient, not a BlurView.
export const GlassCard = ({ children, style, glow = 'purple', radius = 24, noPad, ...rest }) => (
  // CHANGED: outer borderRadius now always matches the inner `radius` prop —
  // previously hardcoded to 24 regardless of `radius`, which on cards using a
  // different radius left the shadow's corner-rounding slightly mismatched from
  // the visible card, reading as a faint square peeking through the corners.
  <View style={[ggStyles.shadowWrap, { borderRadius: radius, shadowColor: GLOW[glow] || GLOW.purple }, style]} {...rest}>
    <View style={[ggStyles.clip, { borderRadius: radius }]}>
      <LinearGradient
        colors={TINT[glow] || TINT.purple}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
      />
      {/* Reflection sheen — top-left to mid, fading out */}
      <LinearGradient
        colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.6, y: 0.7 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
      />
      <CardShine />
      <View style={[ggStyles.border, { borderRadius: radius }]} />
      <View style={noPad ? null : ggStyles.padding}>{children}</View>
    </View>
  </View>
);

// ── Gradient hero card ─────────────────────────────────────────────────────────
// The signature "weather mood" treatment: a diagonal pastel gradient with a
// glass sheen + light edge, used for the affirmation and mood cards.
export const GradientHeroCard = ({
                                   children,
                                   style,
                                   colors = [pastel.heroPink, pastel.heroPurple, pastel.heroBlue],
                                   glow = 'purple',
                                   radius = 28,
                                   ...rest
                                 }) => (
  // CHANGED: same borderRadius-mismatch fix as GlassCard — this was the more
  // visible instance of the bug, since GradientHeroCard's inner radius (28)
  // never matched the outer shadow's hardcoded 24.
  <View style={[ggStyles.shadowWrap, ggStyles.heroShadow, { borderRadius: radius, shadowColor: GLOW[glow] || GLOW.purple }, style]} {...rest}>
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[ggStyles.clip, { borderRadius: radius }]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.55, y: 0.65 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
      />
      <CardShine sparkleColorDim />
      <View style={[ggStyles.heroBorder, { borderRadius: radius }]} />
      <View style={ggStyles.padding}>{children}</View>
    </LinearGradient>
  </View>
);

const ggStyles = StyleSheet.create({
  shadowWrap: {
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    marginBottom: 16,
  },
  heroShadow: { shadowOpacity: 0.32, shadowRadius: 22, elevation: 8 },
  clip: { overflow: 'hidden' },
  border: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1, borderColor: pastel.glassBorder,
  },
  heroBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  padding: { padding: 18 },
});