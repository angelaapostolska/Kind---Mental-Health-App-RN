// src/components/home/SoftGlass.jsx
//
// Home-screen-only refinement of the pastel glass look, tuned to match the
// reference mockup. Kept LOCAL to components/home so the shared Glass.jsx (and the
// Mood / Journal / Breathe / Profile tabs) stays untouched.
//
// v2 changes:
//   • deeper, bottom-weighted card shadows (were barely visible)
//   • sparkles are back — a few per card, placed from a per-card `seed` so each
//     card gets a different (but render-stable) scatter
//   • fixed the lingering "square" on cards: the elevated wrapper now carries a
//     background + the rounded corners are owned solely by the clip, so Android's
//     elevation shadow is rounded instead of drawing a square halo, and there's no
//     radius seam between the gradient layers and the card edge.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { pastel } from '@/components';

// blend a hex color toward white by `amt` (0..1)
const mixWhite = (hex, amt) => {
  const h = (hex || '#9C7BEA').replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * amt);
  const to = (c) => c.toString(16).padStart(2, '0');
  return `#${to(mix(r))}${to(mix(g))}${to(mix(b))}`;
};

// tiny deterministic PRNG so a given seed always lays the sparkles down the same way
const rng = (seed) => {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Sparkles ────────────────────────────────────────────────────────────────────
const Sparkles = ({ seed = 1, count = 4, dim }) => {
  const items = React.useMemo(() => {
    const r = rng(Math.imul(seed, 2654435761));
    return Array.from({ length: count }).map(() => ({
      left: 8 + r() * 82,     // %
      top: 6 + r() * 58,      // %
      size: 7 + Math.round(r() * 7),
      opacity: (dim ? 0.35 : 0.5) + r() * 0.35,
    }));
  }, [seed, count, dim]);

  return (
    <>
      {items.map((it, i) => (
        <MaterialCommunityIcons
          key={i}
          name="star-four-points"
          size={it.size}
          color="#fff"
          pointerEvents="none"
          style={{ position: 'absolute', left: `${it.left}%`, top: `${it.top}%`, opacity: it.opacity }}
        />
      ))}
    </>
  );
};

// ── Frosted card ────────────────────────────────────────────────────────────────
export const SoftCard = ({ children, style, radius = 24, fill, noPad, seed = 1, sparkleCount = 4, ...rest }) => (
  // wrapper carries the shadow + a background so the (Android) elevation shadow is
  // rounded, not square. The inner clip owns the rounded corners for everything else.
  <View style={[s.shadow, { borderRadius: radius, backgroundColor: 'rgba(255,255,255,0.55)' }, style]} {...rest}>
    <View style={[s.clip, { borderRadius: radius }]}>
      {/* translucent frosted base */}
      <LinearGradient
        colors={fill || ['rgba(255,255,255,0.58)', 'rgba(255,255,255,0.40)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* soft top-edge sheen — fades out by ~40% (no bright patch in the middle) */}
      <LinearGradient
        colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* gentle top-left corner glow */}
      <LinearGradient
        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.45, y: 0.42 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <Sparkles seed={seed} count={sparkleCount} />
      {/* white inner-glow ring */}
      <View style={[s.ring, { borderRadius: radius }]} pointerEvents="none" />
      <View style={noPad ? null : s.pad}>{children}</View>
    </View>
  </View>
);

// ── Vivid gradient hero card (affirmation / mood) ───────────────────────────────
export const SoftHeroCard = ({
                               children,
                               style,
                               radius = 28,
                               colors = [pastel.heroPink, pastel.heroPurple, pastel.heroBlue],
                               seed = 1,
                               sparkleCount = 4,
                               ...rest
                             }) => (
  <View style={[s.shadow, s.heroShadow, { borderRadius: radius, backgroundColor: colors[Math.min(1, colors.length - 1)] }, style]} {...rest}>
    <View style={[s.clip, { borderRadius: radius }]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.85 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* top-edge sheen */}
      <LinearGradient
        colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* soft top-left corner glow */}
      <LinearGradient
        colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 0.45 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <Sparkles seed={seed} count={sparkleCount} dim />
      <View style={[s.heroRing, { borderRadius: radius }]} pointerEvents="none" />
      <View style={s.pad}>{children}</View>
    </View>
  </View>
);

// ── Clay icon badge ─────────────────────────────────────────────────────────────
const ICON_TINT = {
  purple:   { sat: '#9C7BEA', light: '#C9B4F5', shadow: '#8A63DE' },
  pink:     { sat: '#FF8FB0', light: '#FFC4D7', shadow: '#F4719A' },
  mint:     { sat: '#43D6B5', light: '#93EDDA', shadow: '#23B89F' },
  blue:     { sat: '#88B6F2', light: '#C5DCFB', shadow: '#5FA0EE' },
  lavender: { sat: '#B79CF2', light: '#DECEF9', shadow: '#9C7BEA' },
};

export const SoftIcon = ({
                           size = 44,
                           radius,            // omit → circle
                           tint = 'purple',
                           baseColor,         // OR pass any hex to derive the gradient from it
                           children,
                           style,
                         }) => {
  const t = ICON_TINT[tint] || ICON_TINT.purple;
  const r = radius != null ? radius : size / 2;
  const colors = baseColor ? [baseColor, mixWhite(baseColor, 0.65)] : [t.sat, t.light];
  const shadowColor = baseColor || t.shadow;

  return (
    <View
      style={[
        {
          borderRadius: r,
          shadowColor,
          shadowOpacity: 0.42,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 5 },
          elevation: 6,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          width: size, height: size, borderRadius: r,
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)',
        }}
      >
        {/* glossy highlight near the top */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: size * 0.07, alignSelf: 'center',
            width: size * 0.72, height: size * 0.4, borderRadius: size * 0.36,
            backgroundColor: 'rgba(255,255,255,0.42)',
          }}
        />
        {children}
      </LinearGradient>
    </View>
  );
};

const s = StyleSheet.create({
  // CHANGED: deeper, bottom-weighted shadow (was opacity 0.16 / radius 14)
  shadow: {
    shadowColor: pastel.purpleDeep,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 9,
    marginBottom: 18,
  },
  heroShadow: { shadowOpacity: 0.36, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  clip: { overflow: 'hidden' },
  pad: { padding: 18 },
  ring: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.82)',
  },
  heroRing: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
});