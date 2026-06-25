// PreviewScreen.tsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  StatusBar,
  Image,
  ImageBackground,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { EcosystemContext } from "../EcosystemContext";

type AppKey = "sdelaiZa" | "zadrugim" | "sledimZa";
type Point = { x: number; y: number };

// Фоновая картинка, к которой привязаны динамичные ободы.
// Координаты ниже рассчитаны для макета 881x1785, который ты прислал.
// В этой версии файл PreviewScreen.tsx лежит в корне проекта рядом с bg.jpg.
const PREVIEW_BACKGROUND = require("../bg.jpg");
// Важно: не используем Image.resolveAssetSource, потому что в твоей среде
// он недоступен. Размеры указаны вручную по PNG "no buttle.png".
const PREVIEW_BACKGROUND_WIDTH = 881;
const PREVIEW_BACKGROUND_HEIGHT = 1785;

const ENABLE_IDLE_FLOAT = false;

type BgCircle = { cx: number; cy: number; d: number };

const BACKGROUND_CIRCLES: Record<"top" | "avatar" | "heart" | "bot", BgCircle> = {
  // Нормализованные координаты: cx/cy — центр от 0 до 1, d — диаметр от ширины картинки.
  // Они рассчитаны по присланному макету 881x1785, но переживают изменение размера файла.
  top: { cx: 540 / 881, cy: 355 / 1785, d: 230 / 880 },
  avatar: { cx: 640 / 881, cy: 815 / 1785, d: 270 / 881 },
  heart: { cx: 490 / 881, cy: 999 / 1785, d: 190 / 881 },
  bot: { cx: 542 / 930, cy: 1320 / 1785, d: 210 / 881 },
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function dist(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function angleDeg(a: Point, b: Point) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/**
 * Фоновое мерцание звёзд — всегда активно.
 */
function StarField({ width, height }: { width: number; height: number }) {
  const stars = useRef(
    Array.from({ length: 85 }, (_, i) => {
      const isMedium = i % 5 === 0;
      const size = isMedium ? 3.4 + Math.random() * 2.4 : 1.8 + Math.random() * 1.6;

      const opacity = new Animated.Value(0.25 + Math.random() * 0.55);
      const scale = new Animated.Value(0.9 + Math.random() * 0.6);

      const tint =
        i % 7 === 0
          ? "rgba(255,235,250,1)"
          : i % 3 === 0
          ? "rgba(210,235,255,1)"
          : "rgba(255,255,255,1)";

      return {
        id: i,
        x: Math.random(),
        y: Math.random(),
        size,
        opacity,
        scale,
        tint,
        isMedium,
      };
    })
  ).current;

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];

    stars.forEach((s) => {
      const dur = 1200 + Math.random() * 2200;
      const delay = Math.random() * 900;

      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(s.opacity, {
              toValue: 0.18 + Math.random() * 0.35,
              duration: dur * 0.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(s.scale, {
              toValue: 0.85 + Math.random() * 0.7,
              duration: dur * 0.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(s.opacity, {
              toValue: 0.45 + Math.random() * 0.55,
              duration: dur * 0.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(s.scale, {
              toValue: 1.05 + Math.random() * 0.85,
              duration: dur * 0.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      loops.push(anim);
      anim.start();
    });

    return () => loops.forEach((l) => l.stop());
  }, [stars]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s) => {
        const left = s.x * width;
        const top = s.y * height;
        const haloSize = s.size * (s.isMedium ? 4.2 : 3.2);

        return (
          <View key={`star-${s.id}`} style={{ position: "absolute", left, top }}>
            <Animated.View
              style={[
                styles.starHalo,
                {
                  width: haloSize,
                  height: haloSize,
                  borderRadius: haloSize / 2,
                  backgroundColor: s.tint,
                  opacity: s.opacity,
                  transform: [{ scale: s.scale }],
                  left: -haloSize / 2,
                  top: -haloSize / 2,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.star,
                {
                  width: s.size,
                  height: s.size,
                  borderRadius: s.size / 2,
                  backgroundColor: s.tint,
                  opacity: s.opacity,
                  transform: [{ scale: s.scale }],
                  left: -s.size / 2,
                  top: -s.size / 2,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

/**
 * ДНК/нейросетка: top->mid->bot->top (активна только НЕ в idle).
 */
function DnaNeuralOverlay({
  width,
  centers,
  orbSize,
}: {
  width: number;
  height: number;
  centers: Point[];
  orbSize: number;
}) {
  const [t, setT] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const loop = () => {
      const elapsed = (Date.now() - start) / 1000;
      const speed = 0.18;
      setT((elapsed * speed) % 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const [cTop, cMid, cBot] = centers;

  const amp = Math.max(10, Math.min(width * 0.045, 26));
  const lineCount = 26;

  const buildPoint = (s: number) => {
    const seg = s * 3;
    let base: Point;

    if (seg < 1) {
      const p = seg;
      base = { x: lerp(cTop.x, cMid.x, p), y: lerp(cTop.y, cMid.y, p) };
    } else if (seg < 2) {
      const p = seg - 1;
      base = { x: lerp(cMid.x, cBot.x, p), y: lerp(cMid.y, cBot.y, p) };
    } else {
      const p = seg - 2;
      base = { x: lerp(cBot.x, cTop.x, p), y: lerp(cBot.y, cTop.y, p) };
    }

    const theta = s * Math.PI * 2 * 2.2;
    const dx = Math.cos(theta) * amp;
    const dy = Math.sin(theta) * (amp * 0.35);

    return { base, dx, dy };
  };

  const strandA: Point[] = [];
  const strandB: Point[] = [];

  for (let i = 0; i < lineCount; i++) {
    const phase = i / lineCount;
    const s = (t + phase) % 1;

    const p = buildPoint(s);
    const squeeze = 0.55 + 0.45 * Math.sin(s * Math.PI);
    const dx = p.dx * squeeze;
    const dy = p.dy * squeeze;

    strandA.push({ x: p.base.x + dx, y: p.base.y + dy });
    strandB.push({ x: p.base.x - dx, y: p.base.y - dy });
  }

  const buildLines = (pts: Point[], keyPrefix: string) => {
    const lines: React.ReactNode[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = dist(a, b);
      const ang = angleDeg(a, b);
      lines.push(
        <View
          key={`${keyPrefix}-l-${i}`}
          style={[
            styles.dnaLine,
            {
              left: a.x,
              top: a.y,
              width: len,
              transform: [{ rotate: `${ang}deg` }],
            },
          ]}
        />
      );
    }
    return lines;
  };

  const buildNodes = (pts: Point[], keyPrefix: string, opacityBase: number) => {
    return pts.map((p, i) => {
      const size = 3 + (i % 3);
      const o = opacityBase + 0.35 * Math.sin((t + i / pts.length) * Math.PI * 2);
      return (
        <View
          key={`${keyPrefix}-n-${i}`}
          style={[
            styles.dnaNode,
            {
              left: p.x - size / 2,
              top: p.y - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: Math.max(0.08, Math.min(0.95, o)),
            },
          ]}
        />
      );
    });
  };

  const rungs = strandA.map((a, i) => {
    if (i % 3 !== 0) return null;
    const b = strandB[i];
    const len = dist(a, b);
    const ang = angleDeg(a, b);
    return (
      <View
        key={`r-${i}`}
        style={[
          styles.dnaRung,
          {
            left: a.x,
            top: a.y,
            width: len,
            transform: [{ rotate: `${ang}deg` }],
          },
        ]}
      />
    );
  });

  const clipPadding = orbSize * 0.08;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { padding: clipPadding }]}>
        {buildLines(strandA, "a")}
        {buildLines(strandB, "b")}
        {rungs}
        {buildNodes(strandA, "a", 0.45)}
        {buildNodes(strandB, "b", 0.32)}
      </View>
    </View>
  );
}

function GlowingOrb({
  size,
  icon,
  onPress,
}: {
  size: number;
  icon: "briefcase-outline" | "heart-outline" | "people-outline";
  onPress: () => void;
}) {
  const accessibilityLabel =
    icon === "briefcase-outline" ? "СделайЗА" : icon === "heart-outline" ? "ЗАдружи" : "СледиЗА";
  const ringWidth = Math.max(2, Math.round(size * 0.026));
  const pulse = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    const sweepLoop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    pulseLoop.start();
    sweepLoop.start();
    return () => {
      pulseLoop.stop();
      sweepLoop.stop();
    };
  }, [pulse, sweep]);

  const onPressIn = () => {
    Animated.timing(press, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };
  const onPressOut = () => {
    Animated.timing(press, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const ringColor = useMemo(() => {
    return pulse.interpolate({
      inputRange: [0, 1],
      outputRange: ["rgba(140,120,255,0.45)", "rgba(90,240,255,0.78)"],
    });
  }, [pulse]);

  const ringGlow = useMemo(() => {
    return pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 0.62],
    });
  }, [pulse]);

  const pressedScale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.965],
  });

  const seg1 = sweep.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.08, 0.82, 0.08, 0.08],
  });
  const seg2 = sweep.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.08, 0.08, 0.82, 0.08],
  });
  const seg3 = sweep.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.82, 0.08, 0.08, 0.82],
  });

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pressedScale }],
          },
        ]}
      >
        <View style={[styles.glass, { width: size, height: size, borderRadius: size / 2 }]} />
        <Animated.View
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: ringWidth,
              borderColor: ringColor,
              opacity: ringGlow,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringSegment,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: ringWidth + 1,
              borderTopColor: "rgba(255,120,220,0.95)",
              borderRightColor: "rgba(100,240,255,0.95)",
              borderBottomColor: "rgba(120,120,255,0.95)",
              borderLeftColor: "transparent",
              opacity: seg1,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringSegment,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: ringWidth + 1,
              borderTopColor: "rgba(100,240,255,0.95)",
              borderRightColor: "rgba(120,120,255,0.95)",
              borderBottomColor: "rgba(255,120,220,0.95)",
              borderLeftColor: "transparent",
              opacity: seg2,
              transform: [{ rotate: "120deg" }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringSegment,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: ringWidth + 1,
              borderTopColor: "rgba(120,120,255,0.95)",
              borderRightColor: "rgba(255,120,220,0.95)",
              borderBottomColor: "rgba(100,240,255,0.95)",
              borderLeftColor: "transparent",
              opacity: seg3,
              transform: [{ rotate: "240deg" }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

function AvatarOrb({
  size,
  avatarUri,
  onPress,
}: {
  size: number;
  avatarUri?: string;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    const sweepLoop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1700,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );

    pulseLoop.start();
    sweepLoop.start();
    return () => {
      pulseLoop.stop();
      sweepLoop.stop();
    };
  }, [pulse, sweep]);

  const ringWidth = Math.max(2, Math.round(size * 0.024));
  const ringColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(150,210,255,0.40)", "rgba(255,140,235,0.82)"],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.78],
  });
  const seg1 = sweep.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.08, 0.9, 0.08, 0.08],
  });
  const seg2 = sweep.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.08, 0.08, 0.9, 0.08],
  });
  const seg3 = sweep.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.9, 0.08, 0.08, 0.9],
  });

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Аватар профиля" onPress={onPress}>
      <View style={[styles.avatarOrb, { width: size, height: size, borderRadius: size / 2 }]}>
        {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" /> : null}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: ringWidth,
              borderColor: ringColor,
              opacity: ringOpacity,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringSegment,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: ringWidth + 1,
              borderTopColor: "rgba(120,220,255,0.95)",
              borderRightColor: "rgba(255,140,235,0.95)",
              borderBottomColor: "rgba(140,120,255,0.95)",
              borderLeftColor: "transparent",
              opacity: seg1,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringSegment,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: ringWidth + 1,
              borderTopColor: "rgba(255,140,235,0.95)",
              borderRightColor: "rgba(140,120,255,0.95)",
              borderBottomColor: "rgba(120,220,255,0.95)",
              borderLeftColor: "transparent",
              opacity: seg2,
              transform: [{ rotate: "120deg" }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringSegment,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: ringWidth + 1,
              borderTopColor: "rgba(140,120,255,0.95)",
              borderRightColor: "rgba(120,220,255,0.95)",
              borderBottomColor: "rgba(255,140,235,0.95)",
              borderLeftColor: "transparent",
              opacity: seg3,
              transform: [{ rotate: "240deg" }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function ConfettiAnimation({ onFinish }: { onFinish: () => void }) {
  const particles = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * 100),
      y: new Animated.Value(100),
      opacity: new Animated.Value(1),
      color: [
        "rgba(120,100,255,0.9)",
        "rgba(255,120,220,0.9)",
        "rgba(90,240,255,0.9)",
        "rgba(255,200,60,0.9)",
        "rgba(100,255,150,0.9)",
        "rgba(255,100,100,0.9)",
      ][i % 6],
      size: 6 + Math.random() * 8,
      targetX: Math.random() * 100,
      targetY: Math.random() * 60,
    }))
  ).current;

  useEffect(() => {
    const anims = particles.map((p) =>
      Animated.parallel([
        Animated.timing(p.y, {
          toValue: p.targetY,
          duration: 600 + Math.random() * 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(p.x, {
          toValue: p.targetX,
          duration: 600 + Math.random() * 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.delay(1200),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: false,
          }),
        ]),
      ])
    );
    Animated.parallel(anims).start();
    const timer = setTimeout(() => onFinish(), 2000);
    return () => clearTimeout(timer);
  }, [onFinish, particles]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => {
        const left = p.x.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
        const top = p.y.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
        return (
          <Animated.View
            key={p.id}
            style={{
              position: "absolute",
              left: left as any,
              top: top as any,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              opacity: p.opacity,
            }}
          />
        );
      })}
    </View>
  );
}

