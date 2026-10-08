import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { CareIcon } from '@/components/care-icon';
import { AppText } from '@/components/text';
import { BorderRadius } from '@/constants/border-radius';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

const SPLASH_DELAY_MS = 2400;

export default function SplashRoute() {
  const router = useRouter();
  const [breath] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    animation.start();
    const timer = setTimeout(() => router.replace('/login'), SPLASH_DELAY_MS);
    return () => { clearTimeout(timer); animation.stop(); };
  }, [router, breath]);

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.top}><View style={styles.badge}><View style={styles.dot} /><AppText style={styles.badgeText}>CAMPUS CARE SANCTUARY</AppText></View></View>
          <View style={styles.center}>
            <View style={styles.glow}><Image source={{ uri: glowArt }} style={StyleSheet.absoluteFill} /><View style={styles.logo}><CareIcon name="leaf" size={62} color={Colors.careAccent} /></View></View>
            <AppText variant="heading" style={styles.title}>MindEase</AppText>
            <AppText variant="caption" style={styles.subtitle}>Campus Care &amp; Student Well-being</AppText>
            <AppText variant="caption" style={styles.support}>Your mental health sanctuary on campus</AppText>
            <View style={styles.breathing}>
              <Animated.View style={[styles.breathCircle, { opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] }) }] }]}><CareIcon name="leaf" size={18} color={Colors.careAccent} /></Animated.View>
              <AppText variant="caption" style={styles.breathText}>Taking a deep breath...</AppText>
            </View>
          </View>
          <View style={styles.footer}>
            {/* Reference branding copy; partnership and encryption claims need institutional verification before release. */}
            <View style={styles.badge}><CareIcon name="shield" size={12} /><AppText style={styles.badgeText}>100% Confidential • In Partnership with UHS</AppText></View>
            <AppText style={styles.version}>v1.0.0  •  Your campus wellbeing space</AppText>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.careBackground },
  scroll: { flexGrow: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 400, alignSelf: 'center', minHeight: 480 },
  top: { alignItems: 'center', paddingTop: Spacing.xlarge, paddingBottom: Spacing.large },
  badge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xsmall, backgroundColor: Colors.careBadge, borderRadius: BorderRadius.round, paddingHorizontal: Spacing.small, paddingVertical: Spacing.xsmall },
  badgeText: { fontSize: 12, lineHeight: 16, color: Colors.careMuted, textAlign: 'center' },
  dot: { width: 6, height: 6, borderRadius: BorderRadius.round, backgroundColor: Colors.careGreen },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.small, paddingVertical: Spacing.large },
  glow: { width: 220, height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.small },
  logo: { width: 116, height: 116, borderRadius: BorderRadius.large, backgroundColor: Colors.carePale, alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px ${Colors.careShadow}` },
  title: { color: Colors.careAccent },
  subtitle: { color: Colors.careAccent, textAlign: 'center' },
  support: { maxWidth: 230, textAlign: 'center', color: Colors.careMuted },
  breathing: { alignItems: 'center', gap: Spacing.medium, marginTop: Spacing.xlarge },
  breathCircle: { width: 36, height: 36, borderRadius: BorderRadius.round, borderWidth: 4, borderColor: Colors.carePale, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  breathText: { fontSize: 12, color: Colors.careMuted },
  footer: { alignItems: 'center', gap: Spacing.small, paddingVertical: Spacing.xlarge },
  version: { fontSize: 12, color: Colors.careMuted },
});

const glowArt = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 190"><defs><radialGradient id="glow"><stop stop-color="${Colors.careAccent}" stop-opacity=".35"/><stop offset="1" stop-color="${Colors.careBackground}" stop-opacity="0"/></radialGradient></defs><ellipse cx="110" cy="95" rx="110" ry="95" fill="url(#glow)"/></svg>`);
