import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const ROTATING_SUBTITLES = [
  'Trusted Home Services',
  'Skilled Professionals',
  'Easy Household Solutions',
  'All Your Home Needs in One Place',
];

const FEATURES = [
  {
    icon: 'shield-check' as const,
    iconBg: 'bg-blue-50',
    iconColor: '#1D4ED8',
    title: 'Trusted Professionals',
    detail: 'Connect with verified and skilled service professionals.',
  },
  {
    icon: 'lightning-bolt' as const,
    iconBg: 'bg-amber-50',
    iconColor: '#B45309',
    title: 'Easy Service Access',
    detail: 'Explore household services from one convenient application.',
  },
  {
    icon: 'home' as const,
    iconBg: 'bg-teal-50',
    iconColor: '#0D9488',
    title: 'Home Services in One App',
    detail: 'Find plumbing, electrical, cleaning, carpentry, AC services, and more.',
  },
];

const SERVICES = [
  { name: 'Plumbing', icon: 'pipe-wrench' as const, color: '#1D4ED8', bg: '#DBEAFE' },
  { name: 'Electrical', icon: 'flash' as const, color: '#B45309', bg: '#FEF3C7' },
  { name: 'Cleaning', icon: 'spray-bottle' as const, color: '#0D9488', bg: '#CCFBF1' },
  { name: 'Carpentry', icon: 'hammer' as const, color: '#7C2D12', bg: '#FFEDD5' },
  { name: 'AC Service', icon: 'snowflake' as const, color: '#0284C7', bg: '#E0F2FE' },
];

type Edge = `${number}%`;

const ORBIT_BADGES = [
  { icon: 'pipe-wrench' as const, color: '#1D4ED8', left: '4%' as Edge, top: '6%' as Edge },
  { icon: 'flash' as const, color: '#B45309', right: '4%' as Edge, top: '6%' as Edge },
  { icon: 'spray-bottle' as const, color: '#0D9488', left: '0%' as Edge, top: '44%' as Edge },
  { icon: 'hammer' as const, color: '#7C2D12', right: '0%' as Edge, top: '44%' as Edge },
  { icon: 'snowflake' as const, color: '#0284C7', right: '14%' as Edge, bottom: '2%' as Edge },
];

const ROLES = [
  {
    key: 'customer',
    icon: 'home' as const,
    title: 'Customer Login',
    description: 'Find trusted professionals for your household needs.',
    route: '/(auth)/customer-login',
  },
  {
    key: 'provider',
    icon: 'briefcase' as const,
    title: 'Service Provider Login',
    description: 'Offer your skills and connect with customers.',
    route: '/(auth)/provider-login',
  },
  {
    key: 'admin',
    icon: 'shield-check' as const,
    title: 'Admin Login',
    description: 'Manage and verify the HomeOne platform.',
    route: '/(auth)/admin-login',
  },
] as const;

const CARD_WIDTH = 104;
const CARD_GAP = 12;

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function Intro() {
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => null);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % ROTATING_SUBTITLES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <BackgroundPattern reduceMotion={reduceMotion} />

      {/* Top navigation bar */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={{ paddingTop: insets.top + 8 }}
        className="flex-row items-center justify-between px-5 pb-1"
      >
        <View className="flex-row items-center">
          <View className="mr-2 h-9 w-9 items-center justify-center rounded-xl bg-blue-700">
            <MaterialCommunityIcons name="home" size={20} color="#fff" />
          </View>
          <Text className="text-lg font-extrabold tracking-wide text-slate-900">HOMEONE</Text>
        </View>
        <Pressable
          onPress={() => setRoleSheetOpen(true)}
          className="rounded-full border-2 border-blue-700 px-5 py-2 active:bg-blue-50"
        >
          <Text className="text-[15px] font-bold text-blue-700">Login</Text>
        </Pressable>
      </Animated.View>

      <Animated.ScrollView
        entering={FadeIn.duration(400)}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HeroIllustration reduceMotion={reduceMotion} />

        <Animated.View entering={FadeInUp.delay(500).duration(500)} className="items-center px-6">
          <Text className="text-[30px] font-extrabold tracking-wide text-slate-900">HOMEONE</Text>
          <Text className="mt-1.5 text-lg font-semibold text-blue-700">
            Everything Your Home Needs
          </Text>
          <View className="mt-1.5 h-6 items-center justify-center">
            <Animated.Text
              key={phraseIndex}
              entering={FadeInUp.duration(350)}
              exiting={FadeOutDown.duration(250)}
              className="text-center text-[15px] text-slate-500"
            >
              {ROTATING_SUBTITLES[phraseIndex]}
            </Animated.Text>
          </View>
          <Text className="mt-1.5 text-center text-[15px] leading-6 text-slate-500">
            Find trusted professionals for all your home services in one place.
          </Text>
        </Animated.View>

        <View className="mt-5 px-6">
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              index={index}
              icon={feature.icon}
              iconBg={feature.iconBg}
              iconColor={feature.iconColor}
              title={feature.title}
              detail={feature.detail}
              expanded={expandedIndex === index}
              onToggle={() => setExpandedIndex((prev) => (prev === index ? null : index))}
            />
          ))}
        </View>

        <ServicePreview reduceMotion={reduceMotion} />
      </Animated.ScrollView>

      {/* Fixed Get Started button with safe-area spacing */}
      <Animated.View
        entering={FadeInUp.delay(900).duration(500)}
        style={{ paddingBottom: insets.bottom + 14 }}
        className="border-t border-slate-100 bg-white px-6 pt-3"
      >
        <GetStartedButton reduceMotion={reduceMotion} />
      </Animated.View>

      <RoleSheet open={roleSheetOpen} onClose={() => setRoleSheetOpen(false)} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Hero illustration: house built from views + orbiting service badges */
