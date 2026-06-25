import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import PreviewScreen from "../components/PreviewScreen";
import type { RootStackParamList } from "../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = "dating" | "search" | "events" | "chats" | "profile";
type AppStage = "ecosystem" | "preview" | "main"; // ecosystem = первое окно, preview = экран экосистемы (PreviewScreen), main = основной экран

type ProfileCard = {
  id: string;
  name: string;
  age: number;
  verified?: boolean;
  online?: boolean;
  distanceKm?: number;
  city?: string;
  about?: string;
  photo: string;
  photo2?: string;
};

const { width: W, height: H } = Dimensions.get("window");

const COLORS = {
  bg: "#FFFFFF",
  text: "#111827",
  muted: "rgba(17,24,39,0.55)",
  line: "rgba(17,24,39,0.10)",
  card: "#FFFFFF",
  chipBg: "rgba(17,24,39,0.06)",
  chipBgOn: "rgba(244,114,182,0.16)",
  pink: "#F472B6",
  pinkSoft: "#FBCFE8",
  purpleSoft: "#E9D5FF",
  lilac: "#EDE9FE",
  darkBtn: "#2B2B2B",
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** ---------- Bottom Sheet (simple) ---------- */
function Sheet({
  visible,
  onClose,
  title,
  children,
  height = Math.min(H * 0.82, 720),
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number;
}) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 shown

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 180,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height + 32, 0] });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheetWrap,
            {
              height,
              paddingBottom: Math.max(insets.bottom, 14),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.sheetHandleRow}>
            <View style={styles.sheetHandle} />
          </View>

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title ?? ""}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </Pressable>
          </View>

          <View style={styles.sheetBody}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** ---------- Top Bar ---------- */
function TopBar({
  stage,
  tab,
  onTab,
  likesBadge,
  chatsBadge,
  onOpenLikes,
  onOpenFilters,
  onBackFromDating,
  onEnterMain,
}: {
  stage: AppStage;
  tab: Tab;
  onTab: (t: Tab) => void;
  likesBadge: number;
  chatsBadge: number;
  onOpenLikes: () => void;
  onOpenFilters: () => void;

  // стрелка на экране с девушкой -> вернуть в предыдущее меню (ecosystem)
  onBackFromDating: () => void;

  // кнопка "В экосистему" на первом экране -> перейти в превью (main)
  onEnterMain: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isProfile = tab === "profile";

  // 1) ПЕРВЫЙ ЭКРАН (ecosystem): слева "В экосистему", центр "ЗАДРУЖИ", справа фильтры
  if (stage === "ecosystem") {
    return (
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.topRowEcosystem}>
          <Pressable onPress={onEnterMain} style={styles.ecoBtn}>
            <Text style={styles.ecoBtnTxt}>В экосистему</Text>
          </Pressable>

          <View pointerEvents="none" style={styles.topTitleCenterAbs}>
            <Text style={styles.topTitleDating}>ЗАДРУЖИ</Text>
          </View>

          <Pressable onPress={onOpenFilters} style={styles.topIconBtn}>
            <Ionicons name="options-outline" size={22} color={COLORS.text} />
          </Pressable>
        </View>
      </View>
    );
  }

  // 2) ЭКРАН С ДЕВУШКОЙ (main + dating): стрелка влево, центр бренд в капсуле, справа сердце+badge и фильтры
  if (stage === "main" && tab === "dating") {
    return (
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.topRowDatingMamba}>
          <Pressable onPress={onBackFromDating} style={styles.topIconBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>

          <View pointerEvents="none" style={styles.brandCapsuleCenterAbs}>
            <View style={styles.brandCapsule}>
              <Text style={styles.brandCapsuleTxt}>ЗАДРУЖИ</Text>
            </View>
          </View>

          <View style={styles.topRightGroup}>
            <Pressable onPress={onOpenLikes} style={styles.topIconBtn}>
              <Ionicons name="heart-outline" size={24} color={COLORS.text} />
              {likesBadge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{likesBadge}</Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable onPress={onOpenFilters} style={styles.topIconBtn}>
              <Ionicons name="options-outline" size={24} color={COLORS.text} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // 3) Остальные вкладки — оставляем как было
  return (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => onTab("profile")} style={styles.topIconBtn}>
          <Ionicons name="person-outline" size={24} color={COLORS.text} />
        </Pressable>

        <Pressable onPress={() => onTab("search")} style={styles.topIconBtn}>
          <Ionicons name="search-outline" size={24} color={COLORS.text} />
        </Pressable>

        <Pressable onPress={onOpenLikes} style={styles.topIconBtn}>
          <Ionicons name="heart-outline" size={24} color={COLORS.text} />
          {likesBadge > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{likesBadge}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable onPress={() => onTab("chats")} style={styles.topIconBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.text} />
          {chatsBadge > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{chatsBadge}</Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.topBrandWrap}>
          <Text style={[styles.brand, isProfile && { color: "#E11D48" }]}>ЗАДРУЖИ</Text>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable onPress={() => onTab("dating")} style={styles.topIconBtn}>
          <Ionicons name="albums-outline" size={24} color={COLORS.text} />
        </Pressable>

        <Pressable onPress={() => onTab("events")} style={styles.topIconBtn}>
          <Ionicons name="ticket-outline" size={24} color={COLORS.text} />
        </Pressable>

        <Pressable onPress={onOpenFilters} style={styles.topIconBtn}>
          <Ionicons name="options-outline" size={24} color={COLORS.text} />
        </Pressable>
      </View>
    </View>
  );
}

/** ---------- Bottom Tabs ---------- */
function BottomTabs({
  tab,
  onTab,
  likesBadge,
  chatsBadge,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  likesBadge: number;
  chatsBadge: number;
}) {
  const insets = useSafeAreaInsets();

  const items: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }> =
    [
      { key: "dating", label: "Знакомства", icon: "albums-outline" },
      { key: "search", label: "Поиск", icon: "search-outline" },
      { key: "events", label: "События", icon: "ticket-outline", badge: likesBadge },
      { key: "chats", label: "Чаты", icon: "chatbubble-ellipses-outline", badge: chatsBadge },
      { key: "profile", label: "Профиль", icon: "person-outline" },
    ];

  return (
    <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map((it) => {
        const active = it.key === tab;
        const color = active ? COLORS.text : COLORS.muted;
        return (
          <Pressable key={it.key} onPress={() => onTab(it.key)} style={styles.tabBtn}>
            <Ionicons name={it.icon} size={22} color={color} />
            {!!it.badge && it.badge > 0 ? (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeTxt}>{it.badge}</Text>
              </View>
            ) : null}
            <Text style={[styles.tabTxt, active && styles.tabTxtOn]} numberOfLines={1}>
              {it.label}
            </Text>
            {active ? <View style={styles.tabDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** ---------- UI bits ---------- */
function DarkPillButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.darkBtn}>
      <Text style={styles.darkBtnTxt}>{title}</Text>
    </Pressable>
  );
}

function Segmented({
  left,
  right,
  value,
  onChange,
}: {
  left: string;
  right: string;
  value: "left" | "right";
  onChange: (v: "left" | "right") => void;
}) {
  return (
    <View style={styles.segment}>
      <Pressable
        onPress={() => onChange("left")}
        style={[styles.segmentItem, value === "left" && styles.segmentItemOn]}
      >
        <Text style={[styles.segmentTxt, value === "left" && styles.segmentTxtOn]}>{left}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("right")}
        style={[styles.segmentItem, value === "right" && styles.segmentItemOn]}
      >
        <Text style={[styles.segmentTxt, value === "right" && styles.segmentTxtOn]}>{right}</Text>
      </Pressable>
    </View>
  );
}

function RangeSlider({
  label,
  min,
  max,
  step,
  leftValue,
  rightValue,
  onChange,
  formatValue,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  leftValue: number;
  rightValue: number;
  onChange: (l: number, r: number) => void;
  formatValue: (l: number, r: number) => string;
}) {
  const trackRef = useRef<View>(null);
  const [trackW, setTrackW] = useState(0);

  const toX = (v: number) => {
    if (!trackW) return 0;
    const t = (v - min) / (max - min);
    return clamp(t * trackW, 0, trackW);
  };

  const toV = (x: number) => {
    if (!trackW) return min;
    const t = clamp(x / trackW, 0, 1);
    const raw = min + t * (max - min);
    const snapped = Math.round(raw / step) * step;
    return clamp(snapped, min, max);
  };

  const leftX = toX(leftValue);
  const rightX = toX(rightValue);

  const getLocalX = (gestureX: number, cb: (x: number) => void) => {
    trackRef.current?.measureInWindow((x) => {
      cb(gestureX - x);
    });
  };

  const leftPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        getLocalX(g.moveX, (lx) => {
          const v = toV(lx);
          const nextL = clamp(v, min, rightValue - step);
          onChange(nextL, rightValue);
        });
      },
    })
  ).current;

  const rightPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        getLocalX(g.moveX, (lx) => {
          const v = toV(lx);
          const nextR = clamp(v, leftValue + step, max);
          onChange(leftValue, nextR);
        });
      },
    })
  ).current;

  return (
    <View style={{ marginTop: 18 }}>
      <View style={styles.sliderRow}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.sectionValue}>{formatValue(leftValue, rightValue)}</Text>
      </View>

      <View ref={trackRef} style={styles.rangeWrap} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
        <View style={styles.rangeTrack} />

        {trackW > 0 ? (
          <View style={[styles.rangeActive, { left: leftX, width: Math.max(0, rightX - leftX) }]} />
        ) : null}

        <View style={[styles.rangeThumb, { left: leftX - 13 }]} {...leftPan.panHandlers} />
        <View style={[styles.rangeThumb, { left: rightX - 13 }]} {...rightPan.panHandlers} />
      </View>
    </View>
  );
}