function SuccessScreen({ onClose }: { onClose: () => void }) {
  const [apps, setApps] = useState({
    sdelaiZa: true,
    zadrugim: true,
    sledimZa: true,
  });

  const toggleApp = (key: "sdelaiZa" | "zadrugim" | "sledimZa") => {
    setApps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={successStyles.container}>
      <Text style={successStyles.title}>Поздравляем!</Text>
      <Text style={successStyles.description}>
        Ты вступил в нашу ЭКО систему. Теперь тебе будут доступны бесплатно 3 приложения, используй их по мере необходимости.
      </Text>

      <View style={successStyles.appList}>
        <View style={successStyles.appRow}>
          <Text style={successStyles.appName}>СделайЗА</Text>
          <Pressable
            style={[successStyles.toggle, apps.sdelaiZa && successStyles.toggleActive]}
            onPress={() => toggleApp("sdelaiZa")}
          >
            <View style={[successStyles.toggleThumb, apps.sdelaiZa && successStyles.toggleThumbActive]} />
          </Pressable>
        </View>

        <View style={successStyles.appRow}>
          <Text style={successStyles.appName}>ЗАдружи</Text>
          <Pressable
            style={[successStyles.toggle, apps.zadrugim && successStyles.toggleActive]}
            onPress={() => toggleApp("zadrugim")}
          >
            <View style={[successStyles.toggleThumb, apps.zadrugim && successStyles.toggleThumbActive]} />
          </Pressable>
        </View>

        <View style={successStyles.appRow}>
          <Text style={successStyles.appName}>СледиЗА</Text>
          <Pressable
            style={[successStyles.toggle, apps.sledimZa && successStyles.toggleActive]}
            onPress={() => toggleApp("sledimZa")}
          >
            <View style={[successStyles.toggleThumb, apps.sledimZa && successStyles.toggleThumbActive]} />
          </Pressable>
        </View>
      </View>

      <Text style={successStyles.hint}>
        Отключай и включай свои приложения. Когда кнопка активна — твой профиль виден другим пользователям.
      </Text>

      <Pressable style={successStyles.closeBtn} onPress={onClose}>
        <Text style={successStyles.closeBtnText}>Продолжить</Text>
      </Pressable>
    </View>
  );
}