/* ------------------------------------------------------------------ */

function HeroIllustration({ reduceMotion }: { reduceMotion: boolean }) {
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    floatY.value = withRepeat(
      withSequence(withTiming(-8, { duration: 1800 }), withTiming(0, { duration: 1800 })),
      -1,
      true,
    );
  }, [floatY, reduceMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(250).duration(600)}
      className="mt-2 items-center"
    >
      <Animated.View style={[{ height: 218, width: '100%', maxWidth: 340 }, floatStyle]}>
        {/* Soft background glow */}
        <View className="absolute left-1/2 top-1/2 h-56 w-56 rounded-full bg-blue-100 opacity-60" style={{ transform: [{ translateX: -112 }, { translateY: -112 }] }} />
        <View className="absolute left-1/2 top-1/2 h-40 w-40 rounded-full bg-blue-50 opacity-80" style={{ transform: [{ translateX: -80 }, { translateY: -80 }] }} />

        {/* House */}
        <View className="absolute left-1/2 top-[52px] items-center" style={{ transform: [{ translateX: -75 }] }}>
          {/* Chimney */}
          <View className="absolute -top-5 right-6 h-7 w-5 rounded-t bg-slate-300" />
          {/* Roof */}
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 75,
              borderRightWidth: 75,
              borderBottomWidth: 58,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: '#1D4ED8',
            }}
          />
          {/* Body */}
          <View className="-mt-2 h-[86px] w-[132px] items-center rounded-b-2xl border-2 border-blue-100 bg-white pt-2 shadow-sm">
            <View className="flex-row">
              {/* Window */}
              <View className="mr-4 h-8 w-8 items-center justify-center rounded-lg border-2 border-blue-200 bg-blue-50">
                <View className="absolute h-full w-[2px] bg-blue-200" />
                <View className="absolute h-[2px] w-full bg-blue-200" />
              </View>
              {/* Door */}
              <View className="h-12 w-8 rounded-t-full bg-blue-700">
                <View className="absolute right-1.5 top-6 h-1.5 w-1.5 rounded-full bg-amber-300" />
              </View>
            </View>
          </View>
        </View>

        {/* Orbiting service badges */}
        {ORBIT_BADGES.map((badge, index) => (
          <ServiceBadge
            key={badge.icon}
            icon={badge.icon}
            color={badge.color}
            delay={700 + index * 170}
            reduceMotion={reduceMotion}
            position={{
              ...(badge.left !== undefined ? { left: badge.left } : {}),
              ...(badge.right !== undefined ? { right: badge.right } : {}),
              ...(badge.top !== undefined ? { top: badge.top } : {}),
              ...(badge.bottom !== undefined ? { bottom: badge.bottom } : {}),
            }}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

function ServiceBadge({
  icon,
  color,
  delay,
  reduceMotion,
  position,
}: {
  icon: 'pipe-wrench' | 'flash' | 'spray-bottle' | 'hammer' | 'snowflake';
  color: string;
  delay: number;
  reduceMotion: boolean;
  position: { left?: Edge; right?: Edge; top?: Edge; bottom?: Edge };
}) {
  const bobY = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    bobY.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(-6, { duration: 1500 }), withTiming(0, { duration: 1500 })),
        -1,
        true,
      ),
    );
  }, [bobY, delay, reduceMotion]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }],
  }));

  return (
    <Animated.View
      entering={ZoomIn.delay(delay).duration(450)}
      style={[bobStyle, position]}
      className="absolute"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full border border-slate-100 bg-white shadow-md">
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Feature cards: one expanded at a time, smooth expand/collapse        */
/* ------------------------------------------------------------------ */

function FeatureCard({
  index,
  icon,
  iconBg,
  iconColor,
  title,
  detail,
  expanded,
  onToggle,
}: {
  index: number;
  icon: 'shield-check' | 'lightning-bolt' | 'home';
  iconBg: string;
  iconColor: string;
  title: string;
  detail: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const chevron = useSharedValue(0);

  useEffect(() => {
    chevron.value = withTiming(expanded ? 1 : 0, { duration: 220 });
  }, [chevron, expanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(650 + index * 130).duration(450)}
      layout={LinearTransition.springify().damping(18).stiffness(160)}
      className="mb-2.5"
    >
      <Pressable
        onPress={onToggle}
        className={`flex-row items-center rounded-2xl border px-4 py-3.5 ${
          expanded ? 'border-blue-200 bg-blue-50/60' : 'border-slate-100 bg-slate-50'
        } active:bg-blue-50`}
      >
        <View className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-slate-800">{title}</Text>
          {expanded ? (
            <Animated.Text entering={FadeIn.duration(250)} className="mt-1 text-[13px] leading-5 text-slate-500">
              {detail}
            </Animated.Text>
          ) : null}
        </View>
        <Animated.View style={chevronStyle}>
          <MaterialCommunityIcons name="chevron-down" size={22} color="#94A3B8" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Service preview: auto-scrolling horizontal cards + manual swipe      */
/* ------------------------------------------------------------------ */

function ServicePreview({ reduceMotion }: { reduceMotion: boolean }) {
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const paused = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => {
      if (paused.current) return;
      setActiveIndex((current) => {
        const next = (current + 1) % SERVICES.length;
        try {
          listRef.current?.scrollToIndex({ index: next, animated: true });
        } catch {
          // Race with layout; the next tick retries.
        }
        return next;
      });
    }, 2800);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );

  function onScrollIndex(event: { nativeEvent: { contentOffset: { x: number } } }) {
    const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
    if (index >= 0 && index < SERVICES.length) setActiveIndex(index);
  }

  return (
    <Animated.View entering={FadeInUp.delay(1050).duration(500)} className="mt-4">
      <Text className="mb-3 px-6 text-lg font-bold text-slate-900">Services for Every Home</Text>
      <FlatList
        ref={listRef}
        data={SERVICES}
        keyExtractor={(item) => item.name}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: CARD_GAP }}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + CARD_GAP,
          offset: (CARD_WIDTH + CARD_GAP) * index,
          index,
        })}
        onScrollBeginDrag={() => {
          paused.current = true;
          if (resumeTimer.current) clearTimeout(resumeTimer.current);
        }}
        onScrollEndDrag={() => {
          resumeTimer.current = setTimeout(() => {
            paused.current = false;
          }, 4000);
        }}
        onMomentumScrollEnd={onScrollIndex}
        renderItem={({ item }) => (
          <View
            style={{ width: CARD_WIDTH }}
            className="items-center rounded-2xl border border-slate-100 bg-white px-2 py-4 shadow-sm"
          >
            <View
              className="mb-2 h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: item.bg }}
            >
              <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
            </View>
            <Text className="text-center text-xs font-semibold text-slate-800">{item.name}</Text>
          </View>
        )}
      />
      <View className="mt-3 flex-row items-center justify-center gap-1.5">
        {SERVICES.map((service, index) => (
          <View
            key={service.name}
            className={`h-1.5 rounded-full ${index === activeIndex ? 'w-5 bg-blue-700' : 'w-1.5 bg-slate-300'}`}
          />
        ))}
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Get Started button: entrance, arrow nudge, press feedback            */
/* ------------------------------------------------------------------ */

