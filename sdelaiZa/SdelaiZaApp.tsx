// App.tsx
import React, { useMemo, useRef, useState, useEffect, useContext, useCallback } from "react";
import {
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  BackHandler,
  Dimensions,
  Linking,
  ImageBackground,
  useWindowDimensions,
} from "react-native";

import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as IntentLauncher from "expo-intent-launcher";
import { Audio, Video } from "expo-av";

import { EcosystemContext } from "../EcosystemContext";
import { ECOSYSTEM_CITIES } from "../constants/ecosystemCities";

const RUS_CITIES = ECOSYSTEM_CITIES;
 /**
 * Единый зелёный стиль (как в кнопке "Заказать")
 * (требование: "все цвета зеленого сделать в едином стиле")
 */
const GREEN = "#2F855A";
/* =========================
TYPES
========================= */
type UserRole = "customer" | "performer";
/**
 * ✅ по ТЗ: "Круги" — центральная кнопка вместо "Сообщения"
 */
type Tab = "search" | "favorites" | "circles" | "deals" | "profile";
type Screen =
  | { name: "home" }
  | { name: "filters" }
  | { name: "needHelper" }
  | { name: "helpCategory"; category: string }
  | { name: "performersList"; category: string; serviceName: string }
  | { name: "performerProfile"; performerId: number; category: string; serviceName: string }
  | { name: "reviews"; performerId: number }
  | { name: "myReviews"; role: UserRole }
  | { name: "becomePerformer" }
  | { name: "confirmOrder"; performerId: number; category: string; serviceName: string; price: number; priceIsFrom: boolean }
  | { name: "orderSuccess"; orderId: string }
  | { name: "chat"; orderId: string }
  | { name: "favorites" }
  | { name: "deals" }
  | { name: "messages" }
  | { name: "circles" }
  | { name: "circleDetails"; circleId: string }
  | { name: "projectActive"; circleId: string } // ✅ NEW (п.10)
  | { name: "projectChat"; circleId: string; orderId: string } // ✅ NEW (п.10)
  | { name: "myProfile" }
  | { name: "profileSettings" }
  | { name: "notifications" }
  | { name: "performerServiceSetup"; sourceIndex: number; presetCategory?: string; presetService?: string };
type Filters = {
  city: string;
  district?: string;
  category?: string;
  service?: string;
  priceFrom?: number;
  priceTo?: number;
  minRating4Plus: boolean;
  sort: "default" | "cheaper" | "expensive";
};
type WorkAreaMode = "district_only" | "city_all";
type User = {
  id: string;
  role: UserRole;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  gender?: "male" | "female";
  city: string;
  district: string;
  address: string;
  workAreaMode: WorkAreaMode;
  payCardMasked: string;
  extraPhone: string;
  callsAnyTime: boolean;
  callsEveryDay: boolean;
  callsFrom?: string;
  callsTo?: string;
  callsDays?: WorkDay[];
  doneOrders: number;
  ratingAsPerformer: number;
  avatarUri?: string;
  createdAt: number;
};
type ServiceItem = { title: string; price: number; priceIsFrom: boolean };
type Performer = {
  id: number;
  name: string;
  description: string;
  rating: number;
  reviews: number;
  years: number;
  completed: number;
  city: string;
  district: string;
  category: string;
  service: string;
  price: number;
  priceIsFrom: boolean;
  costType?: CostType;
  isAvailable: boolean;
  isPro?: boolean;
  isVerifiedPassport?: boolean;
  avatarUri?: string;
  bannerUri?: string;
  services?: ServiceItem[];
  workPhotos?: string[];
   workMedia?: { uri: string; kind: "photo" | "video" }[]; // ✅ NEW: фото+видео для карточки исполнителя
  //
  ownerUserId?: string;
  workAreaMode?: WorkAreaMode;
};
type OrderStatus = "created" | "in_progress" | "done" | "canceled" | "disputed";
type Order = {
  id: string;
  createdAt: number;
  status: OrderStatus;
  customerId: string;
  performerId: number;
  category: string;
  serviceName: string;
  price: number;
  priceIsFrom: boolean;
};
type ChatAttachmentKind = "photo" | "video" | "audio" | "file";
type ChatMsg = {
  id: string;
  orderId: string;
  sender: "me" | "other" | "system";
  createdAt: number;
  text: string;
  attachment?: { uri: string; kind: ChatAttachmentKind; name?: string; thumbUri?: string; mimeType?: string };
};
type NotificationItem = {
  id: string;
  createdAt: number;
  title: string;
  text: string;
  isRead: boolean;
  userRoleTarget: UserRole;
  meta?: { type: "circle_invite"; circleId: string } | null;
};
type Review = { id: string; author: string; rating: number; text: string; createdAt: number };
type CustomerRequest = {
  id: string;
  createdAt: number;
  city: string;
  district?: string;
  category: string;
  service?: string;
  priceFrom?: number;
  priceTo?: number;
  customerId: string;
  customerName: string;
};
/**
 * ✅ Эскроу/стадия сделки для чата
 */
type DealStage = "unpaid" | "paid" | "released" | "disputed";
/* =========================
✅ Circles (Круги / Проекты)
========================= */
type CircleWorkChip = { id: string; title: string };
type CircleProject = {
  id: string;
  createdAt: number;
  status: "sent";
  customerId: string;
  customerName: string;
  title: string;
  fullText: string;
  city: string;
  district: string;
  address: string;
  chips: CircleWorkChip[];
  imageUri?: string;
};
/* =========================
✅ Performer Service Setup
========================= */
type WorkDay = "пн" | "вт" | "ср" | "чт" | "пт" | "сб" | "вс";
type CostType = "За услугу" | "За час" | "За метр" | "За единицу" | "За день";
type AddressMode = "У клиента" | "У исполнителя" | "Удаленно";
type TravelMode = "Не выезжаю" | "По своему району" | "По всему городу";
type PerformerServiceConfig = {
  id: string;
  sourceIndex: number;
  performerRecordId?: number;
  category?: string;
  service?: string;
  years?: number;
  days: Set<WorkDay>;
  timeFrom?: string;
  timeTo?: string;
  contract: boolean | null;
  warranty: boolean | null;
  minSumRub: string;
  workWithLegal: boolean | null;
  media: { uri: string; kind: "photo" | "video" }[];
  description: string;
  priceRub: string;
  priceIsFrom: boolean;
  costType?: CostType;
  addressMode: AddressMode;
  location: string;
  travelMode: TravelMode;
};
type QuickField = { text: string; selectedCategory?: string; selectedService?: string };
const WORK_DAYS: WorkDay[] = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const COST_TYPES: CostType[] = ["За услугу", "За час", "За метр", "За единицу", "За день"];
const ADDRESS_MODES: AddressMode[] = ["У клиента", "У исполнителя", "Удаленно"];
const TRAVEL_MODES: TravelMode[] = ["Не выезжаю", "По своему району", "По всему городу"];
/* =========================
HELPERS
========================= */
function uid() {
  return Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}