function RegisterModal({
  visible,
  onClose,
  setProfile,
  isRegistered,
}: {
  visible: boolean;
  onClose: () => void;
  setProfile: (p: any | null) => void;
  isRegistered: boolean;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+7 ");
  const [smsCode, setSmsCode] = useState("1111");
  const [avatarUri, setAvatarUri] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [errors, setErrors] = useState({
    name: false,
    city: false,
    email: false,
    phone: false,
    smsCode: false,
  });

  useEffect(() => {
    if (!visible) return;
    setShowConfetti(false);
    setShowSuccess(!!isRegistered);
  }, [visible, isRegistered]);

  const confirmLogoutAll = () => {
    const title = "Выход";
    const message = "Вы действительно хотите выйти из всех приложений?";

    const doLogout = () => {
      setProfile(null);
      setShowSuccess(false);
      setShowConfetti(false);
      onClose();
    };

    if (Platform.OS === "web") {
      const ok = (globalThis as any)?.confirm?.(message) ?? false;
      if (ok) doLogout();
      return;
    }

    Alert.alert(title, message, [
      { text: "Нет", style: "cancel" },
      { text: "Да", style: "destructive", onPress: doLogout },
    ]);
  };

  const validateEmail = (value: string) => {
    const v = value.trim().toLowerCase();
    const atIndex = v.indexOf("@");
    if (atIndex === -1) return false;

    const local = v.slice(0, atIndex);
    const domain = v.slice(atIndex + 1);
    if (local.length < 3) return false;

    const allowedDomains = new Set([
      "gmail.com",
      "yandex.ru",
      "yandex.com",
      "ya.ru",
      "mail.ru",
      "bk.ru",
      "inbox.ru",
      "list.ru",
      "rambler.ru",
      "outlook.com",
      "hotmail.com",
      "live.com",
      "icloud.com",
      "me.com",
      "mac.com",
      "proton.me",
      "protonmail.com",
      "yahoo.com",
    ]);

    if (!allowedDomains.has(domain)) return false;
    if (/\s/.test(local) || /\s/.test(domain)) return false;

    return true;
  };

  const getPhoneDigits = (value: string) => value.replace(/\D/g, "");

  const pickAvatar = async () => {
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Фото", "Разрешите доступ к галерее, чтобы выбрать аватар.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Фото", "Не удалось выбрать изображение.");
    }
  };

  const CITIES = [
    "Абакан",
    "Альметьевск",
    "Ангарск",
    "Архангельск",
    "Астрахань",
    "Балаково",
    "Барнаул",
    "Белгород",
    "Бийск",
    "Благовещенск",
    "Братск",
    "Брянск",
    "Великий Новгород",
    "Владивосток",
    "Владикавказ",
    "Владимир",
    "Волгоград",
    "Волжский",
    "Вологда",
    "Воронеж",
    "Грозный",
    "Дзержинск",
    "Екатеринбург",
    "Златоуст",
    "Иваново",
    "Ижевск",
    "Иркутск",
    "Казань",
    "Калининград",
    "Калуга",
    "Каменск-Уральский",
    "Кемерово",
    "Киров",
    "Ковров",
    "Комсомольск-на-Амуре",
    "Копейск",
    "Кострома",
    "Краснодар",
    "Красноярск",
    "Курган",
    "Курск",
    "Липецк",
    "Магнитогорск",
    "Махачкала",
    "Миасс",
    "Москва",
    "Мурманск",
    "Набережные Челны",
    "Нальчик",
    "Находка",
    "Нижневартовск",
    "Нижний Новгород",
    "Нижний Тагил",
    "Новокузнецк",
    "Новосибирск",
    "Норильск",
    "Омск",
    "Оренбург",
    "Орёл",
    "Орск",
    "Пенза",
    "Пермь",
    "Петрозаводск",
    "Прокопьевск",
    "Рубцовск",
    "Рыбинск",
    "Рязань",
    "Салават",
    "Самара",
    "Санкт-Петербург",
    "Саранск",
    "Саратов",
    "Смоленск",
    "Сочи",
    "Ставрополь",
    "Стерлитамак",
    "Сургут",
    "Сыктывкар",
    "Таганрог",
    "Тамбов",
    "Тверь",
    "Тольятти",
    "Томск",
    "Тула",
    "Тюмень",
    "Улан-Удэ",
    "Ульяновск",
    "Уссурийск",
    "Уфа",
    "Хабаровск",
    "Чебоксары",
    "Челябинск",
    "Череповец",
    "Чита",
    "Шахты",
    "Электросталь",
    "Южно-Сахалинск",
    "Якутск",
    "Ярославль",
  ];

  const formatPhone = (text: string) => {
    setErrors((p) => ({ ...p, phone: false }));

    let digits = text.replace(/\D/g, "");
    if (digits.length === 0) {
      setPhone("+7 ");
      return;
    }
    if (digits[0] === "8") digits = "7" + digits.slice(1);
    if (digits[0] !== "7") digits = "7" + digits;
    digits = digits.slice(0, 11);

    let formatted = "+7";
    if (digits.length > 1) {
      formatted += " (" + digits.slice(1, Math.min(4, digits.length));
      if (digits.length >= 4) {
        formatted += ") " + digits.slice(4, Math.min(7, digits.length));
        if (digits.length >= 7) {
          formatted += "-" + digits.slice(7, Math.min(9, digits.length));
          if (digits.length >= 9) {
            formatted += "-" + digits.slice(9, 11);
          }
        }
      }
    }
    setPhone(formatted);
  };

  const handleRegister = () => {
    const nameOk = name.trim().length > 0;
    const cityOk = city.trim().length > 0;
    const emailOk = validateEmail(email);
    const phoneOk = getPhoneDigits(phone).length === 11;
    const codeOk = smsCode.trim() === "1111";

    const nextErrors = {
      name: !nameOk,
      city: !cityOk,
      email: !emailOk,
      phone: !phoneOk,
      smsCode: !codeOk,
    };

    setErrors(nextErrors);

    const hasAnyError = Object.values(nextErrors).some(Boolean);
    if (hasAnyError) return;

    setProfile({
      name: name.trim(),
      city: city.trim(),
      email: email.trim(),
      phoneMain: phone,
      phoneExtra: "",
      address: "",
      avatarUri: avatarUri || undefined,
    });

    setShowConfetti(true);
  };

  const handleConfettiFinish = () => {
    setShowConfetti(false);
    setShowSuccess(true);
  };

  const handleClose = () => {
    setShowSuccess(false);
    setShowConfetti(false);
    setName("");
    setCity("");
    setEmail("");
    setPhone("+7 ");
    setSmsCode("1111");
    setAvatarUri("");
    setErrors({
      name: false,
      city: false,
      email: false,
      phone: false,
      smsCode: false,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={styles.modalCard}>
          {showSuccess ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={successStyles.scrollContent}>
              <SuccessScreen onClose={handleClose} />
            </ScrollView>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Регистрация</Text>

              <Pressable style={styles.avatarPick} onPress={pickAvatar}>
                <View style={styles.avatarPickPreview}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarPickImage} resizeMode="cover" />
                  ) : (
                    <Ionicons name="camera-outline" size={28} color="rgba(80,70,170,0.78)" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.avatarPickTitle}>{avatarUri ? "Фото выбрано" : "Добавить фото"}</Text>
                  <Text style={styles.avatarPickText}>Появится в четвертом круге экосистемы</Text>
                </View>
              </Pressable>

              <Text style={styles.fieldLabel}>Имя</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Введите имя"
                placeholderTextColor="rgba(30,20,70,0.35)"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (errors.name) setErrors((p) => ({ ...p, name: false }));
                }}
              />

              <Text style={styles.fieldLabel}>Город</Text>
              <View style={[styles.pickerWrap, errors.city && styles.pickerWrapError]}>
                <Picker
                 mode="dropdown"
                  selectedValue={city}
                  onValueChange={(val) => {
                    const v = String(val);
                    setCity(v);
                    if (errors.city) setErrors((p) => ({ ...p, city: false }));
                  }}
                  style={styles.picker}
                  dropdownIconColor="rgba(30,20,70,0.5)"
                >
                  <Picker.Item label="Выберите город" value="" color="rgba(30,20,70,0.35)" />
                  {CITIES.map((c) => (
                    <Picker.Item key={c} label={c} value={c} color="rgba(30,20,70,0.85)" />
                  ))}
                </Picker>
              </View>

              <Text style={styles.fieldLabel}>Почта</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="example@mail.com"
                placeholderTextColor="rgba(30,20,70,0.35)"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors((p) => ({ ...p, email: false }));
                }}
              />

              <Text style={styles.fieldLabel}>Номер телефона</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="+7 (___) ___-__-__"
                placeholderTextColor="rgba(30,20,70,0.35)"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={formatPhone}
              />

              <Text style={styles.fieldLabel}>Код из SMS</Text>
              <TextInput
                style={[styles.input, errors.smsCode && styles.inputError]}
                placeholder="1111"
                placeholderTextColor="rgba(30,20,70,0.35)"
                keyboardType="number-pad"
                value={smsCode}
                onChangeText={(v) => {
                  setSmsCode(v.replace(/\D/g, "").slice(0, 6));
                  if (errors.smsCode) setErrors((p) => ({ ...p, smsCode: false }));
                }}
              />

              <View style={styles.regInfoRow}>
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.95)" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.regInfoTitle}>Единая регистрация — доступ ко всем трём приложениям</Text>
                  <Text style={styles.regInfoText}>Управляйте своей видимостью и настройками приватности</Text>
                </View>
              </View>

              <Pressable style={styles.submitBtn} onPress={handleRegister}>
                <Text style={styles.submitBtnText}>Зарегистрироваться</Text>
              </Pressable>
            </ScrollView>
          )}

          {showConfetti && <ConfettiAnimation onFinish={handleConfettiFinish} />}

          <Pressable
            style={styles.modalCloseBtn}
            onPress={() => {
              if (isRegistered) confirmLogoutAll();
              else handleClose();
            }}
          >
            <Ionicons name={isRegistered ? "log-out-outline" : "close"} size={22} color="rgba(30,20,70,0.6)" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Кнопка: перелив "цветотенью" + звёздочки справа от текста.
 */