/** ---------- FIRST SCREEN (ecosystem) ---------- */
function LocationGateScreen({ onAllow }: { onAllow: () => void }) {
  return (
    <View style={styles.locGateWrap}>
      <View style={styles.locGateCard}>
        <View style={styles.locGateImageBox}>
          <Ionicons name="location" size={120} color="#7C3AED" />
        </View>

        <Text style={styles.locGateTitle}>Твоё местоположение</Text>
        <Text style={styles.locGateSub}>
          Чтобы искать знакомства поблизости,{"\n"}
          разреши приложению доступ к твоему{"\n"}
          местоположению.
        </Text>

        <View style={{ marginTop: 22, width: "100%" }}>
          <DarkPillButton title="Разрешить" onPress={onAllow} />
        </View>
      </View>
    </View>
  );
}

/** ---------- Main App ---------- */
export default function ZadrugimApp() {
  const navigation = useNavigation<Nav>();

  // 1) При старте показываем ecosystem экран
  const [stage, setStage] = useState<AppStage>("ecosystem");

  const [tab, setTab] = useState<Tab>("dating");

  const [likesBadge, setLikesBadge] = useState(31);
  const [chatsBadge, setChatsBadge] = useState(1);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [likesVipOpen, setLikesVipOpen] = useState(false);
  const [superLikeOpen, setSuperLikeOpen] = useState(false);
  const [vipStatusOpen, setVipStatusOpen] = useState(false);

  const [chatMoreOpen, setChatMoreOpen] = useState(false);
  const [chatAttachOpen, setChatAttachOpen] = useState(false);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [complimentsOpen, setComplimentsOpen] = useState(false);
  const [addPhotoOpen, setAddPhotoOpen] = useState(false);

  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [heightOpen, setHeightOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [kidsOpen, setKidsOpen] = useState(false);
  const [smokeOpen, setSmokeOpen] = useState(false);
  const [alcoholOpen, setAlcoholOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);
  const [ageRangeOpen, setAgeRangeOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  // filters state (активные)
  const [filtersLookingFor, setFiltersLookingFor] = useState<"left" | "right">("left"); // Девушку / Друга
  const [ageMin, setAgeMin] = useState(32);
  const [ageMax, setAgeMax] = useState(45);
  const [heightMin, setHeightMin] = useState(150);
  const [heightMax, setHeightMax] = useState(220);

  const profiles: ProfileCard[] = useMemo(
    () => [
      {
        id: "p1",
        name: "Екатерина",
        age: 43,
        verified: true,
        online: true,
        distanceKm: 13,
        city: "Ростов-на-Дону",
        about:
          "Та красота, которую я ищу, исходит изнутри: сила, мужество! Если ты высокий, весёлый и обаятельный - напиши! Я жду))",
        photo:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
        photo2:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "p2",
        name: "Не_знакомка",
        age: 39,
        verified: true,
        online: true,
        distanceKm: 7,
        city: "Ростов-на-Дону",
        about: "Позитивное общение, прогулки, уют.",
        photo:
          "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=1200&q=80",
        photo2:
          "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1200&q=80",
      },
    ],
    []
  );

  const [datingIndex, setDatingIndex] = useState(0);
  const current = profiles[datingIndex % profiles.length];

  const gridPeople = useMemo(
    () => [
      { id: "g1", name: "Полина", age: 40, verified: true, online: true, img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=80" },
      { id: "g2", name: "Валерия", age: 36, verified: false, online: true, img: "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=700&q=80" },
      { id: "g3", name: "Инна", age: 45, verified: false, online: true, img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=700&q=80" },
      { id: "g4", name: "Алёна", age: 40, verified: true, online: true, img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=700&q=80" },
      { id: "g5", name: "—", age: 0, verified: false, online: false, img: "https://images.unsplash.com/photo-1520975958228-bbd28f9f6e19?auto=format&fit=crop&w=700&q=80" },
    ],
    []
  );

  const chats = useMemo(
    () => [
      { id: "c1", title: "Оповещения", preview: "Здравствуйте, Симон!...",
        time: "13:21", dot: true, star: true,
        avatar: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=256&q=80" },
      { id: "c2", title: "Марта", preview: "Привет! Меня зовут Марта, я виртуал...",
        time: "13:21", dot: true, badge: 1,
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80" },
    ],
    []
  );

  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const openChat = chats.find((c) => c.id === openChatId);

  function openFilters() {
    setFiltersOpen(true);
  }

  function openLikes() {
    setLikesVipOpen(true);
  }

  function doLike() {
    setDatingIndex((x) => x + 1);
  }

  function doSuperLike() {
    setSuperLikeOpen(true);
  }

  // Кнопка "В экосистему" открывает общий экран экосистемы внутри ЗАдружи.
  const enterMainPreview = () => {
    setStage("preview");
  };

  // 2) Стрелка сверху на экране с девушкой -> вернуться в предыдущее меню (ecosystem)
  const backToEcosystem = () => {
    setStage("ecosystem");
  };

  /** ----- content ----- */
  const content = (
    <View style={styles.content}>
      {stage === "ecosystem" ? (
        <LocationGateScreen
          onAllow={() => {
            // вы не просили реальные permissions — просто открываем ваш sheet "Местоположение"
            setLocationOpen(true);
          }}
        />
      ) : tab === "dating" ? (
        <DatingScreen
          profile={current}
          onLike={doLike}
          onSuperLike={doSuperLike}
          onOpenChat={() => setOpenChatId("c2")}
          onOpenMore={() => setVipStatusOpen(true)}
        />
      ) : tab === "search" ? (
        <SearchScreen data={gridPeople} onOpenFilters={openFilters} />
      ) : tab === "events" ? (
        <EventsScreen onOpenVip={() => setVipStatusOpen(true)} onOpenAll={() => setLikesVipOpen(true)} />
      ) : tab === "chats" ? (
        <ChatsScreen data={chats} onOpenChat={(id) => setOpenChatId(id)} onOpenFilterMenu={() => setChatMoreOpen(true)} />
      ) : (
        <ProfileScreen
          onEdit={() => setProfileEditOpen(true)}
          onSettings={() => setProfileSettingsOpen(true)}
          onAddPhoto={() => setAddPhotoOpen(true)}
        />
      )}
    </View>
  );

  const openFromEmbeddedPreview = (routeName: keyof RootStackParamList | string) => {
    if (routeName === "Zadrugim") {
      setStage("main");
      setTab("dating");
      return;
    }

    if (routeName === "Preview") {
      setStage("preview");
      return;
    }

    if (routeName === "SdelaiZa" || routeName === "SlediZa") {
      if (typeof (navigation as any).push === "function") {
        (navigation as any).push(routeName);
        return;
      }

      navigation.navigate(routeName as any);
    }
  };

  const embeddedPreviewNavigation = {
    navigate: openFromEmbeddedPreview,
    push: openFromEmbeddedPreview,
    goBack: () => {
      setStage("main");
      setTab("dating");
    },
    canGoBack: () => true,
  };

  return (
  <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

    {stage === "preview" ? (
      <PreviewScreen navigation={embeddedPreviewNavigation} />
    ) : (
      <>
        <TopBar
          stage={stage}
          tab={tab}
          onTab={setTab}
          likesBadge={likesBadge}
          chatsBadge={chatsBadge}
          onOpenLikes={openLikes}
          onOpenFilters={openFilters}
          onBackFromDating={backToEcosystem}
          onEnterMain={enterMainPreview}
        />

        {content}

        <BottomTabs tab={tab} onTab={setTab} likesBadge={likesBadge} chatsBadge={chatsBadge} />

        {/* ---- Filters sheet ---- */}
        <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title="Фильтры">
          <View style={styles.filtersBlock}>
            <RowNav
              icon="navigate-outline"
              title="Местоположение"
              subtitle="Ростов-на-Дону, Ростовская область"
              onPress={() => {
                setFiltersOpen(false);
                setLocationOpen(true);
              }}
            />

            <Text style={[styles.h2, { marginTop: 18 }]}>Ищу</Text>
            <Segmented left="Девушку" right="Друга" value={filtersLookingFor} onChange={setFiltersLookingFor} />

            <RangeSlider
              label="Возраст"
              min={18}
              max={80}
              step={1}
              leftValue={ageMin}
              rightValue={ageMax}
              onChange={(l, r) => {
                setAgeMin(l);
                setAgeMax(r);
              }}
              formatValue={(l, r) => `${l}-${r}`}
            />

            <RangeSlider
              label="Рост"
              min={120}
              max={230}
              step={5}
              leftValue={heightMin}
              rightValue={heightMax}
              onChange={(l, r) => {
                setHeightMin(l);
                setHeightMax(r);
              }}
              formatValue={(l, r) => `${l}-${r} см`}
            />

            <View style={{ height: 18 }} />
          </View>

          <View style={{ marginTop: "auto" }}>
            <DarkPillButton title="Сохранить" onPress={() => setFiltersOpen(false)} />
          </View>
        </Sheet>

        {/* ---- Likes paywall (VIP status) ---- */}
        <Sheet visible={likesVipOpen} onClose={() => setLikesVipOpen(false)} title="VIP-статус">
          <View style={{ alignItems: "center", paddingTop: 10 }}>
            <View style={styles.vipIcon}>
              <Ionicons name="heart" size={22} color={COLORS.pink} />
            </View>
            <Text style={styles.vipTitle}>Просмотр лайков</Text>
            <Text style={styles.vipSub}>Узнай, кому ты нравишься.</Text>

            <View style={styles.dotsRow}>
              {new Array(10).fill(0).map((_, i) => (
                <View key={i} style={[styles.dot, i === 0 && styles.dotOn]} />
              ))}
            </View>

            <View style={styles.priceRow}>
              <PriceCard days="7" price="1113 ₽" />
              <PriceCard days="30" price="2204 ₽" highlight label="Популярно" oldPrice="4158 ₽" />
              <PriceCard days="90" price="5523 ₽" oldPrice="9054 ₽" />
            </View>

            <Text style={styles.vipFoot}>
              Точная сумма будет указана после выбора способа оплаты. Услуга продлевается автоматически.
            </Text>

            <View style={{ width: "100%", marginTop: 10 }}>
              <DarkPillButton title="Купить" onPress={() => setLikesVipOpen(false)} />
            </View>
          </View>
        </Sheet>

        {/* ---- Superlike paywall ---- */}
        <Sheet visible={superLikeOpen} onClose={() => setSuperLikeOpen(false)} title="">
          <View style={{ alignItems: "center", paddingTop: 10 }}>
            <View style={styles.superLikeBox}>
              <Text style={styles.superLikeWord}>SUPER{"\n"}LIKE</Text>
            </View>
            <Text style={styles.vipTitle}>Суперлайк</Text>
            <Text style={styles.vipSub}>
              Суперлайк — это способ выразить особую симпатию и начать общение без мэтча.
            </Text>
            <View style={{ width: "100%", marginTop: 18 }}>
              <DarkPillButton title="1084.0 RUB" onPress={() => setSuperLikeOpen(false)} />
            </View>
            <Text style={styles.smallNote}>
              При последующих нажатиях на суперлайк списание произойдёт автоматически.
            </Text>
          </View>
        </Sheet>

        {/* ---- VIP status (events) ---- */}
        <Sheet visible={vipStatusOpen} onClose={() => setVipStatusOpen(false)} title="VIP-статус">
          <View style={{ alignItems: "center", paddingTop: 14 }}>
            <Text style={styles.vipTitle}>Переписка без мэтча</Text>
            <Text style={styles.vipSub}>Начинай до 40 чатов в день без создания пары.</Text>
            <View style={styles.dotsRow}>
              {new Array(10).fill(0).map((_, i) => (
                <View key={i} style={[styles.dot, i === 1 && styles.dotOn]} />
              ))}
            </View>
            <View style={styles.priceRow}>
              <PriceCard days="7" price="1113 ₽" />
              <PriceCard days="30" price="2204 ₽" highlight label="Популярно" oldPrice="4158 ₽" />
              <PriceCard days="90" price="5523 ₽" oldPrice="9054 ₽" />
            </View>
            <View style={{ width: "100%", marginTop: 18 }}>
              <DarkPillButton title="Купить" onPress={() => setVipStatusOpen(false)} />
            </View>
          </View>
        </Sheet>

        {/* ---- Location ---- */}
        <Sheet visible={locationOpen} onClose={() => setLocationOpen(false)} title="Местоположение">
          <View style={{ gap: 12 }}>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color={COLORS.muted} />
              <TextInput
                placeholder="Ростов-на-Дону, Ростовская область"
                placeholderTextColor={COLORS.muted}
                style={styles.searchInput}
              />
            </View>

            <View style={styles.vipHint}>
              <Ionicons name="location-outline" size={18} color={COLORS.muted} />
              <Text style={styles.vipHintTxt}>
                С VIP-статусом ты сможешь выбрать любое местоположение, без него — только в радиусе 40 км от тебя.
              </Text>
            </View>

            <DarkPillButton
              title="Купить VIP-статус"
              onPress={() => {
                setLocationOpen(false);
                setVipStatusOpen(true);
              }}
            />

            <Text style={[styles.h2, { marginTop: 6 }]}>Обновить местоположение</Text>

            {["Ростов-на-Дону, Ростовская область", "Ростовская область", "Москва, Московская область"].map((x, i) => (
              <Pressable key={x} style={styles.locRow}>
                <Text style={styles.locTxt}>{x}</Text>
                {i === 0 ? (
                  <Ionicons name="checkmark" size={20} color={COLORS.text} />
                ) : (
                  <Ionicons name="crown-outline" size={18} color={COLORS.muted} />
                )}
              </Pressable>
            ))}
            <View style={{ height: 8 }} />
            <DarkPillButton title="Расширить зону" onPress={() => setVipStatusOpen(true)} />
          </View>
        </Sheet>

        {/* ---- Chat screen modal ---- */}
        <Modal visible={!!openChatId} animationType="slide" onRequestClose={() => setOpenChatId(null)}>
          <SafeAreaView style={styles.chatSafe}>
            <View style={styles.chatHeader}>
              <Pressable onPress={() => setOpenChatId(null)} style={styles.chatHeaderBtn}>
                <Ionicons name="arrow-back" size={22} color={COLORS.text} />
              </Pressable>

              <View style={styles.chatTitleWrap}>
                <Image source={{ uri: openChat?.avatar }} style={styles.chatAvatar} />
                <View>
                  <Text style={styles.chatTitle}>{openChat?.title ?? "Чат"}</Text>
                  <Text style={styles.chatSub}>Был(а) 1 час назад</Text>
                </View>
              </View>

              <View style={{ flex: 1 }} />
              <Pressable style={styles.chatHeaderBtn}>
                <Ionicons name="call-outline" size={22} color={COLORS.text} />
              </Pressable>
              <Pressable onPress={() => setChatMoreOpen(true)} style={styles.chatHeaderBtn}>
                <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text} />
              </Pressable>
            </View>

            <View style={styles.chatEmpty}>
              <View style={styles.chatFlower}>
                <Ionicons name="flower-outline" size={56} color={COLORS.pink} />
              </View>
              <Text style={styles.chatEmptyTxt}>
                Может, это начало чего-то прекрасного?{"\n"}Сделай первый шаг — и узнаешь.
              </Text>
              <Text style={styles.chatHelp}>Помочь написать сообщение?</Text>
              <DarkPillButton title="Да, предложить варианты" onPress={() => {}} />
            </View>

            <View style={styles.chatInputRow}>
              <Pressable onPress={() => setChatAttachOpen(true)} style={styles.plusBtn}>
                <Ionicons name="add" size={26} color={COLORS.text} />
              </Pressable>
              <View style={styles.inputWrap}>
                <Text style={styles.inputPlaceholder}>Написать...</Text>
              </View>
              <Pressable onPress={() => setAddPhotoOpen(true)} style={styles.giftBtn}>
                <Ionicons name="gift-outline" size={22} color={COLORS.text} />
              </Pressable>
            </View>

            {/* chat "more" */}
            <Sheet visible={chatMoreOpen} onClose={() => setChatMoreOpen(false)} title="">
              <Pressable style={styles.actionRow}>
                <Text style={styles.actionTxt}>Пожаловаться</Text>
                <Ionicons name="ban-outline" size={20} color={COLORS.text} />
              </Pressable>
              <Pressable style={styles.actionRow}>
                <Text style={styles.actionTxt}>Показывать изображения</Text>
                <Ionicons name="image-outline" size={20} color={COLORS.text} />
              </Pressable>
            </Sheet>

            {/* attach sheet */}
            <Sheet visible={chatAttachOpen} onClose={() => setChatAttachOpen(false)} title="">
              {[
                { t: "Контакт", i: "person-circle-outline" },
                { t: "Фото", i: "image-outline" },
                { t: "Комплимент", i: "rose-outline" },
                { t: "Стикер", i: "happy-outline" },
              ].map((x) => (
                <Pressable
                  key={x.t}
                  style={styles.actionRow}
                  onPress={() => {
                    setChatAttachOpen(false);
                    if (x.t === "Стикер") setStickersOpen(true);
                    if (x.t === "Комплимент") setComplimentsOpen(true);
                    if (x.t === "Фото") setAddPhotoOpen(true);
                  }}
                >
                  <Text style={styles.actionTxt}>{x.t}</Text>
                  <Ionicons name={x.i as any} size={20} color={COLORS.text} />
                </Pressable>
              ))}
              <Pressable style={[styles.actionRow, { marginTop: 8 }]} onPress={() => setChatAttachOpen(false)}>
                <Text style={[styles.actionTxt, { fontWeight: "700" }]}>Отмена</Text>
              </Pressable>
            </Sheet>

            {/* stickers */}
            <Sheet visible={stickersOpen} onClose={() => setStickersOpen(false)} title="Стикеры">
              <View style={styles.stickersGrid}>
                {new Array(9).fill(0).map((_, i) => (
                  <View key={i} style={styles.stickerTile}>
                    <Ionicons name="happy" size={34} color={COLORS.pink} />
                  </View>
                ))}
              </View>
            </Sheet>

            {/* compliments */}
            <Sheet visible={complimentsOpen} onClose={() => setComplimentsOpen(false)} title="Комплименты">
              <Text style={styles.h2}>Бесплатные</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {["💐", "💐", "💐"].map((x, i) => (
                  <View key={i} style={styles.giftCard}>
                    <Text style={{ fontSize: 40 }}>{x}</Text>
                    <Text style={styles.giftPrice}>Бесплатно</Text>
                  </View>
                ))}
              </ScrollView>

              <Text style={[styles.h2, { marginTop: 18 }]}>9 мая</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {["🎗️", "🪖", "🧨"].map((x, i) => (
                  <View key={i} style={styles.giftCard}>
                    <Text style={{ fontSize: 40 }}>{x}</Text>
                    <Text style={styles.giftPrice}>223.0 RUB</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={{ marginTop: 18 }}>
                <DarkPillButton title="Подарить комплимент" onPress={() => setComplimentsOpen(false)} />
              </View>
            </Sheet>

            {/* add photo */}
            <Sheet visible={addPhotoOpen} onClose={() => setAddPhotoOpen(false)} title="Добавь фото">
              <Text style={styles.vipSub}>Сделай снимок или выбери из альбома.</Text>
              <View style={{ marginTop: 16, gap: 12 }}>
                <Pressable style={styles.bigPickRow}>
                  <Ionicons name="images-outline" size={22} color={COLORS.text} />
                  <Text style={styles.bigPickTxt}>Галерея</Text>
                </Pressable>
                <Pressable style={styles.bigPickRow}>
                  <Ionicons name="camera-outline" size={22} color={COLORS.text} />
                  <Text style={styles.bigPickTxt}>Камера</Text>
                </Pressable>
                <Pressable style={styles.bigPickRow}>
                  <Ionicons name="logo-odnoklassniki" size={20} color={COLORS.text} />
                  <Text style={styles.bigPickTxt}>Одноклассники</Text>
                </Pressable>
                <Pressable style={styles.bigPickRow}>
                  <Ionicons name="logo-vk" size={20} color={COLORS.text} />
                  <Text style={styles.bigPickTxt}>Вконтакте</Text>
                </Pressable>
              </View>
            </Sheet>
          </SafeAreaView>
        </Modal>

        {/* ---- Profile edit ---- */}
        <Sheet visible={profileEditOpen} onClose={() => setProfileEditOpen(false)} title="Редактировать профиль">
          <View style={{ gap: 8 }}>
            <RowNav title="Курение" subtitle="Не указано" icon="flame-outline" onPress={() => setSmokeOpen(true)} />
            <RowNav title="Алкоголь" subtitle="Не указано" icon="wine-outline" onPress={() => setAlcoholOpen(true)} />
            <RowNav title="Путешествия" subtitle="Германия" icon="briefcase-outline" onPress={() => {}} />
            <RowNav title="Внешность" subtitle="Не указано" icon="happy-outline" onPress={() => {}} />
            <RowNav title="Телосложение" subtitle="Не указано" icon="barbell-outline" onPress={() => {}} />
            <RowNav title="Рост" subtitle="" icon="resize-outline" onPress={() => setHeightOpen(true)} />
            <RowNav title="Вес" subtitle="" icon="speedometer-outline" onPress={() => setWeightOpen(true)} />
            <RowNav title="Дети" subtitle="Не указано" icon="balloon-outline" onPress={() => setKidsOpen(true)} />
          </View>
        </Sheet>

        {/* ---- Profile settings ---- */}
        <Sheet visible={profileSettingsOpen} onClose={() => setProfileSettingsOpen(false)} title="">
          <View style={{ gap: 8 }}>
            <View style={styles.profileSettingsTabs}>
              <View style={[styles.profileSettingsTab, styles.profileSettingsTabOn]}>
                <Text style={[styles.profileSettingsTabTxt, styles.profileSettingsTabTxtOn]}>Профиль</Text>
              </View>
              <View style={styles.profileSettingsTab}>
                <Text style={styles.profileSettingsTabTxt}>Безопасность</Text>
              </View>
            </View>

            <RowNav title="Использовать промокод" icon="pricetag-outline" onPress={() => {}} />
            <RowNav title="Соглашение" icon="document-text-outline" onPress={() => {}} />
            <RowNav title="Конфиденциальность" icon="lock-closed-outline" onPress={() => setPrivacyOpen(true)} />
            <RowNav title="Персональные данные" icon="folder-outline" onPress={() => {}} />
            <RowNav title="О компании" icon="business-outline" onPress={() => {}} />
            <RowNav title="Дейтбук" icon="book-outline" onPress={() => {}} />
            <RowNav title="Поддержка" icon="help-circle-outline" onPress={() => {}} />

            <Pressable style={[styles.actionRow, { marginTop: 14 }]} onPress={() => {}}>
              <Text style={[styles.actionTxt, { color: "#DC2626", fontWeight: "800" }]}>Удалить профиль</Text>
              <Ionicons name="trash-outline" size={20} color={"#DC2626"} />
            </Pressable>
          </View>
        </Sheet>

        {/* ---- Languages ---- */}
        <Sheet visible={languagesOpen} onClose={() => setLanguagesOpen(false)} title="">
          <Text style={styles.h2}>Знаю языки</Text>
          <View style={{ marginTop: 12 }}>
            {["English", "Deutsch", "Français", "Español", "Italiano", "Русский"].map((x) => (
              <Pressable key={x} style={styles.checkRow}>
                <Text style={styles.checkTxt}>{x}</Text>
                <View style={styles.checkBoxOn}>
                  <Ionicons name="checkmark" size={16} color={COLORS.bg} />
                </View>
              </Pressable>
            ))}
          </View>
        </Sheet>

        {/* ---- Goal ---- */}
        <Sheet visible={goalOpen} onClose={() => setGoalOpen(false)} title="Цель знакомства">
          {["Серьёзные отношения", "Дружеское общение", "Флирт и свидания", "Решу, когда встречу"].map((x, i) => (
            <Pressable key={x} style={styles.checkRow}>
              <Text style={styles.checkTxt}>{x}</Text>
              <View style={[styles.checkBox, i === 3 && styles.checkBoxOn]}>
                {i === 3 ? <Ionicons name="checkmark" size={16} color={COLORS.bg} /> : null}
              </View>
            </Pressable>
          ))}
        </Sheet>

        {/* ---- Height ---- */}
        <Sheet visible={heightOpen} onClose={() => setHeightOpen(false)} title="Рост">
          <View style={{ alignItems: "center", paddingTop: 16 }}>
            <Text style={styles.h2}>185 см (6'1")</Text>
            <View style={styles.sliderSingle} />
            <View style={{ alignSelf: "flex-end", marginTop: 18 }}>
              <Pressable style={styles.roundOk} onPress={() => setHeightOpen(false)}>
                <Ionicons name="checkmark" size={20} color={COLORS.bg} />
              </Pressable>
            </View>
          </View>
        </Sheet>

        {/* ---- Weight ---- */}
        <Sheet visible={weightOpen} onClose={() => setWeightOpen(false)} title="Вес">
          <View style={{ alignItems: "center", paddingTop: 16 }}>
            <Text style={styles.h2}>100 кг (220 lb)</Text>
            <View style={styles.sliderSingle} />
            <View style={{ alignSelf: "flex-end", marginTop: 18 }}>
              <Pressable style={styles.roundOk} onPress={() => setWeightOpen(false)}>
                <Ionicons name="checkmark" size={20} color={COLORS.bg} />
              </Pressable>
            </View>
          </View>
        </Sheet>

        {/* ---- Age range ---- */}
        <Sheet visible={ageRangeOpen} onClose={() => setAgeRangeOpen(false)} title="В возрасте">
          <View style={{ alignItems: "center", paddingTop: 16 }}>
            <Text style={styles.vipSub}>Выбери возраст собеседников.</Text>
            <Text style={[styles.h2, { marginTop: 12 }]}>33–46</Text>
            <View style={styles.sliderLineWide}>
              <View style={styles.sliderDotLeft} />
              <View style={styles.sliderDotRight} />
            </View>
            <View style={{ width: "100%", marginTop: 18, opacity: 0.55 }}>
              <DarkPillButton title="Сохранить" onPress={() => {}} />
            </View>
          </View>
        </Sheet>

        {/* ---- Kids ---- */}
        <Sheet visible={kidsOpen} onClose={() => setKidsOpen(false)} title="Дети">
          {["Детей нет", "Детей нет, но хочу", "Дети есть, живем вместе", "Дети есть, живем порознь"].map((x) => (
            <Pressable key={x} style={styles.pickRow}>
              <Text style={styles.pickTxt}>{x}</Text>
            </Pressable>
          ))}
        </Sheet>

        {/* ---- Smoke ---- */}
        <Sheet visible={smokeOpen} onClose={() => setSmokeOpen(false)} title="Курение">
          {["Не курю", "Почти не курю", "Бросаю курить", "Курю"].map((x) => (
            <Pressable key={x} style={styles.pickRow}>
              <Text style={styles.pickTxt}>{x}</Text>
            </Pressable>
          ))}
        </Sheet>

        {/* ---- Alcohol ---- */}
        <Sheet visible={alcoholOpen} onClose={() => setAlcoholOpen(false)} title="Алкоголь">
          {["Не пью вообще", "Пью в компаниях изредка", "Люблю выпить"].map((x) => (
            <Pressable key={x} style={styles.pickRow}>
              <Text style={styles.pickTxt}>{x}</Text>
            </Pressable>
          ))}
        </Sheet>

        {/* ---- Income ---- */}
        <Sheet visible={incomeOpen} onClose={() => setIncomeOpen(false)} title="Материальное положение">
          {[
            "Нет работы",
            "Учусь",
            "Непостоянные заработки",
            "Постоянный небольшой доход",
            "Стабильный средний доход",
            "Хорошо зарабатываю, обеспечен",
          ].map((x) => (
            <Pressable key={x} style={styles.pickRow}>
              <Text style={styles.pickTxt}>{x}</Text>
            </Pressable>
          ))}
        </Sheet>

        {/* ---- Home ---- */}
        <Sheet visible={homeOpen} onClose={() => setHomeOpen(false)} title="Условия проживания">
          {[
            "Отдельная квартира (снимаю или своя)",
            "Комната в общежитии или коммуналка",
            "Живу с родителями",
            "Живу с приятелем или с подругой",
            "Нет постоянного жилья",
          ].map((x) => (
            <Pressable key={x} style={styles.pickRow}>
              <Text style={styles.pickTxt}>{x}</Text>
            </Pressable>
          ))}
        </Sheet>

        {/* ---- Privacy ---- */}
        <Sheet visible={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Конфиденциальность">
          <View style={{ gap: 14, paddingTop: 10 }}>
            <Text style={styles.vipSub}>
              Пользуясь Мамбoй, ты принимаешь условия обработки персональных данных в соответствии с этими документами.
            </Text>
            {[
              "Согласие на обработку персональных данных",
              "Согласие на распространение персональных данных",
              "Согласие на обработку персональных данных в рамках процедуры подтверждения фото",
              "Политика конфиденциальности",
            ].map((x) => (
              <Pressable key={x} style={styles.pickRow}>
                <Text style={styles.pickTxt}>{x}</Text>
              </Pressable>
            ))}
          </View>
        </Sheet>
      </>
    )}
  </SafeAreaView>
);
}
/** ---------- Screens ---------- */

function DatingScreen({
  profile,
  onLike,
  onSuperLike,
  onOpenChat,
  onOpenMore,
}: {
  profile: ProfileCard;
  onLike: () => void;
  onSuperLike: () => void;
  onOpenChat: () => void;
  onOpenMore: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.cardOuter}>
        <View style={styles.bigCard}>
          <Image source={{ uri: profile.photo }} style={styles.bigPhoto} />
          <Pressable onPress={onOpenMore} style={styles.bigMore}>
            <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.bg} />
          </Pressable>

          <View style={styles.nameOverlay}>
            <Text style={styles.nameTxt}>
              {profile.name}, {profile.age}{" "}
              {profile.verified ? <Ionicons name="checkmark-circle" size={18} color="#3B82F6" /> : null}
            </Text>
          </View>

          <View style={styles.actionsOverlay}>
            <Pressable style={styles.actionCircle} onPress={onOpenChat}>
              <Ionicons name="chatbubble-outline" size={22} color={COLORS.text} />
            </Pressable>

            <Pressable style={styles.actionCircleMid} onPress={onSuperLike}>
              <Ionicons name="heart" size={20} color={COLORS.text} />
            </Pressable>

            <Pressable style={styles.likeBig} onPress={onLike}>
              <View style={styles.likeBigRing}>
                <Ionicons name="heart" size={34} color={"#F97316"} />
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function SearchScreen({
  data,
  onOpenFilters,
}: {
  data: Array<{ id: string; name: string; age: number; verified: boolean; online: boolean; img: string }>;
  onOpenFilters: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.pageTitleRow}>
        <Text style={styles.pageTitle}>Поиск</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.iconTiny} onPress={onOpenFilters}>
          <Ionicons name="options-outline" size={22} color={COLORS.text} />
        </Pressable>
      </View>

      <FlatList
        data={data}
        numColumns={2}
        keyExtractor={(x) => x.id}
        columnWrapperStyle={{ gap: 14, paddingHorizontal: 14 }}
        contentContainerStyle={{ paddingBottom: 18, paddingTop: 10 }}
        renderItem={({ item }) => (
          <View style={styles.gridCard}>
            <Image source={{ uri: item.img }} style={styles.gridImg} />
            <View style={styles.gridMeta}>
              <Text style={styles.gridName}>
                {item.name}, {item.age > 0 ? item.age : ""}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                {item.verified ? <Ionicons name="checkmark-circle" size={16} color="#3B82F6" /> : null}
                <View style={[styles.onlineDot, item.online ? { backgroundColor: "#22C55E" } : { backgroundColor: "#D1D5DB" }]} />
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.promoCard}>
            <View style={styles.promoIcon}>
              <Ionicons name="eye-outline" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.promoTxt}>Активируй гарантированные показы — получи больше лайков</Text>
            <View style={{ marginTop: 14, width: "100%" }}>
              <DarkPillButton title="Активировать" onPress={() => {}} />
            </View>
          </View>
        }
      />
    </View>
  );
}

function EventsScreen({ onOpenVip, onOpenAll }: { onOpenVip: () => void; onOpenAll: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.pageTitleRow}>
        <Text style={styles.pageTitle}>События</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 18 }}>
        <View style={styles.eventsGrid}>
          <View style={styles.eventTile}>
            <View style={styles.eventIcon}>
              <Ionicons name="crown-outline" size={26} color={"#F59E0B"} />
            </View>
            <Text style={styles.eventTxt}>Открой профили всех,{"\n"}кто обратил на тебя{"\n"}внимание.</Text>
            <View style={{ marginTop: 14 }}>
              <DarkPillButton title="Купить VIP" onPress={onOpenVip} />
            </View>
          </View>

          <View style={[styles.eventTile, { backgroundColor: COLORS.pinkSoft }]} />
          <View style={[styles.eventTile, { backgroundColor: COLORS.pinkSoft }]} />
          <View style={[styles.eventTile, { backgroundColor: COLORS.pinkSoft }]} />
        </View>

        <View style={{ marginTop: 18 }}>
          <DarkPillButton title="👑  Посмотреть все" onPress={onOpenAll} />
        </View>

        <View style={{ height: 10 }} />
      </ScrollView>
    </View>
  );
}

function ChatsScreen({
  data,
  onOpenChat,
  onOpenFilterMenu,
}: {
  data: Array<any>;
  onOpenChat: (id: string) => void;
  onOpenFilterMenu: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.pageTitleRow}>
        <Text style={styles.pageTitle}>Чаты</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.iconTiny} onPress={onOpenFilterMenu}>
          <Ionicons name="options-outline" size={22} color={COLORS.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 18 }}>
        <Text style={styles.sectionLabel}>Мои пары</Text>
        <View style={{ height: 12 }} />
        <Image
          source={{ uri: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=320&q=80" }}
          style={styles.matchAvatar}
        />

        <View style={{ height: 18 }} />
        <View style={styles.rowBetween}>
          <Text style={styles.sectionLabel}>Все</Text>
          <Ionicons name="options-outline" size={20} color={COLORS.muted} />
        </View>

        <View style={{ height: 10 }} />
        {data.map((c) => (
          <Pressable key={c.id} onPress={() => onOpenChat(c.id)} style={styles.chatRow}>
            <Image source={{ uri: c.avatar }} style={styles.chatListAvatar} />
            <View style={{ flex: 1 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.chatListTitle}>{c.title}</Text>
                <Text style={styles.chatListTime}>{c.time}</Text>
              </View>
              <View style={[styles.rowBetween, { marginTop: 6 }]}>
                <Text style={styles.chatListPreview} numberOfLines={1}>
                  {c.preview}
                </Text>
                {c.badge ? (
                  <View style={styles.smallBadge}>
                    <Text style={styles.smallBadgeTxt}>{c.badge}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {c.star ? <Ionicons name="star-outline" size={18} color={COLORS.muted} /> : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function ProfileScreen({
  onEdit,
  onSettings,
  onAddPhoto,
}: {
  onEdit: () => void;
  onSettings: () => void;
  onAddPhoto: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.pageTitleRow}>
        <Text style={styles.pageTitle}>Профиль</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.iconTiny} onPress={onEdit}>
          <Ionicons name="create-outline" size={22} color={COLORS.text} />
        </Pressable>
        <Pressable style={styles.iconTiny} onPress={onSettings}>
          <Ionicons name="settings-outline" size={22} color={COLORS.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 22 }}>
        <Text style={styles.profileProgressTxt}>Заполнен на 43%</Text>
        <View style={styles.waveLine} />

        <View style={styles.vipBanner}>
          <Text style={styles.vipBannerTxt}>Mamba VIP</Text>
        </View>

        <View style={styles.photoRow}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1520975958228-bbd28f9f6e19?auto=format&fit=crop&w=700&q=80" }}
            style={styles.profilePhoto}
          />
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1520975958228-bbd28f9f6e19?auto=format&fit=crop&w=700&q=80" }}
            style={styles.profilePhotoSmall}
          />
          <View style={styles.profileAddBox}>
            <Text style={styles.plusBig}>+</Text>
          </View>
        </View>

        <DarkPillButton title="Добавить фото" onPress={onAddPhoto} />

        <View style={{ height: 18 }} />

        <RowNav title="Симон" subtitle="" icon="person-outline" onPress={onEdit} />
        <RowNav title="41 год" subtitle="" icon="calendar-outline" onPress={onEdit} />
        <RowNav title="Местоположение" subtitle="Ростов-на-Дону" icon="navigate-outline" onPress={onEdit} />

        <View style={styles.aboutBox}>
          <Text style={styles.aboutPlaceholder}>Расскажи о себе...</Text>
        </View>

        <RowNav title="Познакомлюсь" subtitle="С девушкой" icon="heart-outline" onPress={onEdit} />
        <RowNav title="В возрасте" subtitle="33–46" icon="time-outline" onPress={onEdit} />
        <RowNav title="Цель знакомства" subtitle="Решу, когда встречу" icon="compass-outline" onPress={onEdit} />
        <RowNav title="Образование" subtitle="Не указано" icon="school-outline" onPress={onEdit} />
        <RowNav title="Языки" subtitle="Русский" icon="language-outline" onPress={onEdit} />
      </ScrollView>
    </View>
  );
}

/** ---------- Small components ---------- */

function RowNav({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.rowNav}>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={20} color={COLORS.text} />
        </View>
      ) : (
        <View style={{ width: 26 }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </Pressable>
  );
}

function PriceCard({
  days,
  price,
  oldPrice,
  highlight,
  label,
}: {
  days: string;
  price: string;
  oldPrice?: string;
  highlight?: boolean;
  label?: string;
}) {
  return (
    <View style={[styles.priceCard, highlight && styles.priceCardOn]}>
      {!!label ? (
        <View style={styles.pricePill}>
          <Text style={styles.pricePillTxt}>{label}</Text>
        </View>
      ) : null}
      <Text style={styles.priceDays}>{days}{"\n"}дней</Text>
      {!!oldPrice ? <Text style={styles.oldPrice}>{oldPrice}</Text> : <View style={{ height: 18 }} />}
      <Text style={styles.priceNow}>{price}</Text>
    </View>
  );
}

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, backgroundColor: COLORS.bg },

  topBar: {
    backgroundColor: COLORS.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8,
  },

  // ecosystem top row
  topRowEcosystem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
    justifyContent: "space-between",
  },
  ecoBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ecoBtnTxt: { color: COLORS.bg, fontWeight: "900", fontSize: 12 },

  // dating top row (mamba-like)
  topRowDatingMamba: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
    justifyContent: "space-between",
  },
  topRightGroup: { flexDirection: "row", alignItems: "center", gap: 8 },

  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  topTitleCenterAbs: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleDating: { fontWeight: "900", fontSize: 20, color: COLORS.text },

  brandCapsuleCenterAbs: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  brandCapsule: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(244,114,182,0.10)",
  },
  brandCapsuleTxt: { fontWeight: "900", color: "#F43F5E", letterSpacing: 0.6 },

  topBrandWrap: {
    marginLeft: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(244,114,182,0.10)",
  },
  brand: { fontWeight: "900", color: "#F43F5E", letterSpacing: 0.6 },

  badge: {
    position: "absolute",
    right: -2,
    top: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  badgeTxt: { color: COLORS.bg, fontWeight: "800", fontSize: 11 },

  tabs: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.line,
    flexDirection: "row",
    paddingTop: 8,
    paddingHorizontal: 8,
    backgroundColor: COLORS.bg,
  },
  tabBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  tabTxt: { marginTop: 4, fontSize: 11, color: COLORS.muted, fontWeight: "700" },
  tabTxtOn: { color: COLORS.text },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.pink, marginTop: 4 },
  tabBadge: {
    position: "absolute",
    right: 18,
    top: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  tabBadgeTxt: { color: COLORS.bg, fontWeight: "800", fontSize: 10 },

  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  pageTitle: { fontSize: 26, fontWeight: "900", color: COLORS.text },
  iconTiny: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  // first screen card
  locGateWrap: { flex: 1, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 },
  locGateCard: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: "rgba(17,24,39,0.08)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  locGateImageBox: { width: 220, height: 220, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  locGateTitle: { marginTop: 18, fontSize: 32, fontWeight: "900", color: COLORS.text, textAlign: "center" },
  locGateSub: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 26,
  },

  cardOuter: { flex: 1, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 },
  bigCard: {
    flex: 1,
    borderRadius: 34,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "rgba(17,24,39,0.08)",
  },
  bigPhoto: { width: "100%", height: "100%" },
  bigMore: {
    position: "absolute",
    right: 16,
    top: 16,
    width: 44,
    height: 32,
    borderRadius: 18,
    backgroundColor: "rgba(17,24,39,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  nameOverlay: { position: "absolute", left: 18, bottom: 128 },
  nameTxt: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.bg,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 2 },
  },
  actionsOverlay: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionCircle: { width: 66, height: 66, borderRadius: 33, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  actionCircleMid: { width: 66, height: 66, borderRadius: 33, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  likeBig: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  likeBigRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: "rgba(244,114,182,0.55)",
  },

  gridCard: { flex: 1, borderRadius: 26, overflow: "hidden", backgroundColor: "#F3F4F6" },
  gridImg: { width: "100%", height: 160 },
  gridMeta: { padding: 10 },
  gridName: { fontWeight: "900", fontSize: 20, color: COLORS.text },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },

  promoCard: {
    marginTop: 16,
    marginHorizontal: 14,
    padding: 16,
    borderRadius: 26,
    backgroundColor: COLORS.lilac,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.15)",
  },
  promoIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(124,58,237,0.12)", alignItems: "center", justifyContent: "center" },
  promoTxt: { marginTop: 12, fontSize: 18, fontWeight: "900", color: COLORS.text },

  eventsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  eventTile: { width: (W - 14 * 2 - 12) / 2, borderRadius: 26, backgroundColor: "#FFE4E6", padding: 14, minHeight: 220 },
  eventIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  eventTxt: { marginTop: 12, fontSize: 16, fontWeight: "900", color: COLORS.text },

  darkBtn: { backgroundColor: COLORS.darkBtn, paddingVertical: 16, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 6, borderColor: COLORS.pinkSoft },
  darkBtnTxt: { color: COLORS.bg, fontWeight: "900", fontSize: 18 },

  sheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  sheetHandleRow: { alignItems: "center", paddingTop: 10 },
  sheetHandle: { width: 46, height: 5, borderRadius: 3, backgroundColor: "rgba(17,24,39,0.20)" },
  sheetHeader: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  sheetTitle: { flex: 1, textAlign: "center", fontWeight: "900", fontSize: 20, color: COLORS.text },
  sheetCloseBtn: { position: "absolute", right: 14, top: 8, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sheetBody: { paddingHorizontal: 18, paddingBottom: 14, flex: 1 },

  filtersBlock: { paddingTop: 6 },
  h2: { fontSize: 20, fontWeight: "900", color: COLORS.text },
  sectionLabel: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  sectionValue: { fontSize: 16, fontWeight: "900", color: COLORS.text },

  segment: { marginTop: 12, flexDirection: "row", backgroundColor: "rgba(17,24,39,0.06)", borderRadius: 999, padding: 5 },
  segmentItem: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  segmentItemOn: { backgroundColor: COLORS.darkBtn },
  segmentTxt: { fontWeight: "900", color: COLORS.text },
  segmentTxtOn: { color: COLORS.bg },

  sliderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sliderSingle: { width: "100%", height: 5, borderRadius: 3, backgroundColor: "rgba(17,24,39,0.10)", marginTop: 18 },
  sliderLineWide: { width: "100%", height: 5, borderRadius: 3, backgroundColor: "rgba(17,24,39,0.10)", marginTop: 14, position: "relative" },
  sliderDotLeft: { position: "absolute", left: "26%", top: -10, width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.darkBtn },
  sliderDotRight: { position: "absolute", left: "54%", top: -10, width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.darkBtn },

  rangeWrap: { marginTop: 14, height: 26, justifyContent: "center" },
  rangeTrack: { height: 5, borderRadius: 3, backgroundColor: "rgba(17,24,39,0.10)" },
  rangeActive: { position: "absolute", height: 5, borderRadius: 3, backgroundColor: COLORS.darkBtn },
  rangeThumb: { position: "absolute", width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.darkBtn },

  roundOk: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.darkBtn, alignItems: "center", justifyContent: "center" },

  vipIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: "rgba(244,114,182,0.12)", alignItems: "center", justifyContent: "center" },
  vipTitle: { marginTop: 12, fontSize: 28, fontWeight: "900", color: COLORS.text, textAlign: "center" },
  vipSub: { marginTop: 10, fontSize: 16, fontWeight: "700", color: COLORS.muted, textAlign: "center", lineHeight: 22 },
  dotsRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(17,24,39,0.15)" },
  dotOn: { backgroundColor: COLORS.text },

  priceRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  priceCard: { width: (W - 18 * 2 - 10 * 2) / 3, borderRadius: 22, paddingVertical: 16, alignItems: "center", backgroundColor: "rgba(17,24,39,0.04)" },
  priceCardOn: { backgroundColor: "rgba(244,114,182,0.28)" },
  pricePill: { position: "absolute", top: 10, backgroundColor: COLORS.darkBtn, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pricePillTxt: { color: COLORS.bg, fontWeight: "900", fontSize: 12 },
  priceDays: { marginTop: 18, fontSize: 20, fontWeight: "900", color: COLORS.text, textAlign: "center" },
  oldPrice: { marginTop: 14, fontSize: 16, fontWeight: "900", color: COLORS.muted, textDecorationLine: "line-through" },
  priceNow: { marginTop: 8, fontSize: 24, fontWeight: "900", color: COLORS.text },
  vipFoot: { marginTop: 16, fontSize: 12, color: COLORS.muted, textAlign: "center", lineHeight: 18 },

  superLikeBox: { width: 180, height: 180, borderRadius: 34, backgroundColor: "rgba(244,114,182,0.18)", alignItems: "center", justifyContent: "center" },
  superLikeWord: { fontWeight: "900", fontSize: 28, color: COLORS.text, textAlign: "center", lineHeight: 28 },
  smallNote: { marginTop: 12, fontSize: 12, color: COLORS.muted, textAlign: "center" },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  chatSafe: { flex: 1, backgroundColor: COLORS.bg },
  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  chatHeaderBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  chatTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 6 },
  chatAvatar: { width: 38, height: 38, borderRadius: 12 },
  chatTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  chatSub: { marginTop: 2, fontSize: 12, color: COLORS.muted, fontWeight: "700" },

  chatEmpty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  chatFlower: { width: 130, height: 130, borderRadius: 40, backgroundColor: "rgba(244,114,182,0.10)", alignItems: "center", justifyContent: "center" },
  chatEmptyTxt: { textAlign: "center", fontSize: 18, fontWeight: "800", color: COLORS.muted, lineHeight: 26 },
  chatHelp: { fontSize: 20, fontWeight: "900", color: COLORS.text, marginTop: 10 },

  chatInputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 10, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.line },
  plusBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(17,24,39,0.06)", alignItems: "center", justifyContent: "center" },
  inputWrap: { flex: 1, height: 44, borderRadius: 22, backgroundColor: "rgba(17,24,39,0.06)", justifyContent: "center", paddingHorizontal: 14 },
  inputPlaceholder: { color: "rgba(17,24,39,0.35)", fontWeight: "800" },
  giftBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(17,24,39,0.06)", alignItems: "center", justifyContent: "center" },

  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  actionTxt: { fontSize: 18, fontWeight: "800", color: COLORS.text },

  stickersGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 10 },
  stickerTile: { width: (W - 18 * 2 - 12 * 2) / 3, height: 100, borderRadius: 22, backgroundColor: "rgba(244,114,182,0.10)", alignItems: "center", justifyContent: "center" },

  giftCard: { width: 140, height: 140, borderRadius: 24, backgroundColor: COLORS.pinkSoft, alignItems: "center", justifyContent: "center", marginRight: 12 },
  giftPrice: { marginTop: 10, fontWeight: "900", color: COLORS.text },

  bigPickRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  bigPickTxt: { fontSize: 18, fontWeight: "900", color: COLORS.text },

  matchAvatar: { width: 86, height: 86, borderRadius: 26 },

  chatRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  chatListAvatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#F3F4F6" },
  chatListTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  chatListTime: { fontSize: 12, color: COLORS.muted, fontWeight: "800" },
  chatListPreview: { color: COLORS.muted, fontWeight: "700", maxWidth: W * 0.55 },
  smallBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: "#111827", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  smallBadgeTxt: { color: COLORS.bg, fontWeight: "900", fontSize: 12 },

  profileProgressTxt: { fontWeight: "900", color: COLORS.muted, marginBottom: 10 },
  waveLine: { height: 6, borderRadius: 4, backgroundColor: "rgba(17,24,39,0.08)", marginBottom: 14 },
  vipBanner: { backgroundColor: COLORS.pinkSoft, borderRadius: 26, padding: 18, alignItems: "center" },
  vipBannerTxt: { fontWeight: "900", color: COLORS.text, fontSize: 18 },
  photoRow: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 14, marginBottom: 14 },
  profilePhoto: { width: 170, height: 170, borderRadius: 30, backgroundColor: "#F3F4F6" },
  profilePhotoSmall: { width: 110, height: 110, borderRadius: 30, backgroundColor: "#F3F4F6" },
  profileAddBox: { width: 110, height: 110, borderRadius: 30, backgroundColor: "rgba(17,24,39,0.06)", alignItems: "center", justifyContent: "center" },
  plusBig: { fontSize: 34, fontWeight: "900", color: "rgba(17,24,39,0.35)" },

  rowNav: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  rowIcon: { width: 26, alignItems: "center" },
  rowTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  rowSub: { marginTop: 4, fontWeight: "800", color: COLORS.muted },

  aboutBox: { marginTop: 10, marginBottom: 10, borderWidth: 2, borderColor: "rgba(17,24,39,0.14)", borderRadius: 18, padding: 14, minHeight: 80, justifyContent: "center" },
  aboutPlaceholder: { color: "rgba(17,24,39,0.35)", fontWeight: "800" },

  profileSettingsTabs: { flexDirection: "row", gap: 10, paddingVertical: 6, justifyContent: "center" },
  profileSettingsTab: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, backgroundColor: "rgba(17,24,39,0.06)" },
  profileSettingsTabOn: { backgroundColor: COLORS.darkBtn },
  profileSettingsTabTxt: { fontWeight: "900", color: COLORS.text },
  profileSettingsTabTxtOn: { color: COLORS.bg },

  checkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  checkTxt: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  checkBox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "rgba(17,24,39,0.18)" },
  checkBoxOn: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.darkBtn, alignItems: "center", justifyContent: "center" },

  pickRow: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  pickTxt: { fontSize: 18, fontWeight: "800", color: COLORS.text },

  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 2, borderColor: "rgba(17,24,39,0.10)", borderRadius: 16, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: COLORS.text, fontWeight: "800" },

  vipHint: { flexDirection: "row", gap: 10, backgroundColor: "rgba(124,58,237,0.10)", borderRadius: 18, padding: 12, borderWidth: 1, borderColor: "rgba(124,58,237,0.18)" },
  vipHintTxt: { flex: 1, color: COLORS.muted, fontWeight: "800", lineHeight: 18 },

  locRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  locTxt: { fontWeight: "800", color: COLORS.text },
});