function GetStartedButton({ reduceMotion }: { reduceMotion: boolean }) {
  const arrowX = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    arrowX.value = withRepeat(
      withSequence(withTiming(5, { duration: 700 }), withTiming(0, { duration: 700 })),
      -1,
      true,
    );
  }, [arrowX, reduceMotion]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowX.value }],
  }));

  return (
    <Pressable
      onPress={() => router.push('/role-selection')}
      className="flex-row items-center justify-center rounded-2xl bg-blue-700 py-4 shadow-lg active:bg-blue-800"
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <Text className="text-lg font-bold text-white">Get Started</Text>
      <Animated.View style={arrowStyle}>
        <MaterialCommunityIcons name="arrow-right" size={22} color="#fff" />
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Role picker bottom sheet: close button, tap-outside, drag to dismiss */
/* ------------------------------------------------------------------ */

function RoleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sheetY = useSharedValue(420);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (open) {
      sheetY.value = withSpring(0, { damping: 24, stiffness: 220 });
      backdrop.value = withTiming(1, { duration: 250 });
    }
  }, [open, sheetY, backdrop]);

  function dismiss() {
    backdrop.value = withTiming(0, { duration: 200 });
    sheetY.value = withTiming(
      420,
      { duration: 220 },
      (finished) => {
        if (finished) runOnJS(onClose)();
      },
    );
  }

  function goToRole(route: string) {
    dismiss();
    setTimeout(() => router.push(route as never), 230);
  }

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      sheetY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 110 || event.velocityY > 700) {
        runOnJS(dismiss)();
      } else {
        sheetY.value = withSpring(0, { damping: 22 });
      }
    });

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' }, backdropStyle]}>
        <Pressable style={{ flex: 1 }} onPress={dismiss} />
        <GestureDetector gesture={pan}>
          <Animated.View
            style={sheetStyle}
            className="rounded-t-3xl bg-white px-5 pb-8 pt-2"
          >
            <View className="mb-1 mt-1 items-center">
              <View className="h-1.5 w-12 rounded-full bg-slate-300" />
            </View>
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-slate-900">Login as</Text>
              <Pressable
                onPress={dismiss}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
              >
                <MaterialCommunityIcons name="close" size={20} color="#475569" />
              </Pressable>
            </View>
            <Text className="mb-4 text-sm text-slate-500">
              Choose your role to open the right login page.
            </Text>
            {ROLES.map((role) => (
              <Pressable
                key={role.key}
                onPress={() => goToRole(role.route)}
                className="mb-2.5 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4 active:bg-blue-50"
              >
                <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                  <MaterialCommunityIcons
                    name={role.icon}
                    size={24}
                    color={role.key === 'admin' ? '#1E40AF' : '#1D4ED8'}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-bold text-slate-900">{role.title}</Text>
                  <Text className="text-[13px] text-slate-500" numberOfLines={2}>
                    {role.description}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#CBD5E1" />
              </Pressable>
            ))}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Subtle animated background pattern                                  */