function ShimmerCtaButton({ title, onPress }: { title: string; onPress: () => void }) {
  const glow = useRef(new Animated.Value(0)).current;

  const stars = useRef(
    Array.from({ length: 3 }, (_, i) => ({
      id: `b-${i}`,
      o: new Animated.Value(0.35 + Math.random() * 0.35),
      s: new Animated.Value(0.9 + Math.random() * 0.4),
    }))
  ).current;

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    glowLoop.start();

    const starLoops: Animated.CompositeAnimation[] = [];
    stars.forEach((st) => {
      const dur = 1200 + Math.random() * 1800;
      const anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(st.o, {
              toValue: 0.12 + Math.random() * 0.22,
              duration: dur * 0.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(st.s, {
              toValue: 0.75 + Math.random() * 0.45,
              duration: dur * 0.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(st.o, {
              toValue: 0.45 + Math.random() * 0.45,
              duration: dur * 0.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(st.s, {
              toValue: 0.95 + Math.random() * 0.55,
              duration: dur * 0.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      starLoops.push(anim);
      anim.start();
    });

    return () => {
      glowLoop.stop();
      starLoops.forEach((a) => a.stop());
    };
  }, [glow, stars]);

  const shadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.55],
  });
  const shadowRadius = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 26],
  });
  const elevation = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 12],
  });

  const tintA = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.22],
  });
  const tintB = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.06],
  });

  return (
    <Animated.View
      style={[
        styles.bottomCta,
        {
          shadowOpacity: shadowOpacity as any,
          shadowRadius: shadowRadius as any,
          elevation: elevation as any,
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />

      <Animated.View pointerEvents="none" style={[styles.ctaTintA, { opacity: tintA as any }]} />
      <Animated.View pointerEvents="none" style={[styles.ctaTintB, { opacity: tintB as any }]} />

      <View pointerEvents="none" style={styles.ctaRow}>
        <Text style={styles.bottomCtaText}>{title}</Text>

        <View style={styles.ctaRightStars}>
          {stars.map((st, idx) => (
            <Animated.View
              key={st.id}
              style={[
                styles.ctaStarDot,
                {
                  opacity: st.o,
                  transform: [{ scale: st.s }],
                  marginLeft: idx === 0 ? 0 : 6,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

export default function PreviewScreen({ navigation }: any) {
  const windowSize = useWindowDimensions();

  // Для web-публикации на Netlify фиксируем экран как мобильный холст.
  // Иначе браузер меняет пропорции viewport, фон crop'ается через cover,
  // а интерактивные круги уезжают от своих мест.
  const width = Platform.OS === "web" ? Math.min(windowSize.width, 430) : windowSize.width;
  const height =
    Platform.OS === "web"
      ? Math.round(width * (PREVIEW_BACKGROUND_HEIGHT / PREVIEW_BACKGROUND_WIDTH))
      : Math.round(width * (PREVIEW_BACKGROUND_HEIGHT / PREVIEW_BACKGROUND_WIDTH));

  // ✅ ЕДИНСТВЕННЫЙ источник истины
  const eco = useContext(EcosystemContext) as any;
  const profile = eco?.profile ?? null;
  const setProfile = eco?.setProfile as (p: any | null) => void;

  const isRegistered = !!profile;
  const avatarUri = profile?.avatarUri;

  const [showRegister, setShowRegister] = useState(false);

  const [idleMode, setIdleMode] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const layout = useMemo(() => {
    // На web-фоне используем resizeMode="stretch" внутри холста с исходным aspect-ratio.
    // Поэтому координаты кругов считаются напрямую от размеров холста.
    const renderedBgWidth = width;
    const renderedBgHeight = height;

    const mapCircle = (circle: BgCircle) => {
      const size = circle.d * renderedBgWidth;
      const center = {
        x: circle.cx * renderedBgWidth,
        y: circle.cy * renderedBgHeight,
      };

      return {
        size,
        x: center.x - size / 2,
        y: center.y - size / 2,
        center,
      };
    };

    const top = mapCircle(BACKGROUND_CIRCLES.top);
    const avatar = mapCircle(BACKGROUND_CIRCLES.avatar);
    const heart = mapCircle(BACKGROUND_CIRCLES.heart);
    const bot = mapCircle(BACKGROUND_CIRCLES.bot);

    const averageOrbSize = (top.size + heart.size + bot.size) / 3;

    return {
      orbSize: averageOrbSize,
      pTop: { x: top.x, y: top.y },
      pAvatar: { x: avatar.x, y: avatar.y },
      pMid: { x: heart.x, y: heart.y },
      pBot: { x: bot.x, y: bot.y },
      topSize: top.size,
      avatarSize: avatar.size,
      midSize: heart.size,
      botSize: bot.size,
      centers: [top.center, heart.center, bot.center],
    };
  }, [width, height]);

  const topOff = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const midOff = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const botOff = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      if (!ENABLE_IDLE_FLOAT) return;
      setIdleMode(true);
    }, 10000);

    setIdleMode((prev) => (prev ? false : prev));
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!idleMode) {
      Animated.parallel([
        Animated.spring(topOff, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
        Animated.spring(midOff, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
        Animated.spring(botOff, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
      ]).start();
      return;
    }

    const orbSize = layout.orbSize;
    const radius = orbSize / 2;
    const pad = 14;

    const bounds = {
      minX: pad,
      maxX: width - pad - orbSize,
      minY: pad + 40,
      maxY: height - pad - orbSize - 90,
    };

    const pos = {
      top: { x: 0, y: 0 },
      mid: { x: 0, y: 0 },
      bot: { x: 0, y: 0 },
    };

    const vel = {
      top: { x: (Math.random() * 2 - 1) * 140, y: (Math.random() * 2 - 1) * 120 },
      mid: { x: (Math.random() * 2 - 1) * 140, y: (Math.random() * 2 - 1) * 120 },
      bot: { x: (Math.random() * 2 - 1) * 140, y: (Math.random() * 2 - 1) * 120 },
    };

    let raf = 0;
    let last = Date.now();

    const base = {
      top: { x: layout.pTop.x, y: layout.pTop.y },
      mid: { x: layout.pMid.x, y: layout.pMid.y },
      bot: { x: layout.pBot.x, y: layout.pBot.y },
    };

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const resolveCollision = (aKey: keyof typeof pos, bKey: keyof typeof pos) => {
      const ax = base[aKey].x + pos[aKey].x + radius;
      const ay = base[aKey].y + pos[aKey].y + radius;
      const bx = base[bKey].x + pos[bKey].x + radius;
      const by = base[bKey].y + pos[bKey].y + radius;

      const dx = bx - ax;
      const dy = by - ay;
      const d = Math.sqrt(dx * dx + dy * dy);
      const minDist = radius * 2 * 0.96;

      if (d > 0 && d < minDist) {
        const nx = dx / d;
        const ny = dy / d;
        const overlap = (minDist - d) / 2;

        pos[aKey].x -= nx * overlap;
        pos[aKey].y -= ny * overlap;
        pos[bKey].x += nx * overlap;
        pos[bKey].y += ny * overlap;

        const va = vel[aKey];
        const vb = vel[bKey];

        const vaN = va.x * nx + va.y * ny;
        const vbN = vb.x * nx + vb.y * ny;

        const impulse = vbN - vaN;

        va.x += impulse * nx;
        va.y += impulse * ny;

        vb.x -= impulse * nx;
        vb.y -= impulse * ny;
      }
    };

    const ensureNeverStops = (k: keyof typeof vel) => {
      const speed = Math.sqrt(vel[k].x * vel[k].x + vel[k].y * vel[k].y);
      if (speed < 55) {
        const angle = Math.random() * Math.PI * 2;
        vel[k].x += Math.cos(angle) * 90;
        vel[k].y += Math.sin(angle) * 80;
      }
    };

    const step = () => {
      const now = Date.now();
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;

      const friction = 0.9992;

      (["top", "mid", "bot"] as const).forEach((k) => {
        pos[k].x += vel[k].x * dt;
        pos[k].y += vel[k].y * dt;

        const absX = base[k].x + pos[k].x;
        const absY = base[k].y + pos[k].y;

        if (absX < bounds.minX) {
          pos[k].x += bounds.minX - absX;
          vel[k].x *= -1;
        } else if (absX > bounds.maxX) {
          pos[k].x -= absX - bounds.maxX;
          vel[k].x *= -1;
        }

        if (absY < bounds.minY) {
          pos[k].y += bounds.minY - absY;
          vel[k].y *= -1;
        } else if (absY > bounds.maxY) {
          pos[k].y -= absY - bounds.maxY;
          vel[k].y *= -1;
        }

        vel[k].x *= friction;
        vel[k].y *= friction;

        vel[k].x += (Math.random() * 2 - 1) * 18 * dt;
        vel[k].y += (Math.random() * 2 - 1) * 18 * dt;

        vel[k].x = clamp(vel[k].x, -220, 220);
        vel[k].y = clamp(vel[k].y, -190, 190);

        ensureNeverStops(k);
      });

      resolveCollision("top", "mid");
      resolveCollision("mid", "bot");
      resolveCollision("top", "bot");

      topOff.setValue({ x: pos.top.x, y: pos.top.y });
      midOff.setValue({ x: pos.mid.x, y: pos.mid.y });
      botOff.setValue({ x: pos.bot.x, y: pos.bot.y });

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [
    idleMode,
    layout.orbSize,
    layout.pBot.x,
    layout.pBot.y,
    layout.pMid.x,
    layout.pMid.y,
    layout.pTop.x,
    layout.pTop.y,
    topOff,
    midOff,
    botOff,
    width,
    height,
  ]);

  const openApp = (appKey: AppKey) => {
    const routeName =
      appKey === "sdelaiZa"
        ? "SdelaiZa"
        : appKey === "sledimZa"
        ? "SlediZa"
        : "Zadrugim";

    if (typeof navigation?.push === "function") {
      navigation.push(routeName);
      return;
    }

    navigation.navigate(routeName);
  };

  return (
    <View
      style={styles.root}
      onTouchStart={resetIdleTimer}
      onStartShouldSetResponderCapture={() => {
        resetIdleTimer();
        return false;
      }}
      onResponderGrant={resetIdleTimer}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <ScrollView
        style={styles.previewScroll}
        contentContainerStyle={[
          styles.previewScrollContent,
          { minHeight: windowSize.height, paddingVertical: Platform.OS === "web" ? 0 : 0 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.previewCanvas, { width, height }]}>
          <ImageBackground source={PREVIEW_BACKGROUND} resizeMode="stretch" style={StyleSheet.absoluteFill} />

          {Platform.OS === "web" ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="СделайЗА"
                onPress={() => openApp("sdelaiZa")}
                style={[
                  styles.webHotspot,
                  {
                    left: layout.pTop.x,
                    top: layout.pTop.y,
                    width: layout.topSize,
                    height: layout.topSize,
                    borderRadius: layout.topSize / 2,
                  },
                ]}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Регистрация"
                onPress={() => setShowRegister(true)}
                style={[
                  styles.webHotspot,
                  {
                    left: layout.pAvatar.x,
                    top: layout.pAvatar.y,
                    width: layout.avatarSize,
                    height: layout.avatarSize,
                    borderRadius: layout.avatarSize / 2,
                  },
                ]}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ЗАдружи"
                onPress={() => openApp("zadrugim")}
                style={[
                  styles.webHotspot,
                  {
                    left: layout.pMid.x,
                    top: layout.pMid.y,
                    width: layout.midSize,
                    height: layout.midSize,
                    borderRadius: layout.midSize / 2,
                  },
                ]}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="СледиЗА"
                onPress={() => openApp("sledimZa")}
                style={[
                  styles.webHotspot,
                  {
                    left: layout.pBot.x,
                    top: layout.pBot.y,
                    width: layout.botSize,
                    height: layout.botSize,
                    borderRadius: layout.botSize / 2,
                  },
                ]}
              />
            </>
          ) : (
            <>
              <Animated.View style={[styles.orbWrap, { left: layout.pTop.x, top: layout.pTop.y }]}>
                <GlowingOrb size={layout.topSize} icon="briefcase-outline" onPress={() => openApp("sdelaiZa")} />
              </Animated.View>

              <Animated.View style={[styles.orbWrap, { left: layout.pAvatar.x, top: layout.pAvatar.y }]}>
                <AvatarOrb size={layout.avatarSize} avatarUri={avatarUri} onPress={() => setShowRegister(true)} />
              </Animated.View>

              <Animated.View style={[styles.orbWrap, { left: layout.pMid.x, top: layout.pMid.y }]}>
                <GlowingOrb size={layout.midSize} icon="heart-outline" onPress={() => openApp("zadrugim")} />
              </Animated.View>

              <Animated.View style={[styles.orbWrap, { left: layout.pBot.x, top: layout.pBot.y }]}>
                <GlowingOrb size={layout.botSize} icon="people-outline" onPress={() => openApp("sledimZa")} />
              </Animated.View>
            </>
          )}

          <ShimmerCtaButton title={isRegistered ? "Вход" : "Войти/Зарегистрироваться"} onPress={() => setShowRegister(true)} />
        </View>
      </ScrollView>

      <RegisterModal
        visible={showRegister}
        onClose={() => setShowRegister(false)}
        setProfile={setProfile}
        isRegistered={isRegistered}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EAF4FF" },
  previewScroll: { flex: 1, width: "100%" },
  previewScrollContent: {
    alignItems: "center",
    backgroundColor: "#EAF4FF",
  },
  previewCanvas: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#EAF4FF",
  },
  orbWrap: { position: "absolute" },
  webHotspot: { position: "absolute", backgroundColor: "transparent", zIndex: 20 },

  mist: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  star: {
    position: "absolute",
    shadowColor: "#9fd8ff",
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  starHalo: {
    position: "absolute",
    opacity: 0.22,
    shadowColor: "#c7f0ff",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },

  topTitleWrap: {
    position: "absolute",
    top: Platform.select({ ios: 58, android: 44 }),
    left: 18,
    right: 18,
    alignItems: "center",
  },
  topTitle: {
    color: "rgba(30, 20, 70, 0.78)",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 2,
  },
  topTitle2: {
    marginTop: 2,
    color: "rgba(30, 20, 70, 0.72)",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  topSubtitle: {
    marginTop: 8,
    color: "rgba(30, 20, 70, 0.55)",
    fontSize: 14,
    fontWeight: "700",
  },

  orb: { justifyContent: "center", alignItems: "center" },
  glass: {
    position: "absolute",
    borderWidth: 0,
    backgroundColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#7E6BFF",
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 0 },
    }),
  },
  ring: { position: "absolute", borderWidth: 2 },
  ringSegment: { position: "absolute", borderWidth: 3 },

  iconWrap: {
    width: "70%",
    height: "70%",
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  dnaLine: {
    position: "absolute",
    height: 2,
    backgroundColor: "rgba(120, 200, 255, 0.18)",
  },
  dnaRung: {
    position: "absolute",
    height: 1,
    backgroundColor: "rgba(255, 170, 235, 0.22)",
  },
  dnaNode: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#9F8CFF",
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  avatarOrb: {
    overflow: "hidden",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "rgba(160,230,255,0.85)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },

  bottomCta: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: 36,
    height: 54,
    borderRadius: 28,
    backgroundColor: "rgba(120, 120, 255, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "rgba(120, 200, 255, 1)",
    shadowOffset: { width: 0, height: 10 },
  },

  ctaTintA: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(140,240,255,1)",
  },
  ctaTintB: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,120,220,1)",
  },

  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ctaRightStars: {
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  ctaStarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.95)",
  },

  bottomCtaText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 18,
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "88%",
    maxHeight: "85%",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 12 },
    }),
  },
  modalCloseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "rgba(30,20,70,0.85)",
    textAlign: "center",
    marginBottom: 18,
  },

  avatarPick: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(240,242,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(120,120,255,0.22)",
    marginBottom: 8,
  },
  avatarPickPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "rgba(220,226,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarPickImage: {
    width: "100%",
    height: "100%",
  },
  avatarPickTitle: {
    color: "rgba(30,20,70,0.84)",
    fontSize: 15,
    fontWeight: "900",
  },
  avatarPickText: {
    marginTop: 3,
    color: "rgba(30,20,70,0.52)",
    fontSize: 12,
    fontWeight: "700",
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(30,20,70,0.6)",
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(120,120,255,0.25)",
    backgroundColor: "rgba(240,242,255,0.7)",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "rgba(30,20,70,0.85)",
  },
  pickerWrap: {
  height: 46,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(120,120,255,0.25)",
  backgroundColor: "rgba(240,242,255,0.7)",
  overflow: "hidden",
  justifyContent: "center",
},

picker: {
  height: 46,
  width: "100%",
  color: "rgba(30,20,70,0.85)",
  fontSize: 15,
  backgroundColor: "transparent",

  // ✅ Убираем “внутреннюю” рамку у select на WEB
  ...(Platform.OS === "web"
    ? ({
        outlineStyle: "none",
        outlineWidth: 0,
        borderWidth: 0,
        boxShadow: "none",
        appearance: "none",
        paddingLeft: 12,
        paddingRight: 34, // чтобы текст не залезал под стрелку
      } as any)
    : null),
},

  regInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    backgroundColor: "rgba(240,242,255,0.6)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  lockBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(70, 90, 180, 0.70)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  regInfoTitle: {
    color: "rgba(20, 16, 50, 0.82)",
    fontSize: 13,
    fontWeight: "800",
  },
  regInfoText: {
    marginTop: 2,
    color: "rgba(20, 16, 50, 0.55)",
    fontSize: 11,
    fontWeight: "700",
  },

  submitBtn: {
    marginTop: 18,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(100, 100, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },

  inputError: {
    borderColor: "rgba(255, 60, 60, 0.9)",
  },
  pickerWrapError: {
    borderColor: "rgba(255, 60, 60, 0.9)",
  },
});

const successStyles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "rgba(30,20,70,0.85)",
    textAlign: "center",
    marginBottom: 14,
  },
  description: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(30,20,70,0.65)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  appList: {
    marginBottom: 20,
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(240,242,255,0.7)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(120,120,255,0.15)",
    marginBottom: 14,
  },
  appName: {
    fontSize: 17,
    fontWeight: "800",
    color: "rgba(30,20,70,0.82)",
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(200,200,210,0.5)",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: "rgba(120,100,255,0.75)",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  hint: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(30,20,70,0.5)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  closeBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(100, 100, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
});

