// components/PreviewScreen.tsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EcosystemContext } from "../EcosystemContext";

type AppKey = "sdelaiZa" | "zadrugim" | "sledimZa";

type NavLike = {
  navigate?: (name: string, params?: any) => void;
  push?: (name: string, params?: any) => void;
  goBack?: () => void;
  canGoBack?: () => boolean;
};

type PreviewScreenProps = {
  navigation?: NavLike;
};

const PREVIEW_BACKGROUND = require("../bg.jpg");

// Реальный размер постера. Вся геометрия ниже считается только от него.
// Поэтому web, Android, iPhone и десктоп больше не "разъезжаются".
const POSTER_W = 881;
const POSTER_H = 1785;
const POSTER_RATIO = POSTER_H / POSTER_W;

const MAX_WEB_WIDTH = 430;
const MIN_SIDE_PADDING = 0;

const TAP_ZONES: Record<AppKey, { x: number; y: number; w: number; h: number }> = {
  sdelaiZa: { x: 40, y: 215, w: 800, h: 390 },
  zadrugim: { x: 40, y: 655, w: 800, h: 390 },
  sledimZa: { x: 40, y: 1090, w: 800, h: 390 },
};

const STAR_SEED = [
  { x: 0.12, y: 0.07, s: 2.0, d: 0 },
  { x: 0.22, y: 0.12, s: 1.4, d: 180 },
  { x: 0.38, y: 0.08, s: 1.8, d: 420 },
  { x: 0.63, y: 0.09, s: 1.5, d: 260 },
  { x: 0.78, y: 0.12, s: 2.2, d: 620 },
  { x: 0.91, y: 0.18, s: 1.6, d: 130 },
  { x: 0.16, y: 0.23, s: 2.4, d: 520 },
  { x: 0.31, y: 0.29, s: 1.5, d: 760 },
  { x: 0.49, y: 0.24, s: 2.0, d: 90 },
  { x: 0.73, y: 0.27, s: 1.3, d: 340 },
  { x: 0.86, y: 0.34, s: 1.9, d: 820 },
  { x: 0.08, y: 0.39, s: 1.5, d: 410 },
  { x: 0.26, y: 0.46, s: 2.2, d: 230 },
  { x: 0.52, y: 0.42, s: 1.4, d: 680 },
  { x: 0.68, y: 0.50, s: 2.1, d: 40 },
  { x: 0.92, y: 0.48, s: 1.7, d: 540 },
  { x: 0.13, y: 0.58, s: 2.1, d: 300 },
  { x: 0.37, y: 0.61, s: 1.4, d: 720 },
  { x: 0.58, y: 0.66, s: 1.9, d: 170 },
  { x: 0.82, y: 0.62, s: 2.4, d: 470 },
  { x: 0.20, y: 0.74, s: 1.5, d: 860 },
  { x: 0.44, y: 0.79, s: 2.2, d: 240 },
  { x: 0.69, y: 0.76, s: 1.6, d: 610 },
  { x: 0.88, y: 0.84, s: 2.0, d: 120 },
  { x: 0.11, y: 0.90, s: 1.8, d: 730 },
  { x: 0.33, y: 0.93, s: 2.3, d: 390 },
  { x: 0.61, y: 0.91, s: 1.5, d: 570 },
  { x: 0.80, y: 0.96, s: 2.1, d: 210 },
];

function routeFor(appKey: AppKey) {
  if (appKey === "sdelaiZa") return "SdelaiZa";
  if (appKey === "sledimZa") return "SlediZa";
  return "Zadrugim";
}

function formatPhoneRU(input: string) {
  const digits = input.replace(/\D/g, "");
  let d = digits;
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);

  const rest = d.slice(1);
  const a = rest.slice(0, 3);
  const b = rest.slice(3, 6);
  const c = rest.slice(6, 8);
  const e = rest.slice(8, 10);

  let out = "+7";
  if (a.length) out += ` (${a}`;
  if (a.length === 3) out += ")";
  if (b.length) out += ` ${b}`;
  if (c.length) out += `-${c}`;
  if (e.length) out += `-${e}`;
  return out;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim().toLowerCase());
}