/* ------------------------------------------------------------------ */

const PATTERN_ICONS = [
  { icon: 'home' as const, left: '6%' as Edge, top: '18%' as Edge },
  { icon: 'wrench' as const, right: '8%' as Edge, top: '30%' as Edge },
  { icon: 'flash' as const, left: '10%' as Edge, top: '52%' as Edge },
  { icon: 'shower' as const, right: '6%' as Edge, top: '62%' as Edge },
  { icon: 'lightbulb' as const, left: '14%' as Edge, top: '78%' as Edge },
  { icon: 'snowflake' as const, right: '12%' as Edge, top: '12%' as Edge },
];

function BackgroundPattern({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <View className="absolute inset-0" pointerEvents="none">
      {PATTERN_ICONS.map((item, index) => (
        <PatternIcon
          key={`${item.icon}-${index}`}
          icon={item.icon}
          reduceMotion={reduceMotion}
          duration={7000 + index * 900}
          position={{
            ...(item.left !== undefined ? { left: item.left } : {}),
            ...(item.right !== undefined ? { right: item.right } : {}),
            ...(item.top !== undefined ? { top: item.top } : {}),
          }}
        />
      ))}
    </View>
  );
}

function PatternIcon({
  icon,
  reduceMotion,
  duration,
  position,
}: {
  icon: 'home' | 'wrench' | 'flash' | 'shower' | 'lightbulb' | 'snowflake';
  reduceMotion: boolean;
  duration: number;
  position: { left?: Edge; right?: Edge; top?: Edge };
}) {
  const driftY = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    driftY.value = withRepeat(
      withSequence(withTiming(-12, { duration }), withTiming(0, { duration })),
      -1,
      true,
    );
  }, [driftY, duration, reduceMotion]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: driftY.value }],
    opacity: 0.05,
  }));

  return (
    <Animated.View style={[driftStyle, position]} className="absolute">
      <MaterialCommunityIcons name={icon} size={44} color="#1D4ED8" />
    </Animated.View>
  );
}