function money(n: number) {
  const s = Math.round(n).toString();
  const spaced = s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${spaced} ₽`;
}
function sanitizeName(input: string) {
  const cleaned = input.replace(/[^a-zA-Zа-яА-ЯёЁ\s-]/g, "");
  return cleaned.replace(/\s{2,}/g, " ").slice(0, 40);
}
function formatPhoneRU(input: string) {
  const digits = input.replace(/\D/g, "");
  let d = digits;
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);
  const rest = d.slice(1);
  const a = rest.slice(0, 3),
    b = rest.slice(3, 6),
    c = rest.slice(6, 8),
    e = rest.slice(8, 10);
  let out = "+7";
  if (a.length) out += ` (${a}`;
  if (a.length === 3) out += `)`;
  if (b.length) out += ` ${b}`;
  if (c.length) out += `-${c}`;
  if (e.length) out += `-${e}`;
  return out;
}
function phoneDigitsRU(value: string) {
  return value.replace(/\D/g, "");
}
function isValidEmail(value: string) {
  const v = (value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function formatServiceAge(createdAt: number) {
  const diffMs = Date.now() - createdAt;
  const days = Math.floor(diffMs / 86400000);
  if (days < 365) return "менее года";
  const years = Math.floor(days / 365);
  return years === 1 ? "1 год" : `${years} лет`;
}
const RU_MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
function formatChatDateRU(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()} ${RU_MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}г`;
}
function formatTimeHHMM(ts: number) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
function sameDay(a: number, b: number) {
  const da = new Date(a),
    db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
function formatYearsLabel(years: number) {
  if (years <= 0) return "менее года";
  if (years === 1) return "1 год";
  if (years >= 2 && years <= 4) return `${years} года`;
  return `${years} лет`;
}
function buildTimeOptionsHH00() {
  const out: string[] = [];
  for (let h = 0; h <= 23; h++) out.push(`${String(h).padStart(2, "0")}:00`);
  return out;
}
const TIME_OPTIONS = buildTimeOptionsHH00();
function formatOptionalBool(value: boolean | null | undefined) {
  if (value === true) return "Да";
  if (value === false) return "Нет";
  return "Не указано";
}
function formatWorkDaysSet(days?: Set<WorkDay>) {
  if (!days || !days.size) return "Не указано";
  return WORK_DAYS.filter((day) => days.has(day))
    .map((day) => day.toUpperCase())
    .join(", ");
}
/* =========================
   DATA
========================= */
const CATEGORY_SERVICES: Record<string, string[]> = {
  "Помощь по дому": ["Мойка окон", "Уборка", "Сборка мебели", "Мелкий ремонт"],
  "Помощь по здоровью": ["Сиделка", "Сопровождение", "Уколы/капельницы", "Помощь по дому"],
  "Помощь в логистике": ["Грузчики", "Переезд", "Доставка", "Курьер"],
  "Помощь в образовании": ["Репетитор", "Домашние задания", "Подготовка к экзаменам", "Языки"],
  "Помощь в бизнесе": ["SMM", "Дизайн", "Тексты", "Продажи/лидоген"],
  "Помощь в офисе": ["Помощь в документообороте", "Уборка офиса", "Юридические услуги", "Бухгалтерские услуги", "Аудиторские услуги", "Кредитные брокеры", "Лизинг"],
  "Помощь в путешествии": ["Гид", "Переводчик", "Маршрут", "Сопровождение"],
  "Помощь на дороге": ["Эвакуатор", "Шиномонтаж", "ремонт авто", "Срочная помощь"],
};
const ALL_CATEGORIES = Object.keys(CATEGORY_SERVICES);
const HOME_CATEGORIES_ORDER: string[] = [
  "Помощь по дому",
  "Помощь по здоровью",
  "Помощь в логистике",
  "Помощь в образовании",
  "Помощь в бизнесе",
  "Помощь в офисе",
  "Помощь на дороге",
  "Помощь в путешествии",
];
const HOME_HERO_URI = "https://images.unsplash.com/photo-1523413453844-2a37f58d7b0b?auto=format&fit=crop&w=1400&q=60";
const HOME_TOP_BG_URI = "https://images.unsplash.com/photo-1523413453844-2a37f58d7b0b?auto=format&fit=crop&w=1400&q=60";
const SERVICE_BANNER_URI: Record<string, string> = {
  "Мойка окон": "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1400&q=60",
  "Уборка": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=60",
  "Сборка мебели": "https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&w=1400&q=60",
  "Мелкий ремонт": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=60",
  "Сиделка": "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1400&q=60",
  "Сопровождение": "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1400&q=60",
  "Уколы/капельницы": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1400&q=60",
  "Помощь по дому": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=60",
  "Грузчики": "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1400&q=60",
  "Переезд": "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=60",
  "Доставка": "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1400&q=60",
  "Курьер": "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1400&q=60",
  "Репетитор": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=60",
  "Домашние задания": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=60",
  "Подготовка к экзаменам": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1400&q=60",
  "Языки": "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1400&q=60",
  "SMM": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=60",
  "Дизайн": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=60",
  "Тексты": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=60",
  "Продажи/лидоген": "https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1400&q=60",
  "Помощь в документообороте": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=60",
  "Уборка офиса": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=60",
  "Юридические услуги": "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=60",
  "Бухгалтерские услуги": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=60",
  "Аудиторские услуги": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=60",
  "Кредитные брокеры": "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1400&q=60",
  "Лизинг": "https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=1400&q=60",
  "Гид": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=60",
  "Переводчик": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=60",
  "Маршрут": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=60",
  "Эвакуатор": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=60",
  "Шиномонтаж": "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1400&q=60",
  "ремонт авто": "https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1400&q=60",
  "Срочная помощь": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=60",
};
function getServiceBannerUri(category: string, service: string) {
  return SERVICE_BANNER_URI[service] || CATEGORY_BANNER_URI[category] || HOME_HERO_URI;
}
const CATEGORY_BANNER_URI: Record<string, string> = {
  "Помощь по дому": "https://images.unsplash.com/photo-1560067174-8943bd8f0a7d?auto=format&fit=crop&w=1400&q=60",
  "Помощь по здоровью": "https://images.unsplash.com/photo-1580281658629-07c5f5a6f1a5?auto=format&fit=crop&w=1400&q=60",
  "Помощь в логистике": "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1400&q=60",
  "Помощь в образовании": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=60",
  "Помощь в бизнесе": "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1400&q=60",
  "Помощь в офисе": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=60",
  "Помощь в путешествии": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=60",
  "Помощь на дороге": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1400&q=60",
};
const defaultFilters: Filters = {
  city: "Ростов-на-Дону",
  district: undefined,
  category: undefined,
  service: undefined,
  priceFrom: undefined,
  priceTo: undefined,
  minRating4Plus: false,
  sort: "default",
};
// ✅ п.5: порядок специализаций (кнопки)
const CIRCLE_WORK_SUGGESTIONS: string[] = ["Дизайнер", "Демонтаж", "Штукатуры", "Стяжка пола", "Маляры", "Плиточник", "Сантехник", "Электрик", "Поклейка обоев", "Потолки", "Укладка ламината", "Мебель", "Клининг"];
const demoWorkPhotos = [
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1582582429416-0c6a4d2f4b16?auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=60",
];
const initialPerformers: Performer[] = [
  {
    id: 1,
    name: "Леонид Степанов",
    description: "Мойка окон и балконов",
    rating: 4.9,
    reviews: 152,
    years: 2,
    completed: 154,
    city: "Ростов-на-Дону",
    district: "Центральный",
    category: "Помощь по дому",
    service: "Мойка окон",
    price: 1800,
    priceIsFrom: true,
    isAvailable: true,
    isPro: true,
    isVerifiedPassport: true,
    workAreaMode: "city_all",
    avatarUri: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=200&q=60",
    bannerUri: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=60",
    services: [
      { title: "Мойка окон в квартире", price: 1800, priceIsFrom: true },
      { title: "Мойка балкона / лоджии", price: 1500, priceIsFrom: true },
      { title: "Мойка после ремонта", price: 3000, priceIsFrom: true },
    ],
    workPhotos: demoWorkPhotos,
  },
  {
    id: 2,
    name: "Андрей Пак",
    description: "Шиномонтаж и срочная помощь",
    rating: 4.7,
    reviews: 88,
    years: 3,
    completed: 210,
    city: "Ростов-на-Дону",
    district: "Ворошиловский",
    category: "Помощь на дороге",
    service: "Шиномонтаж",
    price: 1200,
    priceIsFrom: true,
    isAvailable: true,
    isPro: false,
    isVerifiedPassport: false,
    workAreaMode: "district_only",
    avatarUri: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=200&q=60",
    bannerUri: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=60",
    services: [
      { title: "Шиномонтаж", price: 1200, priceIsFrom: true },
      { title: "Срочная помощь", price: 1500, priceIsFrom: true },
      { title: "Эвакуатор", price: 2500, priceIsFrom: true },
    ],
    workPhotos: demoWorkPhotos,
  },
  {
    id: 3,
    name: "Мария Лебедева",
    description: "Репетитор по математике",
    rating: 4.8,
    reviews: 64,
    years: 4,
    completed: 340,
    city: "Ростов-на-Дону",
    district: "Ленинский",
    category: "Помощь в образовании",
    service: "Репетитор",
    price: 1200,
    priceIsFrom: true,
    isAvailable: true,
    isPro: true,
    isVerifiedPassport: true,
    workAreaMode: "district_only",
    avatarUri: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=60",
    bannerUri: "https://images.unsplash.com/photo-1520975958225-9e21f3c2bdf8?auto=format&fit=crop&w=1200&q=60",
    services: [
      { title: "Алгебра/геометрия", price: 1200, priceIsFrom: true },
      { title: "Подготовка к ОГЭ", price: 1500, priceIsFrom: true },
      { title: "Подготовка к ЕГЭ", price: 2000, priceIsFrom: true },
    ],
    workPhotos: demoWorkPhotos,
  },
  {
    id: 4,
    name: "Ирина Воронова",
    description: "Уборка: генеральная/поддерживающая",
    rating: 4.6,
    reviews: 51,
    years: 2,
    completed: 180,
    city: "Ростов-на-Дону",
    district: "Октябрьский",
    category: "Помощь по дому",
    service: "Уборка",
    price: 2000,
    priceIsFrom: true,
    isAvailable: true,
    isPro: false,
    isVerifiedPassport: true,
    workAreaMode: "district_only",
    avatarUri: "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=200&q=60",
    workPhotos: demoWorkPhotos,
  },
];
const demoReviewsByPerformerId: Record<number, Review[]> = {
  1: [
    { id: "r1", author: "Алексей", rating: 5, text: "Всё идеально, быстро и аккуратно.", createdAt: Date.now() - 86400000 * 3 },
    { id: "r2", author: "Марина", rating: 5, text: "Очень вежливый и пунктуальный мастер.", createdAt: Date.now() - 86400000 * 7 },
    { id: "r3", author: "Игорь", rating: 4, text: "Хорошо, но немного задержался.", createdAt: Date.now() - 86400000 * 11 },
  ],
  2: [
    { id: "r4", author: "Павел", rating: 5, text: "Спас в дороге, приехал быстро.", createdAt: Date.now() - 86400000 * 2 },
    { id: "r5", author: "Ольга", rating: 4, text: "Всё ок, но дороговато.", createdAt: Date.now() - 86400000 * 9 },
  ],
  3: [{ id: "r6", author: "Кирилл", rating: 5, text: "Очень доходчиво объясняет.", createdAt: Date.now() - 86400000 * 5 }],
  4: [{ id: "r7", author: "Анна", rating: 4, text: "Чисто, быстро. Спасибо.", createdAt: Date.now() - 86400000 * 6 }],
};
const demoMyReviewsCustomer: Review[] = [
  { id: "mc1", author: "Леонид Степанов", rating: 5, text: "Отличный заказчик, всё по делу.", createdAt: Date.now() - 86400000 * 4 },
  { id: "mc2", author: "Мария Лебедева", rating: 5, text: "Быстро договорились, комфортно работать.", createdAt: Date.now() - 86400000 * 12 },
];
const demoMyReviewsPerformer: Review[] = [
  { id: "mp1", author: "Анна (заказчик)", rating: 5, text: "Исполнитель вежливый, работа выполнена отлично.", createdAt: Date.now() - 86400000 * 3 },
  { id: "mp2", author: "Игорь (заказчик)", rating: 4, text: "В целом хорошо, но немного опозоздал.", createdAt: Date.now() - 86400000 * 9 },
];
const CITY_DISTRICTS: Record<string, string[]> = {
  Москва: ["ЦАО", "САО", "ЮАО", "ВАО", "ЮЗАО", "СЗАО", "ЗАО", "ЮВАО", "СВАО"],
  "Санкт-Петербург": ["Центральный", "Приморский", "Московский", "Петроградский", "Фрунзенский"],
  "Ростов-на-Дону": ["Центральный", "Ворошиловский", "Пролетарский", "Ленинский", "Октябрьский"],
};
function getDistrictsByCity(city: string) {
  return CITY_DISTRICTS[city] || ["Центральный", "Северный", "Южный", "Западный", "Восточный"];
}
/* =========================
   UI PRIMITIVES
========================= */
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
function PrimaryButton({
  title,
  onPress,
  variant = "green",
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: "green" | "dark" | "light";
  disabled?: boolean;
}) {
  const bg = variant === "green" ? GREEN : variant === "dark" ? "#111" : "#EFEFEF";
  const color = variant === "light" ? "#111" : "#fff";
  return (
    <TouchableOpacity
      style={[
        styles.primaryBtn,
        { backgroundColor: bg, opacity: disabled ? 0.55 : 1 },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Text style={[styles.primaryBtnText, { color }]} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
function Row({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>{children}</View>;
}
function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
function Pill({
  text,
  tone = "gray",
}: {
  text: string;
  tone?: "gray" | "green" | "blue" | "gold";
}) {
  const bg =
    tone === "green"
      ? "#E8F8EF"
      : tone === "blue"
      ? "#EAF1FF"
      : tone === "gold"
      ? "#FFF4D6"
      : "#F1F2F4";
  const color =
    tone === "green"
      ? GREEN
      : tone === "blue"
      ? "#1E4EA7"
      : tone === "gold"
      ? "#9A6B00"
      : "#444";
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}
/* =========================
   HEADER
========================= */
function BackArrow({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={styles.backArrow}>←</Text>
    </TouchableOpacity>
  );
}
function AppHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerSide}>
        <BackArrow onPress={onBack} />
      </View>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={[styles.headerSide, { alignItems: "flex-end" }]}>{right ?? null}</View>
    </View>
  );
}
/* =========================
   HEART
========================= */
function HeartButton({ active, onPress, transparent = false }: { active: boolean; onPress: () => void; transparent?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const run = () => {
    Animated.sequence([Animated.timing(scale, { toValue: 1.12, duration: 85, useNativeDriver: true }), Animated.timing(scale, { toValue: 1, duration: 110, useNativeDriver: true })]).start();
  };
  return (
    <Pressable
      onStartShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onPress={() => {
        run();
        onPress();
      }}
      style={[styles.favIconBtn, transparent ? styles.favIconBtnTransparent : null]}
      hitSlop={8}
    >
      <Animated.Text style={[styles.favIconTxt, active ? styles.favIconTxtActive : null, { transform: [{ scale }] }]}>{active ? "❤️" : "🤍"}</Animated.Text>
    </Pressable>
  );
}
/* =========================
   Performer Card
========================= */
function PerformerCard({
  p,
  onOpen,
  onOpenReviews,
  onToggleFav,
  isFav,
  proUnderHeart = false,
  passportUploadedFlag = false,
  showBanner = true,
}: {
  p: Performer;
  onOpen: () => void;
  onOpenReviews: () => void;
  onToggleFav: () => void;
  isFav: boolean;
  proUnderHeart?: boolean;
  passportUploadedFlag?: boolean;
  showBanner?: boolean;
}) {
  const showPassport = !!p.isVerifiedPassport && passportUploadedFlag;
  const bannerUri = getServiceBannerUri(p.category, p.service);
  return (
    <Pressable style={styles.pCard} onPress={onOpen}>
      {showBanner ? (
        <View style={styles.pCardBannerWrap}>
          <Image source={{ uri: bannerUri }} style={styles.pCardBanner} resizeMode="cover" />
          <View style={styles.pCardTopRight} pointerEvents="box-none">
            {!proUnderHeart && p.isPro ? <Pill text="PRO ⭐" tone="gold" /> : null}
            <HeartButton active={isFav} onPress={onToggleFav} />
          </View>
        </View>
      ) : (
        <View style={styles.pCardTopRightNoBanner} pointerEvents="box-none">
          {!proUnderHeart && p.isPro ? <Pill text="PRO ⭐" tone="gold" /> : null}
          <HeartButton active={isFav} onPress={onToggleFav} />
        </View>
      )}
      <Row>
        <View style={styles.pAvatarCol}>
          <View style={styles.avatarWrapRound}>
            {p.avatarUri ? <Image source={{ uri: p.avatarUri }} style={styles.avatarRound} /> : null}
          </View>
          {proUnderHeart && p.isPro ? (
            <View style={styles.proUnderAvatarWrap}>
              <Pill text="PRO ⭐" tone="gold" />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, paddingRight: 46 }}>
          <Text style={styles.pName} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={styles.pSpec} numberOfLines={2}>
            Специалист в области: {p.service}
          </Text>
          <Row style={{ marginTop: 8, flexWrap: "wrap" }}>
            <Text style={styles.pMeta}>⭐ {p.rating.toFixed(1)}</Text>
            <Text style={[styles.pMeta, { marginLeft: 10 }]}>{p.reviews} отзывов</Text>
            <Pressable onPress={onOpenReviews} style={{ marginLeft: 10 }}>
              <Text style={styles.pRead}>читать</Text>
            </Pressable>
            <View style={{ width: 10 }} />
            {showPassport ? (
              <Row style={{ marginTop: 4 }}>
                <Text style={styles.pCheck}>✅</Text>
                <Text style={styles.pPassport}>Паспорт проверен</Text>
              </Row>
            ) : null}
          </Row>
          <Text style={styles.pPrice}>
            {p.priceIsFrom ? "от " : ""}
            {money(p.price)}
            {p.costType ? ` / ${p.costType}` : ""}
          </Text>
        </View>
      </Row>
    </Pressable>
  );
}
/* =========================
   NeedHelperScreenView
========================= */
type NeedHelperScreenViewProps = {
  showHeader: boolean;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  filtersDraft: Filters;
  setFiltersDraft: React.Dispatch<React.SetStateAction<Filters>>;
  priceFromText: string;
  setPriceFromText: React.Dispatch<React.SetStateAction<string>>;
  priceToText: string;
  setPriceToText: React.Dispatch<React.SetStateAction<string>>;
  openPicker: (title: string, options: string[], selected: string | undefined, onPick: (v: string) => void) => void;
  user: User | null;
  setCustomerRequests: React.Dispatch<React.SetStateAction<CustomerRequest[]>>;
  customerRequests: CustomerRequest[];
  performers: Performer[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
};
function NeedHelperScreenView(props: NeedHelperScreenViewProps) {
  const { showHeader, filtersDraft, setFiltersDraft, setFilters, priceFromText, setPriceFromText, priceToText, setPriceToText, openPicker, user, setCustomerRequests, performers, setNotifications, setScreen } =
    props;
  const services = useMemo(() => (filtersDraft.category ? CATEGORY_SERVICES[filtersDraft.category] || [] : []), [filtersDraft.category]);
  const districts = useMemo(() => getDistrictsByCity(filtersDraft.city), [filtersDraft.city]);
  const parseMoney = (t: string) => {
    const digits = t.replace(/\D/g, "");
    if (!digits) return undefined;
    const n = parseInt(digits, 10);
    return Number.isFinite(n) ? n : undefined;
  };
  const apply = () => {
    const from = parseMoney(priceFromText);
    const to = parseMoney(priceToText);
    if (from != null && to != null && from > to) return Alert.alert("Ошибка", "Цена «от» не может быть больше «до»");
    setFilters({
      city: filtersDraft.city,
      district: filtersDraft.district || undefined,
      category: filtersDraft.category || undefined,
      service: filtersDraft.service || undefined,
      priceFrom: from,
      priceTo: to,
      minRating4Plus: filtersDraft.minRating4Plus,
      sort: filtersDraft.sort,
    });
    if (user) {
      const reqCategory = (filtersDraft.category || "").trim();
      if (reqCategory) {
        const req: CustomerRequest = {
          id: "cr_" + uid(),
          createdAt: Date.now(),
          city: filtersDraft.city,
          district: filtersDraft.district,
          category: reqCategory,
          service: filtersDraft.service,
          priceFrom: from,
          priceTo: to,
          customerId: user.id,
          customerName: user.firstName,
        };
        setCustomerRequests((prev) => [req, ...prev]);
        const notifyTargets = performers.filter((p) => {
          if (p.city !== req.city) return false;
          if (p.category !== req.category) return false;
          if (req.service && p.service !== req.service) return false;
          return true;
        });
        if (notifyTargets.length) {
          setNotifications((prev) => [
            ...notifyTargets.map(() => ({
              id: "n_" + uid(),
              createdAt: Date.now(),
              title: "Новый запрос от заказчика",
              text: `${req.customerName}: ${req.category}${req.service ? " / " + req.service : ""} • город: ${req.city}`,
              isRead: false,
              userRoleTarget: "performer" as const,
              meta: null,
            })),
            ...prev,
          ]);
        }
      }
    }
    setScreen({ name: "performersList", category: filtersDraft.category || "", serviceName: filtersDraft.service || "" });
  };
  const sortLabel = filtersDraft.sort === "default" ? "По умолчанию" : filtersDraft.sort === "cheaper" ? "Дешевле" : "Дороже";
  const onChangeFrom = (t: string) => setPriceFromText(t.replace(/\D/g, "").slice(0, 9));
  const onChangeTo = (t: string) => setPriceToText(t.replace(/\D/g, "").slice(0, 9));
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? (showHeader ? 88 : 0) : 0}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 220 }} keyboardShouldPersistTaps="always">
        <Title>Нужен помощник</Title>
        <Text style={{ marginTop: 6, color: "#666", fontWeight: "800" }}>Настройте фильтры и нажмите “Показать исполнителей”</Text>
        <View style={{ height: 10 }} />
        <Card>
          <Text style={styles.label}>Город</Text>
          <TouchableOpacity
            style={styles.pickerLine}
            activeOpacity={0.9}
            onPress={() => openPicker("Город", RUS_CITIES, filtersDraft.city, (v) => setFiltersDraft((p) => ({ ...p, city: v, district: undefined })))}
          >
            <Text style={styles.pickerVal}>{filtersDraft.city}</Text>
            <Text style={styles.pickerArr}>▾</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Район</Text>
          <TouchableOpacity
            style={styles.pickerLine}
            activeOpacity={0.9}
            onPress={() => openPicker("Район", ["", ...districts], filtersDraft.district || "", (v) => setFiltersDraft((p) => ({ ...p, district: v ? v : undefined })))}
          >
            <Text style={styles.pickerVal}>{filtersDraft.district ? filtersDraft.district : "Любой"}</Text>
            <Text style={styles.pickerArr}>▾</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Категория</Text>
          <TouchableOpacity
            style={styles.pickerLine}
            activeOpacity={0.9}
            onPress={() => openPicker("Категория", ["", ...ALL_CATEGORIES], filtersDraft.category || "", (v) => setFiltersDraft((p) => ({ ...p, category: v ? v : undefined, service: undefined })))}
          >
            <Text style={styles.pickerVal}>{filtersDraft.category ? filtersDraft.category : "Любая"}</Text>
            <Text style={styles.pickerArr}>▾</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Услуга</Text>
          <TouchableOpacity
            style={[styles.pickerLine, !filtersDraft.category ? { opacity: 0.55 } : null]}
            activeOpacity={0.9}
            disabled={!filtersDraft.category}
            onPress={() => openPicker("Услуга", ["", ...services], filtersDraft.service || "", (v) => setFiltersDraft((p) => ({ ...p, service: v ? v : undefined })))}
          >
            <Text style={styles.pickerVal}>{filtersDraft.service ? filtersDraft.service : "Любая"}</Text>
            <Text style={styles.pickerArr}>▾</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Стоимость</Text>
<View style={{ flexDirection: "row" }}>
  <TextInput
    style={[styles.input, { flex: 1, marginBottom: 0 }]}
    placeholder="от"
    value={priceFromText}
    onChangeText={onChangeFrom}
    keyboardType="number-pad"
    inputMode="numeric"
    autoCorrect={false}
    autoCapitalize="none"
    returnKeyType="next"
    blurOnSubmit={false}
    onSubmitEditing={apply}
    onBlur={() => setFiltersDraft((p) => ({ ...p, priceFrom: parseMoney(priceFromText) }))}
  />
  <View style={{ width: 10 }} />
  <TextInput
    style={[styles.input, { flex: 1, marginBottom: 0 }]}
    placeholder="до"
    value={priceToText}
    onChangeText={onChangeTo}
    keyboardType="number-pad"
    inputMode="numeric"
    autoCorrect={false}
    autoCapitalize="none"
    returnKeyType="done"
    blurOnSubmit={false}
    onSubmitEditing={apply}
    onBlur={() => setFiltersDraft((p) => ({ ...p, priceTo: parseMoney(priceToText) }))}
  />
</View> {/* ✅ ВОТ ЭТОТ </View> ОБЯЗАТЕЛЕН */}
          <Text style={styles.label}>Рейтинг</Text>
          <TouchableOpacity style={styles.rowLine} activeOpacity={0.9} onPress={() => setFiltersDraft((p) => ({ ...p, minRating4Plus: !p.minRating4Plus }))}>
            <Text style={{ fontWeight: "900", color: "#111" }}>4+ звезды</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ fontWeight: "900", color: filtersDraft.minRating4Plus ? GREEN : "#999" }}>{filtersDraft.minRating4Plus ? "Вкл" : "Выкл"}</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Сортировка</Text>
          <TouchableOpacity
            style={styles.pickerLine}
            activeOpacity={0.9}
            onPress={() =>
              openPicker("Сортировка", ["По умолчанию", "Дешевле", "Дороже"], sortLabel, (v) =>
                setFiltersDraft((p) => ({ ...p, sort: v === "Дешевле" ? "cheaper" : v === "Дороже" ? "expensive" : "default" }))
              )
            }
          >
            <Text style={styles.pickerVal}>{sortLabel}</Text>
            <Text style={styles.pickerArr}>▾</Text>
          </TouchableOpacity>
          <View style={{ height: 12 }} />
          <PrimaryButton title="Показать исполнителей" variant="dark" onPress={apply} />
          <View style={{ height: 10 }} />
          <PrimaryButton
            title="Сбросить"
            variant="light"
            onPress={() => {
              setFiltersDraft(defaultFilters);
              setPriceFromText("");
              setPriceToText("");
            }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
/* =========================
   BecomePerformerScreenView
========================= */
type BecomePerformerScreenViewProps = {
  showHeader: boolean;
  user: User | null;
  filters: Filters;
  customerRequests: CustomerRequest[];
  performers: Performer[];
  openPicker: (title: string, options: string[], selected: string | undefined, onPick: (v: string) => void) => void;
  perfName: string;
  setPerfName: React.Dispatch<React.SetStateAction<string>>;
  perfDesc: string;
  setPerfDesc: React.Dispatch<React.SetStateAction<string>>;
  perfCategory: string | undefined;
  setPerfCategory: React.Dispatch<React.SetStateAction<string | undefined>>;
  perfService: string | undefined;
  setPerfService: React.Dispatch<React.SetStateAction<string | undefined>>;
  perfPriceText: string;
  setPerfPriceText: React.Dispatch<React.SetStateAction<string>>;
  perfPriceIsFrom: boolean;
  setPerfPriceIsFrom: React.Dispatch<React.SetStateAction<boolean>>;
  matchedCustomersOpen: boolean;
  setMatchedCustomersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  matchedCustomers: CustomerRequest[];
  setMatchedCustomers: React.Dispatch<React.SetStateAction<CustomerRequest[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
};
function BecomePerformerScreenView(props: BecomePerformerScreenViewProps) {
  const {
    showHeader,
    user,
    filters,
    customerRequests,
    openPicker,
    perfName,
    setPerfName,
    perfDesc,
    setPerfDesc,
    perfCategory,
    setPerfCategory,
    perfService,
    setPerfService,
    perfPriceText,
    setPerfPriceText,
    perfPriceIsFrom,
    setPerfPriceIsFrom,
    matchedCustomersOpen,
    setMatchedCustomersOpen,
    matchedCustomers,
    setMatchedCustomers,
    setNotifications,
  } = props;
  const services = useMemo(() => (perfCategory ? CATEGORY_SERVICES[perfCategory] || [] : []), [perfCategory]);
  const onChangePerfPrice = (t: string) => setPerfPriceText(t.replace(/\D/g, ""));
  const save = () => {
    const nameTrim = perfName.trim();
    if (!nameTrim) return Alert.alert("Ошибка", "Введите имя.");
    if (!perfCategory) return Alert.alert("Ошибка", "Выберите категорию.");
    if (!perfService) return Alert.alert("Ошибка", "Выберите вид работы (услугу).");
    const priceNum = parseInt(perfPriceText || "0", 10);
    if (!priceNum || priceNum <= 0) return Alert.alert("Ошибка", "Укажите стоимость.");
    const city = user?.city || filters.city || defaultFilters.city;
    const matches = customerRequests.filter((r) => {
      if (r.city !== city) return false;
      if (r.category !== perfCategory) return false;
      if (r.service && r.service !== perfService) return false;
      return true;
    });
    if (matches.length) {
      setNotifications((prev) => [
        ...matches.map(() => ({
          id: "n_" + uid(),
          createdAt: Date.now(),
          title: "Найден исполнитель",
          text: `${nameTrim}: ${perfCategory} / ${perfService} • ${perfPriceIsFrom ? "от " : ""}${money(parseInt(perfPriceText, 10))} • город: ${city}`,
          isRead: false,
          userRoleTarget: "customer" as const,
          meta: null,
        })),
        ...prev,
      ]);
    }
    setMatchedCustomers(matches);
    setMatchedCustomersOpen(true);
    Alert.alert("Сохранено", matches.length ? "Заявка отправлена заказчикам." : "Пока нет заказчиков по этим параметрам.");
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? (showHeader ? 88 : 0) : 0}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 220 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: 10 }} />
        <Card>
          <Text style={styles.label}>Имя</Text>
          <TextInput style={styles.input} value={perfName} onChangeText={(t) => setPerfName(sanitizeName(t))} placeholder="Введите имя" />
          <Text style={styles.label}>Описание</Text>
          <TextInput style={styles.input} value={perfDesc} onChangeText={setPerfDesc} placeholder="Опишите себя и опыт" multiline />
          <Text style={styles.label}>Категория</Text>
          <TouchableOpacity
            style={styles.pickerLine}
            activeOpacity={0.9}
            onPress={() =>
              openPicker("Категория", ALL_CATEGORIES, perfCategory, (v) => {
                setPerfCategory(v);
                setPerfService(undefined);
              })
            }
          >
            <Text style={styles.pickerVal}>{perfCategory ? perfCategory : "Выберите категорию"}</Text>
            <Text style={styles.pickerArr}>▾</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Вид работы (услуга)</Text>
          <TouchableOpacity style={[styles.pickerLine, !perfCategory ? { opacity: 0.55 } : null]} disabled={!perfCategory} activeOpacity={0.9} onPress={() => openPicker("Услуга", services, perfService, (v) => setPerfService(v))}>
            <Text style={styles.pickerVal}>{perfService ? perfService : "Выберите услугу"}</Text>
            <Text style={styles.pickerArr}>▾</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Стоимость в ₽</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={perfPriceText}
              onChangeText={onChangePerfPrice}
              placeholder="Введите сумму"
              keyboardType="number-pad"
              inputMode="numeric"
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={save}
            />
          </View>
          <View style={{ height: 10 }} />
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setPerfPriceIsFrom(true)} style={[styles.priceModeBtn, perfPriceIsFrom ? styles.priceModeBtnActive : null]}>
              <Text style={[styles.priceModeBtnText, perfPriceIsFrom ? styles.priceModeBtnTextActive : null]}>от</Text>
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <TouchableOpacity activeOpacity={0.9} onPress={() => setPerfPriceIsFrom(false)} style={[styles.priceModeBtn, !perfPriceIsFrom ? styles.priceModeBtnActive : null]}>
              <Text style={[styles.priceModeBtnText, !perfPriceIsFrom ? styles.priceModeBtnTextActive : null]}>фиксированная</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 14 }} />
          <PrimaryButton title="Сохранить" variant="dark" onPress={save} />
        </Card>
      </ScrollView>
      <Modal visible={matchedCustomersOpen} transparent animationType="fade">
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject as any} activeOpacity={1} onPress={() => setMatchedCustomersOpen(false)} />
          <View style={styles.sheetCard}>
            <Text style={{ fontWeight: "900", fontSize: 16 }}>Заказчики по вашим параметрам</Text>
            <Text style={{ marginTop: 6, color: "#666", fontWeight: "800" }}>{matchedCustomers.length ? `Найдено: ${matchedCustomers.length}` : "Пока нет совпадений"}</Text>
            <View style={{ height: 10 }} />
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {matchedCustomers.map((r) => (
                <View key={r.id} style={styles.matchRow}>
                  <Text style={{ fontWeight: "900", color: "#111" }}>{r.customerName}</Text>
                  <Text style={{ marginTop: 4, color: "#666", fontWeight: "800" }}>
                    {r.city}
                    {r.district ? ` • ${r.district}` : ""} • {r.category}
                    {r.service ? ` / ${r.service}` : ""}
                  </Text>
                  {r.priceFrom != null || r.priceTo != null ? (
                    <Text style={{ marginTop: 4, color: "#111", fontWeight: "900" }}>
                      Бюджет: {r.priceFrom != null ? `от ${money(r.priceFrom)}` : ""}
                      {r.priceTo != null ? ` до ${money(r.priceTo)}` : ""}
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
            <View style={{ height: 10 }} />
            <PrimaryButton title="Закрыть" variant="light" onPress={() => setMatchedCustomersOpen(false)} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
/* =========================
   ConfirmOrderScreenView
========================= */
type ConfirmOrderScreenViewProps = {
  showHeader: boolean;
  s: Extract<Screen, { name: "confirmOrder" }>;
  performers: Performer[];
  createOrder: (p: Performer, category: string, serviceName: string, price: number, priceIsFrom: boolean) => Order | undefined;
  openChatForOrder: (orderId: string) => void;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
};
function ConfirmOrderScreenView(props: ConfirmOrderScreenViewProps) {
  const { showHeader, s, performers, createOrder, openChatForOrder, setScreen } = props;
  const p = performers.find((x) => x.id === s.performerId);
  if (!p) return null;
  const confirm = () => {
    const order = createOrder(p, s.category, s.serviceName, s.price, s.priceIsFrom);
    if (!order) return;
    setScreen({ name: "orderSuccess", orderId: order.id });
    openChatForOrder(order.id);
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? (showHeader ? 88 : 0) : 0}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 220 }} keyboardShouldPersistTaps="handled">
        <Title>Подтверждение</Title>
        <View style={{ height: 10 }} />
        <Card>
          <Text style={{ fontWeight: "900", color: "#111" }}>{p.name}</Text>
          <Text style={{ marginTop: 4, color: "#666", fontWeight: "800" }}>
            {s.category} / {s.serviceName}
          </Text>
          <Text style={{ fontWeight: "900", marginTop: 12, marginBottom: 6 }}>Стоимость</Text>
          <Text style={{ color: "#111", fontWeight: "900", marginBottom: 12, fontSize: 16 }}>
            {s.priceIsFrom ? "от " : ""}
            {money(s.price)}
          </Text>
          <PrimaryButton title="Создать заказ и перейти в чат" variant="dark" onPress={confirm} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
/* =========================
   ChatScreenView
========================= */
type ChatScreenViewProps = {
  orderId: string;
  chats: Record<string, ChatMsg[]>;
  setChats: React.Dispatch<React.SetStateAction<Record<string, ChatMsg[]>>>;
  orders: Order[];
  performers: Performer[];
  user: User | null;
profileMode: UserRole;
performerServices: PerformerServiceConfig[];
  openPerformerProfile: (performerId: number) => void;
  onArchiveDeal: () => void;
  pushChatNotification: (toRole: UserRole, title: string, text: string) => void;
  getDealStage: (orderId: string) => DealStage;
  setDealStage: (orderId: string, stage: DealStage) => void;
  setOrderStatus: (orderId: string, status: OrderStatus) => void;
  notifyAdminDispute: (orderId: string) => void;
  bottomOverlayInset?: number;
  // ✅ обязателен для чата (чтобы меню "+" и 📷 могли открывать галерею)
  pickDeviceMedia: (params: {
    kind: "photo" | "video" | "mixed" | "file";
multiple?: boolean;
limit?: number;
onPicked: (items: { uri: string; kind: "photo" | "video" | "file"; name?: string }[]) => void;
  }) => void | Promise<void>;
};
function ChatScreenView(props: ChatScreenViewProps) {
  const {
  orderId,
  chats,
  setChats,
  orders,
  performers,
  user,
  profileMode,
  performerServices,
  openPerformerProfile,
  onArchiveDeal,
  pushChatNotification,
  getDealStage,
  setDealStage,
  setOrderStatus,
  notifyAdminDispute,
  bottomOverlayInset = 0,
  pickDeviceMedia, // ✅ важно
} = props;
  const insets = useSafeAreaInsets();
  const msgs = chats[orderId] || [];
    // ✅ Toast при попытке обмена контактами (телефон)
  const [phoneToastVisible, setPhoneToastVisible] = useState(false);
  const phoneToastOpacity = useRef(new Animated.Value(0)).current;
  const phoneToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPhoneToastAtRef = useRef<number>(0);

  // Детектор телефонов (любые форматы: +7..., 8..., 7..., пробелы/скобки/дефисы и т.д.)
  const containsPhoneNumber = useCallback((textValue: string) => {
    const t = (textValue || "").trim();
    if (!t) return false;

    // 1) самый частый RU паттерн
    const ruPattern = /(\+7|7|8)\s*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/;

    // 2) общий "длинный номер": минимум 10 цифр подряд с разделителями
    //    (плюс/скобки/пробелы/дефисы допустимы)
    const generic = /(?:\+?\d[\s\-()]{0,3}){10,}/;

    // 3) fallback: просто много цифр
    const digits = t.replace(/\D/g, "");
    const digitsLooksLikePhone = digits.length >= 10 && digits.length <= 15;

    return ruPattern.test(t) || generic.test(t) || digitsLooksLikePhone;
  }, []);

  const showPhoneToast = useCallback(() => {
    const now = Date.now();
    // анти-спам: не чаще, чем раз в 2 секунды
    if (now - lastPhoneToastAtRef.current < 2000) return;
    lastPhoneToastAtRef.current = now;

    if (phoneToastTimerRef.current) clearTimeout(phoneToastTimerRef.current);

    setPhoneToastVisible(true);
    phoneToastOpacity.setValue(0);
    Animated.timing(phoneToastOpacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();

    phoneToastTimerRef.current = setTimeout(() => {
      Animated.timing(phoneToastOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setPhoneToastVisible(false);
      });
    }, 1500);
  }, [phoneToastOpacity]);

  // ✅ если новое сообщение содержит номер телефона — показать toast
  useEffect(() => {
    if (!msgs.length) return;
    const last = msgs[msgs.length - 1];
    if (!last) return;
    if (containsPhoneNumber(last.text || "")) {
      showPhoneToast();
    }
  }, [msgs.length, containsPhoneNumber, showPhoneToast]);

  // cleanup
  useEffect(() => {
    return () => {
      if (phoneToastTimerRef.current) clearTimeout(phoneToastTimerRef.current);
    };
  }, []);
    const hasTextConversation = useMemo(() => {
  // ✅ Начало переписки — только если "я" отправил текст через поле ввода (или быстрый ответ, если он шлётся через sendTextMessage)
  return msgs.some((m) => m.sender === "me" && (m.text || "").trim().length > 0);
}, [msgs]);
  const guardMediaBeforeText = () => {
  if (hasTextConversation) return true;
  const title = "Отправка невозможна";
  const msg = "Отправка возможна после переписки. Сначала отправьте текстовое сообщение.";
  if (Platform.OS === "web") {
    // ✅ web fallback
    (globalThis as any)?.alert?.(`${title}\n\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
  return false;
};
  const [text, setText] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachmentViewer, setAttachmentViewer] = useState<null | {
  uri: string;
  kind: ChatAttachmentKind;
  name?: string;
}>(null);
// recorder refs
const recordingRef = useRef<Audio.Recording | null>(null);
// WEB MediaRecorder refs
const webRecorderRef = useRef<MediaRecorder | null>(null);
const webStreamRef = useRef<MediaStream | null>(null);
const webChunksRef = useRef<BlobPart[]>([]);
// playback state/refs
const [playingId, setPlayingId] = useState<string | null>(null);
const soundRef = useRef<Audio.Sound | null>(null);
const webAudioRef = useRef<HTMLAudioElement | null>(null);
const sendAudioAttachment = useCallback(
  (uri: string, name?: string) => {
    const msg: ChatMsg = {
      id: "m_" + uid(),
      orderId,
      sender: "me",
      createdAt: Date.now(),
      text: "",
      attachment: {
        uri,
        kind: "audio",
        name: name ?? (Platform.OS === "web" ? "voice.webm" : "voice.m4a"),
      },
    };

    setChats((prev) => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), msg],
    }));
  },
  [orderId, setChats]
);

const openUri = useCallback(async (uri: string, name?: string, mimeType?: string) => {
  if (!uri) return;

  // WEB
  if (Platform.OS === "web") {
    (globalThis as any)?.open?.(uri, "_blank", "noopener,noreferrer");
    return;
  }

  // ANDROID: Intent VIEW с grant permission
  if (Platform.OS === "android") {
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: uri,
        flags: IntentLauncher.IntentLauncherAndroid.FLAG_GRANT_READ_URI_PERMISSION,
        type: mimeType,
      });
      return;
    } catch {
      // fallback ниже
    }
  }

  // iOS / fallback
  try {
    await Linking.openURL(uri);
  } catch {
    Alert.alert("Не удалось открыть файл", "Попробуйте PDF или установите приложение для этого типа документа.");
  }
}, []);
const stopPlayback = useCallback(async () => {
  // WEB
  if (Platform.OS === "web") {
    const a = webAudioRef.current;
    if (a) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
      webAudioRef.current = null;
    }
    setPlayingId(null);
    return;
  }
  // iOS/Android
  try {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  } catch {}
  setPlayingId(null);
}, []);
const togglePlayAudio = useCallback(
  async (id: string, uri: string) => {
    if (!uri) return;
    // нажали на уже играющее
    if (playingId === id) {
      await stopPlayback();
      return;
    }
    // остановить предыдущее
    await stopPlayback();
    // WEB
    // ✅ WEB
if (Platform.OS === "web") {
  try {
    const AudioCtor = (globalThis as any).Audio;
    if (!AudioCtor) {
      (globalThis as any)?.alert?.("Воспроизведение недоступно в этой среде.");
      return;
    }
    const a: HTMLAudioElement = new AudioCtor(uri);
    webAudioRef.current = a;
    setPlayingId(id);
    a.onended = () => {
      setPlayingId(null);
      webAudioRef.current = null;
    };
    // важно: play должен быть внутри try, иначе catch не ловит
    await a.play();
  } catch (e) {
    console.log("WEB_PLAY_ERROR", e);
    (globalThis as any)?.alert?.("Не удалось воспроизвести голосовое сообщение.");
    setPlayingId(null);
    webAudioRef.current = null;
  }
  return;
}
    // iOS/Android (expo-av)
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingId(id);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status?.didJustFinish) {
          setPlayingId(null);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch {
      Alert.alert("Ошибка", "Не удалось воспроизвести голосовое сообщение.");
      setPlayingId(null);
      soundRef.current = null;
    }
  },
  [playingId, stopPlayback]
);
useEffect(() => {
  return () => {
    stopPlayback();
  };
}, [stopPlayback]);
const startVoiceRecording = useCallback(async () => {
  if (!guardMediaBeforeText()) return;
  // WEB: MediaRecorder
  if (Platform.OS === "web") {
    try {
      const navAny = globalThis as any;
      const mediaDevices = navAny?.navigator?.mediaDevices;
      if (!mediaDevices?.getUserMedia) {
        navAny?.alert?.("Запись недоступна в этом браузере.");
        return;
      }
      const stream: MediaStream = await mediaDevices.getUserMedia({ audio: true });
      webStreamRef.current = stream;
      const RecorderCtor = (globalThis as any).MediaRecorder;
      const recorder: MediaRecorder = new RecorderCtor(stream);
      webRecorderRef.current = recorder;
      webChunksRef.current = [];
      recorder.ondataavailable = (e: any) => {
        if (e?.data && e.data.size > 0) webChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        try {
          const blob = new Blob(webChunksRef.current, { type: "audio/webm" });
          const url = (globalThis as any)?.URL?.createObjectURL?.(blob);
          if (url) sendAudioAttachment(url, "voice.webm");
        } finally {
          webStreamRef.current?.getTracks?.().forEach((t) => t.stop());
          webStreamRef.current = null;
          webRecorderRef.current = null;
          webChunksRef.current = [];
        }
      };
      recorder.start();
      setIsRecording(true);
      return;
    } catch (e) {
      (globalThis as any)?.alert?.("Не удалось получить доступ к микрофону.");
      setIsRecording(false);
      return;
    }
  }
  // iOS/Android: expo-av Recording
  try {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Доступ", "Нужен доступ к микрофону.");
      return;
    }
    // ВАЖНО: если что-то играло — остановить
    await stopPlayback();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setIsRecording(true);
  } catch (e) {
    console.log("REC_START_ERROR", e);
    Alert.alert("Ошибка", "Не удалось начать запись голосового сообщения");
    setIsRecording(false);
    recordingRef.current = null;
  }
}, [guardMediaBeforeText, sendAudioAttachment, stopPlayback]);
const stopVoiceRecording = useCallback(async () => {
  // WEB
  if (Platform.OS === "web") {
    try {
      const r = webRecorderRef.current;
      if (r && r.state !== "inactive") r.stop();
    } finally {
      setIsRecording(false);
    }
    return;
  }
  // iOS/Android
  try {
    const rec = recordingRef.current;
    if (!rec) {
      setIsRecording(false);
      return;
    }
    await rec.stopAndUnloadAsync();
    const uri = rec.getURI();
    recordingRef.current = null;
    setIsRecording(false);
    // переключаем обратно в режим воспроизведения
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
    if (uri) sendAudioAttachment(uri, "voice.m4a");
  } catch (e) {
    console.log("REC_STOP_ERROR", e);
    Alert.alert("Ошибка", "Не удалось остановить запись.");
    setIsRecording(false);
    recordingRef.current = null;
  }
}, [sendAudioAttachment]);
  const openDeviceCamera = useCallback(async () => {
  if (!guardMediaBeforeText()) return;

  // WEB fallback: на вебе открываем выбор фото
  if (Platform.OS === "web") {
    pickDeviceMedia({
      kind: "photo",
      limit: 1,
      onPicked: (items) => {
        const first = items[0];
        if (!first?.uri) return;
        const msg: ChatMsg = {
          id: "m_" + uid(),
          orderId,
          sender: "me",
          createdAt: Date.now(),
          text: "",
          attachment: { uri: first.uri, kind: "photo" },
        };
        setChats((prev) => ({
          ...prev,
          [orderId]: [...(prev[orderId] || []), msg],
        }));
      },
    });
    return;
  }

  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Доступ", "Нужен доступ к камере.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
      videoMaxDuration: 120, // ✅ 2 минуты
    });

    if (res.canceled) return;

    const asset = res.assets?.[0];
    if (!asset?.uri) return;

    const isVideo = asset.type === "video";

    // ✅ лимиты видео (как в регламентах)
    if (isVideo) {
      const MAX_VIDEO_MS = 2 * 60 * 1000;
      const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

      const durationMs = typeof asset.duration === "number" ? asset.duration : undefined;
      const fileSizeBytes = (asset as any).fileSize as number | undefined;

      if (durationMs != null && durationMs > MAX_VIDEO_MS) {
        Alert.alert("Лимит видео", "Видео должно быть не длиннее 2 минут.");
        return;
      }
      if (fileSizeBytes != null && fileSizeBytes > MAX_VIDEO_BYTES) {
        Alert.alert("Лимит видео", "Размер видео должен быть не больше 50 MB.");
        return;
      }
    }

    let thumbUri: string | undefined;
    if (isVideo) {
      try {
        const th = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 0 });
        thumbUri = th?.uri;
      } catch {
        thumbUri = undefined;
      }
    }

    const msg: ChatMsg = {
      id: "m_" + uid(),
      orderId,
      sender: "me",
      createdAt: Date.now(),
      text: "",
      attachment: {
        uri: asset.uri,
        kind: isVideo ? "video" : "photo",
        name: isVideo ? "video.mp4" : undefined,
        thumbUri,
      },
    };

    setChats((prev) => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), msg],
    }));
  } catch {
    Alert.alert("Ошибка", "Не удалось открыть камеру.");
  }
}, [guardMediaBeforeText, orderId, pickDeviceMedia, setChats]);
  const rot = useRef(new Animated.Value(0)).current;
  const [offerText, setOfferText] = useState("");
  
// Универсальная отправка текста (для обычного send + быстрых ответов)
const sendTextMessage = (value: string) => {
  const t = value.trim();
  if (!t) return;
  const msg: ChatMsg = {
    id: "m_" + uid(),
    orderId,
    sender: "me",
    createdAt: Date.now(),
    text: t,
  };
  setChats((prev) => ({ ...prev, [orderId]: [...(prev[orderId] || []), msg] }));
  setText("");
  const myRole: UserRole = user?.role ?? "customer";
  const otherRole: UserRole = myRole === "customer" ? "performer" : "customer";
  pushChatNotification(otherRole, "Новое сообщение", `В чате по заказу ${orderId}: ${t.slice(0, 60)}`);
};
  const [payOpen, setPayOpen] = useState(false);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [meetPlaceOpen, setMeetPlaceOpen] = useState(false);
const meetingPlaceText = useMemo(() => {
  if (!user) return "";
  const city = (user.city || "").trim();
  const district = (user.district || "").trim();
  const address = (user.address || "").trim();
  // Формируем аккуратную строку
  const parts = [
    city ? `г. ${city}` : "",
    district ? `район: ${district}` : "",
    address ? `адрес: ${address}` : "",
  ].filter(Boolean);
  return parts.length ? `Место встречи: ${parts.join(", ")}` : "";
}, [user]);
const openMeetPlace = () => {
  if (!user) {
    if (Platform.OS === "web") (globalThis as any)?.alert?.("Сначала войдите в профиль.");
    else Alert.alert("Профиль", "Сначала войдите в профиль.");
    return;
  }
  if (!meetingPlaceText) {
    const msg = "Заполните Город, Район и Адрес в разделе «Управление профилем».";
    if (Platform.OS === "web") (globalThis as any)?.alert?.(msg);
    else Alert.alert("Место встречи", msg);
    return;
  }
  setMeetPlaceOpen(true);
};
  const [quickReplyCustomOpen, setQuickReplyCustomOpen] = useState(false);
  const [quickReplyCustomText, setQuickReplyCustomText] = useState("");
  const [serviceAttachOpen, setServiceAttachOpen] = useState(false);
const availableServices = useMemo(() => {
  return (performerServices || [])
    .filter((s) => (s.service || "").trim().length > 0)
    .sort((a, b) => (a.service || "").localeCompare(b.service || "", "ru"));
}, [performerServices]);
const openServiceAttach = () => {
  // по ТЗ: услуги берем из "Мой профиль" при включенной кнопке "исполнитель"
  if (profileMode !== "performer") {
    Alert.alert(
      "Прикрепить услугу",
      'Переключите профиль в режим "Я исполнитель", чтобы прикреплять услуги.'
    );
    return;
  }
  if (!availableServices.length) {
    Alert.alert(
      "Прикрепить услугу",
      "Сначала добавьте и сохраните услуги в разделе «Мой профиль»."
    );
    return;
  }
  setServiceAttachOpen(true);
};
  const [payMethod, setPayMethod] = useState<"card" | "yoomoney" | "sberpay" | "sbp">("card");
  const [bankCode, setBankCode] = useState("");
  const [bankCodeStep, setBankCodeStep] = useState<"idle" | "waiting_code" | "code_enter">("idle");
  const order = orders.find((o) => o.id === orderId);
  const performer = performers.find((x) => x.id === order?.performerId);
  const otherName = performer?.name || "Исполнитель";
  const otherRatingNum = performer?.rating != null ? Number(performer.rating.toFixed(1)) : 0;
  const otherAvatar = performer?.avatarUri;
  const myAvatar = user?.avatarUri;
  const stage: DealStage = getDealStage(orderId);
  const serviceFee = useMemo(() => Math.round((order?.price ?? 0) * 0.1), [order?.price]);
  const totalToPay = useMemo(() => (order?.price ?? 0) + serviceFee, [order?.price, serviceFee]);
  const lastOfferAmount = useMemo(() => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.sender !== "system") continue;
      const m2 = m.text.replace(/\s/g, "");
      const match = m2.match(/(\d{2,})₽/);
      if (match && match[1]) return parseInt(match[1], 10);
    }
    return order?.price ?? 0;
  }, [msgs, order?.price]);
  const toggleAttach = () => {
    const next = !attachOpen;
    setAttachOpen(next);
    Animated.timing(rot, { toValue: next ? 1 : 0, duration: 160, useNativeDriver: true }).start();
  };
const send = () => {
  sendTextMessage(text);
};
  const submitByEnter = () => {
  if (text.trim().length === 0) return;
  send();
};
  const propose = () => {
    const n = parseInt(offerText.replace(/\D/g, "") || "0", 10);
    if (!n || n < 100) return Alert.alert("Ошибка", "Введите сумму (>= 100)");
    setChats((prev) => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), { id: "m_" + uid(), orderId, sender: "system", createdAt: Date.now(), text: `Вам предложили: ${money(n)}. Обсудите условия и сроки.` }],
    }));
    setOfferText("");
  };
  const accept = () => {
    if (!lastOfferAmount) return;
    setPayOpen(true);
  };
  const doPay = () => {
    setPayOpen(false);
    setDealStage(orderId, "paid");
    setOrderStatus(orderId, "in_progress");
    const sys: ChatMsg = { id: "m_" + uid(), orderId, sender: "system", createdAt: Date.now(), text: "Оплата произведена, удачной сделки." };
    setChats((prev) => ({ ...prev, [orderId]: [...(prev[orderId] || []), sys] }));
    pushChatNotification("customer", "Оплата", `Оплата по заказу ${orderId} произведена.`);
    pushChatNotification("performer", "Оплата", `Оплата по заказу ${orderId} произведена.`);
  };
  const requestBankCode = () => {
    setBankCodeStep("code_enter");
    Alert.alert("Код", "Код из банка отправлен (мок). Введите его для подтверждения.");
  };
  const releaseFunds = () => {
    const digits = bankCode.replace(/\D/g, "");
    if (digits.length < 4) return Alert.alert("Ошибка", "Введите код (минимум 4 цифры).");
    setDealStage(orderId, "released");
    setOrderStatus(orderId, "done");
    setChats((prev) => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), { id: "m_" + uid(), orderId, sender: "system", createdAt: Date.now(), text: "Работа принята. Выплата исполнителю отправлена (мок)." }],
    }));
    pushChatNotification("customer", "Работа принята", `По заказу ${orderId} подтверждено выполнение.`);
    pushChatNotification("performer", "Выплата", `По заказу ${orderId} подтверждено выполнение. Выплата отправлена.`);
    setBankCode("");
    setBankCodeStep("idle");
  };
  const openDispute = () => {
    setDealStage(orderId, "disputed");
    setOrderStatus(orderId, "disputed");
    notifyAdminDispute(orderId);
    setChats((prev) => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), { id: "m_" + uid(), orderId, sender: "system", createdAt: Date.now(), text: "Опишите ситуацию, чем вы не довольны?" }],
    }));
    pushChatNotification("customer", "Открыт спор", `По заказу ${orderId} открыт спор.`);
    pushChatNotification("performer", "Открыт спор", `По заказу ${orderId} открыт спор.`);
  };
  const attachItems = useMemo(() => {
      const sendAttachment = async (
  kind: ChatAttachmentKind,
  uri: string,
  name?: string,
  mimeType?: string
) => {
  if (!guardMediaBeforeText()) return;

  // === thumb for video ===
  let thumbUri: string | undefined;

  const generateVideoThumbWeb = async (videoUri: string) => {
    try {
      const docAny = (globalThis as any)?.document;
      if (!docAny?.createElement) return undefined;

      return await new Promise<string | undefined>((resolve) => {
        const video = docAny.createElement("video") as HTMLVideoElement;
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.src = videoUri;

        const cleanup = () => {
          try {
            video.pause();
            video.removeAttribute("src");
            video.load();
          } catch {}
        };

        video.onloadeddata = () => {
          try {
            const canvas = docAny.createElement("canvas") as HTMLCanvasElement;
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 180;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              cleanup();
              resolve(undefined);
              return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                cleanup();
                if (!blob) return resolve(undefined);
                const url = (globalThis as any)?.URL?.createObjectURL?.(blob);
                resolve(url || undefined);
              },
              "image/jpeg",
              0.82
            );
          } catch {
            cleanup();
            resolve(undefined);
          }
        };

        video.onerror = () => {
          cleanup();
          resolve(undefined);
        };
      });
    } catch {
      return undefined;
    }
  };

  if (kind === "video" && uri) {
    if (Platform.OS === "web") {
      thumbUri = await generateVideoThumbWeb(uri);
    } else {
      try {
        const res = await VideoThumbnails.getThumbnailAsync(uri, { time: 0 });
        thumbUri = res?.uri;
      } catch {
        thumbUri = undefined;
      }
    }
  }

  const msg: ChatMsg = {
    id: "m_" + uid(),
    orderId,
    sender: "me",
    createdAt: Date.now(),
    text: "",
    attachment: { uri, kind, name, thumbUri, mimeType },
  };

  setChats((prev) => ({ ...prev, [orderId]: [...(prev[orderId] || []), msg] }));
};

const pickPhotoFromDevice = () => {
  if (!guardMediaBeforeText()) return;
  pickDeviceMedia({
    kind: "photo",
    limit: 1,
    onPicked: async (items) => {
      const first = items[0];
      if (!first?.uri) return;
      await sendAttachment("photo", first.uri);
    },
  });
};

const pickVideoFromDevice = () => {
  if (!guardMediaBeforeText()) return;
  pickDeviceMedia({
    kind: "video",
    limit: 1,
    onPicked: async (items) => {
      const first = items[0];
      if (!first?.uri) return;
      await sendAttachment("video", first.uri, first.name, first.mimeType);
    },
  });
};

const pickFileFromDevice = () => {
  if (!guardMediaBeforeText()) return;
  pickDeviceMedia({
    kind: "file",
    limit: 1,
    onPicked: async (items) => {
      const first = items[0];
      if (!first?.uri) return;
      await sendAttachment("file", first.uri, first.name || "Документ", first.mimeType);
    },
  });
};

const base = [
  { title: "Фото", onPress: pickPhotoFromDevice },
  { title: "Видео", onPress: pickVideoFromDevice },
  { title: "Прикрепить документ", onPress: pickFileFromDevice },
  { title: "Скорый ответ", onPress: () => setQuickRepliesOpen(true) },
  { title: "Указать место встречи", onPress: openMeetPlace },
  { title: "Прикрепить услугу", onPress: () => openServiceAttach() },
  { title: "Закрыть сделку и отправить в архив", onPress: () => onArchiveDeal() },
];

if (stage === "disputed") {
  return [
    {
      title: "Фото (до 5)",
      onPress: () => {
        if (!guardMediaBeforeText()) return;
        Alert.alert("Фото", "Можно до 5 фото (мок).");
      },
    },
    {
      title: "Видео (до 10с)",
      onPress: () => {
        if (!guardMediaBeforeText()) return;
        Alert.alert("Видео", "Короткое видео до 10с (мок).");
      },
    },
    ...base.filter((x) => x.title !== "Фото" && x.title !== "Видео"),
  ];
}

return base;
  }, [onArchiveDeal, stage, openMeetPlace]);
  return (
    <KeyboardAvoidingView
  style={{ flex: 1, backgroundColor: "#F6F7F9" }}
  behavior={Platform.OS === "ios" ? "padding" : "height"} // ✅
  keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
>
      <Modal visible={attachOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.attachBackdrop} activeOpacity={1} onPress={toggleAttach} />
        <View style={styles.attachPanel}>
          {attachItems.map((it) => (
            <TouchableOpacity
              key={it.title}
              style={styles.attachItem}
              activeOpacity={0.85}
              onPress={() => {
                toggleAttach();
                it.onPress();
              }}
            >
              <Text style={styles.attachItemText}>{it.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
      
<Modal visible={quickRepliesOpen} transparent animationType="fade">
  <TouchableOpacity
    style={styles.sheetBackdrop}
    activeOpacity={1}
    onPress={() => setQuickRepliesOpen(false)}
  />
  <View style={[styles.sheetCard, { position: "absolute", left: 0, right: 0, bottom: 0 }]}>
    <Text style={{ fontWeight: "900", fontSize: 16, color: "#111" }}>Скорый ответ</Text>
    <View style={{ height: 10 }} />
    {[
      "Уже не актуально",
      "Наберите мне",
      "Как быстро сможете приехать?",
      "Сколько стоит?",
    ].map((t) => (
      <TouchableOpacity
        key={t}
        activeOpacity={0.9}
        style={styles.sheetOption}
        onPress={() => {
          setQuickRepliesOpen(false);
          sendTextMessage(t);
        }}
      >
        <Text style={{ fontWeight: "900", color: "#111" }}>{t}</Text>
      </TouchableOpacity>
    ))}
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.sheetOption, { borderWidth: 2, borderColor: GREEN, backgroundColor: "#E8F8EF" }]}
      onPress={() => {
        setQuickRepliesOpen(false);
        setQuickReplyCustomOpen(true);
      }}
    >
      <Text style={{ fontWeight: "900", color: GREEN }}>Добавить свой быстрый ответ</Text>
    </TouchableOpacity>
    <View style={{ height: 10 }} />
    <PrimaryButton title="Закрыть" variant="light" onPress={() => setQuickRepliesOpen(false)} />
  </View>
</Modal>
{/* ✅ Custom Quick Reply modal */}
<Modal visible={quickReplyCustomOpen} transparent animationType="slide">
  <KeyboardAvoidingView
    style={styles.modalBackdrop}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    keyboardVerticalOffset={Platform.OS === "ios" ? 44 : 0}
  >
    <View style={styles.modalCard}>
      <Text style={{ fontWeight: "900", fontSize: 16 }}>Свой быстрый ответ</Text>
      <View style={{ height: 10 }} />
      <TextInput
        style={styles.input}
        placeholder="Введите текст..."
        value={quickReplyCustomText}
        onChangeText={setQuickReplyCustomText}
      />
      <PrimaryButton
        title="Отправить"
        variant="dark"
        onPress={() => {
          const t = quickReplyCustomText.trim();
          if (!t) return;
          setQuickReplyCustomText("");
          setQuickReplyCustomOpen(false);
          sendTextMessage(t);
        }}
      />
      <View style={{ height: 10 }} />
      <PrimaryButton title="Отмена" variant="light" onPress={() => setQuickReplyCustomOpen(false)} />
    </View>
  </KeyboardAvoidingView>
</Modal>
{/* ✅ Meet place modal */}
<Modal visible={meetPlaceOpen} transparent animationType="slide">
  <View style={styles.sheetBackdrop}>
    <TouchableOpacity
      style={StyleSheet.absoluteFillObject as any}
      activeOpacity={1}
      onPress={() => setMeetPlaceOpen(false)}
    />
    <View style={styles.sheetCard}>
      <Text style={{ fontWeight: "900", fontSize: 16, color: "#111" }}>
        Место встречи
      </Text>
      <View style={{ height: 10 }} />
      <Text style={{ color: "#111", fontWeight: "800", lineHeight: 20 }}>
        {meetingPlaceText}
      </Text>
      <View style={{ height: 12 }} />
      <PrimaryButton
        title="Отправить"
        variant="dark"
        onPress={() => {
          setMeetPlaceOpen(false);
          if (meetingPlaceText) sendTextMessage(meetingPlaceText);
        }}
      />
      <View style={{ height: 10 }} />
      <PrimaryButton
        title="Отмена"
        variant="light"
        onPress={() => setMeetPlaceOpen(false)}
      />
    </View>
  </View>
</Modal>
      <Modal visible={payOpen} transparent animationType="slide">
        <View style={styles.payBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject as any} activeOpacity={1} onPress={() => setPayOpen(false)} />
          <View style={styles.payCard}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "900", fontSize: 16, color: "#111" }}>Оплата заказа</Text>
              <TouchableOpacity onPress={() => setPayOpen(false)} activeOpacity={0.9} style={styles.       payCloseBtn}>
                
  
                <Text style={{ fontWeight: "900", color: "#111" }}>✕</Text>
              </TouchableOpacity>
            </Row>
            <View style={{ height: 12 }} />
            <View style={styles.payInfoRow}>
              <Text style={styles.payInfoLeft}>Заказ</Text>
              <Text style={styles.payInfoRight}>{orderId}</Text>
            </View>
            <View style={styles.payInfoRow}>
              <Text style={styles.payInfoLeft}>{order?.serviceName || "Услуга"}</Text>
              <Text style={styles.payInfoRight}>{money(order?.price || 0)}</Text>
            </View>
            <View style={styles.payInfoRow}>
              <Text style={styles.payInfoLeft}>Сумма</Text>
              <Text style={styles.payInfoRight}>{money(order?.price || 0)}</Text>
            </View>
            <View style={styles.payInfoRow}>
              <Text style={styles.payInfoLeft}>Сервис</Text>
              <Text style={styles.payInfoRight}>{money(serviceFee)}</Text>
            </View>
            <View style={[styles.payInfoRow, { marginTop: 6 }]}>
              <Text style={[styles.payInfoLeft, { fontWeight: "900", color: "#111" }]}>Итого</Text>
              <Text style={[styles.payInfoRight, { fontWeight: "900", color: "#111" }]}>{money(totalToPay)}</Text>
            </View>
            <View style={{ height: 12 }} />
            <Text style={{ fontWeight: "900", color: "#111", marginBottom: 10 }}>Способ оплаты</Text>
            {[
              { id: "card" as const, label: "Банковская карта" },
              { id: "yoomoney" as const, label: "ЮMoney" },
              { id: "sberpay" as const, label: "СберPay" },
              { id: "sbp" as const, label: "СБП" },
            ].map((m) => {
              const active = payMethod === m.id;
              return (
                <TouchableOpacity key={m.id} activeOpacity={0.9} onPress={() => setPayMethod(m.id)} style={[styles.payMethodRow, active ? styles.payMethodRowActive : null]}>
                  <Text style={{ fontWeight: "900", color: "#111", flex: 1 }}>{m.label}</Text>
                  <View style={[styles.payRadio, active ? styles.payRadioActive : null]} />
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 12 }} />
            <TouchableOpacity activeOpacity={0.9} onPress={doPay} style={styles.payBtn}>
              <Text style={styles.payBtnText}>Оплатить {money(totalToPay)}</Text>
            </TouchableOpacity>
            <Text style={styles.paySafeText}>🔒 Безопасная оплата</Text>
          </View>
        </View>
      </Modal>
      <View style={[styles.chatTopCard, { marginTop: 10 }]}>
        <Row>
          <Pressable style={styles.chatTopAvatar} onPress={() => performer?.id && openPerformerProfile(performer.id)}>
            {otherAvatar ? <Image source={{ uri: otherAvatar }} style={styles.chatTopAvatarImg} /> : null}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatTopName} numberOfLines={1}>
              {otherName}
            </Text>
            <Row style={{ marginTop: 4 }}>
              <Text style={styles.chatTopRatingNum}>{otherRatingNum ? otherRatingNum.toFixed(1) : "—"}</Text>
              <Text style={styles.chatTopStar}>⭐</Text>
            </Row>
          </View>
        </Row>
        <View style={{ height: 10 }} />
        <Text style={styles.chatServiceTitle} numberOfLines={2}>
          {order?.category ? `${order.category} • ${order?.serviceName || "—"}` : order?.serviceName || "—"}
        </Text>
        
      </View>
            
      {/* ✅ Toast при номере телефона */}
      {phoneToastVisible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.phoneToastWrap,
            { opacity: phoneToastOpacity, top: insets.top + 12 },
          ]}
        >
          <View style={styles.phoneToastCard}>
            <Text style={styles.phoneToastText}>
              Общайтесь и оплачивайте только внутри приложения, это обеспечит защиту ваших интересов в ходе сделки.
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {/* дальше у тебя идет ScrollView с сообщениями */}
      {/* ✅ Toast при номере телефона */}
{phoneToastVisible ? (
  <Animated.View
    pointerEvents="none"
    style={[
      styles.phoneToastWrap,
      { opacity: phoneToastOpacity, top: insets.top + 12 },
    ]}
  >
    <View style={styles.phoneToastCard}>
      <Text style={styles.phoneToastText}>
        Общайтесь и оплачивайте только внутри приложения, это обеспечит защиту ваших интересов в ходе сделки.
      </Text>
    </View>
  </Animated.View>
) : null}
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 220 + bottomOverlayInset }} keyboardShouldPersistTaps="handled">
        <View style={styles.chatDateWrap}>
          <Text style={styles.chatDateText}>{formatChatDateRU(Date.now())}</Text>
        </View>
        <View style={{ height: 8 }} />
        {msgs.map((m, idx) => {
          const prev = msgs[idx - 1];
          const showDay = idx !== 0 && prev ? !sameDay(prev.createdAt, m.createdAt) : false;
          const isMe = m.sender === "me";
          const isSys = m.sender === "system";
          const isMedia = !!m.attachment && (m.attachment.kind === "photo" || m.attachment.kind === "video");
          if (isSys) {
            return (
              <View key={m.id} style={styles.sysWrap}>
                {showDay ? (
                  <View style={styles.chatDateWrap}>
                    <Text style={styles.chatDateText}>{formatChatDateRU(m.createdAt)}</Text>
                  </View>
                ) : null}
                <View style={styles.sysBubble}>
                  <Text style={styles.sysText}>{m.text}</Text>
                  <Text style={styles.msgTimeCenter}>{formatTimeHHMM(m.createdAt)}</Text>
                </View>
              </View>
            );
          }
          return (
            <View key={m.id}>
              {showDay ? (
                <View style={styles.chatDateWrap}>
                  <Text style={styles.chatDateText}>{formatChatDateRU(m.createdAt)}</Text>
                </View>
              ) : null}
              <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                {!isMe ? (
                  <Pressable style={styles.msgAvatar} onPress={() => performer?.id && openPerformerProfile(performer.id)} hitSlop={8}>
                    {otherAvatar ? <Image source={{ uri: otherAvatar }} style={styles.msgAvatarImg} /> : null}
                  </Pressable>
                ) : null}
                

<View
  style={[
    styles.bubble,
    isMe ? styles.bubbleMe : styles.bubbleOther,
    isMedia ? styles.bubbleMedia : null, // ✅ УБИРАЕТ зелёный фон/пэддинги
  ]}
>
  {m.attachment ? (
    m.attachment.kind === "audio" ? (
      <Pressable onPress={() => togglePlayAudio(m.id, m.attachment?.uri || "")}>
        <Text style={[styles.bubbleText, { color: isMe ? "#fff" : "#111" }]}>
          {playingId === m.id ? "⏸️ Голосовое (пауза)" : "▶️ Голосовое сообщение"}
        </Text>
      </Pressable>
    ) : m.attachment.kind === "photo" ? (
      <Pressable
        onPress={() => {
          if (!m.attachment?.uri) return;
          setAttachmentViewer({ uri: m.attachment.uri, kind: "photo", name: m.attachment?.name });
        }}
        style={styles.attachmentThumb}
      >
        <Image source={{ uri: m.attachment.uri }} style={styles.attachmentImg} resizeMode="cover" />
      </Pressable>
    ) : m.attachment.kind === "video" ? (
  <Pressable
    onPress={() => {
      if (!m.attachment?.uri) return;
      setAttachmentViewer({ uri: m.attachment.uri, kind: "video", name: m.attachment?.name });
    }}
    style={styles.attachmentThumb} // тот же контейнер что у фото (без рамок)
  >
    {m.attachment.thumbUri ? (
      <Image
        source={{ uri: m.attachment.thumbUri }}
        style={styles.attachmentImg}
        resizeMode="cover"
      />
    ) : (
      <View style={styles.attachmentVideoFallback}>
        <Text style={styles.attachmentVideoIcon}>🎬</Text>
        <Text style={[styles.attachmentVideoText, { color: isMe ? "#fff" : "#111" }]}>
          Видео
        </Text>
      </View>
    )}

    <View style={styles.attachmentPlayOverlay}>
      <Text style={styles.attachmentPlayOverlayIcon}>▶️</Text>
    </View>
  </Pressable>
) : (
  <Pressable
    onPress={() => openUri(m.attachment?.uri || "", m.attachment?.name, m.attachment?.mimeType)}
    style={styles.attachmentFileRow}
  >
    <Text style={styles.attachmentFileIcon}>📎</Text>
    <Text style={[styles.attachmentFileName, { color: isMe ? "#fff" : "#111" }]} numberOfLines={1}>
      {m.attachment?.name || "Документ"}
    </Text>
    <Text style={[styles.attachmentFileOpen, { color: isMe ? "rgba(255,255,255,0.85)" : "#666" }]}>
      открыть
    </Text>
  </Pressable>
)
  ) : (
    <Text style={[styles.bubbleText, { color: isMe ? "#fff" : "#111" }]}>{m.text}</Text>
  )}
</View>
                {isMe ? <View style={styles.msgAvatar}>{myAvatar ? <Image source={{ uri: myAvatar }} style={styles.msgAvatarImg} /> : null}</View> : null}
                <Text style={[styles.msgTime, isMe ? { marginLeft: 8 } : { marginRight: 8 }]}>{formatTimeHHMM(m.createdAt)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <SafeAreaView style={[styles.chatBottomSafe, { paddingBottom: insets.bottom + bottomOverlayInset }]}>
        {stage === "unpaid" ? (
          <View style={styles.offerBar}>
            <TouchableOpacity activeOpacity={0.9} onPress={accept} style={styles.offerAcceptBtn}>
              <Text style={styles.offerAcceptText}>Принять</Text>
            </TouchableOpacity>
            <TextInput value={offerText} onChangeText={(t) => setOfferText(t.replace(/\D/g, "").slice(0, 9))} placeholder="сумма.." placeholderTextColor="#9AA0A6" keyboardType="number-pad" inputMode="numeric" style={styles.offerInput} />
            <TouchableOpacity activeOpacity={0.9} onPress={propose} style={styles.offerSendBtn}>
              <Text style={styles.offerSendText}>Предложить</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {stage === "paid" ? (
          <View style={{ paddingBottom: 10 }}>
            <View style={styles.acceptWorkRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setBankCodeStep("waiting_code");
                  requestBankCode();
                }}
                style={styles.acceptWorkBtn}
              >
                <Text style={styles.acceptWorkBtnText}>Принять работу</Text>
              </TouchableOpacity>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <TextInput value={bankCode} onChangeText={(t) => setBankCode(t.replace(/\D/g, "").slice(0, 6))} placeholder="код из банка" placeholderTextColor="#9AA0A6" keyboardType="number-pad" inputMode="numeric" style={styles.bankCodeInput} />
              </View>
              <View style={{ width: 10 }} />
              <TouchableOpacity activeOpacity={0.9} onPress={releaseFunds} style={styles.bankSendBtn}>
                <Text style={styles.bankSendBtnText}>Отправить</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.9} onPress={openDispute} style={styles.disputeBtn}>
              <Text style={styles.disputeBtnText}>Открыть спор</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {stage === "disputed" ? (
          <View style={{ paddingBottom: 10 }}>
            <View style={styles.disputedBadge}>
              <Text style={styles.disputedBadgeText}>Спор открыт • средства удерживаются</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.chatComposerPinned}>
          <TouchableOpacity onPress={toggleAttach} activeOpacity={0.9} style={styles.attachBtn}>
  <Animated.View
  style={[
    styles.attachPlusWrap,
    {
      transform: [
        { translateY: Platform.OS === "web" ? -4 : 0 }, // ✅ mobile строго по центру
        {
          rotate: rot.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "45deg"],
          }),
        },
      ],
    },
  ]}
>
  <Text style={styles.attachPlusText}>+</Text>
</Animated.View>
</TouchableOpacity>
          <TextInput
  value={text}
  onChangeText={setText}
  placeholder="Сообщение…"
  style={styles.chatInput}
  multiline={false}                 // ✅ Enter = отправка
  returnKeyType="send"
  enablesReturnKeyAutomatically
  blurOnSubmit={true}
  onSubmitEditing={submitByEnter}   // ✅ iOS/Android
  onKeyPress={(e) => {              // ✅ web
    if (Platform.OS === "web" && (e as any)?.nativeEvent?.key === "Enter") {
      e.preventDefault?.();
      submitByEnter();
    }
  }}
/>
          {text.trim().length > 0 ? (
            <TouchableOpacity onPress={send} activeOpacity={0.9} style={styles.sendBtnIcon}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>➤</Text>
            </TouchableOpacity>
          ) : (
            <Row style={{ marginLeft: 8 }}>
              <TouchableOpacity
  onPress={() => {
    if (!guardMediaBeforeText()) return;
    pickDeviceMedia({
      kind: "photo",
      limit: 1,
      onPicked: (items) => {
        const first = items[0];
        if (!first?.uri) return;
        const msg: ChatMsg = {
          id: "m_" + uid(),
          orderId,
          sender: "me",
          createdAt: Date.now(),
          text: "",
          attachment: { uri: first.uri, kind: "photo" },
        };
        setChats((prev) => ({
          ...prev,
          [orderId]: [...(prev[orderId] || []), msg],
        }));
      },
    });
  }}
  activeOpacity={0.9}
  style={styles.iconBtn}
>
  <Text style={{ fontSize: 18 }}>📷</Text>
</TouchableOpacity>
<View style={{ width: 8 }} />
<TouchableOpacity
  onPress={() => {
  if (isRecording) stopVoiceRecording();
  else startVoiceRecording();
}}
  activeOpacity={0.9}
  style={styles.iconBtn}
>
  <Text style={{ fontSize: 18 }}>{isRecording ? "⏹️" : "🎙️"}</Text>
</TouchableOpacity>
            </Row>
          )}
        </View>
            </SafeAreaView>

      {/* ✅ Viewer вложений (фото/видео) */}
      <Modal
        visible={!!attachmentViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachmentViewer(null)}
      >
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerCard}>
            {attachmentViewer?.kind === "photo" ? (
              <Image
                source={{ uri: attachmentViewer.uri }}
                style={styles.viewerImg}
                resizeMode="contain"
              />
            ) : attachmentViewer?.kind === "video" ? (
              <Video
                source={{ uri: attachmentViewer.uri }}
                style={styles.viewerImg}
                useNativeControls
                resizeMode="contain"
                shouldPlay
              />
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setAttachmentViewer(null)}
            style={styles.viewerClose}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );;
}
/* =========================
   HomeScreenView
========================= */
type HomeScreenViewProps = {
  filters: Filters;
  onBackToEcosystem: () => void;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  setFiltersDraft: React.Dispatch<React.SetStateAction<Filters>>;
  setPriceFromText: React.Dispatch<React.SetStateAction<string>>;
  setPriceToText: React.Dispatch<React.SetStateAction<string>>;
  trendingServices: { category: string; service: string; growthPct: number; requests7d: number }[];
  topPerformers: Performer[];
  favPerformers: Set<number>;
  subServices: Set<string>;
  toggleFav: (id: number) => void;
  toggleSubService: (serviceTitle: string) => void;
  requireAuth: (role: UserRole, next: () => void) => void;
  passportUploadedFlag: boolean;
  profileMode: UserRole;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
};
const HomeScreenView = React.memo(function HomeScreenView(props: HomeScreenViewProps) {
  const safe = useSafeAreaInsets();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  const {
    filters,
    setFilters,
    setFiltersDraft,
    setPriceFromText,
    setPriceToText,
    trendingServices,
    topPerformers,
    favPerformers,
    subServices,
    toggleFav,
    toggleSubService,
    requireAuth,
    passportUploadedFlag,
    profileMode,
    setScreen,
    onBackToEcosystem,
  } = props;
  const CATEGORY_ICON: Record<string, string> = {
    "Помощь по дому": "🏠",
    "Помощь по здоровью": "❤️",
    "Помощь в логистике": "🚚",
    "Помощь в образовании": "🎓",
    "Помощь в офисе": "🏢",
    "Помощь в бизнесе": "💼",
    "Помощь в путешествии": "🧳",
    "Помощь на дороге": "🚗",
  };
  const CategoryTile = (cat: string) => {
    const icon = CATEGORY_ICON[cat] || "⭐";
    return (
      <TouchableOpacity style={styles.homeCatTile} activeOpacity={0.9} onPress={() => setScreen({ name: "helpCategory", category: cat })}>
        <View style={styles.homeCatInner}>
          <Text style={styles.homeCatIcon}>{icon}</Text>
          <Text style={styles.homeCatTitle} numberOfLines={2}>
            {cat}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  const row1 = HOME_CATEGORIES_ORDER.slice(0, 4);
const row2 = HOME_CATEGORIES_ORDER.slice(4, 8);
const STICKY_CTA_HEIGHT = 140;
const headerH = safe.top + 86;

return (
  <View style={styles.homeRoot}>
    <ImageBackground
      source={require("../assets/home-bg.jpg")}
      style={styles.homeBgAbsolute}
      resizeMode="cover"
      imageStyle={{ left: -width * (isMobile ? 0.02 : 0.03), top: height * 0.03 }}
    />

    <View style={[styles.homeHeaderOverlay, { height: headerH }]}>
      <ImageBackground
        source={require("../assets/home-bg.jpg")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        imageStyle={{ transform: [{ scaleY: 1.03 }] }}
      />
      <View style={[styles.homeFloatingHeader, { height: headerH, paddingTop: safe.top + 14 }]}>
        <View style={styles.homeHeaderRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.homeTopTitle}>СделайЗа</Text>
            <Text style={styles.homeTopSubtitle}>Мы всё сделаем за тебя</Text>
          </View>

          <TouchableOpacity activeOpacity={0.9} onPress={onBackToEcosystem} style={styles.ecosystemBtn}>
            <Text style={styles.ecosystemBtnText}>В экосистему</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>

    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: headerH + 16 + 110,
        paddingBottom: 180 + STICKY_CTA_HEIGHT,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.homeCatalogTitle}>Каталог услуг</Text>
      <View style={{ height: 12 }} />

      <View style={styles.homeCatalogCardsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View>
            <View style={styles.homeCatalogRow}>
              {row1.map((cat) => (
                <View key={cat} style={styles.homeCatalogItemWrap}>
                  {CategoryTile(cat)}
                </View>
              ))}
            </View>

            <View style={styles.homeCatalogRow}>
              {row2.map((cat) => (
                <View key={cat} style={styles.homeCatalogItemWrap}>
                  {CategoryTile(cat)}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>


      <View style={{ height: 12 }} />

      <Card>
        <Row style={{ alignItems: "center" }}>
          <Text style={{ fontWeight: "900", fontSize: 18, color: "#111" }}>🔥 В тренде</Text>
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} keyboardShouldPersistTaps="handled">
          {trendingServices.map((t) => (
            <View key={`${t.category}_${t.service}`} style={styles.trendCard}>
              <Text style={{ fontWeight: "900" }} numberOfLines={1}>
                {t.service}
              </Text>
              <Text style={{ color: "#666", marginTop: 4, fontWeight: "800" }} numberOfLines={1}>
                {t.category}
              </Text>
              <Text style={{ marginTop: 8, fontWeight: "900" }}>+{t.growthPct}% за 7 дней</Text>
              <Text style={{ color: "#444", fontWeight: "800" }}>{t.requests7d} заявок</Text>
              <View style={{ flexDirection: "row", marginTop: 10, alignItems: "center" }}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: "#111", flex: 1 }]}
                  onPress={() => {
                    setFilters((f) => ({ ...f, category: t.category, service: t.service }));
                    setScreen({ name: "performersList", category: t.category, serviceName: t.service });
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.smallBtnTextDark} numberOfLines={1} ellipsizeMode="clip">
                    Открыть
                  </Text>
                </TouchableOpacity>
                <View style={{ width: 8 }} />
                <HeartButton active={subServices.has(t.service)} transparent onPress={() => toggleSubService(t.service)} />
              </View>
            </View>
          ))}
        </ScrollView>
      </Card>

      <Card>
        <Title>🏆 ТОП исполнители</Title>
        <View style={{ height: 10 }} />
        {topPerformers.length ? (
          <View>
            {topPerformers.slice(0, 4).map((p, index, arr) => (
              <View key={p.id} style={index !== arr.length - 1 ? { marginBottom: 10 } : undefined}>
                <PerformerCard
                  p={p}
                  proUnderHeart
                  passportUploadedFlag={passportUploadedFlag}
                  showBanner={false}
                  onOpen={() =>
                    setScreen({
                      name: "performerProfile",
                      performerId: p.id,
                      category: p.category,
                      serviceName: p.service,
                    })
                  }
                  onOpenReviews={() => setScreen({ name: "reviews", performerId: p.id })}
                  onToggleFav={() => toggleFav(p.id)}
                  isFav={favPerformers.has(p.id)}
                />
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: "#666", fontWeight: "800" }}>Пока нет ТОП исполнителей для выбранного города.</Text>
        )}
      </Card>
    </ScrollView>

    <View pointerEvents="box-none" style={[styles.homeStickyCtas, { bottom: 64 + insets.bottom }]}>
      <View style={styles.homeStickyCtasInner}>
        <PrimaryButton
          title="Хочу клиентов"
          onPress={() => {
            if (profileMode !== "performer") {
              Alert.alert("Статус", 'Вам нужно поменять статус на "Исполнитель".');
              return;
            }
            requireAuth("performer", () => setScreen({ name: "becomePerformer" }));
          }}
          variant="green"
        />
        <View style={{ height: 10 }} />
        <PrimaryButton
          title="Нужен помощник"
          onPress={() => {
            if (profileMode !== "customer") {
              Alert.alert("Статус", 'Вам нужно поменять статус на "Заказчик".');
              return;
            }
            requireAuth("customer", () => {
              setFiltersDraft(filters);
              setPriceFromText(filters.priceFrom != null ? String(filters.priceFrom) : "");
              setPriceToText(filters.priceTo != null ? String(filters.priceTo) : "");
              setScreen({ name: "needHelper" });
            });
          }}
          variant="dark"
        />
      </View>
    </View>
  </View>
);
});
type PerformerProfileScreenProps = {
  performerId: number;
  category: string;
  serviceName: string;
  performers: Performer[];
  performerServices: PerformerServiceConfig[];
  passportUploadedFlag: boolean;
  demoWorkPhotos: string[];
  requireAuth: (role: UserRole, next: () => void) => void;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
  setPhotoViewer: React.Dispatch<React.SetStateAction<{ uri: string } | null>>;
};
function PerformerProfileScreen({
  performerId,
  category,
  serviceName,
  performers,
  performerServices,
  passportUploadedFlag,
  demoWorkPhotos,
  requireAuth,
  setScreen,
  setPhotoViewer,
}: PerformerProfileScreenProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const p = performers.find((x) => x.id === performerId);
  if (!p) return null;
  const servicesList =
    p.services && p.services.length
      ? p.services
      : [{ title: p.service, price: p.price, priceIsFrom: p.priceIsFrom }];
    const workMedia =
    (p.workMedia && p.workMedia.length
      ? p.workMedia
      : (p.workPhotos && p.workPhotos.length
          ? p.workPhotos.map((uri) => ({ uri, kind: "photo" as const }))
          : demoWorkPhotos.map((uri) => ({ uri, kind: "photo" as const }))
        )
    ).slice(0, 6);
  const selectedService = servicesList[selectedIdx] || servicesList[0];
  const performerServiceConfigs = performerServices.filter((cfg) => cfg.performerRecordId === p.id);
  const getServiceConfig = (serviceTitle: string) =>
    performerServiceConfigs.find(
      (cfg) =>
        cfg.service === serviceTitle && (!cfg.category || cfg.category === (category || p.category))
    ) ??
    performerServiceConfigs.find((cfg) => cfg.service === serviceTitle) ??
    undefined;
  const selectedServiceConfig = getServiceConfig(selectedService.title);
  const formatServicePrice = (item: ServiceItem, costType?: CostType) =>
    `${item.priceIsFrom ? "от " : ""}${money(item.price)}${costType ? ` / ${costType}` : ""}`;
  const selectedMinSum = selectedServiceConfig?.minSumRub
    ? parseInt(selectedServiceConfig.minSumRub, 10)
    : NaN;
  const performerWorkArea =
    p.workAreaMode === "city_all"
      ? "По всему городу"
      : p.workAreaMode === "district_only"
      ? "По своему району"
      : "Не указано";
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180 }} keyboardShouldPersistTaps="handled">
      <Card style={styles.profileCard}>
        {p.bannerUri ? <Image source={{ uri: p.bannerUri }} style={styles.banner} /> : null}
        <Row style={{ alignItems: "flex-start" }}>
          <View style={[styles.avatarWrapRoundBig, { marginTop: -10 }]}>
            {p.avatarUri ? <Image source={{ uri: p.avatarUri }} style={styles.avatarRound} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Row style={{ alignItems: "center" }}>
              <Text style={styles.profileName} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={{ flex: 1 }} />
              {p.isPro ? <Pill text="PRO ⭐️" tone="gold" /> : null}
            </Row>
            <Text style={styles.profileSpec} numberOfLines={2}>
              Специалист • {serviceName || p.service}
            </Text>
            <Row style={{ marginTop: 8, flexWrap: "wrap" }}>
              <Text style={styles.pMeta}>⭐️ {p.rating.toFixed(1)}</Text>
              <Text style={[styles.pMeta, { marginLeft: 10 }]}>{p.reviews} отзывов</Text>
              <Pressable onPress={() => setScreen({ name: "reviews", performerId: p.id })} style={{ marginLeft: 10 }}>
                <Text style={styles.pRead}>читать</Text>
              </Pressable>
              <Text style={[styles.pMeta, { marginLeft: 12 }]}>в сервисе: {formatYearsLabel(p.years)}</Text>
              <Text style={[styles.pMeta, { marginLeft: 12 }]}>выполнено: {p.completed}</Text>
            </Row>
            {p.isVerifiedPassport && passportUploadedFlag ? (
              <Row style={{ marginTop: 6 }}>
                <Text style={styles.pCheck}>✅</Text>
                <Text style={styles.pPassport}>Паспорт проверен</Text>
              </Row>
            ) : null}
          </View>
        </Row>
        <View style={{ height: 14 }} />
        <Text style={styles.blockTitle}>Категория:</Text>
        <Text style={styles.blockText}>{category || p.category}</Text>
        <View style={{ height: 10 }} />
        <Text style={styles.blockTitle}>Услуги:</Text>
        <View style={{ marginTop: 6 }}>
          {servicesList.map((s, idx) => {
            const active = idx === selectedIdx;
            const lineConfig = getServiceConfig(s.title);
            return (
              <Pressable
                key={`${s.title}_${idx}`}
                style={[styles.serviceLine, active ? styles.serviceLineActive : null]}
                onPress={() => setSelectedIdx(idx)}
              >
                <Text style={styles.serviceTitle} numberOfLines={2}>
                  {s.title}
                </Text>
                <Text style={styles.servicePrice}>
                  {formatServicePrice(s, lineConfig?.costType)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        
        <PrimaryButton
          title="Предложить работу"
          variant="green"
          onPress={() =>
            requireAuth("customer", () =>
              setScreen({
                name: "confirmOrder",
                performerId: p.id,
                category: category || p.category,
                serviceName: selectedService.title,
                price: selectedService.price,
                priceIsFrom: selectedService.priceIsFrom,
              })
            )
          }
        />
        <View style={{ height: 14 }} />
        <Text style={styles.blockTitle}>Фото работ</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} keyboardShouldPersistTaps="handled">
          {workMedia.map((m, idx) => (
            <Pressable
              key={m.uri + idx}
              onPress={() => {
                if (m.kind === "photo") setPhotoViewer({ uri: m.uri });
                // видео: пока только отображаем как опубликованное (без проигрывания)
              }}
              style={[styles.workPhotoTile, idx === 0 ? { marginLeft: 0 } : null]}
            >
              {m.kind === "photo" ? (
                <Image source={{ uri: m.uri }} style={styles.workPhotoImg} />
              ) : (
                <View style={styles.workVideoTile}>
                  <Text style={styles.workVideoIcon}>🎬</Text>
                  <Text style={styles.workVideoLabel}>Видео</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
        <Text style={{ marginTop: 8, color: "#666", fontWeight: "800" }}>
          Нажмите на фото, чтобы открыть в полном размере
        </Text>
        <View style={{ height: 12 }} />
        <PrimaryButton
          title="Подробнее обо мне"
          variant="green"
          onPress={() => setAboutExpanded((prev) => !prev)}
        />
        {aboutExpanded ? (
  <View style={styles.profileMoreBox}>
    <View style={styles.profileMoreRow}>
      <Text style={styles.profileMoreLabel}>О себе</Text>
      <Text style={styles.profileMoreValue}>{p.description || "Не указано"}</Text>
    </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Город</Text>
              <Text style={styles.profileMoreValue}>{p.city || "Не указано"}</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Район</Text>
              <Text style={styles.profileMoreValue}>{p.district || "Не указано"}</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Рабочая зона</Text>
              <Text style={styles.profileMoreValue}>{performerWorkArea}</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Часы работы</Text>
              <Text style={styles.profileMoreValue}>
                {selectedServiceConfig?.timeFrom && selectedServiceConfig?.timeTo
                  ? `${selectedServiceConfig.timeFrom} - ${selectedServiceConfig.timeTo}`
                  : "Не указано"}
              </Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Дни работы</Text>
              <Text style={styles.profileMoreValue}>
                {formatWorkDaysSet(selectedServiceConfig?.days)}
              </Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Формат работы</Text>
              <Text style={styles.profileMoreValue}>
                {selectedServiceConfig?.addressMode || "Не указано"}
              </Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Выезд</Text>
              <Text style={styles.profileMoreValue}>
                {selectedServiceConfig?.travelMode || "Не указано"}
              </Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Договор</Text>
              <Text style={styles.profileMoreValue}>
                {formatOptionalBool(selectedServiceConfig?.contract)}
              </Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Гарантии</Text>
              <Text style={styles.profileMoreValue}>
                {formatOptionalBool(selectedServiceConfig?.warranty)}
              </Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Юр. лица</Text>
              <Text style={styles.profileMoreValue}>
                {formatOptionalBool(selectedServiceConfig?.workWithLegal)}
              </Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileMoreRow}>
              <Text style={styles.profileMoreLabel}>Мин. сумма</Text>
              <Text style={styles.profileMoreValue}>
                {Number.isFinite(selectedMinSum) && selectedMinSum > 0 ? money(selectedMinSum) : "Не указано"}
              </Text>
            </View>
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
};
type ProfileSettingsScreenProps = {
  user: User | null;
  profileMode: UserRole;
  requireAuth: (role: UserRole, next: () => void) => void;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
  setCallsAnyTime: React.Dispatch<React.SetStateAction<boolean>>;
  setCallsEveryDay: React.Dispatch<React.SetStateAction<boolean>>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setEcosystemRegistered?: (v: any) => void;
  pickDeviceMedia: (params: {
    kind: "photo" | "video" | "mixed" | "file";
multiple?: boolean;
limit?: number;
onPicked: (items: { uri: string; kind: "photo" | "video" | "file"; name?: string }[]) => void;
  }) => void | Promise<void>;
  passportPhoto1: string | null;
  passportPhoto2: string | null;
  setPassportPhoto1: React.Dispatch<React.SetStateAction<string | null>>;
  setPassportPhoto2: React.Dispatch<React.SetStateAction<string | null>>;
  suggestAddresses: (city: string, q: string) => string[];
};
function ProfileSettingsScreen({
  user,
  profileMode,
  requireAuth,
  setScreen,
  setCallsAnyTime,
  setCallsEveryDay,
  setUser,
  pickDeviceMedia,
  passportPhoto1,
  passportPhoto2,
  setPassportPhoto1,
  setPassportPhoto2,
  setEcosystemRegistered,
  suggestAddresses,
}: ProfileSettingsScreenProps) {
  const safe = useSafeAreaInsets();
  if (!user) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }}>
        <Card>
          <Text style={{ fontWeight: "900", color: "#111" }}>Вы не авторизованы</Text>
          <View style={{ height: 10 }} />
          <PrimaryButton title="Регистрация" variant="dark" onPress={() => requireAuth("customer", () => {})} />
        </Card>
      </ScrollView>
    );
  }
  const [city, setCity] = useState<string>(user.city || "");
const [district, setDistrict] = useState<string>(user.district || "");
const [address, setAddress] = useState<string>(user.address || "");

// ✅ ВОТ СЮДА (сразу после address)
const [firstName, setFirstName] = useState<string>(user.firstName || "");
const [lastName, setLastName] = useState<string>(user.lastName || "");
const [extraPhoneLocal, setExtraPhoneLocal] = useState<string>(user.extraPhone || "");

const [callsAnyTimeLocal, setCallsAnyTimeLocal] = useState<boolean>(user.callsAnyTime);
const [callsEveryDayLocal, setCallsEveryDayLocal] = useState<boolean>(user.callsEveryDay);
const [callsFromLocal, setCallsFromLocal] = useState<string>(user.callsFrom || "09:00");
const [callsToLocal, setCallsToLocal] = useState<string>(user.callsTo || "21:00");
const [callsDaysLocal, setCallsDaysLocal] = useState<WorkDay[]>(user.callsDays || [...WORK_DAYS]);

const [workAreaModeLocal, setWorkAreaModeLocal] = useState<WorkAreaMode>(user.workAreaMode || "district_only");

  const [addressFocused, setAddressFocused] = useState(false);
  const [localPicker, setLocalPicker] = useState<null | {
    title: string;
    options: string[];
    selected?: string;
    onPick: (v: string) => void;
  }>(null);
  const openLocalPicker = (
    title: string,
    options: string[],
    selected: string | undefined,
    onPick: (v: string) => void
  ) => {
    setLocalPicker({ title, options, selected, onPick });
  };
  const districts = useMemo(() => getDistrictsByCity(city || user.city), [city, user.city]);
  const addressSuggestions = useMemo(() => {
    const cityValue = city.trim();
    const q = address.trim();
    if (!cityValue || !q) return [];
    return suggestAddresses(cityValue, q);
  }, [city, address]);
  useEffect(() => {
    const cityValue = city.trim();
    if (!cityValue) return;
    const cityDistricts = getDistrictsByCity(cityValue);
    if (district && !cityDistricts.includes(district)) {
      setDistrict(cityDistricts[0] || "");
    }
  }, [city, district]);
  const toggleCallDay = (day: WorkDay) => {
    setCallsDaysLocal((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };
  const save = () => {
    const fn = sanitizeName(firstName).trim();
    const ln = sanitizeName(lastName).trim();
    const cityTrim = city.trim();
    const districtTrim = district.trim();
    const addressTrim = address.trim();
    const extraPhoneTrim = extraPhoneLocal.trim();

    if (!fn) return Alert.alert("Ошибка", "Введите имя.");
    if (!ln) return Alert.alert("Ошибка", "Введите фамилию.");
    if (!cityTrim) return Alert.alert("Ошибка", "Выберите город.");
    if (!districtTrim) return Alert.alert("Ошибка", "Выберите район.");
    if (!addressTrim) return Alert.alert("Ошибка", "Введите адрес.");

    if (!callsAnyTimeLocal && (!callsFromLocal || !callsToLocal)) {
      return Alert.alert("Ошибка", "Выберите время звонков.");
    }
    if (!callsEveryDayLocal && !callsDaysLocal.length) {
      return Alert.alert("Ошибка", "Выберите дни недели для звонков.");
    }
    if (extraPhoneTrim && extraPhoneTrim !== "+7") {
      const digits = phoneDigitsRU(extraPhoneTrim);
      if (!(digits.length === 11 && digits.startsWith("7"))) {
        return Alert.alert("Ошибка", "Введите доп. телефон в формате +7 (XXX) XXX-XX-XX");
      }
    }

    setCallsAnyTime(callsAnyTimeLocal);
    setCallsEveryDay(callsEveryDayLocal);

    setUser((prev) =>
      prev
        ? {
            ...prev,
            firstName: fn,
            lastName: ln,
            city: cityTrim,
            district: districtTrim,
            address: addressTrim,
            extraPhone: extraPhoneTrim && extraPhoneTrim !== "+7" ? extraPhoneTrim : "",
            workAreaMode: workAreaModeLocal,
            callsAnyTime: callsAnyTimeLocal,
            callsEveryDay: callsEveryDayLocal,
            callsFrom: callsFromLocal,
            callsTo: callsToLocal,
            callsDays: callsDaysLocal,
          }
        : prev
    );

    // ✅ ВОТ ЭТОТ БЛОК — СРАЗУ ПОСЛЕ setUser(...)
    // чтобы данные профиля подгружались во всех приложениях в "Управление профилем"
    if (typeof setEcosystemRegistered === "function") {
      setEcosystemRegistered({
        name: fn,
        city: cityTrim,
        email: user.email,
        phoneMain: user.phone,
        phoneExtra: extraPhoneTrim && extraPhoneTrim !== "+7" ? extraPhoneTrim : "",
        address: addressTrim,
      });
    }

    Alert.alert("Сохранено", "Профиль обновлён.");
  };
  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Личные данные</Text>
          <Card>
            <Text style={styles.formLabel}>Имя</Text>
            <TextInput
              style={styles.formInput}
              value={firstName}
              onChangeText={(t) => setFirstName(sanitizeName(t))}
              placeholder="Имя"
            />
            <Text style={styles.formLabel}>Фамилия</Text>
            <TextInput
              style={styles.formInput}
              value={lastName}
              onChangeText={(t) => setLastName(sanitizeName(t))}
              placeholder="Фамилия"
            />
            <Text style={styles.formLabel}>Город</Text>
            <TouchableOpacity
              style={styles.pickerLine}
              activeOpacity={0.9}
              onPress={() =>
                openLocalPicker("Город", RUS_CITIES, city, (v) => {
                  setCity(v);
                  setDistrict(getDistrictsByCity(v)[0] || "Центральный");
                })
              }
            >
              <Text style={styles.pickerVal}>{city}</Text>
              <Text style={styles.pickerArr}>▾</Text>
            </TouchableOpacity>
            <Text style={styles.formLabel}>Район</Text>
            <TouchableOpacity
              style={styles.pickerLine}
              activeOpacity={0.9}
              onPress={() => openLocalPicker("Район", districts, district, (v) => setDistrict(v))}
            >
              <Text style={styles.pickerVal}>{district || "Выберите район"}</Text>
              <Text style={styles.pickerArr}>▾</Text>
            </TouchableOpacity>
            <Text style={styles.formLabel}>Адрес</Text>
            <TextInput
              style={styles.formInput}
              value={address}
              onChangeText={setAddress}
              onFocus={() => setAddressFocused(true)}
              onBlur={() => setTimeout(() => setAddressFocused(false), 120)}
              placeholder="Адрес"
              autoCorrect={false}
              autoCapitalize="sentences"
            />
            {addressFocused && addressSuggestions.length ? (
              <View style={styles.addrSuggestBox}>
                {addressSuggestions.map((item, index) => (
                  <Pressable
                    key={`profile_address_${item}_${index}`}
                    style={styles.addrSuggestRow}
                    onPress={() => {
                      setAddress(item);
                      setAddressFocused(false);
                    }}
                  >
                    <Text style={styles.addrSuggestText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.formLabel}>Основной номер</Text>
<TextInput
  style={[styles.formInput, { opacity: 0.8 }]}
  value={user.phone}
  editable={false}
  placeholder="+7 (999) 999-99-99"
/>

<Text style={styles.formLabel}>Почта</Text>
<TextInput
  style={[styles.formInput, { opacity: 0.8 }]}
  value={user.email || ""}
  editable={false}
  placeholder="example@mail.com"
/>
            <Text style={styles.formLabel}>Доп. телефон</Text>
            <TextInput
              style={styles.formInput}
              value={extraPhoneLocal}
              onChangeText={(t) => setExtraPhoneLocal(formatPhoneRU(t))}
              placeholder="+7 (999) 999-99-99"
              keyboardType="phone-pad"
              inputMode="tel"
              autoCorrect={false}
            />
          </Card>
          <Text style={styles.sectionTitle}>Настройки звонков</Text>
          <Card>
            <View style={styles.switchRow}>
              <Row>
                <Text style={styles.switchTitle}>Звонки в любое время</Text>
                <View style={{ flex: 1 }} />
                <Switch value={callsAnyTimeLocal} onValueChange={setCallsAnyTimeLocal} />
              </Row>
            </View>
            {!callsAnyTimeLocal ? (
              <>
                <Text style={styles.formLabel}>Время звонков</Text>
                <Row style={{ gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.pickerLine, { flex: 1 }]}
                    activeOpacity={0.9}
                    onPress={() => openLocalPicker("С", TIME_OPTIONS, callsFromLocal, (v) => setCallsFromLocal(v))}
                  >
                    <Text style={styles.pickerVal}>{callsFromLocal}</Text>
                    <Text style={styles.pickerArr}>▾</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pickerLine, { flex: 1 }]}
                    activeOpacity={0.9}
                    onPress={() => openLocalPicker("До", TIME_OPTIONS, callsToLocal, (v) => setCallsToLocal(v))}
                  >
                    <Text style={styles.pickerVal}>{callsToLocal}</Text>
                    <Text style={styles.pickerArr}>▾</Text>
                  </TouchableOpacity>
                </Row>
              </>
            ) : null}
            <View style={styles.switchRow}>
              <Row>
                <Text style={styles.switchTitle}>Звонки каждый день</Text>
                <View style={{ flex: 1 }} />
                <Switch value={callsEveryDayLocal} onValueChange={setCallsEveryDayLocal} />
              </Row>
            </View>
            {!callsEveryDayLocal ? (
              <>
                <Text style={styles.formLabel}>Дни звонков</Text>
                <Row style={{ flexWrap: "wrap", gap: 8 }}>
                  {WORK_DAYS.map((day) => {
                    const active = callsDaysLocal.includes(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        activeOpacity={0.9}
                        onPress={() => toggleCallDay(day)}
                        style={[styles.dayBtn, active ? styles.dayBtnActive : null]}
                      >
                        <Text style={[styles.dayBtnText, active ? styles.dayBtnTextActive : null]}>
                          {day.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </Row>
              </>
            ) : null}
          </Card>
          {profileMode === "performer" ? (
            <>
              <Text style={styles.sectionTitle}>Рабочая зона</Text>
              <Card>
                <View style={{ flexDirection: "row" }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setWorkAreaModeLocal("district_only")}
                    style={[
                      styles.priceModeBtn,
                      workAreaModeLocal === "district_only" ? styles.priceModeBtnActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priceModeBtnText,
                        workAreaModeLocal === "district_only" ? styles.priceModeBtnTextActive : null,
                      ]}
                    >
                      По району
                    </Text>
                  </TouchableOpacity>
                  <View style={{ width: 10 }} />
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setWorkAreaModeLocal("city_all")}
                    style={[
                      styles.priceModeBtn,
                      workAreaModeLocal === "city_all" ? styles.priceModeBtnActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priceModeBtnText,
                        workAreaModeLocal === "city_all" ? styles.priceModeBtnTextActive : null,
                      ]}
                    >
                      По городу
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </>
          ) : null}
          <Text style={styles.sectionTitle}>Паспорт</Text>
<Card>
  <Text style={styles.formLabel}>Фото паспорта 1</Text>
  <View style={styles.passportFieldWrap}>
    <TouchableOpacity
      style={styles.passportThumbWrap}
      activeOpacity={0.9}
      onPress={() =>
        pickDeviceMedia({
          kind: "photo",
          limit: 1,
          onPicked: (items) => {
            const first = items[0];
            if (!first?.uri) return;
            setPassportPhoto1(first.uri);
          },
        })
      }
    >
      <View style={styles.passportThumb}>
        {passportPhoto1 ? (
          <Image source={{ uri: passportPhoto1 }} style={styles.passportThumbImg} />
        ) : (
          <View style={styles.passportThumbPlaceholder}>
            <Text style={styles.passportThumbPlaceholderIcon}>🪪</Text>
            <Text style={styles.passportThumbPlaceholderText}>
              Загрузить фото паспорта 1
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
    {passportPhoto1 ? (
      <TouchableOpacity
        style={styles.passportRemoveBtn}
        activeOpacity={0.9}
        onPress={() => setPassportPhoto1(null)}
      >
        <Text style={styles.passportRemoveBtnText}>✕</Text>
      </TouchableOpacity>
    ) : null}
  </View>
  <Text style={styles.formLabel}>Фото паспорта 2</Text>
  <View style={styles.passportFieldWrap}>
    <TouchableOpacity
      style={styles.passportThumbWrap}
      activeOpacity={0.9}
      onPress={() =>
        pickDeviceMedia({
          kind: "photo",
          limit: 1,
          onPicked: (items) => {
            const first = items[0];
            if (!first?.uri) return;
            setPassportPhoto2(first.uri);
          },
        })
      }
    >
      <View style={styles.passportThumb}>
        {passportPhoto2 ? (
          <Image source={{ uri: passportPhoto2 }} style={styles.passportThumbImg} />
        ) : (
          <View style={styles.passportThumbPlaceholder}>
            <Text style={styles.passportThumbPlaceholderIcon}>🪪</Text>
            <Text style={styles.passportThumbPlaceholderText}>
              Загрузить фото паспорта 2
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
    {passportPhoto2 ? (
      <TouchableOpacity
        style={styles.passportRemoveBtn}
        activeOpacity={0.9}
        onPress={() => setPassportPhoto2(null)}
      >
        <Text style={styles.passportRemoveBtnText}>✕</Text>
      </TouchableOpacity>
    ) : null}
  </View>
</Card>
          <PrimaryButton title="Сохранить" variant="dark" onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={!!localPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setLocalPicker(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject as any}
            activeOpacity={1}
            onPress={() => setLocalPicker(null)}
          />
          <View style={styles.sheetCard}>
            <Text style={{ fontWeight: "900", fontSize: 16, color: "#111" }}>
              {localPicker?.title ?? "Выбор"}
            </Text>
            <View style={{ height: 10 }} />
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {(localPicker?.options ?? []).map((option, index) => {
                const value = option ?? "";
                const active = value === (localPicker?.selected ?? "");
                return (
                  <TouchableOpacity
                    key={`${localPicker?.title}_${value}_${index}`}
                    activeOpacity={0.9}
                    style={[styles.sheetOption, active ? styles.sheetOptionActive : null]}
                    onPress={() => {
                      localPicker?.onPick(value);
                      setLocalPicker(null);
                    }}
                  >
                    <Text style={{ fontWeight: "900", color: "#111" }}>{value}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ height: 10 }} />
            <PrimaryButton title="Закрыть" variant="light" onPress={() => setLocalPicker(null)} />
          </View>
        </View>
      </Modal>
    </>
  );
};
/* =========================
   AppInner (start)
========================= */
function AppInner({ onBackToEcosystem }: { onBackToEcosystem: () => void }) {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>({ name: "home" });
const [tab, setTab] = useState<Tab>("search");
const [user, setUser] = useState<User | null>(null);
const [authOpen, setAuthOpen] = useState(false);
const [pendingRole, setPendingRole] = useState<UserRole>("customer");

const [authName, setAuthName] = useState("");
const [phone, setPhone] = useState("+7");
const [authCity, setAuthCity] = useState("");
const [authEmail, setAuthEmail] = useState("");
const [code, setCode] = useState("");

const [authErrors, setAuthErrors] = useState({
  name: false,
  phone: false,
  city: false,
  email: false,
  code: false,
});

const authScrollRef = useRef<ScrollView | null>(null);

const authFieldY = useRef<Record<"name" | "phone" | "city" | "email" | "code", number>>({
  name: 0,
  phone: 0,
  city: 0,
  email: 0,
  code: 0,
});
const afterAuthRef = useRef<null | (() => void)>(null);
  const myProfileScrollRef = useRef<ScrollView | null>(null);
  const myProfileQuickFieldY = useRef<number[]>([]);
    const { profile: ecoProfile, setProfile: setEcoProfile } = useContext(EcosystemContext);

  const [profileMode, setProfileMode] = useState<UserRole>("customer");
  const [callsAnyTime, setCallsAnyTime] = useState(true);
  const [callsEveryDay, setCallsEveryDay] = useState(true);
  const [perfName, setPerfName] = useState("");

  const [performers, setPerformers] = useState<Performer[]>(initialPerformers);

  // =========================
  // ✅ ECO PROFILE SYNC (pull) — если профиль уже есть в экосистеме, подхватываем его в СделайЗа
  // =========================
  useEffect(() => {
    if (user) return;
    if (!ecoProfile) return;

    const name = (ecoProfile.name || "").trim() || "Пользователь";
    const city = (ecoProfile.city || "").trim() || defaultFilters.city;

    const nextUser: User = {
      id: "u_" + uid(),
      role: "customer",
      phone: (ecoProfile.phoneMain || "+7").trim(),
      email: (ecoProfile.email || "").trim(),
      firstName: name,
      lastName: "Иванов",
      city,
      district: getDistrictsByCity(city)[0] || "Центральный",
      address: (ecoProfile.address || "ул. Примерная, 10").trim(),
      workAreaMode: "district_only",
      payCardMasked: "**** 1234",
      extraPhone: (ecoProfile.phoneExtra || "").trim(),
      callsAnyTime,
      callsEveryDay,
      callsFrom: "09:00",
      callsTo: "21:00",
      callsDays: [...WORK_DAYS],
      doneOrders: 0,
      ratingAsPerformer: 0,
      avatarUri: ecoProfile.avatarUri,
      createdAt: Date.now(),
    };

    setUser(nextUser);
    setProfileMode(nextUser.role);
    setPerfName(nextUser.firstName);
  }, [ecoProfile, user, callsAnyTime, callsEveryDay]);

  const scrollProfileQuickFieldIntoView = useCallback((idx: number) => {
    const y = myProfileQuickFieldY.current[idx] ?? 0;
    setTimeout(() => {
      myProfileScrollRef.current?.scrollTo({
        y: Math.max(0, y - 140),
        animated: true,
      });
    }, 120);
  }, []);
  
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filtersDraft, setFiltersDraft] = useState<Filters>(defaultFilters);
  const [priceFromText, setPriceFromText] = useState("");
  const [priceToText, setPriceToText] = useState("");
  const [favPerformers, setFavPerformers] = useState<Set<number>>(new Set());
  const [subServices, setSubServices] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [chats, setChats] = useState<Record<string, ChatMsg[]>>({});
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>([]);
  const [perfDesc, setPerfDesc] = useState("");
  const [perfCategory, setPerfCategory] = useState<string | undefined>(undefined);
  const [perfService, setPerfService] = useState<string | undefined>(undefined);
  const [perfPriceText, setPerfPriceText] = useState("");
  const [perfPriceIsFrom, setPerfPriceIsFrom] = useState(true);
  const [matchedCustomersOpen, setMatchedCustomersOpen] = useState(false);
  const [matchedCustomers, setMatchedCustomers] = useState<CustomerRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n1",
      createdAt: Date.now() - 1000 * 60 * 60 * 6,
      title: "Добро пожаловать!",
      text: "Спасибо за регистрацию — выбирайте исполнителей и создавайте сделки.",
      isRead: false,
      userRoleTarget: "customer",
      meta: null,
    },
    {
      id: "n2",
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
      title: "Новые заказы",
      text: "Проверьте текущие сделки в разделе «Мои сделки».",
      isRead: false,
      userRoleTarget: "performer",
      meta: null,
    },
  ]);
  const [photoViewer, setPhotoViewer] = useState<{ uri: string } | null>(null);
  const [passportPhoto1, setPassportPhoto1] = useState<string | null>(null);
  const [passportPhoto2, setPassportPhoto2] = useState<string | null>(null);
  const passportUploadedFlag = !!passportPhoto1 && !!passportPhoto2;
  const [returnToProject, setReturnToProject] = useState<null | { circleId: string }>(null);
  const [projectChatOrderByCircle, setProjectChatOrderByCircle] = useState<Record<string, string>>({});
  const [dealStages, setDealStages] = useState<Record<string, DealStage>>({});
  const getDealStage = useCallback((orderId: string): DealStage => dealStages[orderId] || "unpaid", [dealStages]);
  const setDealStage = useCallback((orderId: string, stage: DealStage) => setDealStages((prev) => ({ ...prev, [orderId]: stage })), []);
  const [adminDisputes, setAdminDisputes] = useState<{ id: string; orderId: string; createdAt: number }[]>([]);
  const notifyAdminDispute = useCallback((orderId: string) => {
    setAdminDisputes((prev) => [{ id: "ad_" + uid(), orderId, createdAt: Date.now() }, ...prev]);
  }, []);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead && n.userRoleTarget === profileMode).length, [notifications, profileMode]);
  const [picker, setPicker] = useState<null | { title: string; options: string[]; selected?: string; onPick: (v: string) => void }>(null);
  const openPicker = (title: string, options: string[], selected: string | undefined, onPick: (v: string) => void) => setPicker({ title, options, selected, onPick });
  const toggleFav = (id: number) => {
    setFavPerformers((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleSubService = (serviceTitle: string) => {
    setSubServices((prev) => {
      const n = new Set(prev);
      n.has(serviceTitle) ? n.delete(serviceTitle) : n.add(serviceTitle);
      return n;
    });
  };
  const validateAuthEmail = (value: string) => {
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

const scrollToAuthField = (field: "name" | "phone" | "city" | "email" | "code") => {
  setTimeout(() => {
    authScrollRef.current?.scrollTo({
      y: Math.max(0, authFieldY.current[field] - 18),
      animated: true,
    });
  }, 120);
};
  const requireAuth = (role: UserRole, next: () => void) => {
    if (user) return next();
    setPendingRole(role);
    afterAuthRef.current = next;
    setAuthOpen(true);
  };
  const [performerAbout, setPerformerAbout] = useState("");
  const [quickFields, setQuickFields] = useState<QuickField[]>([{ text: "" }, { text: "" }, { text: "" }, { text: "" }]);
  const [performerServices, setPerformerServices] = useState<PerformerServiceConfig[]>([]);
  const pushChatNotification = useCallback((toRole: UserRole, title: string, text: string) => {
    setNotifications((prev) => [{ id: "n_" + uid(), createdAt: Date.now(), title, text, isRead: false, userRoleTarget: toRole, meta: null }, ...prev]);
  }, []);
  const setOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }, []);
  /* =========================
     ✅ Адрес (шестерёнка): автоподсказки Город → Район → Адрес
  ========================= */
  const ADDRESS_SAMPLES_BY_CITY: Record<string, string[]> = useMemo(
    () => ({
      Москва: ["ул. Тверская, 10", "ул. Арбат, 5", "пр-т Мира, 120", "ул. Профсоюзная, 56"],
      "Санкт-Петербург": ["Невский пр., 28", "ул. Рубинштейна, 15", "Лиговский пр., 50"],
      "Ростов-на-Дону": ["ул. Большая Садовая, 80", "пр-т Будённовский, 45", "ул. Пушкинская, 120", "ул. Красноармейская, 200"],
      Краснодар: ["ул. Красная, 100", "ул. Северная, 300", "ул. Ставропольская, 150"],
      Сочи: ["Курортный пр., 70", "ул. Навагинская, 9", "ул. Виноградная, 20"],
      Казань: ["ул. Баумана, 25", "пр-т Победы, 90", "ул. Кремлёвская, 2"],
      Самара: ["ул. Ленинградская, 40", "Московское ш., 15", "ул. Молодогвардейская, 80"],
      Новосибирск: ["Красный проспект, 60", "ул. Гоголя, 15", "ул. Ленина, 10"],
      Екатеринбург: ["пр-т Ленина, 35", "ул. Малышева, 44", "ул. 8 Марта, 12"],
      Воронеж: ["пр-т Революции, 22", "ул. Плехановская, 18", "ул. Кирова, 7"],
    }),
    []
  );
  const suggestCities = useCallback((q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return [] as string[];
    return RUS_CITIES.filter((c) => c.toLowerCase().startsWith(s)).slice(0, 8);
  }, []);
  const suggestDistricts = useCallback((city: string, q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return [] as string[];
    const arr = getDistrictsByCity(city);
    return arr.filter((d) => d.toLowerCase().startsWith(s)).slice(0, 10);
  }, []);
  const suggestAddresses = useCallback(
    (city: string, q: string) => {
      const s = q.trim().toLowerCase();
      if (!s) return [] as string[];
      const arr = ADDRESS_SAMPLES_BY_CITY[city] || [];
      return arr.filter((a) => a.toLowerCase().includes(s)).slice(0, 10);
    },
    [ADDRESS_SAMPLES_BY_CITY]
  );
    const requestDeviceMediaPermission = useCallback(async () => {
  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!result.granted) {
    Alert.alert("Доступ", "Нужен доступ к галерее телефона.");
    return false;
  }
  return true;
}, []);
  const pickDeviceMedia = useCallback(
  async ({
    kind,
    multiple = false,
    limit = 1,
    onPicked,
  }: {
    kind: "photo" | "video" | "mixed" | "file";
    multiple?: boolean;
    limit?: number;
    onPicked: (items: { uri: string; kind: "photo" | "video" | "file"; name?: string; mimeType?: string }[]) => void;
  }) => {
    const maxItems = Math.max(1, limit);

    const ALLOWED_DOC_EXT = [".pdf", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
    const isAllowedDoc = (nameOrUri: string) => {
      const lower = (nameOrUri || "").toLowerCase();
      return ALLOWED_DOC_EXT.some((ext) => lower.endsWith(ext));
    };

    // =========================
    // WEB
    // =========================
    if (Platform.OS === "web") {
      try {
        const webDocument = (globalThis as any)?.document;
        if (!webDocument?.createElement) {
          Alert.alert("Ошибка", "Файловая галерея недоступна в этой среде.");
          return;
        }
        const input = webDocument.createElement("input");
        input.type = "file";
        input.accept =
          kind === "photo"
            ? "image/*"
            : kind === "video"
            ? "video/*"
            : kind === "file"
            ? ALLOWED_DOC_EXT.join(",")
            : "image/*,video/*";
        input.multiple = multiple;

        input.onchange = () => {
          const files = Array.from(input.files || []).slice(0, multiple ? maxItems : 1);

          if (kind === "file") {
            const bad = files.find((f: any) => !isAllowedDoc(String(f?.name || "")));
            if (bad) {
              Alert.alert("Только документы", "Можно прикрепить: PDF, TXT, Word, Excel, PowerPoint.");
              return;
            }
          }

          const items = files
            .map((file: any) => {
              const type = String(file?.type || "");
              const isVideo = type.startsWith("video/");
              const isImage = type.startsWith("image/");

              const kindResolved =
                kind === "file"
                  ? ("file" as const)
                  : isVideo
                  ? ("video" as const)
                  : ("photo" as const);

              // если ожидаем документ — не пропускаем фото/видео
              if (kind === "file" && (isVideo || isImage)) return null;

              const uri = (globalThis as any)?.URL?.createObjectURL?.(file) ?? "";
              if (!uri) return null;

              return {
                uri,
                kind: kindResolved,
                name: file?.name,
                mimeType: type || undefined,
              } as { uri: string; kind: "photo" | "video" | "file"; name?: string; mimeType?: string };
            })
            .filter((x): x is { uri: string; kind: "photo" | "video" | "file"; name?: string; mimeType?: string } => !!x?.uri);

          if (!items.length) return;
          onPicked(items);
        };

        input.click();
        return;
      } catch {
        Alert.alert("Ошибка", "Не удалось открыть файловую галерею.");
        return;
      }
    }

    // =========================
    // iOS / Android: FILE
    // =========================
    if (kind === "file") {
      try {
        const res = await DocumentPicker.getDocumentAsync({
          multiple: false,
          copyToCacheDirectory: false, // ✅ важно для Android: чаще отдаёт content://
          type: [
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          ],
        });

        if ((res as any).canceled) return;

        const asset = (res as any).assets?.[0] ?? res;
        const uri = asset?.uri as string | undefined;
        const name = asset?.name as string | undefined;
        const mimeType = (asset as any)?.mimeType as string | undefined;

        if (!uri) return;

        const lower = (name || uri).toLowerCase();
        const ok = ALLOWED_DOC_EXT.some((ext) => lower.endsWith(ext));
        if (!ok) {
          Alert.alert("Только документы", "Можно прикрепить: PDF, TXT, Word, Excel, PowerPoint.");
          return;
        }

        onPicked([{ uri, kind: "file", name, mimeType }]);
      } catch {
        Alert.alert("Ошибка", "Не удалось открыть выбор документа.");
      }
      return;
    }

    // =========================
    // iOS / Android: PHOTO / VIDEO / MIXED
    // =========================
    const granted = await requestDeviceMediaPermission();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        kind === "photo"
          ? ImagePicker.MediaTypeOptions.Images
          : kind === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: kind === "photo" && multiple,
      selectionLimit: kind === "photo" ? Math.max(1, Math.min(maxItems, 5)) : 1,
      quality: 1,
    });

    if (result.canceled) return;

    const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
    const MAX_VIDEO_MS = 2 * 60 * 1000;

    const items = (result.assets || [])
      .map((asset) => {
        const kindResolved = asset.type === "video" ? ("video" as const) : ("photo" as const);

        if (kindResolved === "video") {
          const durationMs = typeof asset.duration === "number" ? asset.duration : undefined;
          const fileSizeBytes = (asset as any).fileSize as number | undefined;

          if (durationMs != null && durationMs > MAX_VIDEO_MS) {
            Alert.alert("Лимит видео", "Видео должно быть не длиннее 2 минут.");
            return null;
          }
          if (fileSizeBytes != null && fileSizeBytes > MAX_VIDEO_BYTES) {
            Alert.alert("Лимит видео", "Размер видео должен быть не больше 50 MB.");
            return null;
          }
        }

        return {
          uri: asset.uri,
          kind: kindResolved,
          mimeType: (asset as any)?.mimeType as string | undefined,
        } as { uri: string; kind: "photo" | "video"; mimeType?: string };
      })
      .filter((x): x is { uri: string; kind: "photo" | "video"; mimeType?: string } => !!x?.uri);

    if (!items.length) {
      Alert.alert("Ошибка", "Не удалось получить выбранные файлы.");
      return;
    }

    onPicked(items);
  },
  [requestDeviceMediaPermission]
);
  /* =========================
     ✅ Круги: стейт проектов + создание + уведомление "🔥"
  ========================= */
  const [circleProjects, setCircleProjects] = useState<CircleProject[]>([]);
  // этапы проекта + эскроу/доки/арбитраж (мок)
  type ProjectDoc = { id: string; title: string; status: "signed" | "pending" | "waiting"; ownerRole?: UserRole };
  type ProjectArbitration = { open: boolean; votesCustomer: number; votesPerformer: number; expertVotes: ("customer" | "performer" | "pending")[] };
  type ProjectEscrowState = {
    performerId?: number;
    total: number;
    stage1Paid: boolean;
    stage2Paid: boolean;
    stage1Released: boolean;
    stage2Released: boolean;
    docs: ProjectDoc[];
    arbitration: ProjectArbitration;
  };
  type CircleStageState = {
    roughPerformerIds: number[];
    finishPerformerIds: number[];
    groupChatOrderId?: string;
    escrow: ProjectEscrowState;
  };
  const [circleStagesById, setCircleStagesById] = useState<Record<string, CircleStageState>>({});
  const ensureCircleStage = useCallback((circleId: string) => {
    setCircleStagesById((prev) => {
      if (prev[circleId]) return prev;
      const defaultEscrow: ProjectEscrowState = {
        performerId: undefined,
        total: 145000,
        stage1Paid: false,
        stage2Paid: false,
        stage1Released: false,
        stage2Released: false,
        docs: [
          { id: "d1", title: "Договор подряда - Электрик.pdf", status: "signed", ownerRole: "performer" },
          { id: "d2", title: "Договор подряда - Маляр.pdf", status: "signed", ownerRole: "performer" },
          { id: "d3", title: "Договор подряда - Plumber.pdf", status: "waiting", ownerRole: "performer" },
        ],
        arbitration: { open: false, votesCustomer: 0, votesPerformer: 0, expertVotes: Array.from({ length: 10 }, () => "pending") },
      };
      return {
        ...prev,
        [circleId]: {
          roughPerformerIds: [],
          finishPerformerIds: [],
          groupChatOrderId: undefined,
          escrow: defaultEscrow,
        },
      };
    });
  }, []);
  const createCircleProject = useCallback(
    (payload: Omit<CircleProject, "id" | "createdAt" | "status" | "customerId" | "customerName">) => {
      if (!user) return;
      const project: CircleProject = {
        id: "cp_" + uid(),
        createdAt: Date.now(),
        status: "sent",
        customerId: user.id,
        customerName: user.firstName,
        ...payload,
      };
      setCircleProjects((prev) => [project, ...prev]);
      // уведомления исполнителям по району или "по всему городу"
      setNotifications((prev) => {
        const targets = performers.filter((pf) => {
          if (pf.city !== project.city) return false;
          const mode = pf.workAreaMode ?? "district_only";
          return mode === "city_all" || pf.district === project.district;
        });
        if (!targets.length) return prev;
        const nextItems: NotificationItem[] = targets.map(() => ({
          id: "n_" + uid(),
          createdAt: Date.now(),
          title: "🔥 Нужен помощник",
          text: `Нужен помощник — перейдите в проект: ${project.title} • ${project.city}, ${project.district}`,
          isRead: false,
          userRoleTarget: "performer",
          meta: { type: "circle_invite", circleId: project.id },
        }));
        return [...nextItems, ...prev];
      });
      ensureCircleStage(project.id);
      return project;
    },
    [ensureCircleStage, performers, user]
  );
  /* =========================
     ✅ подсказки услуг для профиля
  ========================= */
  const normalizeSuggestText = (value: string) => {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};
const buildSuggestions = useCallback((phrase: string) => {
  const q = normalizeSuggestText(phrase);
  if (!q) return [] as { category: string; service: string; score: number }[];
  const parts = q.split(" ").filter(Boolean);
  const found: { category: string; service: string; score: number }[] = [];
  for (const cat of ALL_CATEGORIES) {
    const catNorm = normalizeSuggestText(cat);
    for (const svc of CATEGORY_SERVICES[cat] || []) {
      const svcNorm = normalizeSuggestText(svc);
      const fullNorm = `${catNorm} ${svcNorm}`;
      let score = 0;
      if (svcNorm === q) score += 100;
      if (catNorm === q) score += 70;
      if (svcNorm.startsWith(q)) score += 40;
      if (catNorm.startsWith(q)) score += 25;
      if (svcNorm.includes(q)) score += 18;
      if (catNorm.includes(q)) score += 12;
      if (fullNorm.includes(q)) score += 10;
      for (const part of parts) {
        if (!part) continue;
        if (svcNorm.startsWith(part)) score += 10;
        if (catNorm.startsWith(part)) score += 6;
        if (svcNorm.includes(part)) score += 5;
        if (catNorm.includes(part)) score += 3;
      }
      if (score > 0) {
        found.push({
          category: cat,
          service: svc,
          score,
        });
      }
    }
  }
  const unique = new Map<string, { category: string; service: string; score: number }>();
  found
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.category.localeCompare(b.category, "ru") ||
        a.service.localeCompare(b.service, "ru")
    )
    .forEach((item) => {
      const key = `${item.category}__${item.service}`;
      if (!unique.has(key)) unique.set(key, item);
    });
  return Array.from(unique.values()).slice(0, 12);
}, []);
  /* =========================
     AUTH
  ========================= */
    const submitAuth = () => {
  const nameTrim = authName.trim();
  const lettersOnly = nameTrim.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, "");
  const phoneDigits = phoneDigitsRU(phone);
  const cityTrim = authCity.trim();
  const emailTrim = authEmail.trim();
  const codeTrim = code.trim();

  const nameOk = nameTrim.length > 0 && lettersOnly.length >= 2;
  const phoneOk = phoneDigits.length === 11 && phoneDigits.startsWith("7");
  const cityOk = cityTrim.length > 0;
  const emailOk = validateAuthEmail(emailTrim);
  const codeOk = codeTrim === "1111";

  const nextErrors = {
    name: !nameOk,
    phone: !phoneOk,
    city: !cityOk,
    email: !emailOk,
    code: !codeOk,
  };

  setAuthErrors(nextErrors);

  if (!nameOk) {
    scrollToAuthField("name");
    return Alert.alert("Ошибка", "Введите реальное имя минимум из 2 букв.");
  }

  if (!phoneOk) {
    scrollToAuthField("phone");
    return Alert.alert("Ошибка", "Введите телефон в формате +7 (XXX) XXX-XX-XX.");
  }

  if (!cityOk) {
    scrollToAuthField("city");
    return Alert.alert("Ошибка", "Выберите город.");
  }

  if (!emailOk) {
    scrollToAuthField("email");
    return Alert.alert("Ошибка", "Введите корректную почту из разрешённых доменов.");
  }

  if (!codeOk) {
    scrollToAuthField("code");
    return Alert.alert("Ошибка", "Код теста: 1111");
  }

  const u: User = {
    id: "u_" + uid(),
    role: pendingRole,
    phone: phone.trim(),
    email: emailTrim,
    firstName: nameTrim,
    lastName: "Иванов",
    city: cityTrim,
    district: filters.district || "Центральный",
    address: "ул. Примерная, 10",
    workAreaMode: "district_only",
    payCardMasked: "**** 1234",
    extraPhone: "",
    callsAnyTime,
    callsEveryDay,
    callsFrom: "09:00",
    callsTo: "21:00",
    callsDays: [...WORK_DAYS],
    doneOrders: 7,
    ratingAsPerformer: 4.8,
    avatarUri:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=60",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 200,
  };

  setUser(u);

  setEcoProfile({
    name: u.firstName,
    city: u.city,
    email: u.email,
    phoneMain: u.phone,
    phoneExtra: u.extraPhone || "",
    address: u.address || "",
    avatarUri: u.avatarUri,
  });

  setProfileMode(u.role);
  setAuthOpen(false);

  setAuthName("");
  setPhone("+7");
  setAuthCity("");
  setAuthEmail("");
  setCode("");

  setAuthErrors({
    name: false,
    phone: false,
    city: false,
    email: false,
    code: false,
  });

  setPerfName(u.firstName);

  const fn = afterAuthRef.current;
  afterAuthRef.current = null;
  fn?.();
};
  const openChatForOrder = (orderId: string) => {
    setChats((prev) => {
      if (prev[orderId]) return prev;
      const now = Date.now();
      return {
        ...prev,
        [orderId]: [{ id: "m_" + uid(), orderId, sender: "other", createdAt: now - 9000, text: "Здравствуйте! Готов выполнить ваше задание!" }],
      };
    });
    setDealStages((prev) => (prev[orderId] ? prev : { ...prev, [orderId]: "unpaid" }));
    setScreen({ name: "chat", orderId });
  };
  const createOrder = (
  p: Performer,
  category: string,
  serviceName: string,
  price: number,
  priceIsFrom: boolean
) => {
  if (!user) return;

  const order: Order = {
    id: "o_" + uid(),
    createdAt: Date.now(),
    status: "created",
    customerId: user.id,
    performerId: p.id,
    category,
    serviceName,
    price,
    priceIsFrom,
  };

  setOrders((prev) => [order, ...prev]);
  setDealStages((prev) => ({ ...prev, [order.id]: "unpaid" }));

  return order;
}; 

const openChatWithPerformerFromProject = useCallback(
  (circleId: string, performerId: number) => {
    const p = performers.find((x) => x.id === performerId);
    if (!p) return;

    const createAndOpen = () => {
      const o = createOrder(p, p.category, p.service, p.price, p.priceIsFrom);
      if (!o) return;

      setProjectChatOrderByCircle((prev) => ({ ...prev, [circleId]: o.id }));
      setScreen({ name: "projectChat", circleId, orderId: o.id });
    };

    if (!user) return requireAuth("customer", createAndOpen);
    createAndOpen();
  },
  [createOrder, performers, requireAuth, user]
);
  const filteredPerformers = useMemo(() => {
    let list = [...performers];
    if (filters.city) list = list.filter((p) => p.city === filters.city);
    if (filters.district) list = list.filter((p) => p.district === filters.district);
    if (filters.category) list = list.filter((p) => p.category === filters.category);
    if (filters.service) list = list.filter((p) => p.service === filters.service);
    if (filters.priceFrom != null) list = list.filter((p) => p.price >= (filters.priceFrom as number));
    if (filters.priceTo != null) list = list.filter((p) => p.price <= (filters.priceTo as number));
    if (filters.minRating4Plus) list = list.filter((p) => p.rating >= 4);
    if (filters.sort === "cheaper") list.sort((a, b) => a.price - b.price);
    if (filters.sort === "expensive") list.sort((a, b) => b.price - a.price);
    return list;
  }, [performers, filters]);
  const trendingServices = useMemo(() => {
    const allServices: { category: string; service: string }[] = [];
    for (const cat of ALL_CATEGORIES) for (const svc of CATEGORY_SERVICES[cat] || []) allServices.push({ category: cat, service: svc });
    const base = allServices.map((s, i) => ({
      ...s,
      growthPct: clamp(((i + 1) * 7 + (filters.city === "Москва" ? 10 : 3)) % 55, 5, 55),
      requests7d: clamp(((i + 1) * 11 + (filters.city === "Москва" ? 20 : 9)) % 90, 12, 90),
    }));
    return base.sort((a, b) => b.requests7d + b.growthPct - (a.requests7d + a.growthPct)).slice(0, 6);
  }, [filters.city]);
  const topPerformers = useMemo(() => {
  const bayesian = (rating: number, n: number) => (rating * n + 4.5 * 20) / (n + 20);
  const score = (p: Performer) => bayesian(p.rating, p.reviews) * 0.7 + Math.log(p.completed + 1) * 0.3;
  return performers
    .filter((p) => p.city === filters.city)
    .filter((p) => p.rating >= 4.0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 8);
}, [performers, filters.city]);
const getMatchedPerformersForCircle = useCallback(
  (circleId: string) => {
    const project = circleProjects.find((x) => x.id === circleId);
    if (!project) return [];
    return performers.filter((pf) => {
      if (pf.city !== project.city) return false;
      const mode = pf.workAreaMode ?? "district_only";
      return mode === "city_all" || pf.district === project.district;
    });
  },
  [circleProjects, performers]
);
const openCircleDetails = useCallback(
  (circleId: string) => {
    ensureCircleStage(circleId);
    setTab("circles");
    setScreen({ name: "circleDetails", circleId });
  },
  [ensureCircleStage]
);
const openCircleActive = useCallback(
  (circleId: string) => {
    const project = circleProjects.find((x) => x.id === circleId);
    if (!project) {
      Alert.alert("Проект", "Проект не найден.");
      return;
    }
    ensureCircleStage(circleId);
    const matched = getMatchedPerformersForCircle(circleId);
    if (!matched.length) {
      Alert.alert("Исполнители", "Пока нет подходящих исполнителей для этого проекта.");
      return;
    }
    const currentStage = circleStagesById[circleId];
    const performerId = currentStage?.escrow.performerId ?? matched[0].id;
    setCircleStagesById((prev) => {
      const current = prev[circleId];
      if (!current) {
        return {
          ...prev,
          [circleId]: {
            roughPerformerIds: [],
            finishPerformerIds: [],
            groupChatOrderId: undefined,
            escrow: {
              performerId,
              total: 145000,
              stage1Paid: false,
              stage2Paid: false,
              stage1Released: false,
              stage2Released: false,
              docs: [
                { id: "d1", title: "Договор подряда - Электрик.pdf", status: "signed", ownerRole: "performer" },
                { id: "d2", title: "Договор подряда - Маляр.pdf", status: "signed", ownerRole: "performer" },
                { id: "d3", title: "Договор подряда - Plumber.pdf", status: "waiting", ownerRole: "performer" },
              ],
              arbitration: {
                open: false,
                votesCustomer: 0,
                votesPerformer: 0,
                expertVotes: Array.from({ length: 10 }, () => "pending"),
              },
            },
          },
        };
      }
      return {
        ...prev,
        [circleId]: {
          ...current,
          escrow: {
            ...current.escrow,
            performerId,
          },
        },
      };
    });
    setTab("circles");
    setScreen({ name: "projectActive", circleId });
  },
  [circleProjects, circleStagesById, ensureCircleStage, getMatchedPerformersForCircle]
);
const openCircleChat = useCallback(
  (circleId: string) => {
    const run = () => {
      const project = circleProjects.find((x) => x.id === circleId);
      if (!project) {
        Alert.alert("Чат проекта", "Проект не найден.");
        return;
      }
      ensureCircleStage(circleId);
      const matched = getMatchedPerformersForCircle(circleId);
      if (!matched.length) {
        Alert.alert("Чат проекта", "Сначала нужен подходящий исполнитель для проекта.");
        return;
      }
      const currentStage = circleStagesById[circleId];
      const performerId = currentStage?.escrow.performerId ?? matched[0].id;
      setCircleStagesById((prev) => {
        const current = prev[circleId];
        if (!current) return prev;
        return {
          ...prev,
          [circleId]: {
            ...current,
            escrow: {
              ...current.escrow,
              performerId,
            },
          },
        };
      });
      const existingOrderId = projectChatOrderByCircle[circleId];
      setReturnToProject({ circleId });
      setTab("circles");
      if (existingOrderId) {
        setScreen({ name: "projectChat", circleId, orderId: existingOrderId });
        return;
      }
      openChatWithPerformerFromProject(circleId, performerId);
    };
    requireAuth("customer", run);
  },
  [
    circleProjects,
    circleStagesById,
    ensureCircleStage,
    getMatchedPerformersForCircle,
    openChatWithPerformerFromProject,
    projectChatOrderByCircle,
    requireAuth,
  ]
);
  /* =========================
     HEADER LOGIC
  ========================= */
  const headerTitle = useMemo(() => {
    switch (screen.name) {
      case "needHelper":
        return "Нужен помощник";
      case "helpCategory":
        return screen.category;
      case "performersList":
        return screen.serviceName || "Исполнители";
      case "performerProfile":
        return "Профиль";
      case "reviews":
        return "Отзывы";
      case "myReviews":
        return screen.role === "customer" ? "Отзывы исполнителей" : "Отзывы заказчиков";
      case "becomePerformer":
        return "Хочу клиентов";
      case "confirmOrder":
        return "Подтверждение";
      case "chat":
        return "Чат";
      case "projectChat":
        return "Чат";
      case "projectActive":
        return "Проект(activ)";
      case "profileSettings":
        return "Управление профилем";
      case "notifications":
        return "Уведомления";
      case "performerServiceSetup":
        return "Настройка услуги";
      case "circles":
        return "Круги";
      case "circleDetails":
        return "Круги проекта";
      default:
        return "";
    }
  }, [screen]);
  const showHeader =
    screen.name === "needHelper" ||
    screen.name === "helpCategory" ||
    screen.name === "performersList" ||
    screen.name === "performerProfile" ||
    screen.name === "reviews" ||
    screen.name === "myReviews" ||
    screen.name === "becomePerformer" ||
    screen.name === "confirmOrder" ||
    screen.name === "chat" ||
    screen.name === "projectChat" ||
    screen.name === "projectActive" ||
    screen.name === "profileSettings" ||
    screen.name === "notifications" ||
    screen.name === "performerServiceSetup" ||
    screen.name === "circles" ||
    screen.name === "circleDetails";
  const goBack = useCallback(() => {
    if (screen.name === "projectChat") return setScreen({ name: "projectActive", circleId: screen.circleId });
    if (screen.name === "projectActive") return setScreen({ name: "circleDetails", circleId: screen.circleId });
    if (screen.name === "chat") return setScreen({ name: "deals" });
    if (screen.name === "circleDetails") return setScreen({ name: "circles" });
    if (screen.name === "profileSettings" || screen.name === "notifications") return setScreen({ name: "myProfile" });
    if (screen.name === "myReviews") return setScreen({ name: "myProfile" });
    if (screen.name === "performerServiceSetup") {
  setTab("profile");
  return setScreen({ name: "myProfile" });
}
    if (screen.name === "performerProfile") return setScreen({ name: "performersList", category: screen.category, serviceName: screen.serviceName });
    if (screen.name === "reviews") return setScreen({ name: "home" });
    setScreen({ name: "home" });
  }, [screen]);
  const archiveDealById = useCallback(
    (oid: string) => {
      setOrders((prev) => prev.map((o) => (o.id === oid ? { ...o, status: "canceled" } : o)));
      setChats((prev) => ({
        ...prev,
        [oid]: [...(prev[oid] || []), { id: "m_" + uid(), orderId: oid, sender: "system", createdAt: Date.now(), text: "Сделка закрыта и перенесена в архив." }],
      }));
      setDealStage(oid, "released");
      setScreen({ name: "deals" });
    },
    [setDealStage]
  );
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (photoViewer) {
        setPhotoViewer(null);
        return true;
      }
      if (picker) {
        setPicker(null);
        return true;
      }
      if (authOpen) {
  setAuthOpen(false);
  setAuthName("");
  setPhone("+7");
  setAuthCity("");
  setAuthEmail("");
  setCode("");
  setAuthErrors({
    name: false,
    phone: false,
    city: false,
    email: false,
    code: false,
  });
  afterAuthRef.current = null;
  return true;
}
      if (matchedCustomersOpen) {
        setMatchedCustomersOpen(false);
        return true;
      }
      if (screen.name !== "home") {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [authOpen, goBack, matchedCustomersOpen, photoViewer, picker, screen.name]);
  const headerRight = useMemo(() => {
    if (screen.name === "performerProfile") {
      const p = performers.find((x) => x.id === screen.performerId);
      if (!p) return null;
      return <HeartButton active={favPerformers.has(p.id)} onPress={() => toggleFav(p.id)} transparent />;
    }
    if (screen.name === "chat" || screen.name === "projectChat") {
  return (
    <Row style={{ gap: 10, alignItems: "center" }}>
      <Pressable
        onPress={() => setScreen({ name: "notifications" })}
        style={({ pressed }) => [
          styles.headerIconBtn,
          styles.headerBellBtn,
          pressed ? styles.headerBellBtnPressed : null,
        ]}
      >
        {({ pressed }) => (
          <>
            <Text style={[styles.headerBellIcon, pressed ? styles.headerBellIconPressed : null]}>
              {"\u{1F514}\uFE0E"}
            </Text>
            {unreadCount > 0 ? <View style={styles.redDot} /> : null}
          </>
        )}
      </Pressable>
      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            "Звонок",
            "Номера телефонов подменяются на рандомные. Реальный номер видит только админ. (мок)"
          )
        }
        activeOpacity={0.9}
        style={styles.chatCallBtn}
      >
        <Text style={styles.chatCallIcon}>{"\u260E\uFE0E"}</Text>
      </TouchableOpacity>
    </Row>
  );
}
    return null;
  }, [favPerformers, performers, screen, toggleFav, unreadCount]);
  /* =========================
     SCREENS: helpCategory / performersList / profiles / reviews / deals / favorites / messages
  ========================= */
  const HelpCategoryScreen = ({ category }: { category: string }) => {
    const services = CATEGORY_SERVICES[category] || [];
    const categoryImg = CATEGORY_BANNER_URI[category] || HOME_HERO_URI;
    const getDemoMeta = (idx: number) => {
      const rating = clamp(4.6 + ((idx * 7) % 4) * 0.1, 4.6, 4.9);
      const reviews = 140 + ((idx * 37) % 170);
      return { rating, reviews };
    };
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180 }} keyboardShouldPersistTaps="handled">
        <Image source={{ uri: categoryImg }} style={styles.homeHero} resizeMode="cover" />
        <View style={styles.whitePanel}>
          <Title>{category}</Title>
          <Text style={{ marginTop: 6, color: "#666", fontWeight: "800" }}>Выберите услугу:</Text>
          <View style={{ height: 12 }} />
          {services.map((serviceName, idx) => {
            const { rating, reviews } = getDemoMeta(idx);
            return (
              <View key={serviceName} style={styles.serviceRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.serviceRowTitle} numberOfLines={2}>
                    {serviceName}
                  </Text>
                  <Row style={{ marginTop: 6 }}>
                    <Text style={styles.serviceRowMeta}>⭐ {rating.toFixed(1)}</Text>
                    <Text style={[styles.serviceRowMeta, { marginLeft: 10 }]}>{reviews} отзывов</Text>
                  </Row>
                </View>
                <TouchableOpacity
                  style={[styles.orderBtn, { backgroundColor: GREEN }]}
                  activeOpacity={0.9}
                  onPress={() => {
                    setFilters((f) => ({ ...f, category, service: serviceName }));
                    setScreen({ name: "performersList", category, serviceName });
                  }}
                >
                  <Text style={styles.orderBtnText} numberOfLines={1}>
                    Заказать
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };
  const PerformersListScreen = ({ category, serviceName }: { category: string; serviceName: string }) => {
    const list = filteredPerformers
      .filter((p) => (category ? p.category === category : true))
      .filter((p) => (serviceName ? p.service === serviceName : true));
    const categoryImg = CATEGORY_BANNER_URI[category] || HOME_HERO_URI;
    const topForThisService = useMemo(() => {
  const listedIds = new Set(list.map((p) => p.id));
  return topPerformers
    .filter((p) => p.category === category && p.service === serviceName)
    .filter((p) => !listedIds.has(p.id))
    .slice(0, 4);
}, [topPerformers, category, serviceName, list]);
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180 }} keyboardShouldPersistTaps="handled">
        <Image source={{ uri: categoryImg }} style={styles.homeHero} resizeMode="cover" />
        <View style={styles.whitePanel}>
          <Title>{serviceName || "Исполнители"}</Title>
          <Row style={{ marginTop: 8 }}>
            <Text style={{ color: "#666", fontWeight: "800" }}>📦 {category}</Text>
          </Row>
          <Text style={{ marginTop: 10, fontWeight: "900", fontSize: 18, color: "#111" }}>Выберите исполнителя:</Text>
          <View style={{ height: 12 }} />
          {list.length ? (
            <View style={{ gap: 10 }}>
              {list.map((p) => (
                <Pressable key={p.id} style={styles.performerSelectCard} onPress={() => setScreen({ name: "performerProfile", performerId: p.id, category: p.category, serviceName: p.service })}>
                  <View style={styles.performerSelectAvatar}>{p.avatarUri ? <Image source={{ uri: p.avatarUri }} style={styles.performerSelectAvatarImg} /> : null}</View>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.performerSelectName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Row style={{ marginTop: 6 }}>
                      <Text style={styles.performerSelectMeta}>⭐ {p.rating.toFixed(1)}</Text>
                      <Text style={[styles.performerSelectMeta, { marginLeft: 10 }]}>{p.reviews} отзывов</Text>
                    </Row>
                    <Text style={styles.performerSelectPrice}>
                      {p.priceIsFrom ? "от " : ""}
                      {money(p.price)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Card>
              <Text style={{ fontWeight: "900", color: "#111" }}>Нет исполнителей</Text>
              <Text style={{ color: "#666", fontWeight: "800", marginTop: 6 }}>Попробуйте изменить фильтры (город/район/категория/стоимость).</Text>
              <View style={{ height: 10 }} />
              <PrimaryButton
                title="Изменить фильтры"
                variant="dark"
                onPress={() => {
                  setFiltersDraft(filters);
                  setPriceFromText(filters.priceFrom != null ? String(filters.priceFrom) : "");
                  setPriceToText(filters.priceTo != null ? String(filters.priceTo) : "");
                  setScreen({ name: "needHelper" });
                }}
              />
            </Card>
          )}
        </View>
        <Card>
          <Title>🏆 ТОП исполнители</Title>
          <View style={{ height: 10 }} />
          {topForThisService.length ? (
            <View style={{ gap: 10 }}>
              {topForThisService.map((p) => (
                <PerformerCard
                  key={p.id}
                  p={p}
                  proUnderHeart
                  passportUploadedFlag={passportUploadedFlag}
                  onOpen={() => setScreen({ name: "performerProfile", performerId: p.id, category: p.category, serviceName: p.service })}
                  onOpenReviews={() => setScreen({ name: "reviews", performerId: p.id })}
                  onToggleFav={() => toggleFav(p.id)}
                  isFav={favPerformers.has(p.id)}
                />
              ))}
            </View>
          ) : (
            <Text style={{ color: "#666", fontWeight: "800" }}>Пока нет ТОП исполнителей для этой услуги.</Text>
          )}
        </Card>
      </ScrollView>
    );
  };
  
  const ReviewsScreen = ({ performerId }: { performerId: number }) => {
    const list = demoReviewsByPerformerId[performerId] || [];
    const p = performers.find((x) => x.id === performerId);
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180 }} keyboardShouldPersistTaps="handled">
        <Title>Отзывы</Title>
        <Text style={{ marginTop: 6, color: "#666", fontWeight: "800" }}>{p?.name || ""}</Text>
        <View style={{ height: 10 }} />
        <Card>
          {list.length ? (
            list.map((r) => (
              <View key={r.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: "#F0F0F0" }}>
                <Row>
                  <Text style={{ fontWeight: "900", color: "#111", flex: 1 }}>{r.author}</Text>
                  <Text style={{ fontWeight: "900", color: "#111" }}>⭐ {r.rating}</Text>
                </Row>
                <Text style={{ color: "#666", fontWeight: "800", marginTop: 6 }}>{r.text}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: "#666", fontWeight: "800" }}>Пока нет отзывов.</Text>
          )}
        </Card>
      </ScrollView>
    );
  };
  const MyReviewsScreen = ({ role }: { role: UserRole }) => {
    const list = role === "customer" ? demoMyReviewsCustomer : demoMyReviewsPerformer;
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180 }} keyboardShouldPersistTaps="handled">
        <Title>{role === "customer" ? "Отзывы исполнителей" : "Отзывы заказчиков"}</Title>
        <Text style={{ marginTop: 6, color: "#666", fontWeight: "800" }}>{user ? `${user.firstName} ${user.lastName}` : ""}</Text>
        <View style={{ height: 10 }} />
        <Card>
          {list.length ? (
            list.map((r) => (
              <View key={r.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: "#F0F0F0" }}>
                <Row>
                  <Text style={{ fontWeight: "900", color: "#111", flex: 1 }}>{r.author}</Text>
                  <Text style={{ fontWeight: "900", color: "#111" }}>⭐ {r.rating}</Text>
                </Row>
                <Text style={{ color: "#666", fontWeight: "800", marginTop: 6 }}>{r.text}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: "#666", fontWeight: "800" }}>Пока нет отзывов.</Text>
          )}
        </Card>
      </ScrollView>
    );
  };
  const DealsScreen = () => {
    type DealsTab = "pending" | "active" | "disputed" | "archive";
    const [activeTab, setActiveTab] = useState<DealsTab>("pending");
    const pending = useMemo(() => orders.filter((o) => o.status === "created"), [orders]);
    const active = useMemo(() => orders.filter((o) => o.status === "in_progress" || o.status === "done"), [orders]);
    const disputed = useMemo(() => orders.filter((o) => o.status === "disputed"), [orders]);
    const archive = useMemo(() => orders.filter((o) => o.status === "canceled"), [orders]);
    const safe = useSafeAreaInsets();
    const tabsScrollRef = useRef<ScrollView | null>(null);
    const pagesRef = useRef<ScrollView | null>(null);
    const screenW = Dimensions.get("window").width;
    const pageW = screenW;
    const getTabByIndex = (i: number): DealsTab => (i === 0 ? "pending" : i === 1 ? "active" : i === 2 ? "disputed" : "archive");
    const narrow = (s: string) => s.replace(/\s+/g, "\u202F");
    const underlineX = useRef(new Animated.Value(0)).current;
const underlineW = useRef(new Animated.Value(0)).current;
const tabLayouts = useRef<
  Record<
    string,
    {
      itemX: number;
      textX: number;
      textW: number;
    }
  >
>({}).current;
const UNDERLINE_OFFSET_X = 6;
const moveUnderlineToTab = useCallback(
  (id: DealsTab, animated = true) => {
    const layout = tabLayouts[id];
    if (!layout || layout.textW <= 0) return;
    const nextX = layout.itemX + layout.textX + UNDERLINE_OFFSET_X;
    const nextW = layout.textW;
    if (animated) {
      Animated.parallel([
        Animated.timing(underlineX, {
          toValue: nextX,
          duration: 160,
          useNativeDriver: false,
        }),
        Animated.timing(underlineW, {
          toValue: nextW,
          duration: 160,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      underlineX.setValue(nextX);
      underlineW.setValue(nextW);
    }
  },
  [tabLayouts, underlineX, underlineW]
);
useEffect(() => {
  moveUnderlineToTab(activeTab, true);
}, [activeTab, moveUnderlineToTab]);
    const scrollTabsToIndex = (index: number) => {
      const ITEM_APPROX_W = 150,
        GAP = 4;
      const x = Math.max(0, index * (ITEM_APPROX_W + GAP) - 16);
      requestAnimationFrame(() => tabsScrollRef.current?.scrollTo({ x, animated: true }));
    };
    const onTabPress = (id: DealsTab, index: number) => {
      setActiveTab(id);
      scrollTabsToIndex(index);
      requestAnimationFrame(() => pagesRef.current?.scrollTo({ x: index * pageW, animated: true }));
    };
    const [actionForOrderId, setActionForOrderId] = useState<string | null>(null);
    const closeActions = () => setActionForOrderId(null);
    const pinOrder = (id: string) => {
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === id);
        if (idx < 0) return prev;
        const copy = [...prev];
        const [it] = copy.splice(idx, 1);
        return [it, ...copy];
      });
      closeActions();
    };
    const deleteForever = (id: string) => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      setChats((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      closeActions();
    };
    const moveDisputedToActive = (id: string) => {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "in_progress" } : o)));
      closeActions();
    };
    const PencilBtn = ({ onPress }: { onPress: () => void }) => (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.dealsPencilBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.savedServiceEditText}>✎</Text>
      </TouchableOpacity>
    );
    const ActionSheet = ({
      variant,
      onMove,
      onPin,
      onDelete,
    }: {
      variant: "disputed" | "simple";
      onMove?: () => void;
      onPin: () => void;
      onDelete: () => void;
    }) => (
      <View style={styles.dealsActionSheet}>
        {variant === "disputed" ? (
          <TouchableOpacity activeOpacity={0.9} style={styles.dealsActionRow} onPress={onMove}>
            <Text style={styles.dealsActionIcon}>↔️</Text>
            <Text style={styles.dealsActionText}>Переместить в активные</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity activeOpacity={0.9} style={styles.dealsActionRow} onPress={onPin}>
          <Text style={styles.dealsActionIcon}>📌</Text>
          <Text style={styles.dealsActionText}>Закрепить выше</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.9} style={styles.dealsActionRow} onPress={onDelete}>
          <Text style={styles.dealsActionIcon}>🗑️</Text>
          <Text style={styles.dealsActionText}>Удалить навсегда</Text>
        </TouchableOpacity>
      </View>
    );
    const TabItem = ({ id, index, label, count }: { id: DealsTab; index: number; label: string; count: number }) => {
  const isActive = activeTab === id;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onTabPress(id, index)}
      style={styles.dealsTabItemCompact}
      onLayout={(e) => {
        const { x } = e.nativeEvent.layout;
        const prev = tabLayouts[id] || { itemX: 0, textX: 0, textW: 0 };
        tabLayouts[id] = {
          ...prev,
          itemX: x,
        };
        if (activeTab === id && prev.textW > 0) {
          moveUnderlineToTab(id, false);
        }
      }}
    >
      <Row style={styles.dealsTabLabelRow}>
        <Text
          style={[styles.dealsTabTextCompact, isActive ? styles.dealsTabTextCompactActive : null]}
          numberOfLines={1}
          onLayout={(e) => {
            const { x, width } = e.nativeEvent.layout;
            const prev = tabLayouts[id] || { itemX: 0, textX: 0, textW: 0 };
            tabLayouts[id] = {
              ...prev,
              textX: x,
              textW: width,
            };
            if (activeTab === id) {
              moveUnderlineToTab(id, false);
            }
          }}
        >
          {narrow(label)}
        </Text>
        <View style={styles.dealsTabCountInline}>
          <Text style={styles.dealsTabCountTextBig}>{count}</Text>
        </View>
      </Row>
    </TouchableOpacity>
  );
};
    const DealPerformerCard = ({ o }: { o: Order }) => {
      const p = performers.find((x) => x.id === o.performerId);
      if (!p) return null;
      const createdText = `${formatChatDateRU(o.createdAt)} • ${formatTimeHHMM(o.createdAt)}`;
      const isPending = o.status === "created";
      const isDisputed = o.status === "disputed";
      const isArchive = o.status === "canceled";
      const showPencil = isPending || isDisputed || isArchive;
      const menuVariant: "disputed" | "simple" = isDisputed ? "disputed" : "simple";
      const menuOpen = actionForOrderId === o.id;
      return (
        <View style={{ width: "100%" }}>
          <Pressable
            style={styles.dealsPerformerCard}
            onPress={() => {
              closeActions();
              openChatForOrder(o.id);
            }}
          >
            {showPencil ? (
              <View style={styles.dealsCardTopRight}>
                <PencilBtn onPress={() => setActionForOrderId((prev) => (prev === o.id ? null : o.id))} />
              </View>
            ) : null}
            <Row>
              <View style={styles.pAvatarCol}>
                <Pressable
                  onPress={(e: any) => {
                    e?.stopPropagation?.();
                    setScreen({ name: "performerProfile", performerId: p.id, category: p.category, serviceName: p.service });
                  }}
                  hitSlop={8}
                >
                  <View style={styles.avatarWrapRound}>{p.avatarUri ? <Image source={{ uri: p.avatarUri }} style={styles.avatarRound} /> : null}</View>
                </Pressable>
                {p.isPro ? (
                  <View style={styles.proUnderAvatarWrap}>
                    <Pill text="PRO ⭐" tone="gold" />
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.pSpec} numberOfLines={2}>
                  Специалист в области: {p.service}
                </Text>
                <View style={styles.dealsPerformerBottomRowWrap}>
                  <Text style={styles.dealsPerformerCost} numberOfLines={2}>
                    Стоимость:{" "}
                    <Text style={styles.dealsPerformerCostValue}>
                      {o.priceIsFrom ? "от " : "фиксированная "}
                      {money(o.price)}
                    </Text>
                  </Text>
                  <Text style={styles.dealsPerformerCreated} numberOfLines={2}>
                    <Text style={styles.dealsPerformerCreatedBold}>Создано</Text>: {createdText}
                  </Text>
                </View>
              </View>
            </Row>
          </Pressable>
          {menuOpen ? (
            <ActionSheet
              variant={menuVariant}
              onMove={menuVariant === "disputed" ? () => moveDisputedToActive(o.id) : undefined}
              onPin={() => pinOrder(o.id)}
              onDelete={() => deleteForever(o.id)}
            />
          ) : null}
        </View>
      );
    };
    const Page = ({ list }: { list: Order[] }) => (
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 180, minHeight: 420 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeActions}
      >
        {list.length ? (
          <View style={{ gap: 10 }}>
            {list.map((o) => (
              <DealPerformerCard key={o.id} o={o} />
            ))}
          </View>
        ) : (
          <View style={{ paddingVertical: 14 }}>
            <Text style={{ color: "#666", fontWeight: "800" }}>Пока нет сделок.</Text>
          </View>
        )}
      </ScrollView>
    );
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingTop: 16 + safe.top + 6, paddingHorizontal: 16 }}>
          <Title>Мои сделки</Title>
          <View style={{ height: 10 }} />
          <View style={styles.dealsTabsWrap}>
  <ScrollView
    ref={(r) => (tabsScrollRef.current = r)}
    horizontal
    showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={styles.dealsTabsScrollContentCompact}
  >
    <View style={styles.dealsTabsTrack}>
      <View style={styles.dealsTabsRow}>
        <TabItem id="pending" index={0} label="Ждут действий" count={pending.length} />
        <TabItem id="active" index={1} label="Активные" count={active.length} />
        <TabItem id="disputed" index={2} label="Спорные" count={disputed.length} />
        <TabItem id="archive" index={3} label="Архивные" count={archive.length} />
      </View>
      <View style={styles.dealsUnderlineThinBar} />
      <Animated.View
        style={[
          styles.dealsUnderlineActiveAnimated,
          {
            transform: [{ translateX: underlineX }],
            width: underlineW,
          },
        ]}
      />
    </View>
  </ScrollView>
</View>
        </View>
        <ScrollView
          ref={(r) => (pagesRef.current = r)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const idx = Math.round(x / pageW);
            const t = getTabByIndex(idx);
            setActiveTab(t);
            scrollTabsToIndex(idx);
            closeActions();
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: pageW }}>
            <Page list={pending} />
          </View>
          <View style={{ width: pageW }}>
            <Page list={active} />
          </View>
          <View style={{ width: pageW }}>
            <Page list={disputed} />
          </View>
          <View style={{ width: pageW }}>
            <Page list={archive} />
          </View>
        </ScrollView>
      </View>
    );
  };
  const FavoritesScreen = () => {
    const safe = useSafeAreaInsets();
    const list = performers.filter((p) => favPerformers.has(p.id));
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }} keyboardShouldPersistTaps="handled">
        <Title>Избранное</Title>
        <View style={{ height: 10 }} />
        {list.length ? (
          <View style={{ gap: 10 }}>
            {list.map((p) => (
              <PerformerCard
                key={p.id}
                p={p}
                passportUploadedFlag={passportUploadedFlag}
                onOpen={() => setScreen({ name: "performerProfile", performerId: p.id, category: p.category, serviceName: p.service })}
                onOpenReviews={() => setScreen({ name: "reviews", performerId: p.id })}
                onToggleFav={() => toggleFav(p.id)}
                isFav={true}
              />
            ))}
          </View>
        ) : (
          <Card>
            <Text style={{ fontWeight: "900", color: "#111" }}>Пока пусто</Text>
            <Text style={{ color: "#666", fontWeight: "800", marginTop: 6 }}>Добавляйте исполнителей в избранное, чтобы быстро находить их позже.</Text>
          </Card>
        )}
      </ScrollView>
    );
  };
  const MessagesScreen = () => {
    const safe = useSafeAreaInsets();
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }} keyboardShouldPersistTaps="handled">
        <Title>Сообщения</Title>
        <View style={{ height: 10 }} />
        <Card>
          <Text style={{ color: "#666", fontWeight: "800" }}>Пока пусто.</Text>
        </Card>
      </ScrollView>
    );
  };
/* =========================
   PerformerServiceSetupScreen
========================= */
const PerformerServiceSetupScreen = (s: Extract<Screen, { name: "performerServiceSetup" }>) => {
  const safe = useSafeAreaInsets();
  const existing = performerServices.find((x) => x.sourceIndex === s.sourceIndex);
  const [category, setCategory] = useState<string | undefined>(s.presetCategory ?? existing?.category);
  const [service, setService] = useState<string | undefined>(s.presetService ?? existing?.service);
  const [years, setYears] = useState<number | undefined>(existing?.years);
  const [days, setDays] = useState<Set<WorkDay>>(existing?.days ? new Set(existing.days) : new Set<WorkDay>());
  const [timeFrom, setTimeFrom] = useState<string | undefined>(existing?.timeFrom);
  const [timeTo, setTimeTo] = useState<string | undefined>(existing?.timeTo);
  const [contract, setContract] = useState<boolean | null>(existing?.contract ?? null);
  const [warranty, setWarranty] = useState<boolean | null>(existing?.warranty ?? null);
  const [minSumRub, setMinSumRub] = useState<string>(existing?.minSumRub ?? "");
  const [workWithLegal, setWorkWithLegal] = useState<boolean | null>(existing?.workWithLegal ?? null);
  const [media, setMedia] = useState<{ uri: string; kind: "photo" | "video" }[]>(existing?.media ?? []);
  const [description, setDescription] = useState<string>(existing?.description ?? "");
  const [priceRub, setPriceRub] = useState<string>(existing?.priceRub ?? "");
  const [priceIsFrom, setPriceIsFrom] = useState<boolean>(existing?.priceIsFrom ?? true);
  const [costType, setCostType] = useState<CostType | undefined>(existing?.costType);
  const [addressMode, setAddressMode] = useState<AddressMode>(existing?.addressMode ?? "У клиента");
  const [location, setLocation] = useState<string>(existing?.location ?? "");
  const [travelMode, setTravelMode] = useState<TravelMode>(existing?.travelMode ?? "Не выезжаю");
  const [localPicker, setLocalPicker] = useState<null | {
    title: string;
    options: string[];
    selected?: string;
    onPick: (v: string) => void;
  }>(null);
  useEffect(() => {
    const current = performerServices.find((x) => x.sourceIndex === s.sourceIndex);
    setCategory(s.presetCategory ?? current?.category);
    setService(s.presetService ?? current?.service);
    setYears(current?.years);
    setDays(current?.days ? new Set(current.days) : new Set<WorkDay>());
    setTimeFrom(current?.timeFrom);
    setTimeTo(current?.timeTo);
    setContract(current?.contract ?? null);
    setWarranty(current?.warranty ?? null);
    setMinSumRub(current?.minSumRub ?? "");
    setWorkWithLegal(current?.workWithLegal ?? null);
    setMedia(current?.media ?? []);
    setDescription(current?.description ?? "");
    setPriceRub(current?.priceRub ?? "");
    setPriceIsFrom(current?.priceIsFrom ?? true);
    setCostType(current?.costType);
    setAddressMode(current?.addressMode ?? "У клиента");
    setLocation(current?.location ?? "");
    setTravelMode(current?.travelMode ?? "Не выезжаю");
  }, [performerServices, s.sourceIndex, s.presetCategory, s.presetService]);
  const openLocalPicker = (
    title: string,
    options: string[],
    selected: string | undefined,
    onPick: (v: string) => void
  ) => {
    setLocalPicker({ title, options, selected, onPick });
  };
  const servicesForCategory = useMemo(() => {
    return category ? CATEGORY_SERVICES[category] || [] : [];
  }, [category]);
  const toggleDay = (d: WorkDay) => {
    setDays((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };
  const pickCategory = () =>
    openLocalPicker("Категория", ALL_CATEGORIES, category, (v) => {
      setCategory(v);
      setService(undefined);
    });
  const pickService = () => {
    if (!category) return;
    openLocalPicker("Услуга", servicesForCategory, service, (v) => setService(v));
  };
  const pickYears = () => {
    const yearsOptions = Array.from({ length: 41 }, (_, i) => String(i));
    openLocalPicker("Опыт работы (лет)", yearsOptions, years != null ? String(years) : undefined, (v) => {
      const parsed = parseInt(v, 10);
      setYears(Number.isFinite(parsed) ? parsed : undefined);
    });
  };
  const pickTimeFrom = () =>
    openLocalPicker("Часы работы: с", TIME_OPTIONS, timeFrom, (v) => setTimeFrom(v));
  const pickTimeTo = () =>
    openLocalPicker("Часы работы: до", TIME_OPTIONS, timeTo, (v) => setTimeTo(v));
  const pickCostType = () =>
    openLocalPicker("Тип услуги", COST_TYPES, costType, (v) => setCostType(v as CostType));
  const pickAddressMode = () =>
    openLocalPicker("Формат работы", ADDRESS_MODES, addressMode, (v) => setAddressMode(v as AddressMode));
  const pickTravelMode = () =>
    openLocalPicker("Выезд", TRAVEL_MODES, travelMode, (v) => setTravelMode(v as TravelMode));
  const onChangeMinSum = (t: string) => setMinSumRub(t.replace(/\D/g, "").slice(0, 9));
  const onChangePrice = (t: string) => setPriceRub(t.replace(/\D/g, "").slice(0, 9));
  const removeMedia = (uri: string) => {
    setMedia((prev) => prev.filter((m) => m.uri !== uri));
  };
  
  const pickFromDevice = async (kind: "photo" | "video") => {
  const photoCount = media.filter((m) => m.kind === "photo").length;
  if (kind === "photo" && photoCount >= 5) {
    Alert.alert("Лимит", "Можно добавить максимум 5 фото работ.");
    return;
  }
  // =========================
  // WEB
  // =========================
  if (Platform.OS === "web") {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = kind === "photo" ? "image/*" : "video/*";
      input.multiple = kind === "photo";
      input.onchange = () => {
        const files = Array.from(input.files || []);
        if (!files.length) return;
        const items = files
          .map((file: any) => {
            const type = String(file?.type || "");
            const isVideo = type.startsWith("video/");
            const isImage = type.startsWith("image/");
            // ✅ строго по выбранному режиму
            if (kind === "photo" && !isImage) return null;
            if (kind === "video" && !isVideo) return null;
            return {
              uri: URL.createObjectURL(file),
              kind,
            } as { uri: string; kind: "photo" | "video" };
          })
          .filter((x): x is { uri: string; kind: "photo" | "video" } => !!x?.uri);
        if (!items.length) {
          Alert.alert(
            "Неверный тип файла",
            kind === "photo" ? "Можно выбрать только изображения." : "Можно выбрать только видео."
          );
          return;
        }
        // ✅ лимиты: фото до 5, видео 1
        const remaining = kind === "photo" ? Math.max(1, 5 - photoCount) : 1;
        const limited = items.slice(0, remaining);
        setMedia((prev) => [...limited, ...prev]);
      };
      input.click();
    } catch {
      Alert.alert("Ошибка", "Не удалось открыть файловую галерею.");
    }
    return;
  }
  // =========================
  // iOS / Android
  // =========================
  
  const remaining = kind === "photo" ? Math.max(1, 5 - photoCount) : 1;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes:
      kind === "photo"
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
    allowsMultipleSelection: kind === "photo",
    selectionLimit: kind === "photo" ? remaining : 1,
    quality: 1,
  });
  if (result.canceled) return;
  const items = (result.assets || [])
    .map((asset) => {
      const k = asset.type === "video" ? ("video" as const) : ("photo" as const);
      // ✅ строго по режиму
      if (kind === "photo" && k !== "photo") return null;
      if (kind === "video" && k !== "video") return null;
      return { uri: asset.uri, kind: k };
    })
    .filter((x): x is { uri: string; kind: "photo" | "video" } => !!x?.uri);
  if (!items.length) {
    Alert.alert(
      "Неверный тип",
      kind === "photo" ? "Можно выбрать только изображения." : "Можно выбрать только видео."
    );
    return;
  }
  setMedia((prev) => [...items, ...prev]);
};
  const validate = () => {
  if (!category) return "Выберите категорию.";
  if (!service) return "Выберите услугу.";
  if (years == null) return "Выберите опыт работы.";
  if (!timeFrom || !timeTo) return "Выберите часы работы.";
  if (!costType) return "Выберите тип услуги.";
  const priceNum = parseInt(priceRub || "0", 10);
  if (!priceNum || priceNum <= 0) return "Укажите стоимость.";
  const photosCount = media.filter((m) => m.kind === "photo").length;
  if (photosCount < 1) return "Добавьте хотя бы 1 фото работ.";
  return null;
};
const save = () => {
  const err = validate();
  if (err) return Alert.alert("Ошибка", err);
  if (!user) return Alert.alert("Ошибка", "Сначала войдите в профиль.");
  const performerRecordId = existing?.performerRecordId ?? Date.now() + s.sourceIndex;
  const id = existing?.id ?? "ps_" + uid();
  const cfg: PerformerServiceConfig = {
    id,
    sourceIndex: s.sourceIndex,
    performerRecordId,
    category,
    service,
    years,
    days,
    timeFrom,
    timeTo,
    contract,
    warranty,
    minSumRub,
    workWithLegal,
    media,
    description,
    priceRub,
    priceIsFrom,
    costType,
    addressMode,
    location,
    travelMode,
  };
  setPerformerServices((prev) => {
    const idx = prev.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const copy = [...prev];
      copy[idx] = cfg;
      return copy;
    }
    const prevIdxBySource = prev.findIndex((x) => x.sourceIndex === s.sourceIndex);
    if (prevIdxBySource >= 0) {
      const copy = [...prev];
      copy[prevIdxBySource] = cfg;
      return copy;
    }
    return [cfg, ...prev];
  });
  const priceNum = parseInt(priceRub || "0", 10) || 0;
  const performerName = `${user.firstName} ${user.lastName}`.trim();
  const photoUris = media.filter((m) => m.kind === "photo").map((m) => m.uri).slice(0, 5);
    const mediaForCard = media.slice(0, 6); // фото+видео (как выбрано пользователем)
  const performerRecord: Performer = {
  id: performerRecordId,
  name: performerName || "Новый исполнитель",
  description: description.trim() || performerAbout.trim() || `${service || "Услуга"}`,
  rating: user.ratingAsPerformer || 0,
  reviews: 0,
  years: years ?? 0,
  completed: user.doneOrders || 0,
  city: user.city,
  district: user.district,
  category: category || "",
  service: service || "",
  price: priceNum,
  priceIsFrom,
  costType,
  isAvailable: true,
  isPro: false,
  isVerifiedPassport: passportUploadedFlag,
  avatarUri: user.avatarUri,
  ownerUserId: user.id,
  services: service
    ? [{ title: service, price: priceNum, priceIsFrom }]
    : [],
  workPhotos: photoUris,
  workMedia: mediaForCard,
  workAreaMode: user.workAreaMode,
};
  setPerformers((prev) => {
    const idx = prev.findIndex((p) => p.id === performerRecordId);
    if (idx >= 0) {
      const copy = [...prev];
      copy[idx] = performerRecord;
      return copy;
    }
    return [performerRecord, ...prev];
  });
  setTab("profile");
  setScreen({ name: "myProfile" });
};
const RequiredLabel = ({ children }: { children: string }) => (
  <Row style={styles.requiredLabelRow}>
    <Text style={styles.label}>{children}</Text>
    <View style={{ flex: 1 }} />
    <Text style={styles.requiredStar}>*</Text>
  </Row>
);
  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 220 }}
          keyboardShouldPersistTaps="always"
        >
          <View style={{ height: 10 }} />
          <Card>
            <RequiredLabel>Категории</RequiredLabel>
            <TouchableOpacity style={styles.pickerLine} activeOpacity={0.9} onPress={pickCategory}>
              <Text style={styles.pickerVal}>{category ? category : "Выберите категорию"}</Text>
              <Text style={styles.pickerArr}>▾</Text>
            </TouchableOpacity>
            <RequiredLabel>Услуги</RequiredLabel>
            <TouchableOpacity
              style={[styles.pickerLine, !category ? { opacity: 0.55 } : null]}
              activeOpacity={0.9}
              disabled={!category}
              onPress={pickService}
            >
              <Text style={styles.pickerVal}>{service ? service : "Выберите услугу"}</Text>
              <Text style={styles.pickerArr}>▾</Text>
            </TouchableOpacity>
            <RequiredLabel>Опыт работы</RequiredLabel>
            <TouchableOpacity style={styles.pickerLine} activeOpacity={0.9} onPress={pickYears}>
              <Text style={styles.pickerVal}>{years != null ? formatYearsLabel(years) : "Выберите опыт"}</Text>
              <Text style={styles.pickerArr}>▾</Text>
            </TouchableOpacity>
            <RequiredLabel>Часы работы</RequiredLabel>
            <Row style={{ gap: 10 }}>
              <TouchableOpacity style={[styles.pickerLine, { flex: 1 }]} activeOpacity={0.9} onPress={pickTimeFrom}>
                <Text style={styles.pickerVal}>{timeFrom ? timeFrom : "с"}</Text>
                <Text style={styles.pickerArr}>▾</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pickerLine, { flex: 1 }]} activeOpacity={0.9} onPress={pickTimeTo}>
                <Text style={styles.pickerVal}>{timeTo ? timeTo : "до"}</Text>
                <Text style={styles.pickerArr}>▾</Text>
              </TouchableOpacity>
            </Row>
            <Text style={styles.label}>Дни работы</Text>
            <Row style={{ flexWrap: "wrap", gap: 8 }}>
              {WORK_DAYS.map((d) => {
                const active = days.has(d);
                return (
                  <TouchableOpacity
                    key={d}
                    activeOpacity={0.9}
                    onPress={() => toggleDay(d)}
                    style={[styles.dayBtn, active ? styles.dayBtnActive : null]}
                  >
                    <Text style={[styles.dayBtnText, active ? styles.dayBtnTextActive : null]}>
                      {d.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Row>
            <RequiredLabel>Тип услуги</RequiredLabel>
            <TouchableOpacity style={styles.pickerLine} activeOpacity={0.9} onPress={pickCostType}>
              <Text style={styles.pickerVal}>{costType ? costType : "Выберите тип"}</Text>
              <Text style={styles.pickerArr}>▾</Text>
            </TouchableOpacity>
            <RequiredLabel>Стоимость</RequiredLabel>
            <Row style={{ gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={priceRub}
                onChangeText={onChangePrice}
                placeholder="Введите сумму"
                keyboardType="number-pad"
                inputMode="numeric"
              />
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setPriceIsFrom(true)}
                style={[styles.fromCheckWrap, priceIsFrom ? styles.fromCheckWrapActive : null]}
              >
                <Text style={[styles.fromCheckText, priceIsFrom ? styles.fromCheckTextActive : null]}>от</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setPriceIsFrom(false)}
                style={[styles.fromCheckWrap, !priceIsFrom ? styles.fromCheckWrapActive : null]}
              >
                <Text style={[styles.fromCheckText, !priceIsFrom ? styles.fromCheckTextActive : null]}>фикс</Text>
              </TouchableOpacity>
            </Row>
            <RequiredLabel>Фото работ</RequiredLabel>
            <Row style={{ gap: 10 }}>
              <TouchableOpacity style={styles.mediaAddBtn} activeOpacity={0.9} onPress={() => pickFromDevice("photo")}>
                <Text style={{ fontSize: 18 }}>🖼️</Text>
                <Text style={styles.mediaAddText}>Добавить фото</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaAddBtn} activeOpacity={0.9} onPress={() => pickFromDevice("video")}>
                <Text style={{ fontSize: 18 }}>🎬</Text>
                <Text style={styles.mediaAddText}>Добавить видео</Text>
              </TouchableOpacity>
            </Row>
            <View style={{ height: 10 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {media.map((m, idx) => (
                <View key={m.uri + idx} style={[styles.mediaThumbWrap, idx === 0 ? { marginLeft: 0 } : null]}>
                  <Pressable onPress={() => setPhotoViewer({ uri: m.uri })} style={styles.mediaThumb}>
                    <Image source={{ uri: m.uri }} style={styles.mediaThumbImg} />
                  </Pressable>
                  <View style={styles.mediaKindBadge}>
                    <Text style={styles.mediaKindBadgeText}>{m.kind === "photo" ? "Фото" : "Видео"}</Text>
                  </View>
                  <TouchableOpacity style={styles.mediaRemoveBtn} activeOpacity={0.9} onPress={() => removeMedia(m.uri)}>
                    <Text style={{ color: "#fff", fontWeight: "900" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.label}>Описание</Text>
            <TextInput
              style={[styles.input, { minHeight: 92 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Опишите услугу и важные детали"
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.label}>Формат работы</Text>
            <TouchableOpacity style={styles.pickerLine} activeOpacity={0.9} onPress={pickAddressMode}>
              <Text style={styles.pickerVal}>{addressMode}</Text>
              <Text style={styles.pickerArr}>▾</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Локация</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Адрес / район / ориентир"
              autoCorrect={false}
              autoCapitalize="sentences"
            />
            <Text style={styles.label}>Выезд</Text>
            <TouchableOpacity style={styles.pickerLine} activeOpacity={0.9} onPress={pickTravelMode}>
              <Text style={styles.pickerVal}>{travelMode}</Text>
              <Text style={styles.pickerArr}>▾</Text>
            </TouchableOpacity>
            <Text style={styles.labelSmall}>Доп. параметры</Text>
            <Row style={{ marginTop: 8, gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setContract((p) => (p === true ? null : true))}
                style={[styles.priceModeBtn, contract === true ? styles.priceModeBtnActive : null]}
              >
                <Text style={[styles.priceModeBtnText, contract === true ? styles.priceModeBtnTextActive : null]}>
                  Договор
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setWarranty((p) => (p === true ? null : true))}
                style={[styles.priceModeBtn, warranty === true ? styles.priceModeBtnActive : null]}
              >
                <Text style={[styles.priceModeBtnText, warranty === true ? styles.priceModeBtnTextActive : null]}>
                  Гарантия
                </Text>
              </TouchableOpacity>
            </Row>
            <Row style={{ marginTop: 10, gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setWorkWithLegal((p) => (p === true ? null : true))}
                style={[styles.priceModeBtn, workWithLegal === true ? styles.priceModeBtnActive : null]}
              >
                <Text
                  style={[styles.priceModeBtnText, workWithLegal === true ? styles.priceModeBtnTextActive : null]}
                >
                  Юр.лица
                </Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, { marginBottom: 0 }]}
                  value={minSumRub}
                  onChangeText={onChangeMinSum}
                  placeholder="Мин. сумма (₽)"
                  keyboardType="number-pad"
                  inputMode="numeric"
                />
              </View>
            </Row>
            <View style={{ height: 14 }} />
            <PrimaryButton title="Сохранить" variant="dark" onPress={save} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={!!localPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setLocalPicker(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject as any}
            activeOpacity={1}
            onPress={() => setLocalPicker(null)}
          />
          <View style={styles.sheetCard}>
            <Text style={{ fontWeight: "900", fontSize: 16, color: "#111" }}>
              {localPicker?.title ?? "Выбор"}
            </Text>
            <View style={{ height: 10 }} />
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {(localPicker?.options ?? []).map((option, index) => {
                const value = option ?? "";
                const active = value === (localPicker?.selected ?? "");
                return (
                  <TouchableOpacity
                    key={`${localPicker?.title}_${value}_${index}`}
                    activeOpacity={0.9}
                    style={[styles.sheetOption, active ? styles.sheetOptionActive : null]}
                    onPress={() => {
                      localPicker?.onPick(value);
                      setLocalPicker(null);
                    }}
                  >
                    <Text style={{ fontWeight: "900", color: "#111" }}>{value}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ height: 10 }} />
            <PrimaryButton title="Закрыть" variant="light" onPress={() => setLocalPicker(null)} />
          </View>
        </View>
      </Modal>
    </>
  );
};
/* =========================
   MyProfileScreen
========================= */
const MyProfileScreen = () => {
  const isPerformerModeOn = profileMode === "performer";
  const HY = "\u00AD";
  const savedServiceSourceIndexes = new Set(performerServices.map((ps) => ps.sourceIndex));

  const setQuickText = (idx: number, text: string) => {
    setQuickFields((prev) =>
      prev.map((x, i) =>
        i === idx ? { ...x, text, selectedCategory: undefined, selectedService: undefined } : x
      )
    );
  };

  const resetOtherSelectedQuickFields = (activeIdx: number) => {
    setQuickFields((prev) =>
      prev.map((x, i) => {
        if (i === activeIdx) return x;

        const hasSelectedService = !!x.selectedCategory && !!x.selectedService;

        if (!hasSelectedService) return x;

        return {
          text: "",
          selectedCategory: undefined,
          selectedService: undefined,
        };
      })
    );
  };

  const pickSuggestion = (idx: number, category: string, service: string) => {
    setQuickFields((prev) =>
      prev.map((x, i) =>
        i === idx ? { ...x, selectedCategory: category, selectedService: service } : x
      )
    );
  };
  const openSetupFromQuick = (idx: number) => {
    const q = quickFields[idx];
    setScreen({
      name: "performerServiceSetup",
      sourceIndex: idx,
      presetCategory: q.selectedCategory,
      presetService: q.selectedService,
    });
  };
  const deleteSavedService = (serviceConfig: PerformerServiceConfig) => {
  const deleteAction = () => {
    setPerformerServices((prev) => prev.filter((item) => item.id !== serviceConfig.id));

    if (serviceConfig.performerRecordId != null) {
      setPerformers((prev) => prev.filter((p) => p.id !== serviceConfig.performerRecordId));
    }

    setQuickFields((prev) =>
      prev.map((item, index) =>
        index === serviceConfig.sourceIndex
          ? {
              text: "",
              selectedCategory: undefined,
              selectedService: undefined,
            }
          : item
      )
    );
  };

  if (Platform.OS === "web") {
    const ok = (globalThis as any)?.confirm?.("Вы хотите удалить услугу?");
    if (ok) deleteAction();
    return;
  }

  Alert.alert("Удаление услуги", "Вы хотите удалить услугу?", [
    {
      text: "Нет",
      style: "cancel",
    },
    {
      text: "Да",
      style: "destructive",
      onPress: deleteAction,
    },
  ]);
};
  const onChangeAvatar = () => {
  if (!user) return;
  pickDeviceMedia({
    kind: "photo",
    limit: 1,
    onPicked: (items) => {
      const first = items[0];
      if (!first?.uri) return;
      const nextAvatarUri = first.uri;
      const fullName = `${user.firstName} ${user.lastName}`.trim();
      setUser((prev) => (prev ? { ...prev, avatarUri: nextAvatarUri } : prev));
      setEcoProfile({
        name: ecoProfile?.name || fullName || user.firstName,
        city: ecoProfile?.city || user.city,
        email: ecoProfile?.email || user.email,
        phoneMain: ecoProfile?.phoneMain || user.phone,
        phoneExtra: ecoProfile?.phoneExtra || user.extraPhone || "",
        address: ecoProfile?.address || user.address || "",
        avatarUri: nextAvatarUri,
      });
      setPerformers((prev) =>
        prev.map((p) => {
          const sameOwner = p.ownerUserId === user.id;
          const sameName = p.name.trim() === fullName;
          if (!sameOwner && !sameName) return p;
          return {
            ...p,
            avatarUri: nextAvatarUri,
          };
        })
      );
    },
  });
};
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={{ width: 96 }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={styles.headerTitle}>Мой профиль</Text>
        </View>
        <View
          style={{
            width: 96,
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          {user ? (
            <>
              <TouchableOpacity
                style={styles.headerIconBtn}
                activeOpacity={0.9}
                onPress={() => setScreen({ name: "notifications" })}
              >
                <Text style={styles.headerIconTxt}>🔔</Text>
                {unreadCount > 0 ? <View style={styles.redDot} /> : null}
              </TouchableOpacity>
              <View style={{ width: 10 }} />
              <TouchableOpacity
                style={styles.headerIconBtn}
                activeOpacity={0.9}
                onPress={() => setScreen({ name: "profileSettings" })}
              >
                <Text style={styles.headerIconTxt}>⚙️</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
      {returnToProject ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              const cid = returnToProject.circleId;
              setReturnToProject(null);
              setScreen({ name: "circleDetails", circleId: cid });
            }}
            style={styles.backToProjectBtn}
          >
            <Text style={styles.backToProjectBtnText}>назад в проект</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <ScrollView
        ref={(r) => {
          myProfileScrollRef.current = r;
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 180 }}
        keyboardShouldPersistTaps="always"
      >
        <Row style={{ marginTop: 0 }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setProfileMode("customer")}
            style={[styles.rolePill, profileMode === "customer" ? styles.rolePillActive : null]}
          >
            <Text style={[styles.rolePillText, profileMode === "customer" ? styles.rolePillTextActive : null]}>
              Я заказчик
            </Text>
          </TouchableOpacity>
          <View style={{ width: 10 }} />
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setProfileMode("performer")}
            style={[styles.rolePill, profileMode === "performer" ? styles.rolePillActiveGreen : null]}
          >
            <Text
              style={[
                styles.rolePillText,
                profileMode === "performer" ? styles.rolePillTextActiveGreen : null,
              ]}
            >
              Я исполнитель
            </Text>
          </TouchableOpacity>
        </Row>
        <View style={{ height: 12 }} />
        <Card>
          {user ? (
            <>
              <Row>
    <View style={styles.profileAvatarCol}>
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onChangeAvatar}
      style={[styles.avatarWrapBig, { marginRight: 0 }]}
    >
      {user.avatarUri ? <Image source={{ uri: user.avatarUri }} style={styles.avatarBig} /> : null}
      {/* ✅ иконка камеры по центру */}
      <View pointerEvents="none" style={styles.avatarCameraOverlay}>
        <Text style={styles.avatarCameraIcon}>📷</Text>
      </View>
    </TouchableOpacity>
  </View>
  <View style={{ flex: 1 }}>
    <Text style={{ fontWeight: "900", fontSize: 18, color: "#111" }}>
      {user.firstName} {user.lastName}
    </Text>
    <Text style={{ marginTop: 4, color: "#777", fontWeight: "800" }}>
      Город: {user.city}, район: {user.district}
    </Text>
  </View>
</Row>
              <View style={{ height: 12 }} />
              <Row style={{ gap: 10 }}>
                <View style={styles.statTile}>
                  <Text style={styles.statBig}>{user.doneOrders}</Text>
                  <Text style={styles.statSmall}>{`выпол${HY}ненных за${HY}казов`}</Text>
                </View>
                <Pressable style={styles.statTile} onPress={() => setScreen({ name: "myReviews", role: profileMode })}>
                  <Text style={styles.statBig}>{user.ratingAsPerformer.toFixed(1)}</Text>
                  <Text style={styles.statSmall}>
                    {isPerformerModeOn ? `оценки за${HY}казчиков` : `оценки испол${HY}нителей`}
                    {"\n"}
                    <Text style={styles.readGreen}>читать ›</Text>
                  </Text>
                </Pressable>
                <View style={styles.statTile}>
                  <Text style={styles.statBig}>{formatServiceAge(user.createdAt)}</Text>
                  <Text style={styles.statSmall}>в сервисе</Text>
                </View>
              </Row>
              {isPerformerModeOn ? (
                <>
                  <View style={{ height: 12 }} />
                  <Text style={styles.label}>О себе</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 92 }]}
                    value={performerAbout}
                    onChangeText={setPerformerAbout}
                    placeholder="Краткий комментарий чем вы полезны и какой у вас опыт"
                    placeholderTextColor="#666"
                    multiline
                    textAlignVertical="top"
                    autoCorrect={true}
                    autoCapitalize="sentences"
                    blurOnSubmit={false}
                  />
                </>
              ) : null}
              {isPerformerModeOn ? (
                <>
                  <View style={{ height: 14 }} />
                  <Row style={{ alignItems: "center" }}>
                    <Text style={{ fontWeight: "900", color: "#111" }}>Добавьте услуги</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={{ color: "#111", fontWeight: "900", fontSize: 16 }}>*</Text>
                  </Row>
                  <View style={{ height: 10 }} />
                  {quickFields.map((q, idx) => {
  if (savedServiceSourceIndexes.has(idx)) return null;

  const suggestions = buildSuggestions(q.text);
  const selectedLabel =
    q.selectedCategory && q.selectedService
      ? `${q.selectedCategory} • ${q.selectedService}`
      : "";

  return (
    <View
      key={"qf_" + idx}
      style={{ marginBottom: 14 }}
      onLayout={(e) => {
        myProfileQuickFieldY.current[idx] = e.nativeEvent.layout.y;
      }}
    >
      {selectedLabel ? (
        <>
          <PrimaryButton
            title="Продолжить"
            variant="dark"
            onPress={() => openSetupFromQuick(idx)}
          />

          <View style={{ height: 10 }} />

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 }}>
            <Pill text="Выбрано" tone="green" />
            <Text style={{ fontWeight: "900", color: "#111", flex: 1 }} numberOfLines={2}>
              {selectedLabel}
            </Text>
          </View>
        </>
      ) : null}

      <TextInput
  style={[styles.input, styles.quickServiceInput]}
  value={q.text}
  onChangeText={(t) => setQuickText(idx, t)}
  onFocus={() => {
    resetOtherSelectedQuickFields(idx);
    scrollProfileQuickFieldIntoView(idx);
  }}
  placeholder="Например: уборка офиса / ремонт авто / репетитор по математике"
  placeholderTextColor="#A0A4AD"
  autoCorrect={true}
  autoCapitalize="sentences"
  blurOnSubmit={false}
/>

      {suggestions.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {suggestions.map((sug, j) => {
            const active =
              q.selectedCategory === sug.category && q.selectedService === sug.service;

            return (
              <TouchableOpacity
                key={`${sug.category}_${sug.service}_${j}`}
                activeOpacity={0.9}
                onPress={() => pickSuggestion(idx, sug.category, sug.service)}
                style={[styles.suggestBtn, active ? styles.suggestBtnActive : null]}
              >
                <Text
                  style={[styles.suggestBtnText, active ? styles.suggestBtnTextActive : null]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {sug.category} • {sug.service}
                </Text>
              </TouchableOpacity>
            );
          })}
         </View>
) : null}

<View style={{ height: 10 }} />

                      </View>
                    );
                  })}
                  {performerServices.length ? (
                    <>
                      <View style={{ height: 6 }} />
                      <Text style={{ fontWeight: "900", color: "#111" }}>Сохранённые услуги</Text>
                      <View style={{ height: 10 }} />
                      {performerServices
                        .slice()
                        .sort((a, b) => a.sourceIndex - b.sourceIndex)
                        .map((ps) => (
                          <View key={ps.id} style={styles.savedServiceRow}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={{ fontWeight: "900", color: "#111" }} numberOfLines={1}>
                                {ps.service || "—"}
                              </Text>
                              <Text style={{ marginTop: 4, color: "#666", fontWeight: "800" }} numberOfLines={2}>
                                {ps.category || "—"} • {ps.priceIsFrom ? "от " : ""}
                                {ps.priceRub ? money(parseInt(ps.priceRub, 10) || 0) : "—"} • {ps.costType || "—"}
                              </Text>
                            </View>
                            <View style={styles.savedServiceActions}>
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={() => deleteSavedService(ps)}
    style={styles.savedServiceDeleteBtn}
  >
    <Text style={styles.savedServiceDeleteText}>✕</Text>
  </TouchableOpacity>

  <TouchableOpacity
    activeOpacity={0.9}
    onPress={() =>
      setScreen({
        name: "performerServiceSetup",
        sourceIndex: ps.sourceIndex,
        presetCategory: ps.category,
        presetService: ps.service,
      })
    }
    style={styles.savedServiceEditBtn}
  >
    <Text style={{ fontWeight: "900", color: "#111" }}>✎</Text>
  </TouchableOpacity>
</View>
                          </View>
                        ))}
                    </>
                  ) : null}
                </>
              ) : null}
              <View style={{ height: 14 }} />
              <View style={styles.profileLine}>
                <Text style={styles.profileLineLeft}>Финансы</Text>
                <Text style={styles.profileLineRight}>{money(1250)}</Text>
              </View>
              <View style={styles.profileDivider} />
              <View style={styles.profileLine}>
                <Text style={styles.profileLineLeft}>Бонусы</Text>
                <Text style={styles.profileLineRight}>320</Text>
              </View>
              <View style={styles.profileDivider} />
              <View style={styles.profileLine}>
                <Text style={styles.profileLineLeft}>Заказы (выполнено)</Text>
                <Text style={styles.profileLineRight}>0</Text>
              </View>
              <View style={{ height: 16 }} />
              <PrimaryButton
                title="Перейти к текущим заказам"
                variant="green"
                onPress={() => setScreen({ name: "deals" })}
              />
              <View style={{ height: 10 }} />
              <PrimaryButton
  title="Выйти"
  variant="light"
  onPress={() => {
    // ✅ Полный выход из аккаунта СделайЗА + экосистемы
    setUser(null);
    setEcoProfile(null);

    // ✅ Возвращаем стандартный режим
    setProfileMode("customer");
    setReturnToProject(null);
    setTab("search");
    setScreen({ name: "home" });

    // ✅ Чистим поля авторизации
    setAuthName("");
    setAuthEmail("");
    setPhone("+7");
    setCode("");
    afterAuthRef.current = null;

    // ✅ Уведомление работает и на Web, и на мобильной версии
    if (Platform.OS === "web") {
      (globalThis as any)?.alert?.("Вы вышли из аккаунта.");
    } else {
      Alert.alert("Выход", "Вы вышли из аккаунта.");
    }
  }}
/>
            </>
          ) : (
            <>
              <Text style={{ fontWeight: "900", color: "#111" }}>Вы не вошли</Text>
              <Text style={{ color: "#666", fontWeight: "800", marginTop: 6 }}>
                Зарегистрируйтесь, чтобы создавать сделки и чат.
              </Text>
              <View style={{ height: 12 }} />
              <PrimaryButton title="Регистрация" variant="dark" onPress={() => requireAuth("customer", () => {})} />
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
/* =========================
   BottomTabs (общие табы)
========================= */
const BottomTabs = () => {
  const safe = useSafeAreaInsets();
  const goTab = (t: Tab) => {
    if (t === "circles" && profileMode !== "customer") {
      Alert.alert("Доступ", "Вы можете добавить свой проект, если вы заказчик, перейдите в профиль и поменяйте свой статус.");
      return;
    }
    setTab(t);
    if (t === "search") setScreen({ name: "home" });
    if (t === "favorites") setScreen({ name: "favorites" });
    if (t === "circles") setScreen({ name: "circles" });
    if (t === "deals") setScreen({ name: "deals" });
    if (t === "profile") setScreen({ name: "myProfile" });
  };
  const getTabTone = (id: Tab) => {
  return tab === id ? "active" : "inactive";
};
  const TabBtn = ({
    id,
    icon,
    label,
    badge,
    isSearch,
    isCenter,
    iconTextStyle,
  }: {
    id: Tab;
    icon?: string;
    label: string;
    badge?: number;
    isSearch?: boolean;
    isCenter?: boolean;
    iconTextStyle?: any;
  }) => {
    const tone = getTabTone(id);
    const inactiveColor = "#9AA0A6";
    const activeColor = GREEN;
    const iconOpacity = tone === "active" ? 1 : 0.35;
    const textColor = tone === "active" ? activeColor : inactiveColor;
    const isCircles = id === "circles";
    const isCirclesActive = isCircles && tone === "active";
    return (
      <TouchableOpacity style={[styles.tabBtn, isCenter ? styles.tabBtnCenter : null]} onPress={() => goTab(id)} activeOpacity={0.9}>
        <View style={[styles.tabIconWrap, isCenter ? styles.tabIconWrapCenter : null]}>
          {isSearch ? (
            <Text style={[styles.zaBig, { color: tone === "active" ? activeColor : inactiveColor }]}>За</Text>
          ) : (
            <>
              {isCenter && isCircles ? (
                <View style={styles.circlesCenterIconWrap}>
                  {/* круг/иконка такая же как в неактиве */}
                  <Text style={[styles.tabIconTxt, iconTextStyle, styles.tabIconTxtCenter, { color: isCirclesActive ? GREEN : inactiveColor }]}>{icon}</Text>
                  {/* при активе появляются 3 точки "треугольником" */}
                  {isCirclesActive ? (
                    <>
                      <View style={styles.circlesActiveDotTop} />
                      <View style={styles.circlesActiveDotLeft} />
                      <View style={styles.circlesActiveDotRight} />
                    </>
                  ) : null}
                </View>
              ) : (
                <Text
                  style={[
                    styles.tabIconTxt,
                    iconTextStyle,
                    isCenter ? styles.tabIconTxtCenter : null,
                    {
                      opacity: isCenter ? 1 : iconOpacity,
                      color: isCenter ? (tone === "active" ? GREEN : inactiveColor) : undefined,
                    },
                  ]}
                >
                  {icon}
                </Text>
              )}
              {badge && badge > 0 ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeTxt}>{badge}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
        {/* ✅ центральная вкладка без подписи */}
        <Text style={[styles.tabLabelText, { color: textColor, opacity: isCenter ? 0 : 1 }]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };
  return (
    <SafeAreaView pointerEvents="box-none" style={styles.tabSafeArea}>
      <View style={[styles.tabBar, { paddingBottom: safe.bottom, height: 64 + safe.bottom }]}>
        <TabBtn id="search" label="Поиск" isSearch />
        <TabBtn id="favorites" icon="❤️" label="Избранное" />
        <TabBtn id="circles" icon={"⦿"} label="" isCenter iconTextStyle={styles.tabIconCircles} />
        <TabBtn id="deals" icon="🤝" label="Мои сделки" iconTextStyle={styles.tabIconDeals} />
        <TabBtn id="profile" icon="👤" label="Профиль" badge={unreadCount} />
      </View>
    </SafeAreaView>
  );
}
/* =========================
   Missing screens/components
========================= */
const CirclesScreen = () => {
  const safe = useSafeAreaInsets();
  const initialCity = user?.city || filters.city || defaultFilters.city;
  const initialDistrict = user?.district || getDistrictsByCity(initialCity)[0] || "Центральный";
  const [title, setTitle] = useState("");
const [fullText, setFullText] = useState("");
const [city, setCity] = useState(initialCity);
const [district, setDistrict] = useState(initialDistrict);
const [selectedWorks, setSelectedWorks] = useState<Set<string>>(new Set());

// ✅ ДОБАВИТЬ:
const [address, setAddress] = useState(user?.address || "");

const [addressFocused, setAddressFocused] = useState(false);
const [localPicker, setLocalPicker] = useState<null | {
    title: string;
    options: string[];
    selected?: string;
    onPick: (v: string) => void;
  }>(null);
  const openLocalPicker = (
    title: string,
    options: string[],
    selected: string | undefined,
    onPick: (v: string) => void
  ) => {
    setLocalPicker({ title, options, selected, onPick });
  };
  const districts = useMemo(() => getDistrictsByCity(city || initialCity), [city, initialCity]);
  const addressSuggestions = useMemo(() => {
    const cityValue = city.trim();
    const q = address.trim();
    if (!cityValue || !q) return [];
    return suggestAddresses(cityValue, q);
  }, [city, address]);
  useEffect(() => {
    if (!districts.includes(district)) {
      setDistrict(districts[0] || "Центральный");
    }
  }, [districts, district]);
  const myProjects = useMemo(() => {
    if (!user) return [];
    return circleProjects.filter((p) => p.customerId === user.id);
  }, [circleProjects, user]);
  const toggleWork = (value: string) => {
    setSelectedWorks((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };
  const submit = () => {
    const run = () => {
      const titleTrim = title.trim();
      const cityTrim = city.trim();
      const districtTrim = district.trim();
      const addressTrim = address.trim();
      if (!titleTrim) return Alert.alert("Ошибка", "Введите название проекта.");
      if (!cityTrim) return Alert.alert("Ошибка", "Выберите город.");
      if (!districtTrim) return Alert.alert("Ошибка", "Выберите район.");
      if (!addressTrim) return Alert.alert("Ошибка", "Введите адрес.");
      const chips: CircleWorkChip[] = Array.from(selectedWorks).map((w) => ({
        id: "cw_" + uid(),
        title: w,
      }));
      const created = createCircleProject({
        title: titleTrim,
        fullText: fullText.trim(),
        city: cityTrim,
        district: districtTrim,
        address: addressTrim,
        chips,
        imageUri: undefined,
      });
      if (!created) return;
      setTitle("");
      setFullText("");
      setCity(initialCity);
      setDistrict(initialDistrict);
      setAddress(user?.address || "");
      setSelectedWorks(new Set());
      setAddressFocused(false);
      setTab("circles");
      setScreen({ name: "circleDetails", circleId: created.id });
    };
    requireAuth("customer", run);
  };
  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.circlesSubtitle}>Создайте проект и соберите команду</Text>
          <View style={{ height: 10 }} />
          <Card>
            <Text style={styles.label}>Название проекта</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Например: ремонт квартиры под ключ"
            />
            <Text style={styles.label}>Описание</Text>
            <TextInput
              style={[styles.input, { minHeight: 92 }]}
              value={fullText}
              onChangeText={setFullText}
              placeholder="Опишите задачу и важные детали"
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.label}>Город</Text>
            <TouchableOpacity
              style={styles.pickerLine}
              activeOpacity={0.9}
              onPress={() =>
                openLocalPicker("Город", RUS_CITIES, city, (v) => {
                  setCity(v);
                  setDistrict(getDistrictsByCity(v)[0] || "Центральный");
                })
              }
            >
              <Text style={styles.pickerVal}>{city}</Text>
              <Text style={styles.pickerArr}>▾</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Район</Text>
            <TouchableOpacity
              style={styles.pickerLine}
              activeOpacity={0.9}
              onPress={() => openLocalPicker("Район", districts, district, (v) => setDistrict(v))}
            >
              <Text style={styles.pickerVal}>{district || "Выберите район"}</Text>
              <Text style={styles.pickerArr}>▾</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Адрес</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              onFocus={() => setAddressFocused(true)}
              onBlur={() => setTimeout(() => setAddressFocused(false), 120)}
              placeholder="Укажите адрес"
              autoCorrect={false}
              autoCapitalize="sentences"
            />
            {addressFocused && addressSuggestions.length ? (
              <View style={styles.addrSuggestBox}>
                {addressSuggestions.map((item, index) => (
                  <Pressable
                    key={`circle_address_${item}_${index}`}
                    style={styles.addrSuggestRow}
                    onPress={() => {
                      setAddress(item);
                      setAddressFocused(false);
                    }}
                  >
                    <Text style={styles.addrSuggestText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.label}>Нужны специалисты</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CIRCLE_WORK_SUGGESTIONS.map((item) => {
                const active = selectedWorks.has(item);
                return (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.9}
                    onPress={() => toggleWork(item)}
                    style={[styles.circleChip, active ? styles.circleChipActive : null]}
                  >
                    <Text style={[styles.circleChipText, active ? styles.circleChipTextActive : null]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: 14 }} />
            <PrimaryButton title="Создать проект" variant="dark" onPress={submit} />
          </Card>
          <Card>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.myProjectsBtn}
              onPress={() => {
                if (!myProjects.length) {
                  Alert.alert("Мои проекты", "У вас пока нет проектов.");
                  return;
                }
                setScreen({ name: "circleDetails", circleId: myProjects[0].id });
              }}
            >
              <Text style={styles.myProjectsBtnText}>Мои проекты</Text>
              <Text style={styles.myProjectsBtnArrow}>›</Text>
            </TouchableOpacity>
            <View style={{ height: 12 }} />
            {myProjects.length ? (
              myProjects.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.9}
                  onPress={() => setScreen({ name: "circleDetails", circleId: p.id })}
                  style={[styles.circleRow, { marginBottom: 10 }]}
                >
                  <View style={styles.circleRowImg}>
                    <Text style={{ fontSize: 20 }}>🏗️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "900", color: "#111" }} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={{ marginTop: 4, color: "#666", fontWeight: "800" }} numberOfLines={2}>
                      {p.city}, {p.district} • {p.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: "#666", fontWeight: "800" }}>Пока нет созданных проектов.</Text>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={!!localPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setLocalPicker(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject as any}
            activeOpacity={1}
            onPress={() => setLocalPicker(null)}
          />
          <View style={styles.sheetCard}>
            <Text style={{ fontWeight: "900", fontSize: 16, color: "#111" }}>
              {localPicker?.title ?? "Выбор"}
            </Text>
            <View style={{ height: 10 }} />
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {(localPicker?.options ?? []).map((option, index) => {
                const value = option ?? "";
                const active = value === (localPicker?.selected ?? "");
                return (
                  <TouchableOpacity
                    key={`${localPicker?.title}_${value}_${index}`}
                    activeOpacity={0.9}
                    style={[styles.sheetOption, active ? styles.sheetOptionActive : null]}
                    onPress={() => {
                      localPicker?.onPick(value);
                      setLocalPicker(null);
                    }}
                  >
                    <Text style={{ fontWeight: "900", color: "#111" }}>{value}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ height: 10 }} />
            <PrimaryButton title="Закрыть" variant="light" onPress={() => setLocalPicker(null)} />
          </View>
        </View>
      </Modal>
    </>
  );
};
const CircleDetailsScreen = ({ circleId }: { circleId: string }) => {
  const safe = useSafeAreaInsets();
  useEffect(() => {
    ensureCircleStage(circleId);
  }, [circleId]);
  const project = circleProjects.find((x) => x.id === circleId);
  const stage = circleStagesById[circleId];
  const matchedPerformers = useMemo(() => {
    if (!project) return [];
    return performers.filter((pf) => {
      if (pf.city !== project.city) return false;
      const mode = pf.workAreaMode ?? "district_only";
      return mode === "city_all" || pf.district === project.district;
    });
  }, [performers, project]);
  const roughPerformers = useMemo(() => matchedPerformers.slice(0, 8), [matchedPerformers]);
  const finishPerformers = useMemo(() => matchedPerformers.slice(0, 4), [matchedPerformers]);
const openProject = () => {
  if (!project) return;
  if (!stage) return;
  if (!matchedPerformers.length) {
    Alert.alert("Исполнители", "Пока нет подходящих исполнителей для этого проекта.");
    return;
  }
  const performerId = stage.escrow.performerId ?? matchedPerformers[0].id;
  setCircleStagesById((prev) => {
    const current = prev[circleId];
    if (!current) return prev;
    return {
      ...prev,
      [circleId]: {
        ...current,
        escrow: {
          ...current.escrow,
          performerId,
        },
      },
    };
  });
  setScreen({ name: "projectActive", circleId });
};
  
  if (!project) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }}>
        <Card>
          <Text style={{ fontWeight: "900", color: "#111" }}>Проект не найден</Text>
        </Card>
      </ScrollView>
    );
  }
  if (!stage) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }}>
        <Card>
          <Text style={{ fontWeight: "900", color: "#111" }}>Загрузка проекта…</Text>
        </Card>
      </ScrollView>
    );
  }
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <Text style={{ fontWeight: "900", fontSize: 18, color: "#111" }}>{project.title}</Text>
        <Text style={{ marginTop: 6, color: "#666", fontWeight: "800" }}>
          {project.city}, {project.district}
        </Text>
        <Text style={{ marginTop: 4, color: "#666", fontWeight: "800" }}>{project.address}</Text>
        {project.fullText ? (
          <Text style={{ marginTop: 10, color: "#111", fontWeight: "800" }}>{project.fullText}</Text>
        ) : null}
        {project.chips.length ? (
          <>
            <View style={{ height: 10 }} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {project.chips.map((chip) => (
                <View key={chip.id} style={styles.circleChip}>
                  <Text style={styles.circleChipText}>{chip.title}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </Card>
      <Card>
        <View style={styles.circleVisualWrap}>
          <View style={styles.circleRingsWrap}>
            <View style={styles.ringOuter}>
              <Text style={styles.ringLabelTop}>Черновая</Text>
              <View style={styles.ringOuterAvatars}>
                {roughPerformers.length ? (
                  roughPerformers.map((p) => (
                    <View key={`rough_${p.id}`} style={styles.ringAvatarBubble}>
                      {p.avatarUri ? <Image source={{ uri: p.avatarUri }} style={styles.ringAvatarImg} /> : null}
                    </View>
                  ))
                ) : (
                  <Text style={{ color: "#666", fontWeight: "800" }}>Нет откликов</Text>
                )}
              </View>
              <View style={styles.ringMiddle}>
                <Text style={styles.ringLabelBottom}>Чистовая</Text>
                <View style={styles.ringMiddleAvatars}>
                  {finishPerformers.length ? (
                    finishPerformers.map((p) => (
                      <View key={`finish_${p.id}`} style={styles.ringAvatarBubble}>
                        {p.avatarUri ? <Image source={{ uri: p.avatarUri }} style={styles.ringAvatarImg} /> : null}
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: "#666", fontWeight: "800" }}>Нет откликов</Text>
                  )}
                </View>
                <View style={styles.ringCenter}>
                  <Text style={styles.ringCenterTitle}>Проект</Text>
                  <Text style={styles.ringCenterSub} numberOfLines={3}>
                    {project.title}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.circleVisualHint}>
            Подходящие исполнители распределены по этапам проекта
          </Text>
        </View>
        <View style={{ height: 14 }} />
        <PrimaryButton title="Открыть активный проект" variant="dark" onPress={openProject} />
      </Card>
    </ScrollView>
  );
};
const ProjectActiveScreen = ({ circleId }: { circleId: string }) => {
  const safe = useSafeAreaInsets();
  useEffect(() => {
    ensureCircleStage(circleId);
  }, [circleId]);
  const project = circleProjects.find((x) => x.id === circleId);
  const stage = circleStagesById[circleId];
  const matchedPerformers = useMemo(() => {
    if (!project) return [];
    return performers.filter((pf) => {
      if (pf.city !== project.city) return false;
      const mode = pf.workAreaMode ?? "district_only";
      return mode === "city_all" || pf.district === project.district;
    });
  }, [performers, project]);
  const performer =
    performers.find((x) => x.id === stage?.escrow.performerId) || matchedPerformers[0] || null;
  const [arbOpen, setArbOpen] = useState(false);
  if (!project || !stage) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }}>
        <Card>
          <Text style={{ fontWeight: "900", color: "#111" }}>Проект не найден</Text>
        </Card>
      </ScrollView>
    );
  }
  const escrow = stage.escrow;
  const projectOrderId = projectChatOrderByCircle[circleId];
  const updateStage = (updater: (current: typeof stage) => typeof stage) => {
    setCircleStagesById((prev) => {
      const current = prev[circleId];
      if (!current) return prev;
      return {
        ...prev,
        [circleId]: updater(current),
      };
    });
  };
  const openProjectChat = () => {
  openCircleChat(circleId);
};
  const progressParts = [
    escrow.stage1Paid,
    escrow.stage1Released,
    escrow.stage2Paid,
    escrow.stage2Released,
  ].filter(Boolean).length;
  const progressPct = (progressParts / 4) * 100;
  const customerVotes =
    escrow.arbitration.votesCustomer +
    escrow.arbitration.expertVotes.filter((x) => x === "customer").length;
  const performerVotes =
    escrow.arbitration.votesPerformer +
    escrow.arbitration.expertVotes.filter((x) => x === "performer").length;
  const votesTotal = Math.max(1, customerVotes + performerVotes);
  const customerPct = Math.round((customerVotes / votesTotal) * 100);
  const performerPct = 100 - customerPct;
  const voteForCustomer = () => {
    updateStage((current) => {
      const experts = [...current.escrow.arbitration.expertVotes];
      const idx = experts.findIndex((x) => x === "pending");
      if (idx >= 0) experts[idx] = "customer";
      return {
        ...current,
        escrow: {
          ...current.escrow,
          arbitration: {
            ...current.escrow.arbitration,
            open: true,
            votesCustomer: current.escrow.arbitration.votesCustomer + 1,
            expertVotes: experts,
          },
        },
      };
    });
  };
  const voteForPerformer = () => {
    updateStage((current) => {
      const experts = [...current.escrow.arbitration.expertVotes];
      const idx = experts.findIndex((x) => x === "pending");
      if (idx >= 0) experts[idx] = "performer";
      return {
        ...current,
        escrow: {
          ...current.escrow,
          arbitration: {
            ...current.escrow.arbitration,
            open: true,
            votesPerformer: current.escrow.arbitration.votesPerformer + 1,
            expertVotes: experts,
          },
        },
      };
    });
  };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity activeOpacity={0.9} onPress={openProjectChat} style={styles.projectPinnedChatBtn}>
          <Text style={styles.projectPinnedChatBtnText}>
            {projectOrderId ? "Открыть чат проекта" : "Создать чат проекта"}
          </Text>
          <Text style={{ fontWeight: "900", color: "#111" }}>›</Text>
        </TouchableOpacity>
        <View style={{ height: 12 }} />
        <View style={styles.projectMasterCard}>
          <Row>
            <View style={styles.projectMasterAvatar}>
              {performer?.avatarUri ? (
                <Image source={{ uri: performer.avatarUri }} style={styles.projectMasterAvatarImg} />
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: "#111", fontSize: 16 }}>
                {performer?.name || "Исполнитель не назначен"}
              </Text>
              <Text style={{ marginTop: 4, color: "#666", fontWeight: "800" }}>
                {performer?.service || "Ожидание выбора исполнителя"}
              </Text>
            </View>
          </Row>
          <View style={{ height: 12 }} />
          <View style={styles.projectPayRow}>
            <Text style={styles.projectPayLeft}>Сумма проекта</Text>
            <Text style={[styles.projectPayRight, { color: "#111" }]}>{money(escrow.total)}</Text>
          </View>
          <View style={styles.projectPayRow}>
            <Text style={styles.projectPayLeft}>1 этап</Text>
            <Text style={[styles.projectPayRight, { color: escrow.stage1Released ? GREEN : "#111" }]}>
              {escrow.stage1Released ? "выплачен" : escrow.stage1Paid ? "оплачен" : "не оплачен"}
            </Text>
          </View>
          <View style={styles.projectPayRow}>
            <Text style={styles.projectPayLeft}>2 этап</Text>
            <Text style={[styles.projectPayRight, { color: escrow.stage2Released ? GREEN : "#111" }]}>
              {escrow.stage2Released ? "выплачен" : escrow.stage2Paid ? "оплачен" : "не оплачен"}
            </Text>
          </View>
          <View style={{ height: 10 }} />
          <View style={styles.escrowBarWrap}>
            <View style={[styles.escrowBarFill, { width: `${progressPct}%` }]} />
          </View>
        </View>
        <View style={styles.projectArchiveCard}>
          <Text style={{ fontWeight: "900", color: "#111", marginBottom: 10 }}>Документы</Text>
          {escrow.docs.map((doc) => (
            <View key={doc.id} style={styles.projectDocRow}>
              <Text style={styles.projectDocIcon}>📄</Text>
              <Text style={styles.projectDocTitle} numberOfLines={1}>
                {doc.title}
              </Text>
              <Pill
                text={
                  doc.status === "signed"
                    ? "Подписан"
                    : doc.status === "pending"
                    ? "На проверке"
                    : "Ожидает"
                }
                tone={doc.status === "signed" ? "green" : doc.status === "pending" ? "blue" : "gray"}
              />
            </View>
          ))}
        </View>
        <View style={styles.projectActionsCard}>
          <Text style={{ fontWeight: "900", color: "#111", marginBottom: 10 }}>Действия</Text>
          {!escrow.stage1Paid ? (
            <>
              <PrimaryButton
                title="Оплатить 1 этап"
                variant="green"
                onPress={() =>
                  updateStage((current) => ({
                    ...current,
                    escrow: { ...current.escrow, stage1Paid: true },
                  }))
                }
              />
              <View style={{ height: 10 }} />
            </>
          ) : null}
          {escrow.stage1Paid && !escrow.stage1Released ? (
            <>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.acceptWorkBigBtn}
                onPress={() =>
                  updateStage((current) => ({
                    ...current,
                    escrow: { ...current.escrow, stage1Released: true },
                  }))
                }
              >
                <Text style={styles.acceptWorkBigBtnText}>Принять 1 этап</Text>
              </TouchableOpacity>
              <View style={{ height: 10 }} />
            </>
          ) : null}
          {escrow.stage1Released && !escrow.stage2Paid ? (
            <>
              <PrimaryButton
                title="Оплатить 2 этап"
                variant="green"
                onPress={() =>
                  updateStage((current) => ({
                    ...current,
                    escrow: { ...current.escrow, stage2Paid: true },
                  }))
                }
              />
              <View style={{ height: 10 }} />
            </>
          ) : null}
          {escrow.stage2Paid && !escrow.stage2Released ? (
            <>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.acceptWorkBigBtn}
                onPress={() =>
                  updateStage((current) => ({
                    ...current,
                    escrow: { ...current.escrow, stage2Released: true },
                  }))
                }
              >
                <Text style={styles.acceptWorkBigBtnText}>Принять 2 этап</Text>
              </TouchableOpacity>
              <View style={{ height: 10 }} />
            </>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.openDisputeBtn}
            onPress={() => {
              updateStage((current) => ({
                ...current,
                escrow: {
                  ...current.escrow,
                  arbitration: {
                    ...current.escrow.arbitration,
                    open: true,
                  },
                },
              }));
              setArbOpen(true);
            }}
          >
            <Text style={styles.openDisputeBtnText}>Открыть арбитраж</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal visible={arbOpen} transparent animationType="fade">
        <View style={styles.arbBackdrop}>
          <View style={styles.arbCard}>
            <Text style={styles.arbTitle}>Арбитраж проекта</Text>
            <View style={{ height: 14 }} />
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.arbSideLabelLeft}>Заказчик</Text>
              <Text style={styles.arbSideLabelRight}>Исполнитель</Text>
            </Row>
            <View style={{ height: 8 }} />
            <View style={styles.arbBarWrap}>
              <View style={[styles.arbBarLeft, { width: `${customerPct}%` }]} />
              <View style={[styles.arbBarRight, { width: `${performerPct}%` }]} />
            </View>
            <Text style={styles.arbPercentText}>
              {customerPct}% / {performerPct}%
            </Text>
            <View style={{ height: 14 }} />
            <Text style={styles.arbExpertsTitle}>Эксперты</Text>
            <View style={{ height: 10 }} />
            <View style={styles.arbExpertsGrid}>
              {escrow.arbitration.expertVotes.map((vote, index) => (
                <View
                  key={`expert_${index}`}
                  style={[
                    styles.arbExpertAvatar,
                    vote === "customer"
                      ? styles.arbExpertGreen
                      : vote === "performer"
                      ? styles.arbExpertRed
                      : styles.arbExpertGray,
                  ]}
                >
                  <Text style={{ fontWeight: "900", color: "#111" }}>{index + 1}</Text>
                </View>
              ))}
            </View>
            <View style={{ height: 14 }} />
            <TouchableOpacity activeOpacity={0.9} style={styles.arbVoteBtn} onPress={voteForCustomer}>
              <Text style={styles.arbVoteBtnText}>Голос за заказчика</Text>
            </TouchableOpacity>
            <View style={{ height: 10 }} />
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.arbVoteBtn, { backgroundColor: "#FF3B30" }]}
              onPress={voteForPerformer}
            >
              <Text style={styles.arbVoteBtnText}>Голос за исполнителя</Text>
            </TouchableOpacity>
            <Text style={styles.arbHint}>Мок-логика для экрана проекта, чтобы не было падения и навигация работала.</Text>
            <TouchableOpacity activeOpacity={0.9} style={styles.arbCloseBtn} onPress={() => setArbOpen(false)}>
              <Text style={styles.arbCloseBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
const NotificationsScreen = () => {
  const safe = useSafeAreaInsets();
  const list = useMemo(() => {
    return notifications
      .filter((n) => n.userRoleTarget === profileMode)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [notifications, profileMode]);
  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };
  const markAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.userRoleTarget === profileMode ? { ...n, isRead: true } : n
      )
    );
  };
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingTop: 16 + safe.top + 6, paddingBottom: 180 }}
      keyboardShouldPersistTaps="handled"
    >
      <Row style={{ marginBottom: 10 }}>
        <Title>Уведомления</Title>
        <View style={{ flex: 1 }} />
        {!!list.length ? (
          <TouchableOpacity activeOpacity={0.9} onPress={markAllRead}>
            <Text style={styles.readGreen}>Прочитать все</Text>
          </TouchableOpacity>
        ) : null}
      </Row>
      {list.length ? (
        list.map((n) => (
          <TouchableOpacity
            key={n.id}
            activeOpacity={0.9}
            onPress={() => {
              markRead(n.id);
              if (n.meta?.type === "circle_invite") {
                setTab("circles");
                setScreen({ name: "circleDetails", circleId: n.meta.circleId });
              }
            }}
            style={[
              styles.card,
              {
                borderWidth: n.isRead ? 0 : 1.5,
                borderColor: n.isRead ? "transparent" : GREEN,
              },
            ]}
          >
            <Row style={{ alignItems: "flex-start" }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontWeight: "900", color: "#111" }}>{n.title}</Text>
                <Text style={{ marginTop: 6, color: "#666", fontWeight: "800" }}>{n.text}</Text>
                <Text style={{ marginTop: 8, color: "#999", fontWeight: "800", fontSize: 12 }}>
                  {formatChatDateRU(n.createdAt)} • {formatTimeHHMM(n.createdAt)}
                </Text>
              </View>
              {!n.isRead ? <View style={styles.redDot} /> : null}
            </Row>
          </TouchableOpacity>
        ))
      ) : (
        <Card>
          <Text style={{ color: "#666", fontWeight: "800" }}>Пока нет уведомлений.</Text>
        </Card>
      )}
    </ScrollView>
  );
};
const ProjectTabs = ({
  circleId,
  active,
}: {
  circleId: string;
  active: "project" | "chat";
}) => {
  const safe = useSafeAreaInsets();
  const openProjectTab = () => {
    openCircleActive(circleId);
  };
  const openChatTab = () => {
    openCircleChat(circleId);
  };
  const labelColor = (key: "project" | "chat") => (active === key ? GREEN : "#9AA0A6");
  return (
    <SafeAreaView pointerEvents="box-none" style={styles.projectTabSafeArea}>
      <View style={[styles.projectTabBar, { paddingBottom: safe.bottom, height: 64 + safe.bottom }]}>
        <TouchableOpacity style={styles.projectTabBtn} activeOpacity={0.9} onPress={openProjectTab}>
          <Text style={[styles.projectTabIcon, { color: labelColor("project") }]}>🏗️</Text>
          <Text style={[styles.projectTabLabel, { color: labelColor("project") }]}>Проект</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.projectTabBtn} activeOpacity={0.9} onPress={openChatTab}>
          <Text style={[styles.projectTabIcon, { color: labelColor("chat") }]}>💬</Text>
          <Text style={[styles.projectTabLabel, { color: labelColor("chat") }]}>Чат</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
/* =========================
   render()
========================= */
const render = () => {
  if (screen.name === "home") {
  return (
    <HomeScreenView
      filters={filters}
      setFilters={setFilters}
      setFiltersDraft={setFiltersDraft}
      setPriceFromText={setPriceFromText}
      setPriceToText={setPriceToText}
      trendingServices={trendingServices}
      topPerformers={topPerformers}
      favPerformers={favPerformers}
      subServices={subServices}
      toggleFav={toggleFav}
      toggleSubService={toggleSubService}
      requireAuth={requireAuth}
      passportUploadedFlag={passportUploadedFlag}
      profileMode={profileMode}
      setScreen={setScreen}
      onBackToEcosystem={onBackToEcosystem}
    />
  );
}

  if (screen.name === "filters" || screen.name === "needHelper")
    return (
      <NeedHelperScreenView
        showHeader={showHeader}
        filters={filters}
        setFilters={setFilters}
        filtersDraft={filtersDraft}
        setFiltersDraft={setFiltersDraft}
        priceFromText={priceFromText}
        setPriceFromText={setPriceFromText}
        priceToText={priceToText}
        setPriceToText={setPriceToText}
        openPicker={openPicker}
        user={user}
        customerRequests={customerRequests}
        setCustomerRequests={setCustomerRequests}
        performers={performers}
        setNotifications={setNotifications}
        setScreen={setScreen}
      />
    );

  if (screen.name === "helpCategory") return <HelpCategoryScreen category={screen.category} />;
  if (screen.name === "performersList") return <PerformersListScreen category={screen.category} serviceName={screen.serviceName} />;

  if (screen.name === "performerProfile")
    return (
      <PerformerProfileScreen
        performerId={screen.performerId}
        category={screen.category}
        serviceName={screen.serviceName}
        performers={performers}
        performerServices={performerServices}
        passportUploadedFlag={passportUploadedFlag}
        demoWorkPhotos={demoWorkPhotos}
        requireAuth={requireAuth}
        setScreen={setScreen}
        setPhotoViewer={setPhotoViewer}
      />
    );

  if (screen.name === "reviews") return <ReviewsScreen performerId={screen.performerId} />;
  if (screen.name === "myReviews") return <MyReviewsScreen role={screen.role} />;

  if (screen.name === "becomePerformer")
    return (
      <BecomePerformerScreenView
        showHeader={showHeader}
        user={user}
        filters={filters}
        customerRequests={customerRequests}
        performers={performers}
        openPicker={openPicker}
        perfName={perfName}
        setPerfName={setPerfName}
        perfDesc={perfDesc}
        setPerfDesc={setPerfDesc}
        perfCategory={perfCategory}
        setPerfCategory={setPerfCategory}
        perfService={perfService}
        setPerfService={setPerfService}
        perfPriceText={perfPriceText}
        setPerfPriceText={setPerfPriceText}
        perfPriceIsFrom={perfPriceIsFrom}
        setPerfPriceIsFrom={setPerfPriceIsFrom}
        matchedCustomersOpen={matchedCustomersOpen}
        setMatchedCustomersOpen={setMatchedCustomersOpen}
        matchedCustomers={matchedCustomers}
        setMatchedCustomers={setMatchedCustomers}
        setNotifications={setNotifications}
      />
    );

  if (screen.name === "confirmOrder")
    return (
      <ConfirmOrderScreenView
        showHeader={showHeader}
        s={screen}
        performers={performers}
        createOrder={createOrder}
        openChatForOrder={openChatForOrder}
        setScreen={setScreen}
      />
    );

  if (screen.name === "orderSuccess") return <DealsScreen />;

  if (screen.name === "chat")
    return (
      <ChatScreenView
        orderId={screen.orderId}
        chats={chats}
        setChats={setChats}
        orders={orders}
        performers={performers}
        user={user}
        profileMode={profileMode}
        performerServices={performerServices}
        pickDeviceMedia={pickDeviceMedia}
        openPerformerProfile={(performerId) => {
          const p = performers.find((x) => x.id === performerId);
          if (!p) return;
          setScreen({ name: "performerProfile", performerId: p.id, category: p.category, serviceName: p.service });
        }}
        onArchiveDeal={() => archiveDealById(screen.orderId)}
        pushChatNotification={pushChatNotification}
        getDealStage={getDealStage}
        setDealStage={setDealStage}
        setOrderStatus={setOrderStatus}
        notifyAdminDispute={notifyAdminDispute}
      />
    );

  if (screen.name === "projectChat")
    return (
      <ChatScreenView
        orderId={screen.orderId}
        chats={chats}
        setChats={setChats}
        orders={orders}
        performers={performers}
        user={user}
        profileMode={profileMode}
        performerServices={performerServices}
        pickDeviceMedia={pickDeviceMedia}
        openPerformerProfile={(performerId) => {
          const p = performers.find((x) => x.id === performerId);
          if (!p) return;
          setScreen({ name: "performerProfile", performerId: p.id, category: p.category, serviceName: p.service });
        }}
        onArchiveDeal={() => archiveDealById(screen.orderId)}
        pushChatNotification={pushChatNotification}
        getDealStage={getDealStage}
        setDealStage={setDealStage}
        setOrderStatus={setOrderStatus}
        notifyAdminDispute={notifyAdminDispute}
        bottomOverlayInset={64}
      />
    );

  if (screen.name === "favorites") return <FavoritesScreen />;
  if (screen.name === "deals") return <DealsScreen />;
  if (screen.name === "messages") return <MessagesScreen />;
  if (screen.name === "circles") return <CirclesScreen />;
  if (screen.name === "circleDetails") return <CircleDetailsScreen circleId={screen.circleId} />;
  if (screen.name === "projectActive") return <ProjectActiveScreen circleId={screen.circleId} />;
  if (screen.name === "myProfile") return MyProfileScreen();

  if (screen.name === "profileSettings")
    return (
      <ProfileSettingsScreen
        user={user}
        profileMode={profileMode}
        requireAuth={requireAuth}
        setScreen={setScreen}
        setCallsAnyTime={setCallsAnyTime}
        setCallsEveryDay={setCallsEveryDay}
        setUser={setUser}
        pickDeviceMedia={pickDeviceMedia}
        passportPhoto1={passportPhoto1}
        passportPhoto2={passportPhoto2}
        setPassportPhoto1={setPassportPhoto1}
        setPassportPhoto2={setPassportPhoto2}
        suggestAddresses={suggestAddresses}
      />
    );

  if (screen.name === "notifications") return <NotificationsScreen />;

  if (screen.name === "performerServiceSetup") {
    return (
      <PerformerServiceSetupScreen
        key={`performer_service_setup_${screen.sourceIndex}_${screen.presetCategory ?? ""}_${screen.presetService ?? ""}`}
        {...screen}
      />
    );
  }

  return null;
};

return (
  <SafeAreaView style={{ flex: 1 }}>
    {showHeader ? <AppHeader title={headerTitle} onBack={goBack} right={headerRight} /> : null}
    <View style={{ flex: 1 }}>{render()}</View>

    
  
    {/* Auth modal */}
<Modal visible={authOpen} transparent animationType="slide" onRequestClose={() => setAuthOpen(false)}>
  <KeyboardAvoidingView
    style={styles.modalBackdrop}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    keyboardVerticalOffset={Platform.OS === "ios" ? 44 : 0}
  >
    <View style={[styles.modalCard, { paddingBottom: 16 + insets.bottom }]}>
      <ScrollView
        ref={(r) => {
          authScrollRef.current = r;
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontWeight: "900", fontSize: 16 }}>Регистрация</Text>

        <Text style={{ color: "#666", fontWeight: "700", marginTop: 6 }}>
          Код для теста: <Text style={{ fontWeight: "900" }}>1111</Text>
        </Text>

        <View
          style={{ height: 10 }}
          onLayout={(e) => {
            authFieldY.current.name = e.nativeEvent.layout.y;
          }}
        />

        <TextInput
          style={[styles.input, authErrors.name ? styles.inputError : null]}
          placeholder="Имя"
          value={authName}
          onChangeText={(t) => {
            setAuthName(sanitizeName(t));
            if (authErrors.name) {
              setAuthErrors((p) => ({ ...p, name: false }));
            }
          }}
        />

        <View
          onLayout={(e) => {
            authFieldY.current.phone = e.nativeEvent.layout.y;
          }}
        >
          <TextInput
            style={[styles.input, authErrors.phone ? styles.inputError : null]}
            placeholder="Телефон"
            value={phone}
            onChangeText={(t) => {
              setPhone(formatPhoneRU(t));
              if (authErrors.phone) {
                setAuthErrors((p) => ({ ...p, phone: false }));
              }
            }}
            keyboardType="phone-pad"
          />
        </View>

        <View
          onLayout={(e) => {
            authFieldY.current.city = e.nativeEvent.layout.y;
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.citySelectBtn, authErrors.city ? styles.inputError : null]}
            onPress={() => {
              openPicker("Выберите город", RUS_CITIES, authCity, (v) => {
                setAuthCity(v);
                if (authErrors.city) {
                  setAuthErrors((p) => ({ ...p, city: false }));
                }
              });
            }}
          >
            <Text style={[styles.citySelectText, !authCity ? styles.citySelectPlaceholder : null]}>
              {authCity || "Выберите город"}
            </Text>

            <Text style={styles.citySelectArrow}>⌄</Text>
          </TouchableOpacity>
        </View>

        <View
          onLayout={(e) => {
            authFieldY.current.email = e.nativeEvent.layout.y;
          }}
        >
          <TextInput
            style={[styles.input, authErrors.email ? styles.inputError : null]}
            placeholder="Почта"
            value={authEmail}
            onChangeText={(t) => {
              setAuthEmail(t);
              if (authErrors.email) {
                setAuthErrors((p) => ({ ...p, email: false }));
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View
          onLayout={(e) => {
            authFieldY.current.code = e.nativeEvent.layout.y;
          }}
        >
          <TextInput
            style={[styles.input, authErrors.code ? styles.inputError : null]}
            placeholder="Код из SMS"
            value={code}
            onChangeText={(t) => {
              setCode(t.replace(/\D/g, ""));
              if (authErrors.code) {
                setAuthErrors((p) => ({ ...p, code: false }));
              }
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={submitAuth}
          />
        </View>

        <PrimaryButton title="Подтвердить" variant="dark" onPress={submitAuth} />

        <View style={{ height: 10 }} />

        <PrimaryButton
          title="Отмена"
          variant="green"
          onPress={() => {
            setAuthOpen(false);
            setAuthName("");
            setPhone("+7");
            setAuthCity("");
            setAuthEmail("");
            setCode("");
            setAuthErrors({
              name: false,
              phone: false,
              city: false,
              email: false,
              code: false,
            });
            afterAuthRef.current = null;
          }}
        />
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>

{/* Picker modal */}
<Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
  <View style={styles.sheetBackdrop}>
    <TouchableOpacity
      style={StyleSheet.absoluteFillObject as any}
      activeOpacity={1}
      onPress={() => setPicker(null)}
    />

    <View style={[styles.sheetCard, { paddingBottom: 12 + insets.bottom }]}>
      <Text style={{ fontWeight: "900", fontSize: 16, color: "#111" }}>
        {picker?.title ?? "Выбор"}
      </Text>

      <View style={{ height: 10 }} />

      <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
        {(picker?.options ?? []).map((opt, idx) => {
          const value = opt ?? "";
          const active = value === (picker?.selected ?? "");

          return (
            <TouchableOpacity
              key={`${picker?.title ?? "picker"}_${value}_${idx}`}
              activeOpacity={0.9}
              style={[styles.sheetOption, active ? styles.sheetOptionActive : null]}
              onPress={() => {
                picker?.onPick(value);
                setPicker(null);
              }}
            >
              <Text style={{ fontWeight: "900", color: "#111" }}>
                {value || "Любой"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ height: 10 }} />

      <PrimaryButton
        title="Закрыть"
        variant="light"
        onPress={() => setPicker(null)}
      />
    </View>
  </View>
</Modal>
    {/* Photo viewer modal */}
    <Modal
      visible={!!photoViewer}
      transparent
      animationType="fade"
      onRequestClose={() => setPhotoViewer(null)}
    >
      <View style={styles.viewerBackdrop}>
        <View style={styles.viewerCard}>
          {photoViewer?.uri ? (
            <Image
              source={{ uri: photoViewer.uri }}
              style={styles.viewerImg}
              resizeMode="contain"
            />
          ) : null}
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setPhotoViewer(null)}
          style={styles.viewerClose}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>Закрыть</Text>
        </TouchableOpacity>
      </View>
    </Modal>
    {/* ✅ нижние табы */}
    {screen.name === "projectActive" ? <ProjectTabs circleId={screen.circleId} active="project" /> : null}
      {screen.name === "projectChat" ? <ProjectTabs circleId={screen.circleId} active="chat" /> : null}
      {screen.name !== "chat" && screen.name !== "projectChat" && screen.name !== "projectActive" ? <BottomTabs /> : null}
    </SafeAreaView>
  );
} 
/* =========================
   export default
========================= */
export default function SdelaiZaApp({ navigation }: any) {
  const goToEcosystem = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation?.navigate?.("Preview");
  };

  return (
    <SafeAreaProvider>
      <AppInner onBackToEcosystem={goToEcosystem} />
    </SafeAreaProvider>
  );
}
/* =========================
   styles
========================= */
const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "900", color: "#111" },
  pCardTopRightNoBanner: {
  position: "absolute",
  top: 10,
  right: 10,
  flexDirection: "row",
  alignItems: "center",
  zIndex: 2,
  },
  homeBgAbsolute: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 0,
},
inputError: {
  borderWidth: 1.5,
  borderColor: "rgba(255, 60, 60, 0.9)",
},
citySelectBtn: {
  height: 46,
  borderRadius: 14,
  backgroundColor: "#F1F2F5",
  paddingHorizontal: 12,
  marginBottom: 10,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

citySelectText: {
  color: "#111",
  fontWeight: "900",
  fontSize: 14,
  flex: 1,
},

citySelectPlaceholder: {
  color: "#777",
},

citySelectArrow: {
  color: "#111",
  fontWeight: "900",
  fontSize: 18,
  marginLeft: 8,
},
quickServiceInput: {
  color: "#A0A4AD",
},
homeHeaderOverlay: {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  zIndex: 50,
  overflow: "hidden", // ✅ ключевое: шапка “обрезает” всё под собой
},
  homeHeaderMask: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: -1,
  height: 28,
  backgroundColor: "#fff",
},
    profileAvatarCol: { alignItems: "center", marginRight: 12 },
  avatarCameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCameraIcon: {
  fontSize: 22,
  color: "#C2C7CF",
  opacity: 0.20,
  
},
homeHeaderRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

ecosystemBtn: {
  backgroundColor: "#7E6BFF",
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
  marginTop: -6, // ✅ подняли чуть выше
},

ecosystemBtnText: {
  color: "#FFFFFF",
  fontWeight: "900",
  fontSize: 12,
},
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#EFEFEF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  headerSide: { width: 56, alignItems: "flex-start", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontWeight: "900", fontSize: 16, color: "#111" },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  backArrow: { color: "#111", fontWeight: "900", fontSize: 26, lineHeight: 26 },
  homeHero: { width: "100%", height: 180, borderRadius: 18, marginBottom: 12, backgroundColor: "#E5E7EB" },
  whitePanel: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 12,
  },
  label: { color: "#666", fontWeight: "900", marginBottom: 6, marginTop: 10 },
  labelSmall: { color: "#666", fontWeight: "900", marginBottom: 6, marginTop: 10, fontSize: 12 },
  // ✅ required stars
  requiredStar: { color: "#111", fontWeight: "900", fontSize: 16 },
  requiredLabelRow: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
  },
  pickerLine: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  pickerVal: { fontWeight: "900", color: "#111", flex: 1 },
  pickerArr: { fontWeight: "900", color: "#111" },
  rowLine: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  primaryBtnText: { fontWeight: "900", fontSize: 14 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 8, marginTop: 8 },
  pillText: { fontWeight: "900", fontSize: 12 },
  favIconBtn: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: "#F1F2F4",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 6,
  overflow: "hidden",
},
favIconTxt: {
  fontSize: 18,
  lineHeight: 18,
  textAlign: "center",
  includeFontPadding: false,
},
  
  favIconTxtActive: { opacity: 1 },
  avatarWrapBig: { width: 74, height: 74, borderRadius: 18, overflow: "hidden", backgroundColor: "#F1F2F4", marginRight: 12 },
  avatarBig: { width: "100%", height: "100%" },
  banner: { width: "100%", height: 140, borderRadius: 14, marginBottom: 12 },
  smallBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    minWidth: 0,
  },
  smallBtnTextDark: { color: "white", fontWeight: "900", flexShrink: 1 },
  trendCard: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tabSafeArea: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff" },
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    paddingTop: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  tabBtn: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabIconWrap: { height: 28, alignItems: "center", justifyContent: "center" },
  tabIconTxt: { fontSize: 20, lineHeight: 20 },
  tabIconDeals: { fontSize: 24, lineHeight: 24 },
  tabIconCircles: { fontSize: 18, lineHeight: 18, fontWeight: "900" },
  tabLabelText: {
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 12,
    height: 14,
    includeFontPadding: false,
    textAlignVertical: "center",
  } as any,
  zaBig: { fontSize: 26, lineHeight: 26, fontWeight: "900" },
  tabBadge: {
    position: "absolute",
    top: -8,
    right: -10,
    backgroundColor: "#FF3B30",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeTxt: { color: "#fff", fontWeight: "900", fontSize: 11 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheetCard: { backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
  sheetOption: { backgroundColor: "#F3F4F6", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8 },
  sheetOptionActive: { borderWidth: 2, borderColor: "#2F855A", backgroundColor: "#E8F8EF" },
  pCard: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 14,
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
  position: "relative",
},
pCardBannerWrap: {
  marginHorizontal: -14,
  marginTop: -14,
  marginBottom: 12,
  height: 110,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  overflow: "hidden",
  position: "relative",
  backgroundColor: "#E5E7EB",
},
pCardBanner: {
  width: "100%",
  height: "100%",
},
pCardTopRight: { position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", zIndex: 2 },
  pAvatarCol: { marginRight: 12, alignItems: "center" },
  proUnderAvatarWrap: { marginTop: 6 },
  avatarWrapRound: { width: 54, height: 54, borderRadius: 27, overflow: "hidden", backgroundColor: "#F1F2F4" },
  avatarRound: { width: "100%", height: "100%" },
  avatarWrapRoundBig: { width: 64, height: 64, borderRadius: 32, overflow: "hidden", backgroundColor: "#F1F2F4", marginRight: 12 },
  pName: { fontWeight: "900", fontSize: 16, color: "#111" },
  pSpec: { marginTop: 4, color: "#666", fontWeight: "800" },
  pMeta: { color: "#111", fontWeight: "900" },
  pRead: { color: "#2F855A", fontWeight: "900" },
  pCheck: { fontSize: 14, marginRight: 6 },
  pPassport: { fontWeight: "900", color: "#111" },
  pPrice: { marginTop: 10, fontWeight: "900", fontSize: 16, color: "#111" },
  profileCard: { padding: 14 },
  profileName: { fontWeight: "900", fontSize: 18, color: "#111", maxWidth: 220 },
  profileSpec: { marginTop: 6, color: "#666", fontWeight: "800" },
  blockTitle: { fontWeight: "900", color: "#111" },
  blockText: { marginTop: 4, fontWeight: "800", color: "#666" },
  pPriceBig: { marginTop: 6, fontWeight: "900", fontSize: 18, color: "#111" },
  serviceLine: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceLineActive: { backgroundColor: "rgba(0,0,0,0.12)" },
  serviceTitle: { flex: 1, fontWeight: "900", color: "#111", marginRight: 10 },
  servicePrice: { fontWeight: "900", color: "#111" },
  workPhotoTile: { width: 110, height: 86, borderRadius: 14, overflow: "hidden", backgroundColor: "#E5E7EB", marginRight: 10 },
  workPhotoImg: { width: "100%", height: "100%" },
    workVideoTile: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  workVideoIcon: { fontSize: 22, opacity: 0.55 },
  workVideoLabel: { marginTop: 6, fontWeight: "900", color: "#666", opacity: 0.85 },
  viewerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center" },
  viewerCard: { width: "92%", height: "78%", borderRadius: 18, overflow: "hidden", backgroundColor: "#111" },
  viewerImg: { width: "100%", height: "100%" },
  viewerClose: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  chatCallBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: GREEN,
},
  chatArchiveBtnWrap: { alignItems: "center", justifyContent: "center" },
  chatArchiveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  chatArchiveBtnLabel: { marginTop: 2, fontSize: 10, fontWeight: "900", color: "#666" },
  chatDateWrap: { alignItems: "center", marginTop: 10, marginBottom: 6 },
  chatDateText: { color: "#666", fontWeight: "900" },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 10 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  msgAvatar: { width: 24, height: 24, borderRadius: 12, overflow: "hidden", backgroundColor: "#F1F2F4" },
  msgAvatarImg: { width: "100%", height: "100%" },
  bubble: { maxWidth: "70%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 8 },
  bubbleMe: { backgroundColor: "#2F855A" },
  bubbleOther: { backgroundColor: "#E5E7EB" },
  bubbleText: { fontWeight: "800" },
  attachmentThumb: {
  width: 210,
  height: 140,
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: "rgba(0,0,0,0.08)",
},
attachmentImg: { width: "100%", height: "100%" },

attachmentVideoTile: {
  width: 210,
  height: 90,
  borderRadius: 12,
  backgroundColor: "rgba(0,0,0,0.10)",
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 12,
  gap: 6,
},
attachmentVideoIcon: { fontSize: 24, opacity: 0.9 },
attachmentVideoText: { fontWeight: "900" },

attachmentFileRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
attachmentFileIcon: { fontSize: 16 },
attachmentFileName: { flex: 1, fontWeight: "900" },
attachmentFileOpen: { fontWeight: "900", fontSize: 12 },
  msgTime: { color: "#666", fontWeight: "900", fontSize: 11 },
  msgTimeCenter: { marginTop: 6, color: "#666", fontWeight: "900", fontSize: 11, textAlign: "center" },
  sysWrap: { alignItems: "center", marginBottom: 10 },
  sysBubble: { backgroundColor: "#F3E9D6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, maxWidth: "90%" },
  sysText: { color: "#111", fontWeight: "900" },
  attachBtn: {
  width: 46,
  height: 46,
  borderRadius: 23,
  backgroundColor: "#F3F4F6",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 8,
},
attachPlusWrap: {
  width: 46,
  height: 46,
  alignItems: "center",
  justifyContent: "center",
},
attachPlusText: {
  fontSize: 28,
  fontWeight: "400",
  color: "#111",
  lineHeight: 28, // нейтрально
  textAlign: "center",
  includeFontPadding: false,
} as any,
  chatInput: {
    flex: 1,
    maxHeight: 96,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "800",
    color: "#111",
  },
  sendBtnIcon: { marginLeft: 8, backgroundColor: "#111", borderRadius: 14, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  attachBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  attachPanel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 260,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 12,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  attachItem: { backgroundColor: "#F3F4F6", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 10 },
  attachItemText: { fontWeight: "900", color: "#111" },
  chatTopCard: { backgroundColor: "#fff", borderRadius: 16, marginHorizontal: 12, padding: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  chatTopAvatar: { width: 46, height: 46, borderRadius: 23, overflow: "hidden", backgroundColor: "#F1F2F4", marginRight: 12 },
  chatTopAvatarImg: { width: "100%", height: "100%" },
  chatTopName: { fontWeight: "900", color: "#111", fontSize: 16 },
  chatTopRatingNum: { fontWeight: "900", color: "#111" },
  chatTopStar: { marginLeft: 6, fontSize: 14 },
  chatServiceTitle: { fontWeight: "900", fontSize: 16, color: "#111" },
  chatWarnTextSmall: { marginTop: 6, color: "#9AA0A6", fontWeight: "800", fontSize: 11, lineHeight: 14 },
  chatBottomSafe: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#EFEFEF", paddingHorizontal: 12, paddingTop: 10 },
  offerBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 10 },
  offerAcceptBtn: { backgroundColor: "#2F855A", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  offerAcceptText: { color: "#fff", fontWeight: "900" },
  offerInput: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontWeight: "900", color: "#111", textAlign: "center" },
  offerSendBtn: { backgroundColor: "#111", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  offerSendText: { color: "#fff", fontWeight: "900" },
  chatComposerPinned: { marginBottom: 10, backgroundColor: "#fff", borderRadius: 16, padding: 10, flexDirection: "row", alignItems: "flex-end", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  acceptWorkRow: { flexDirection: "row", alignItems: "center" },
  acceptWorkBtn: { backgroundColor: "#2F855A", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  acceptWorkBtnText: { color: "#fff", fontWeight: "900" },
  bankCodeInput: { backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontWeight: "900", color: "#111", textAlign: "center" },
  bankSendBtn: { backgroundColor: "#111", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  bankSendBtnText: { color: "#fff", fontWeight: "900" },
  disputeBtn: { marginTop: 10, alignSelf: "center", backgroundColor: "#FF8A00", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  disputeBtnText: { color: "#fff", fontWeight: "900" },
  disputedBadge: { alignSelf: "center", backgroundColor: "#FFF4D6", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  disputedBadgeText: { fontWeight: "900", color: "#9A6B00", fontSize: 12 },
  payBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  payCard: { backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 18 },
  payCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  payInfoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  payInfoLeft: { color: "#666", fontWeight: "900" },
  payInfoRight: { color: "#111", fontWeight: "900" },
  payMethodRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  payMethodRowActive: { borderWidth: 2, borderColor: "#2F855A", backgroundColor: "#E8F8EF" },
  payRadio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#C9CED6" },
  payRadioActive: { borderColor: "#2F855A", backgroundColor: "#2F855A" },
  payBtn: { backgroundColor: "#2F855A", borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  payBtnText: { color: "#fff", fontWeight: "900" },
  paySafeText: { marginTop: 10, color: "#9AA0A6", fontWeight: "900", fontSize: 12, textAlign: "center" },
  profileHeaderRow: { flexDirection: "row", alignItems: "center" },
  profileTitle: { fontSize: 26, fontWeight: "900", color: "#111" },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  headerIconTxt: { fontSize: 18 },
  redDot: { position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: 999, backgroundColor: "#FF3B30" },
  rolePill: { flex: 1, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "#EFEFEF", alignItems: "center", justifyContent: "center" },
  rolePillActive: { backgroundColor: "#111" },
  rolePillText: { fontWeight: "900", color: "#111" },
  rolePillTextActive: { color: "#fff" },
  rolePillActiveGreen: { backgroundColor: "#2F855A" },
  rolePillTextActiveGreen: { color: "#fff" },
  // ✅ одинаковая высота плиток (п.4)
  statTile: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 14, padding: 12, height: 86, justifyContent: "center" },
  statBig: { fontWeight: "900", fontSize: 16, color: "#111" },
  statSmall: { marginTop: 4, fontWeight: "800", color: "#666", fontSize: 11, lineHeight: 14 },
  readGreen: { color: "#2F855A", fontWeight: "900" },
  readGreenSmall: { color: "#333333", fontWeight: "900", fontSize: 13, marginBottom: 6 },
  profileLine: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  profileLineLeft: { flex: 1, fontWeight: "900", color: "#111" },
  profileLineRight: { fontWeight: "900", color: "#666" },
  profileDivider: { height: 1, backgroundColor: "#F0F0F0" },
  sectionTitle: { fontWeight: "900", color: "#111", fontSize: 16, marginBottom: 10 },
  formLabel: { color: "#666", fontWeight: "900", marginBottom: 6, marginTop: 10 },
  formInput: { backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontWeight: "800", color: "#111" },
  switchRow: { backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginTop: 10 },
  switchTitle: { fontWeight: "900", color: "#111" },
  priceModeBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  priceModeBtnActive: { backgroundColor: "#111" },
  priceModeBtnText: { fontWeight: "900", color: "#111" },
  priceModeBtnTextActive: { color: "#fff" },
  matchRow: { backgroundColor: "#F3F4F6", borderRadius: 12, padding: 12, marginBottom: 10 },
  homeRoot: { flex: 1, backgroundColor: "transparent" },
  homeTopBg: { position: "absolute", left: 0, right: 0, top: 0, backgroundColor: "transparent" },
  homeFloatingHeader: { position: "absolute", left: 0, right: 0, top: 0, backgroundColor: "transparent", paddingHorizontal: 16, zIndex: 20 },
  homeTopTitle: { fontSize: 34, fontWeight: "900", color: "#111" },
  homeTopSubtitle: { marginTop: 4, fontSize: 14, fontWeight: "800", color: "#333" },
  homeStickyCtas: { position: "absolute", left: 0, right: 0, paddingHorizontal: 16 },
  homeStickyCtasInner: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 18, padding: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
  homeCatalogTitle: { fontSize: 22, fontWeight: "900", color: "#111" },
  homeCatalogCardsWrap: { backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 22, padding: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  homeCatalogRow: { flexDirection: "row" },
  homeCatalogItemWrap: { width: 170, marginRight: 10, marginBottom: 10 },
  homeCatTile: { backgroundColor: "#fff", borderRadius: 18, padding: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, minHeight: 78, justifyContent: "center" },
  homeCatInner: { flexDirection: "row", alignItems: "center" },
  homeCatIcon: { fontSize: 26, marginRight: 10 },
  homeCatTitle: { fontWeight: "900", color: "#111", fontSize: 14, flex: 1 },
  serviceRow: { backgroundColor: "#F3F4F6", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 10 },
  serviceRowTitle: { fontWeight: "900", color: "#111", fontSize: 15 },
  serviceRowMeta: { fontWeight: "800", color: "#666" },
  orderBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, minWidth: 110, alignItems: "center", justifyContent: "center" },
  orderBtnText: { color: "#fff", fontWeight: "900" },
  performerSelectCard: { backgroundColor: "#fff", borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  performerSelectAvatar: { width: 64, height: 64, borderRadius: 14, overflow: "hidden", backgroundColor: "#E5E7EB", marginRight: 12 },
  performerSelectAvatarImg: { width: "100%", height: "100%" },
  performerSelectName: { fontWeight: "900", color: "#111", fontSize: 16 },
  performerSelectMeta: { fontWeight: "800", color: "#666" },
  performerSelectPrice: { marginTop: 8, fontWeight: "900", color: "#111" },
  dealsTabsWrap: { position: "relative" },
  dealsTabsScrollContentCompact: {
  paddingHorizontal: 0,
},
dealsTabsTrack: {
  position: "relative",
  paddingBottom: 4,
},
dealsTabsRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
},
dealsTabItemCompact: {
  paddingVertical: 6,
  paddingHorizontal: 6,
  borderRadius: 12,
},
  dealsTabLabelRow: { flexDirection: "row", alignItems: "flex-end" },
  dealsTabTextCompact: { fontWeight: "900", color: "#777", fontSize: 20, letterSpacing: -0.2 },
  dealsTabTextCompactActive: { color: "#111" },
  dealsTabCountInline: {
    marginLeft: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F1F2F4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    transform: [{ translateY: -6 }],
  },
  dealsTabCountTextBig: { fontSize: 10, fontWeight: "900", color: "#111" },
  dealsUnderlineThinBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 1, backgroundColor: "#E6E8EC", borderRadius: 999 },
  dealsUnderlineActiveAnimated: { position: "absolute", left: 0, bottom: 0, height: 3, backgroundColor: "#111", borderRadius: 999 },
  dealsPerformerCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  dealsPerformerBottomRowWrap: { marginTop: 10, flexDirection: "column", gap: 6 },
  dealsPerformerCost: { fontWeight: "900", color: "#111" },
  dealsPerformerCostValue: { fontWeight: "900", color: "#111" },
  dealsPerformerCreated: { fontWeight: "800", color: "#666" },
  dealsPerformerCreatedBold: { fontWeight: "900", color: "#111" },
  dealsCardTopRight: { position: "absolute", top: 10, right: 10, zIndex: 3 },
  dealsPencilBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  dealsPencilTxt: { fontWeight: "900", color: "#111", fontSize: 16 },
  dealsActionSheet: { backgroundColor: "#fff", borderRadius: 14, padding: 10, marginTop: 8, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  dealsActionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  dealsActionIcon: { width: 26, textAlign: "center", fontSize: 16 },
  dealsActionText: { fontWeight: "900", color: "#111" },
  dayBtn: { backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minWidth: 44, alignItems: "center", justifyContent: "center" },
  dayBtnActive: { backgroundColor: "#111" },
  dayBtnText: { fontWeight: "900", color: "#111" },
  dayBtnTextActive: { color: "#fff" },
  mediaAddBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", gap: 6 },
  mediaAddText: { fontWeight: "900", color: "#111", fontSize: 12 },
  mediaThumbWrap: { marginRight: 10, position: "relative" },
  mediaThumb: { width: 110, height: 86, borderRadius: 14, overflow: "hidden", backgroundColor: "#E5E7EB" },
  mediaThumbImg: { width: "100%", height: "100%" },
  mediaKindBadge: { position: "absolute", left: 8, top: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  mediaKindBadgeText: { color: "#fff", fontWeight: "900", fontSize: 10 },
  mediaRemoveBtn: { position: "absolute", right: 6, top: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  fromCheckWrap: { width: 78, height: 46, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  fromCheckWrapActive: { backgroundColor: "#111" },
  fromCheckText: { fontWeight: "900", color: "#111" },
  fromCheckTextActive: { color: "#fff" },
  suggestBtn: { backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, maxWidth: "100%" },
  suggestBtnActive: { backgroundColor: "#111" },
  suggestBtnText: { fontWeight: "900", color: "#111" },
  suggestBtnTextActive: { color: "#fff" },
  savedServiceRow: { backgroundColor: "#F3F4F6", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 10 },
  savedServiceEditBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: GREEN,
  alignItems: "center",
  justifyContent: "center",
},
  savedServiceActions: {
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},

savedServiceDeleteBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: GREEN,
  alignItems: "center",
  justifyContent: "center",
},

savedServiceDeleteText: {
  fontWeight: "900",
  color: "#D1D5DB",
  fontSize: 16,
},
passportThumbWrap: {
  width: "100%",
},
passportThumb: {
  width: "100%",
  height: 140,
  borderRadius: 14,
  overflow: "hidden",
  backgroundColor: "#E5E7EB",
},
passportThumbImg: {
  width: "100%",
  height: "100%",
},
passportThumbPlaceholder: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 12,
},
passportThumbPlaceholderIcon: {
  fontSize: 22,
  marginBottom: 8,
},
passportThumbPlaceholderText: {
  color: "#666",
  fontWeight: "800",
  textAlign: "center",
},
passportRemoveBtn: {
  position: "absolute",
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: "rgba(0,0,0,0.72)",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2,
},
passportRemoveBtnText: {
  color: "#fff",
  fontWeight: "900",
  fontSize: 12,
  lineHeight: 12,
},
  addrSuggestBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E8EC",
    overflow: "hidden",
    marginTop: -6,
    marginBottom: 12,
  },
  addrSuggestRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1F3",
  },
  addrSuggestText: { fontWeight: "800", color: "#111" },
  addrStepTitle: { fontWeight: "900", color: "#111", marginBottom: 6, marginTop: 6 },
  circlesSubtitle: { fontWeight: "900", fontSize: 18, color: "#111", marginTop: 2 },
  circleRadarWrap: { alignItems: "center", justifyContent: "center", marginBottom: 12 },
  circleRadarCenter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "#E6E8EC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  circleRadarImg: { width: "100%", height: "100%" },
  circleRadarPlus: { fontSize: 40, fontWeight: "900", color: "#9AA0A6" },
  circleRadarHint: { marginTop: 10, color: "#666", fontWeight: "800" },
  circleChip: { backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  circleChipActive: { backgroundColor: "#111" },
  circleChipText: { fontWeight: "900", color: "#111" },
  circleChipTextActive: { color: "#fff" },
  circleMapMock: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
    minHeight: 110,
    justifyContent: "center",
  },
  circleMapDot: {
    position: "absolute",
    right: 18,
    top: 18,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2F855A",
  },
  circleRow: { backgroundColor: "#F3F4F6", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  circleRowImg: { width: 46, height: 46, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  myProjectsBtn: {
    marginTop: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  myProjectsBtnText: { fontWeight: "900", color: "#111", flex: 1 },
  myProjectsBtnArrow: { fontWeight: "900", color: "#111" },
  // ✅ опустить центральную кнопку ниже (п.1)
  tabBtnCenter: { marginTop: 6 },
  tabIconWrapCenter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6E8EC",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabIconTxtCenter: { fontSize: 18, fontWeight: "900" },
  // center circles icon
  circlesCenterIconWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  // ✅ активные точки (п.2)
  circlesActiveDotTop: { position: "absolute", top: -6, width: 7, height: 7, borderRadius: 999, backgroundColor: GREEN },
  circlesActiveDotLeft: { position: "absolute", left: -6, top: 12, width: 7, height: 7, borderRadius: 999, backgroundColor: GREEN },
  circlesActiveDotRight: { position: "absolute", right: -6, top: 12, width: 7, height: 7, borderRadius: 999, backgroundColor: GREEN },
  // ✅ "назад в проект"
  backToProjectBtn: { marginLeft: 10, backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  backToProjectBtnText: { fontWeight: "900", color: "#111" },
  // CircleDetails visual
  circleVisualWrap: { alignItems: "center" },
  circleVisualHint: { marginTop: 10, color: "#666", fontWeight: "800", textAlign: "center" },
  circleAvatarsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 12, gap: 10 },
  circleAvatarBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E6E8EC",
  },
  circleAvatarImg: { width: "100%", height: "100%", resizeMode: "cover" },
  circleRingsWrap: { alignItems: "center", justifyContent: "center" },
  ringOuter: {
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "#E6E8EC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringMiddle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E6E8EC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringCenter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E6E8EC",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  ringCenterTitle: { fontWeight: "900", color: "#111" },
  ringCenterSub: { marginTop: 4, color: "#666", fontWeight: "800", textAlign: "center" },
  ringLabelTop: { position: "absolute", top: 10, fontWeight: "900", color: "#111" },
  ringLabelBottom: { position: "absolute", bottom: 10, fontWeight: "900", color: "#111" },
  // ✅ web: как моб — центрируем аватары (п.3)
  ringOuterAvatars: { position: "absolute", top: 44, left: 14, right: 14, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  ringMiddleAvatars: { position: "absolute", bottom: 44, left: 14, right: 14, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  ringAvatarBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E6E8EC",
    alignItems: "center",
    justifyContent: "center",
  },
  ringAvatarImg: { width: "100%", height: "100%", resizeMode: "cover" },
  projectPinnedChatBtn: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E6E8EC", padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  projectPinnedChatBtnText: { fontWeight: "900", color: "#111" },
  projectMasterCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E6E8EC" },
  projectMasterAvatar: { width: 56, height: 56, borderRadius: 28, overflow: "hidden", backgroundColor: "#F1F2F4", marginRight: 12 },
  projectMasterAvatarImg: { width: "100%", height: "100%" },
  projectPayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  projectPayLeft: { fontWeight: "900", color: "#111" },
  projectPayRight: { fontWeight: "900" },
  escrowBarWrap: { width: "100%", height: 12, backgroundColor: "#E6E8EC", borderRadius: 999, overflow: "hidden" },
  escrowBarFill: { height: "100%", backgroundColor: GREEN, borderRadius: 999 },
  startProjectBtn: { marginTop: 12, backgroundColor: GREEN, borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  startProjectBtnText: { color: "#fff", fontWeight: "900" },
  projectArchiveCard: { marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E6E8EC" },
  projectDocRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  projectDocIcon: { width: 22, textAlign: "center" },
  projectDocTitle: { flex: 1, fontWeight: "900", color: "#111" },
  projectActionsCard: { marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E6E8EC" },
  acceptWorkBigBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  acceptWorkBigBtnText: { color: "#fff", fontWeight: "900" },
  openDisputeBtn: { backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FF3B30" },
  openDisputeBtnText: { color: "#FF3B30", fontWeight: "900" },
  arbBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 16 },
  arbCard: { width: "100%", maxWidth: 420, backgroundColor: "#111", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  arbTitle: { color: "#fff", fontWeight: "900", fontSize: 16, textAlign: "center" },
  arbSideLabelLeft: { color: "#7CFFB2", fontWeight: "900" },
  arbSideLabelRight: { color: "#FF8A80", fontWeight: "900" },
  arbBarWrap: { width: "100%", height: 14, borderRadius: 999, overflow: "hidden", flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)" },
  arbBarLeft: { height: "100%", backgroundColor: "#2F855A" },
  arbBarRight: { height: "100%", backgroundColor: "#FF3B30" },
  arbPercentText: { marginTop: 8, color: "rgba(255,255,255,0.75)", fontWeight: "900", textAlign: "center" },
  arbExpertsTitle: { color: "#fff", fontWeight: "900", textAlign: "center" },
  arbExpertsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  arbExpertAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  arbExpertGreen: { borderWidth: 3, borderColor: "#2F855A" },
  arbExpertRed: { borderWidth: 3, borderColor: "#FF3B30" },
  arbExpertGray: { opacity: 0.35 },
  arbVoteBtn: { marginTop: 8, backgroundColor: "#2F855A", borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  arbVoteBtnText: { color: "#fff", fontWeight: "900" },
  arbHint: { marginTop: 10, color: "rgba(255,255,255,0.7)", fontWeight: "800", textAlign: "center" },
  arbCloseBtn: { marginTop: 10, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  arbCloseBtnText: { color: "#fff", fontWeight: "900" },
  projectTabSafeArea: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff" },
  projectTabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    paddingTop: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  projectTabBtn: { flex: 1, alignItems: "center", justifyContent: "center" },
  projectTabIcon: { fontSize: 20, lineHeight: 20, fontWeight: "900" },
  projectTabLabel: { fontSize: 11, fontWeight: "900", marginTop: 6, height: 14, lineHeight: 12, includeFontPadding: false, textAlignVertical: "center" } as any,
profileMoreBox: {
  marginTop: 12,
  backgroundColor: "#F3F4F6",
  borderRadius: 14,
  padding: 12,
},
headerBellBtn: {
  backgroundColor: "#F3F4F6",
},
headerBellBtnPressed: {
  backgroundColor: "#E8F8EF",
},
headerBellIcon: {
  fontSize: 18,
  color: "#9AA0A6",
  fontWeight: "900",
},
headerBellIconPressed: {
  color: GREEN,
},
chatCallIcon: {
  fontSize: 18,
  color: "#fff",
  fontWeight: "900",
},
profileMoreTitle: {
  fontWeight: "900",
  fontSize: 16,
  color: "#111",
  marginBottom: 10,
},
profileMoreRow: {
  paddingVertical: 8,
},
profileMoreLabel: {
  fontWeight: "900",
  color: "#111",
  marginBottom: 4,
},
profileMoreValue: {
  color: "#666",
  fontWeight: "800",
  lineHeight: 20,
},
passportFieldWrap: {
  marginTop: 10,
  position: "relative",
},
passportThumbWrap: {
  width: "100%",
},
passportThumb: {
  width: "100%",
  height: 140,
  borderRadius: 14,
  overflow: "hidden",
  backgroundColor: "#E5E7EB",
},
passportThumbImg: {
  width: "100%",
  height: "100%",
},
passportThumbPlaceholder: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 12,
},
passportThumbPlaceholderIcon: {
  fontSize: 22,
  marginBottom: 8,
},
passportThumbPlaceholderText: {
  color: "#666",
  fontWeight: "800",
  textAlign: "center",
},
passportRemoveBtn: {
  position: "absolute",
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: "rgba(0,0,0,0.72)",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2,
},
passportRemoveBtnText: {
  color: "#fff",
  fontWeight: "900",
  fontSize: 12,
  lineHeight: 12,
},
bubbleMedia: {
  backgroundColor: "transparent",
  paddingHorizontal: 0,
  paddingVertical: 0,
  marginHorizontal: 8, // оставим отступ как у пузыря
  borderRadius: 14,
  overflow: "hidden",  // чтобы картинка/превью резались по радиусу
},
attachmentPlayOverlay: {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  alignItems: "center",
  justifyContent: "center",
},
attachmentPlayOverlayIcon: {
  fontSize: 34,
  color: "rgba(255,255,255,0.92)",
  textShadowColor: "rgba(0,0,0,0.35)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
},
attachmentVideoFallback: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.10)",
},
// ✅ Phone toast
phoneToastWrap: {
  position: "absolute",
  left: 12,
  right: 12,
  zIndex: 50,
  alignItems: "center",
},
phoneToastCard: {
  backgroundColor: "#fff",
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 14,
  elevation: 6,
  borderWidth: 1,
  borderColor: "#EFEFEF",
  maxWidth: 520,
},
phoneToastText: {
  color: "#111",
  fontWeight: "900",
  textAlign: "center",
  lineHeight: 18,
  fontSize: 12,
  savedServiceEditText: {
  fontWeight: "900",
  color: "#D1D5DB",
  fontSize: 16,
},
},
});