function SparkleField({
  width,
  height,
  scale,
}: {
  width: number;
  height: number;
  scale: number;
}) {
  const values = useRef(STAR_SEED.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = values.map((v, index) => {
      const baseDelay = STAR_SEED[index].d;
      const duration = 2600 + (index % 5) * 360;

      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(baseDelay),
          Animated.timing(v, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      loop.start();
      return loop;
    });

    return () => loops.forEach((l) => l.stop());
  }, [values]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {STAR_SEED.map((star, index) => {
        const value = values[index];
        const size = Math.max(1.4, star.s * scale);
        const halo = size * 7.2;

        const opacity = value.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.12, 0.72, 0.18],
        });

        const haloOpacity = value.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.03, 0.18, 0.04],
        });

        const starScale = value.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.65, 1.35, 0.85],
        });

        return (
          <View
            key={`spark-${index}`}
            style={{
              position: "absolute",
              left: star.x * width,
              top: star.y * height,
            }}
          >
            <Animated.View
              style={[
                styles.starHalo,
                {
                  width: halo,
                  height: halo,
                  borderRadius: halo / 2,
                  left: -halo / 2,
                  top: -halo / 2,
                  opacity: haloOpacity,
                  transform: [{ scale: starScale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.starDot,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  left: -size / 2,
                  top: -size / 2,
                  opacity,
                  transform: [{ scale: starScale }],
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function SoftEnergyFlow({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height * 0.018],
  });

  const opacity = drift.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0.08, 0.22, 0.1],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.energyLayer,
        {
          width,
          height,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.energyOrb, { right: -width * 0.18, top: height * 0.18, width: width * 0.42, height: width * 0.42 }]} />
      <View style={[styles.energyOrbPink, { left: -width * 0.22, top: height * 0.56, width: width * 0.38, height: width * 0.38 }]} />
    </Animated.View>
  );
}

function CardSheen({
  zone,
  scale,
  delay,
}: {
  zone: { x: number; y: number; w: number; h: number };
  scale: number;
  delay: number;
}) {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const sweepLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(sweep, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ])
    );

    sweepLoop.start();

    return () => {
      sweepLoop.stop();
    };
  }, [delay, sweep]);

  const left = zone.x * scale;
  const top = zone.y * scale;
  const width = zone.w * scale;
  const height = zone.h * scale;
  const radius = Math.max(26, 58 * scale);

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.72, width * 1.2],
  });

  const bandOpacity = sweep.interpolate({
    inputRange: [0, 0.16, 0.5, 0.84, 1],
    outputRange: [0, 0.08, 0.22, 0.08, 0],
  });

  const coreOpacity = sweep.interpolate({
    inputRange: [0, 0.25, 0.52, 0.76, 1],
    outputRange: [0, 0.03, 0.18, 0.04, 0],
  });

  return (
    <View
      pointerEvents="none"
      style={[
        styles.cardSheenClip,
        {
          left,
          top,
          width,
          height,
          borderRadius: radius,
        },
      ]}
    >
      {/* Убрано: прямоугольная рамка/аура давала некрасивые горизонтальные линии.
          Оставлены только диагональные блики sheenBand/sheenCore. */}
      <Animated.View
        style={[
          styles.sheenBand,
          {
            width: Math.max(54, width * 0.22),
            height: height * 1.9,
            opacity: bandOpacity,
            transform: [
              { translateX },
              { translateY: -height * 0.42 },
              { rotate: "18deg" },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.sheenCore,
          {
            width: Math.max(18, width * 0.055),
            height: height * 1.9,
            opacity: coreOpacity,
            transform: [
              { translateX },
              { translateY: -height * 0.42 },
              { rotate: "18deg" },
            ],
          },
        ]}
      />
    </View>
  );
}

function PremiumCardSheens({ scale }: { scale: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <CardSheen zone={TAP_ZONES.sdelaiZa} scale={scale} delay={0} />
      <CardSheen zone={TAP_ZONES.zadrugim} scale={scale} delay={850} />
      <CardSheen zone={TAP_ZONES.sledimZa} scale={scale} delay={1700} />
    </View>
  );
}

function RegisterModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { setProfile } = useContext(EcosystemContext);
  const [name, setName] = useState("");
  const [city, setCity] = useState("Ростов-на-Дону");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("1111");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setError("");
  }, [visible]);

  const submit = () => {
    const cleanName = name.trim();
    const cleanCity = city.trim();
    const cleanEmail = email.trim();
    const phoneDigits = phone.replace(/\D/g, "");

    if (cleanName.length < 2) {
      setError("Введите имя минимум из 2 символов.");
      return;
    }
    if (!cleanCity) {
      setError("Введите город.");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError("Введите корректную почту.");
      return;
    }
    if (phoneDigits.length !== 11 || !phoneDigits.startsWith("7")) {
      setError("Введите номер телефона в формате РФ.");
      return;
    }
    if (code.trim() !== "1111") {
      setError("Тестовый код: 1111.");
      return;
    }

    setProfile({
      name: cleanName,
      city: cleanCity,
      email: cleanEmail,
      phoneMain: phone,
      phoneExtra: "",
      address: "",
    });

    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.modalBackdrop} />
        </Pressable>

        <View style={styles.modalCard}>
          <View style={styles.modalGlow} />
          <Pressable onPress={onClose} style={styles.modalClose} hitSlop={10}>
            <Ionicons name="close" size={22} color="#1D1B4C" />
          </Pressable>

          <Text style={styles.modalTitle}>Единый вход</Text>
          <Text style={styles.modalSub}>
            Один профиль для СделайЗА, ЗАдружи и СледиЗА. Код для теста: 1111
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Имя"
            placeholderTextColor="rgba(29,27,76,0.42)"
            style={styles.input}
          />
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Город"
            placeholderTextColor="rgba(29,27,76,0.42)"
            style={styles.input}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Почта"
            placeholderTextColor="rgba(29,27,76,0.42)"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={phone}
            onChangeText={(v) => setPhone(formatPhoneRU(v))}
            placeholder="+7 (999) 999-99-99"
            placeholderTextColor="rgba(29,27,76,0.42)"
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            placeholder="Код из SMS"
            placeholderTextColor="rgba(29,27,76,0.42)"
            keyboardType="number-pad"
            style={styles.input}
          />

          {!!error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable onPress={submit} style={styles.modalPrimary}>
            <Text style={styles.modalPrimaryText}>Войти / зарегистрироваться</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FloatingAuthDock({
  onPress,
}: {
  onPress: () => void;
}) {
  const { profile } = useContext(EcosystemContext);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });

  return (
    <View pointerEvents="box-none" style={styles.dockWrap}>
      <Animated.View style={[styles.dockShadow, { transform: [{ scale }] }]}>
        <Pressable onPress={onPress} style={styles.dock}>
          <View style={styles.dockIcon}>
            <Ionicons name={profile ? "person" : "sparkles"} size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.dockText} numberOfLines={1}>
            {profile ? `Привет, ${profile.name}` : "Войти / Зарегистрироваться"}
          </Text>
          <View style={styles.dockDots}>
            <View style={styles.dockDot} />
            <View style={[styles.dockDot, { opacity: 0.55 }]} />
            <View style={[styles.dockDot, { opacity: 0.3 }]} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function PreviewScreen({ navigation }: PreviewScreenProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [registerOpen, setRegisterOpen] = useState(false);

  const posterWidth = useMemo(() => {
    const base = Platform.OS === "web" ? Math.min(windowWidth, MAX_WEB_WIDTH) : windowWidth;
    return Math.max(320, base - MIN_SIDE_PADDING * 2);
  }, [windowWidth]);

  const posterHeight = posterWidth * POSTER_RATIO;
  const scale = posterWidth / POSTER_W;

  const openApp = (appKey: AppKey) => {
    const routeName = routeFor(appKey);

    if (typeof navigation?.push === "function") {
      navigation.push(routeName, { openedAt: Date.now() });
      return;
    }

    if (typeof navigation?.navigate === "function") {
      navigation.navigate(routeName, { openedAt: Date.now() });
    }
  };

  const hitZone = (zone: { x: number; y: number; w: number; h: number }) => ({
    left: zone.x * scale,
    top: zone.y * scale,
    width: zone.w * scale,
    height: zone.h * scale,
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF7FF" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={[
          styles.scrollContent,
          { minHeight: Math.max(windowHeight, posterHeight), paddingBottom: 106 },
        ]}
      >
        <View style={[styles.phoneFrame, Platform.OS === "web" ? styles.phoneFrameWeb : null]}>
          <View
            style={[
              styles.poster,
              {
                width: posterWidth,
                height: posterHeight,
              },
            ]}
          >
            <ImageBackground
              source={PREVIEW_BACKGROUND}
              resizeMode="stretch"
              style={StyleSheet.absoluteFill}
              imageStyle={styles.posterImage}
            />

            <SoftEnergyFlow width={posterWidth} height={posterHeight} />
            <SparkleField width={posterWidth} height={posterHeight} scale={scale} />
            <PremiumCardSheens scale={scale} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Открыть СделайЗА"
              onPress={() => openApp("sdelaiZa")}
              style={[styles.hitZone, hitZone(TAP_ZONES.sdelaiZa)]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Открыть ЗАдружи"
              onPress={() => openApp("zadrugim")}
              style={[styles.hitZone, hitZone(TAP_ZONES.zadrugim)]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Открыть СледиЗА"
              onPress={() => openApp("sledimZa")}
              style={[styles.hitZone, hitZone(TAP_ZONES.sledimZa)]}
            />
          </View>
        </View>
      </ScrollView>

      <FloatingAuthDock onPress={() => setRegisterOpen(true)} />
      <RegisterModal visible={registerOpen} onClose={() => setRegisterOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EEF7FF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    backgroundColor: "#EEF7FF",
  },
  phoneFrame: {
    overflow: "hidden",
    backgroundColor: "#EEF7FF",
  },
  phoneFrameWeb: {
    minHeight: "100%",
    shadowColor: "#20145D",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
  },
  poster: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#EEF7FF",
  },
  posterImage: {
    width: "100%",
    height: "100%",
  },
  hitZone: {
    position: "absolute",
    backgroundColor: "transparent",
  },

  cardSheenClip: {
    position: "absolute",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  cardIridescentAura: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },
  cardIridescentBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.2,
    borderColor: "rgba(125, 225, 255, 0.52)",
    shadowColor: "#76E8FF",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  sheenBand: {
    position: "absolute",
    left: 0,
    top: 0,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.48,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  sheenCore: {
    position: "absolute",
    left: 0,
    top: 0,
    borderRadius: 999,
    backgroundColor: "rgba(255, 117, 224, 0.98)",
    shadowColor: "#FF76E6",
    shadowOpacity: 0.42,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  starHalo: {
    position: "absolute",
    backgroundColor: "rgba(128, 225, 255, 1)",
    shadowColor: "#7EEBFF",
    shadowOpacity: 0.42,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  starDot: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.88,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  energyLayer: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  energyOrb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(98, 218, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(98, 218, 255, 0.28)",
  },
  energyOrbPink: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 126, 231, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 126, 231, 0.24)",
  },
  dockWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Platform.OS === "web" ? 18 : 16,
    alignItems: "center",
    paddingHorizontal: 18,
  },
  dockShadow: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 999,
    shadowColor: "#7B61FF",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  dock: {
    height: 54,
    borderRadius: 999,
    backgroundColor: "rgba(144, 118, 244, 0.76)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  dockIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dockText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  dockDots: {
    width: 34,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  dockDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    marginLeft: 4,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(13, 14, 48, 0.42)",
  },
  modalCard: {
    margin: 14,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(147, 128, 255, 0.24)",
    shadowColor: "#1E166A",
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    overflow: "hidden",
  },
  modalGlow: {
    position: "absolute",
    right: -60,
    top: -80,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(116, 229, 255, 0.24)",
  },
  modalClose: {
    position: "absolute",
    right: 18,
    top: 18,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(29,27,76,0.06)",
  },
  modalTitle: {
    color: "#1D1B4C",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    paddingRight: 42,
  },
  modalSub: {
    marginTop: 8,
    color: "rgba(29,27,76,0.62)",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 14,
    paddingRight: 10,
  },
  input: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(100, 100, 200, 0.16)",
    backgroundColor: "rgba(237, 242, 255, 0.72)",
    paddingHorizontal: 14,
    color: "#1D1B4C",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
  },
  errorText: {
    color: "#E11D48",
    fontWeight: "800",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  modalPrimary: {
    marginTop: 16,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#6C4CFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C4CFF",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
