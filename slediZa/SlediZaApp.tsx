import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  StatusBar,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EcosystemContext } from '../EcosystemContext';
import type { RootStackParamList } from '../App';
import { ECOSYSTEM_CITIES } from '../constants/ecosystemCities';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RatingBreakdown {
  slediza: number;
  sdelajza: number;
  zadruzhi: number;
}

interface User {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  rating: number;
  ratingBreakdown: RatingBreakdown;
  followers: number;
  following: number;
  posts: number;
  bio: string;
  verified: boolean;
  isFollowing: boolean;
}

interface Post {
  id: number;
  userId: number;
  text: string;
  image: string | null;
  likes: number;
  comments: number;
  reposts: number;
  saves: number;
  liked: boolean;
  saved: boolean;
  time: string;
  type: string;
}

interface Notification {
  id: number;
  type: string;
  userId: number;
  text: string;
  time: string;
}

interface Comment {
  id: number;
  userId: number;
  text: string;
  time: string;
  likes: number;
}

const C = {
  bg: '#000000',
  card: '#111111',
  elevated: '#1A1A1A',
  input: '#222222',
  border: '#2A2A2A',
  borderLight: '#333333',
  text: '#FFFFFF',
  textSec: '#999999',
  textMut: '#666666',
  accent: '#7C3AED',
  accentLight: '#9F67FF',
  like: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  ecoSledi: '#7C3AED',
  ecoSdelai: '#F59E0B',
  ecoZadruzhi: '#EC4899',
};

const USERS: User[] = [
  {
    id: 1,
    name: 'Алексей Волков',
    handle: '@alexwolf',
    avatar: '🐺',
    rating: 4.8,
    ratingBreakdown: { slediza: 4.9, sdelajza: 4.7, zadruzhi: 4.8 },
    followers: 12400,
    following: 890,
    posts: 234,
    bio: 'Дизайнер интерфейсов. Минимализм и функциональность.',
    verified: true,
    isFollowing: false,
  },
  {
    id: 2,
    name: 'Мария Светлова',
    handle: '@mariya_sv',
    avatar: '🌸',
    rating: 4.6,
    ratingBreakdown: { slediza: 4.5, sdelajza: 4.8, zadruzhi: 4.5 },
    followers: 8900,
    following: 1200,
    posts: 567,
    bio: 'Фотограф | Путешественница | Мечтатель',
    verified: true,
    isFollowing: true,
  },
  {
    id: 3,
    name: 'Дмитрий Кузнецов',
    handle: '@dimakuz',
    avatar: '🔥',
    rating: 4.3,
    ratingBreakdown: { slediza: 4.2, sdelajza: 4.5, zadruzhi: 4.2 },
    followers: 3400,
    following: 450,
    posts: 89,
    bio: 'Разработчик | Open Source энтузиаст',
    verified: false,
    isFollowing: false,
  },
  {
    id: 4,
    name: 'Елена Романова',
    handle: '@elena_rom',
    avatar: '🦋',
    rating: 4.9,
    ratingBreakdown: { slediza: 5.0, sdelajza: 4.8, zadruzhi: 4.9 },
    followers: 45000,
    following: 320,
    posts: 1200,
    bio: 'Блогер | Стилист | Вдохновение каждый день ✨',
    verified: true,
    isFollowing: true,
  },
  {
    id: 5,
    name: 'Иван Петров',
    handle: '@ivanp',
    avatar: '🎯',
    rating: 3.9,
    ratingBreakdown: { slediza: 3.8, sdelajza: 4.2, zadruzhi: 3.7 },
    followers: 1200,
    following: 670,
    posts: 45,
    bio: 'Спортсмен | Бегун | Марафонец',
    verified: false,
    isFollowing: false,
  },
];

const POSTS: Post[] = [
  {
    id: 1,
    userId: 4,
    text: 'Сегодня закончила новый проект по стилю! Как вам результат? Делитесь мнениями в комментариях 👇',
    image: null,
    likes: 1240,
    comments: 89,
    reposts: 34,
    saves: 156,
    liked: false,
    saved: false,
    time: '2ч',
    type: 'text',
  },
  {
    id: 2,
    userId: 1,
    text: 'Новый концепт для мобильного приложения. Минимализм — это когда каждый пиксель на своём месте.',
    image: 'design',
    likes: 890,
    comments: 56,
    reposts: 23,
    saves: 234,
    liked: true,
    saved: false,
    time: '4ч',
    type: 'image',
  },
  {
    id: 3,
    userId: 2,
    text: 'Утро в горах Грузии. Тишина, которую хочется слушать вечно 🏔️',
    image: 'photo',
    likes: 2340,
    comments: 123,
    reposts: 67,
    saves: 456,
    liked: false,
    saved: true,
    time: '6ч',
    type: 'image',
  },
  {
    id: 4,
    userId: 3,
    text: 'Только что выложил новую библиотеку на GitHub. React Native компоненты для анимаций. Ссылка в профиле!',
    image: null,
    likes: 456,
    comments: 34,
    reposts: 89,
    saves: 67,
    liked: false,
    saved: false,
    time: '8ч',
    type: 'text',
  },
  {
    id: 5,
    userId: 5,
    text: 'Пробежал первый полумарафон! 21 км за 1:48. Следующая цель — полный марафон 🏃‍♂️',
    image: null,
    likes: 678,
    comments: 45,
    reposts: 12,
    saves: 23,
    liked: false,
    saved: false,
    time: '12ч',
    type: 'text',
  },
  {
    id: 6,
    userId: 4,
    text: 'Топ-5 трендов этой осени. Сохраняйте!\n\n1. Оверсайз пальто\n2. Кожаные аксессуары\n3. Монохромные образы\n4. Винтажные очки\n5. Текстурный трикотаж',
    image: null,
    likes: 3400,
    comments: 234,
    reposts: 156,
    saves: 890,
    liked: true,
    saved: true,
    time: '1д',
    type: 'text',
  },
];

const NOTIFICATIONS: Notification[] = [
  { id: 1, type: 'like', userId: 4, text: 'понравился ваш пост', time: '5м' },
  { id: 2, type: 'follow', userId: 1, text: 'подписался на вас', time: '15м' },
  { id: 3, type: 'comment', userId: 2, text: 'прокомментировала: "Потрясающе!"', time: '1ч' },
  { id: 4, type: 'rating', userId: 3, text: 'повысил ваш рейтинг', time: '2ч' },
  { id: 5, type: 'repost', userId: 5, text: 'сделал репост вашей записи', time: '3ч' },
  { id: 6, type: 'like', userId: 1, text: 'понравился ваш комментарий', time: '5ч' },
];

const COMMENTS: Comment[] = [
  { id: 1, userId: 1, text: 'Отличная работа! 🔥', time: '1ч', likes: 12 },
  { id: 2, userId: 2, text: 'Вдохновляет!', time: '45м', likes: 8 },
  { id: 3, userId: 5, text: 'Круто, продолжай в том же духе', time: '30м', likes: 3 },
];

const ME: User = {
  id: 0,
  name: 'Вы',
  handle: '@myprofile',
  avatar: '👤',
  rating: 4.5,
  ratingBreakdown: { slediza: 4.6, sdelajza: 4.4, zadruzhi: 4.5 },
  followers: 2340,
  following: 567,
  posts: 78,
  bio: 'Мой профиль в экосистеме',
  verified: false,
  isFollowing: false,
};

const CITY_OPTIONS = ECOSYSTEM_CITIES;

const fmt = (n: number): string => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'М';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'К';
  return n.toString();
};

const rColor = (r: number): string => {
  if (r >= 4.5) return '#10B981';
  if (r >= 4.0) return '#F59E0B';
  if (r >= 3.0) return '#EF4444';
  return '#666';
};

const nIcon = (t: string): string => {
  const m: Record<string, string> = {
    like: '❤️',
    follow: '👤',
    comment: '💬',
    rating: '⭐',
    repost: '🔄',
  };

  return m[t] || '🔔';
};

const formatPhoneRU = (input: string) => {
  const digits = input.replace(/\D/g, '');
  let d = digits;

  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7')) d = '7' + d;

  d = d.slice(0, 11);

  const rest = d.slice(1);
  const a = rest.slice(0, 3);
  const b = rest.slice(3, 6);
  const c = rest.slice(6, 8);
  const e = rest.slice(8, 10);

  let out = '+7';

  if (a.length) out += ` (${a}`;
  if (a.length === 3) out += ')';
  if (b.length) out += ` ${b}`;
  if (c.length) out += `-${c}`;
  if (e.length) out += `-${e}`;

  return out;
};

const phoneDigitsRU = (value: string) => value.replace(/\D/g, '');

const validateEmail = (value: string) => {
  const v = value.trim().toLowerCase();
  const atIndex = v.indexOf('@');

  if (atIndex === -1) return false;

  const local = v.slice(0, atIndex);
  const domain = v.slice(atIndex + 1);

  if (local.length < 3) return false;
  if (/\s/.test(local) || /\s/.test(domain)) return false;

  const allowedDomains = new Set([
    'gmail.com',
    'yandex.ru',
    'yandex.com',
    'ya.ru',
    'mail.ru',
    'bk.ru',
    'inbox.ru',
    'list.ru',
    'rambler.ru',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'proton.me',
    'protonmail.com',
    'yahoo.com',
  ]);

  return allowedDomains.has(domain);
};

const RatingBadge = ({
  rating,
  size = 'small',
  showBreakdown = false,
  breakdown,
}: {
  rating: number;
  size?: 'small' | 'medium' | 'large';
  showBreakdown?: boolean;
  breakdown?: RatingBreakdown;
}) => {
  const sz = size === 'large' ? 56 : size === 'medium' ? 40 : 28;
  const fs = size === 'large' ? 18 : size === 'medium' ? 14 : 11;
  const col = rColor(rating);

  return (
    <View style={{ alignItems: size === 'large' ? 'center' : 'flex-start' }}>
      <View
        style={[
          s.ratBadge,
          {
            width: sz,
            height: sz,
            borderRadius: sz / 2,
            borderColor: col,
            backgroundColor: col + '15',
          },
        ]}
      >
        <Text style={[s.ratBadgeText, { fontSize: fs, color: col }]}>{rating.toFixed(1)}</Text>
      </View>

      {showBreakdown && breakdown ? (
        <View style={s.ratBreakdown}>
          {[
            { key: 'slediza' as const, label: 'СледиЗА', color: C.ecoSledi },
            { key: 'sdelajza' as const, label: 'СделайЗА', color: C.ecoSdelai },
            { key: 'zadruzhi' as const, label: 'Задружи', color: C.ecoZadruzhi },
          ].map((item) => (
            <View key={item.key} style={s.ratRow}>
              <Text style={{ fontSize: 10, color: item.color }}>●</Text>
              <Text style={s.ratLabel}>{item.label}</Text>
              <Text style={[s.ratValue, { color: rColor(breakdown[item.key]) }]}>
                {breakdown[item.key].toFixed(1)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const MockImage = ({ type, style }: { type: string; style?: any }) => {
  const colors: Record<string, string> = {
    design: '#7C3AED',
    photo: '#10B981',
  };

  const icons: Record<string, string> = {
    design: '🎨',
    photo: '📸',
  };

  return (
    <View
      style={[
        {
          backgroundColor: colors[type] || '#374151',
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 48 }}>{icons[type] || '🖼️'}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>
        {type === 'design' ? 'UI Концепт' : type === 'photo' ? 'Фото' : 'Медиа'}
      </Text>
    </View>
  );
};

const RegisterModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { setProfile } = useContext(EcosystemContext);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+7');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({
    name: false,
    city: false,
    email: false,
    phone: false,
    code: false,
  });

  useEffect(() => {
    if (!visible) return;

    setCityOpen(false);
    setErrors({
      name: false,
      city: false,
      email: false,
      phone: false,
      code: false,
    });
  }, [visible]);

  const closeRegister = () => {
    setCityOpen(false);
    onClose();
  };

  const submit = () => {
    const nameTrim = name.trim();
    const lettersOnly = nameTrim.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '');
    const phoneDigits = phoneDigitsRU(phone);
    const emailTrim = email.trim();

    const nameOk = lettersOnly.length >= 2;
    const cityOk = city.trim().length > 0;
    const emailOk = validateEmail(emailTrim);
    const phoneOk = phoneDigits.length === 11 && phoneDigits.startsWith('7');
    const codeOk = code.trim() === '1111';

    const nextErrors = {
      name: !nameOk,
      city: !cityOk,
      email: !emailOk,
      phone: !phoneOk,
      code: !codeOk,
    };

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      if (Platform.OS === 'web') {
        (globalThis as any)?.alert?.('Проверьте поля регистрации. Код для теста: 1111');
      } else {
        Alert.alert('Ошибка', 'Проверьте поля регистрации. Код для теста: 1111');
      }

      return;
    }

    setProfile({
      name: nameTrim,
      city: city.trim(),
      email: emailTrim,
      phoneMain: phone,
      phoneExtra: '',
      address: '',
    });

    setName('');
    setCity('');
    setEmail('');
    setPhone('+7');
    setCode('');
    setCityOpen(false);
    onClose();

    if (Platform.OS === 'web') {
      (globalThis as any)?.alert?.('Регистрация завершена. Аккаунт един для всей экосистемы.');
    } else {
      Alert.alert('Готово', 'Регистрация завершена. Аккаунт един для всей экосистемы.');
    }
  };

  return (
    <>
      <Modal transparent animationType="slide" visible={visible} onRequestClose={closeRegister}>
        <View style={s.modalBottom}>
          <View style={s.registerPanel}>
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Регистрация</Text>

              <TouchableOpacity onPress={closeRegister}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}
            >
              <Text style={s.registerHint}>Код для теста: 1111</Text>

              <Text style={s.registerLabel}>Имя</Text>
              <TextInput
                style={[s.registerInput, errors.name ? s.registerInputError : null]}
                placeholder="Введите имя"
                placeholderTextColor={C.textMut}
                value={name}
                onChangeText={(v) => {
                  setName(v.replace(/[^a-zA-Zа-яА-ЯёЁ\s-]/g, ''));
                  if (errors.name) setErrors((p) => ({ ...p, name: false }));
                }}
              />

              <Text style={s.registerLabel}>Город</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[s.citySelectBtn, errors.city ? s.registerInputError : null]}
                onPress={() => setCityOpen(true)}
              >
                <Text style={[s.citySelectText, !city ? s.citySelectPlaceholder : null]}>
                  {city || 'Выберите город'}
                </Text>
                <Text style={s.citySelectArrow}>⌄</Text>
              </TouchableOpacity>

              <Text style={s.registerLabel}>Почта</Text>
              <TextInput
                style={[s.registerInput, errors.email ? s.registerInputError : null]}
                placeholder="example@mail.com"
                placeholderTextColor={C.textMut}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors((p) => ({ ...p, email: false }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={s.registerLabel}>Телефон</Text>
              <TextInput
                style={[s.registerInput, errors.phone ? s.registerInputError : null]}
                placeholder="+7 (999) 999-99-99"
                placeholderTextColor={C.textMut}
                value={phone}
                onChangeText={(v) => {
                  setPhone(formatPhoneRU(v));
                  if (errors.phone) setErrors((p) => ({ ...p, phone: false }));
                }}
                keyboardType="phone-pad"
              />

              <Text style={s.registerLabel}>Код из SMS</Text>
              <TextInput
                style={[s.registerInput, errors.code ? s.registerInputError : null]}
                placeholder="1111"
                placeholderTextColor={C.textMut}
                value={code}
                onChangeText={(v) => {
                  setCode(v.replace(/\D/g, '').slice(0, 6));
                  if (errors.code) setErrors((p) => ({ ...p, code: false }));
                }}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={submit}
              />

              <View style={s.registerInfoBox}>
                <Text style={s.registerInfoTitle}>Единый аккаунт</Text>
                <Text style={s.registerInfoText}>
                  После регистрации профиль будет доступен в Preview, СледиЗА и СделайЗА.
                </Text>
              </View>

              <TouchableOpacity activeOpacity={0.9} style={s.registerBtn} onPress={submit}>
                <Text style={s.registerBtnText}>Зарегистрироваться</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={cityOpen} onRequestClose={() => setCityOpen(false)}>
        <View style={s.cityModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setCityOpen(false)}
          />

          <View style={s.cityModalCard}>
            <View style={s.cityModalHeader}>
              <Text style={s.cityModalTitle}>Выберите город</Text>

              <TouchableOpacity onPress={() => setCityOpen(false)}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {CITY_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.85}
                  style={s.cityOption}
                  onPress={() => {
                    setCity(item);
                    setCityOpen(false);
                    if (errors.city) setErrors((p) => ({ ...p, city: false }));
                  }}
                >
                  <Text style={s.cityOptionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const PostCard = ({
  post,
  onUser,
  onComment,
}: {
  post: Post;
  onUser?: (u: User) => void;
  onComment?: (p: Post) => void;
}) => {
  const user = USERS.find((u) => u.id === post.userId);
  const [liked, setLiked] = useState(post.liked);
  const [saved, setSaved] = useState(post.saved);
  const [lc, setLc] = useState(post.likes);

  if (!user) return null;

  return (
    <View style={s.post}>
      <View style={s.postHead}>
        <TouchableOpacity style={s.postUserRow} onPress={() => onUser?.(user)}>
          <View style={s.avatar}>
            <Text style={{ fontSize: 22 }}>{user.avatar}</Text>
            <View style={s.avatarDot}>
              <Text style={{ fontSize: 8, color: rColor(user.rating) }}>●</Text>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.userName}>{user.name}</Text>
              {user.verified ? <Text style={s.verified}>✓</Text> : null}
              <RatingBadge rating={user.rating} />
            </View>

            <Text style={s.handle}>
              {user.handle} · {post.time}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={s.moreBtn}>⋯</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.postText}>{post.text}</Text>

      {post.image ? <MockImage type={post.image} style={s.postImg} /> : null}

      <View style={s.actions}>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => {
            setLiked(!liked);
            setLc(liked ? lc - 1 : lc + 1);
          }}
        >
          <Text style={{ fontSize: 18 }}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={[s.actionCount, liked ? { color: C.like } : null]}>{fmt(lc)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => onComment?.(post)}>
          <Text style={{ fontSize: 18 }}>💬</Text>
          <Text style={s.actionCount}>{fmt(post.comments)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn}>
          <Text style={{ fontSize: 18 }}>🔄</Text>
          <Text style={s.actionCount}>{fmt(post.reposts)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => setSaved(!saved)}>
          <Text style={{ fontSize: 18 }}>{saved ? '🔖' : '📄'}</Text>
          <Text style={[s.actionCount, saved ? { color: C.accent } : null]}>{fmt(post.saves)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CommentsModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const [txt, setTxt] = useState('');

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={s.modalBottom}>
        <View style={s.modalPanel}>
          <View style={s.modalHandle} />

          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Комментарии</Text>

            <TouchableOpacity onPress={onClose}>
              <Text style={s.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            {COMMENTS.map((c) => {
              const u = USERS.find((x) => x.id === c.userId);
              if (!u) return null;

              return (
                <View key={c.id} style={s.commentItem}>
                  <Text style={{ fontSize: 28, marginTop: 2 }}>{u.avatar}</Text>

                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.commentName}>{u.name}</Text>
                      <RatingBadge rating={u.rating} />
                      <Text style={s.commentTime}>{c.time}</Text>
                    </View>

                    <Text style={s.commentText}>{c.text}</Text>

                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <Text style={s.commentMeta}>🤍 {c.likes}</Text>
                      <Text style={[s.commentMeta, { fontWeight: '600' }]}>Ответить</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={s.commentInputRow}>
            <TextInput
              style={s.commentInput}
              placeholder="Написать комментарий..."
              placeholderTextColor={C.textMut}
              value={txt}
              onChangeText={setTxt}
            />

            <TouchableOpacity style={[s.sendBtn, !txt ? { opacity: 0.4 } : null]} disabled={!txt}>
              <Text style={{ fontSize: 16, color: '#FFF' }}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const UserModal = ({
  visible,
  onClose,
  user,
}: {
  visible: boolean;
  onClose: () => void;
  user: User | null;
}) => {
  const [fw, setFw] = useState(user?.isFollowing || false);

  useEffect(() => {
    setFw(user?.isFollowing || false);
  }, [user]);

  if (!visible || !user) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={s.modalBottom}>
        <View style={s.modalPanel}>
          <View style={s.modalHandle} />

          <TouchableOpacity
            style={{ position: 'absolute', top: 16, right: 20, zIndex: 10 }}
            onPress={onClose}
          >
            <Text style={s.closeBtn}>✕</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center', paddingTop: 8, paddingHorizontal: 24, paddingBottom: 20 }}>
            <View style={s.profileAvatarLg}>
              <Text style={{ fontSize: 40 }}>{user.avatar}</Text>
            </View>

            <Text style={s.profileName}>
              {user.name} {user.verified ? '✓' : ''}
            </Text>

            <Text style={s.profileHandle}>{user.handle}</Text>

            <RatingBadge rating={user.rating} size="large" showBreakdown breakdown={user.ratingBreakdown} />

            <Text style={s.profileBio}>{user.bio}</Text>

            <View style={s.profileStats}>
              {[
                { val: user.posts, label: 'Постов' },
                { val: user.followers, label: 'Подписчиков' },
                { val: user.following, label: 'Подписок' },
              ].map((item, i) => (
                <View key={i} style={s.profileStat}>
                  <Text style={s.profileStatNum}>{fmt(item.val)}</Text>
                  <Text style={s.profileStatLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[s.followBtn, fw ? s.followingBtn : null]} onPress={() => setFw(!fw)}>
              <Text style={[s.followBtnText, fw ? s.followingBtnText : null]}>
                {fw ? 'Подписан' : 'Подписаться'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const FeedScreen = ({
  onUser,
  onComment,
}: {
  onUser: (u: User) => void;
  onComment: (p: Post) => void;
}) => (
  <FlatList
    data={POSTS}
    keyExtractor={(i) => i.id.toString()}
    renderItem={({ item }) => <PostCard post={item} onUser={onUser} onComment={onComment} />}
    ItemSeparatorComponent={() => <View style={s.sep} />}
    contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
    showsVerticalScrollIndicator={false}
  />
);

const RadarPulseRings = () => {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 2600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = createLoop(ring1, 0);
    const a2 = createLoop(ring2, 850);
    const a3 = createLoop(ring3, 1700);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [ring1, ring2, ring3]);

  const renderRing = (value: Animated.Value, size: number) => {
    const scale = value.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 3.4],
    });

    const opacity = value.interpolate({
      inputRange: [0, 0.55, 1],
      outputRange: [0.85, 0.35, 0],
    });

    return (
      <Animated.View
        style={[
          s.radarPulseRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
    );
  };

  return (
    <View pointerEvents="none" style={s.radarPulseLayer}>
      {renderRing(ring1, 120)}
      {renderRing(ring2, 120)}
      {renderRing(ring3, 120)}
    </View>
  );
};

const RadarScreen = ({ onUser }: { onUser: (u: User) => void }) => {
  const nearbyUsers = [
    {
      user: USERS[1],
      style: s.radarPersonTop,
      distance: '120 м',
      note: 'Прошла рядом с вами',
    },
    {
      user: USERS[3],
      style: s.radarPersonRight,
      distance: '240 м',
      note: 'Рядом в экосистеме',
    },
    {
      user: USERS[0],
      style: s.radarPersonLeft,
      distance: '310 м',
      note: 'Включил видимость',
    },
    {
      user: USERS[2],
      style: s.radarPersonBottom,
      distance: '450 м',
      note: 'Недавно был рядом',
    },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={s.radarHeader}>
        <Text style={s.radarTitle}>Радар</Text>
        <Text style={s.radarSubtitle}>
          Показывает людей рядом, если они включили видимость в экосистеме.
        </Text>
      </View>

      <View style={s.radarCard}>
        <View style={s.radarMap}>
          <RadarPulseRings />

          <View style={s.radarCircle1} />
          <View style={s.radarCircle2} />
          <View style={s.radarCircle3} />

          <View style={[s.radarPerson, s.radarPersonCenter]}>
            <Text style={s.radarPersonAvatar}>🧑‍💼</Text>
          </View>

          {nearbyUsers.map((item) => (
            <TouchableOpacity
              key={item.user.id}
              activeOpacity={0.9}
              style={[s.radarPerson, item.style]}
              onPress={() => onUser(item.user)}
            >
              <Text style={s.radarPersonAvatar}>{item.user.avatar}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={s.section}>Рядом с вами</Text>

      {nearbyUsers.map((item) => (
        <TouchableOpacity
          key={`nearby_${item.user.id}`}
          activeOpacity={0.9}
          style={s.radarNearbyRow}
          onPress={() => onUser(item.user)}
        >
          <View style={s.radarNearbyAvatar}>
            <Text style={{ fontSize: 24 }}>{item.user.avatar}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.radarNearbyName}>{item.user.name}</Text>
              {item.user.verified ? <Text style={s.verified}>✓</Text> : null}
            </View>

            <Text style={s.radarNearbyText}>
              {item.note} · {item.distance}
            </Text>
          </View>

          <RatingBadge rating={item.user.rating} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const CreateScreen = ({ onOpenRegister }: { onOpenRegister: () => void }) => {
  const { profile } = useContext(EcosystemContext);
  const [txt, setTxt] = useState('');
  const [ok, setOk] = useState(false);

  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>✍️</Text>

        <Text style={{ fontWeight: '800', color: C.text, fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
          Вы не авторизованы
        </Text>

        <Text style={{ color: C.textSec, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
          Зарегистрируйтесь, чтобы публиковать посты и общаться.
        </Text>

        <TouchableOpacity
          style={[s.publishBtn, { paddingHorizontal: 32, paddingVertical: 14 }]}
          onPress={onOpenRegister}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Регистрация</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = profile.name || 'Вы';

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
      {ok ? (
        <View style={s.successBanner}>
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>
            ✅ Пост опубликован!
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Text style={{ fontSize: 32 }}>{ME.avatar}</Text>

        <View style={{ flex: 1 }}>
          <Text style={s.userName}>{displayName}</Text>
          <Text style={s.handle}>{ME.handle}</Text>
        </View>

        <TouchableOpacity
          style={[s.publishBtn, !txt.trim() ? { opacity: 0.4 } : null]}
          disabled={!txt.trim()}
          onPress={() => {
            setOk(true);
            setTxt('');
            setTimeout(() => setOk(false), 2000);
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Опубликовать</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={s.createInput}
        placeholder="Что нового?"
        placeholderTextColor={C.textMut}
        multiline
        value={txt}
        onChangeText={setTxt}
        textAlignVertical="top"
      />

      <View style={s.toolbar}>
        {['📷', '🎥', '📊', '📍', '😀'].map((icon, i) => (
          <TouchableOpacity key={i} style={s.toolBtn}>
            <Text style={{ fontSize: 22 }}>{icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontSize: 13, color: C.textMut, textAlign: 'right', marginTop: 12 }}>
        {txt.length} / 500
      </Text>
    </View>
  );
};

const NotifyScreen = ({ onUser }: { onUser: (u: User) => void }) => (
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
    <Text style={s.section}>Уведомления</Text>

    {NOTIFICATIONS.map((n) => {
      const u = USERS.find((x) => x.id === n.userId);
      if (!u) return null;

      return (
        <TouchableOpacity key={n.id} style={s.notifItem} onPress={() => onUser(u)}>
          <Text style={{ fontSize: 20 }}>{nIcon(n.type)}</Text>
          <Text style={{ fontSize: 28 }}>{u.avatar}</Text>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: C.textSec, lineHeight: 20 }}>
              <Text style={{ fontWeight: '700', color: C.text }}>{u.name}</Text> {n.text}
            </Text>
            <Text style={{ fontSize: 12, color: C.textMut, marginTop: 2 }}>{n.time}</Text>
          </View>

          <RatingBadge rating={u.rating} />
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const ProfileScreen = ({ onOpenRegister }: { onOpenRegister: () => void }) => {
  const { profile, setProfile } = useContext(EcosystemContext);
  const [tab, setTab] = useState('posts');
  const saved = POSTS.filter((p) => p.saved || p.liked).slice(0, 3);

  const handleLogout = () => {
    const run = () => setProfile(null);

    if (Platform.OS === 'web') {
      const ok = (globalThis as any)?.confirm?.('Вы хотите выйти из аккаунта?');
      if (ok) run();
      return;
    }

    Alert.alert('Выход', 'Вы хотите выйти из аккаунта?', [
      { text: 'Нет', style: 'cancel' },
      { text: 'Да', style: 'destructive', onPress: run },
    ]);
  };

  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>👤</Text>

        <Text style={{ fontWeight: '800', color: C.text, fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
          Вы не авторизованы
        </Text>

        <Text style={{ color: C.textSec, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
          Зарегистрируйтесь, чтобы создавать посты и управлять профилем.
        </Text>

        <TouchableOpacity
          style={[s.publishBtn, { paddingHorizontal: 32, paddingVertical: 14 }]}
          onPress={onOpenRegister}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Регистрация</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = profile.name || 'Вы';
  const displayCity = profile.city || '';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={s.profileHeader}>
        <View style={s.profileAvatarLg}>
          <Text style={{ fontSize: 48 }}>{ME.avatar}</Text>
        </View>

        <Text style={s.profileName}>{displayName}</Text>
        <Text style={s.profileHandle}>{ME.handle}</Text>

        {displayCity ? (
          <Text style={{ fontSize: 13, color: C.textMut, marginBottom: 8 }}>📍 {displayCity}</Text>
        ) : null}

        <RatingBadge rating={ME.rating} size="large" showBreakdown breakdown={ME.ratingBreakdown} />

        <Text style={s.profileBio}>{ME.bio}</Text>

        <View style={s.profileStats}>
          {[
            { val: ME.posts, label: 'Постов' },
            { val: ME.followers, label: 'Подписчиков' },
            { val: ME.following, label: 'Подписок' },
          ].map((item, i) => (
            <View key={i} style={s.profileStat}>
              <Text style={s.profileStatNum}>{fmt(item.val)}</Text>
              <Text style={s.profileStatLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.editBtn}>
          <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>Редактировать профиль</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.editBtn, { marginTop: 12, borderWidth: 1, borderColor: C.like, backgroundColor: 'transparent' }]}
          onPress={handleLogout}
        >
          <Text style={{ color: C.like, fontWeight: '600', fontSize: 14 }}>Выйти</Text>
        </TouchableOpacity>
      </View>

      <View style={s.profileTabs}>
        {[
          { id: 'posts', label: 'Посты' },
          { id: 'media', label: 'Медиа' },
          { id: 'saved', label: 'Избранное' },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[s.profileTab, tab === t.id ? s.profileTabActive : null]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[s.profileTabText, tab === t.id ? s.profileTabTextActive : null]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ padding: 16 }}>
        {tab === 'posts' ? <Text style={s.empty}>Ваши посты будут здесь</Text> : null}

        {tab === 'media' ? (
          <View style={s.mediaGrid}>
            {['🎨', '📸', '🖼️', '🎭', '🌅', '🏙️'].map((e, i) => (
              <View key={i} style={s.mediaItem}>
                <Text style={{ fontSize: 32 }}>{e}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {tab === 'saved'
          ? saved.map((p) => {
              const u = USERS.find((x) => x.id === p.userId);

              return (
                <View key={p.id} style={s.savedItem}>
                  <Text style={{ fontSize: 28 }}>{u?.avatar}</Text>

                  <View style={{ flex: 1 }}>
                    <Text style={s.listName}>{u?.name}</Text>
                    <Text style={{ fontSize: 13, color: C.textSec, marginTop: 2 }} numberOfLines={2}>
                      {p.text}
                    </Text>
                  </View>
                </View>
              );
            })
          : null}
      </View>
    </ScrollView>
  );
};

export default function SlediZaApp() {
  const navigation = useNavigation<Nav>();
  const { profile } = useContext(EcosystemContext);

  const [activeTab, setActiveTab] = useState('feed');
  const [selUser, setSelUser] = useState<User | null>(null);
  const [selPost, setSelPost] = useState<Post | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  const tabConfig: Record<string, { icon: string; label: string }> = {
    feed: { icon: '🏠', label: 'Лента' },
    explore: { icon: '📡', label: 'Радар' },
    create: { icon: '➕', label: '' },
    notifications: { icon: '🔔', label: 'Уведом.' },
    profile: { icon: '👤', label: 'Профиль' },
  };

  const isRegistered = !!profile;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Preview');
            }
          }}
          style={s.headerLeft}
        >
          <Text style={{ fontSize: 28 }}>👁</Text>

          <View>
            <Text style={s.headerTitle}>СледиЗА</Text>
            <Text style={s.headerSub}>ЭКОСИСТЕМА</Text>
          </View>
        </TouchableOpacity>

        <View style={s.headerRight}>
          {isRegistered ? <RatingBadge rating={ME.rating} /> : null}

          <TouchableOpacity style={s.headerIcon}>
            <Text style={{ fontSize: 20 }}>✉️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'feed' ? <FeedScreen onUser={setSelUser} onComment={setSelPost} /> : null}
        {activeTab === 'explore' ? <RadarScreen onUser={setSelUser} /> : null}
        {activeTab === 'create' ? <CreateScreen onOpenRegister={() => setRegisterOpen(true)} /> : null}
        {activeTab === 'notifications' ? <NotifyScreen onUser={setSelUser} /> : null}
        {activeTab === 'profile' ? <ProfileScreen onOpenRegister={() => setRegisterOpen(true)} /> : null}
      </View>

      <View style={s.tabBar}>
        {Object.entries(tabConfig).map(([key, cfg]) => {
          const active = activeTab === key;
          const isCreate = key === 'create';

          return (
            <TouchableOpacity key={key} style={s.tabBarItem} onPress={() => setActiveTab(key)}>
              <View style={isCreate ? s.createBtnStyle : undefined}>
                <Text style={{ fontSize: isCreate ? 24 : 22, opacity: active ? 1 : 0.5 }}>
                  {cfg.icon}
                </Text>
              </View>

              {!isCreate ? (
                <Text style={[s.tabBarLabel, active ? s.tabBarLabelActive : null]}>{cfg.label}</Text>
              ) : null}

              {active && !isCreate ? <View style={s.tabBarIndicator} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <UserModal visible={!!selUser} onClose={() => setSelUser(null)} user={selUser} />
      <CommentsModal visible={!!selPost} onClose={() => setSelPost(null)} />
      <RegisterModal visible={registerOpen} onClose={() => setRegisterOpen(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 9, color: C.accent, fontWeight: '700', letterSpacing: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    backgroundColor: C.bg,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    height: Platform.OS === 'ios' ? 90 : 70,
    alignItems: 'center',
  },
  tabBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBarLabel: { fontSize: 10, color: C.textMut, marginTop: 4 },
  tabBarLabelActive: { color: C.text, fontWeight: '600' },
  tabBarIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
  createBtnStyle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  post: { backgroundColor: C.card, paddingVertical: 16, paddingHorizontal: 16 },
  sep: { height: 8, backgroundColor: '#000' },
  postHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postUserRow: { flexDirection: 'row', gap: 12, flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: C.bg,
    borderRadius: 6,
    padding: 2,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { color: C.text, fontWeight: '700', fontSize: 15 },
  verified: { color: C.accentLight, fontSize: 12 },
  handle: { color: C.textMut, fontSize: 13 },
  moreBtn: { fontSize: 20, color: C.textMut, padding: 4 },
  postText: { color: C.text, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  postImg: { width: '100%', height: 220, borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 20 },
  actionCount: { fontSize: 13, color: C.textSec },

  ratBadge: { borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  ratBadgeText: { fontWeight: '800' },
  ratBreakdown: { marginTop: 12, width: '100%', gap: 6 },
  ratRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.elevated,
    padding: 8,
    borderRadius: 8,
  },
  ratLabel: { color: C.textSec, fontSize: 12, flex: 1 },
  ratValue: { fontWeight: '700', fontSize: 12 },

  radarHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  radarTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: C.text,
    marginBottom: 8,
  },
  radarSubtitle: {
    fontSize: 15,
    color: C.textSec,
    fontWeight: '600',
    lineHeight: 22,
  },
  radarCard: {
    marginHorizontal: 12,
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  radarMap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: '#070711',
    borderWidth: 1,
    borderColor: C.accent,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarPulseLayer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 1,
    height: 1,
    zIndex: 1,
  },
  radarPulseRing: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 2,
    borderColor: 'rgba(16,185,129,0.85)',
    backgroundColor: 'rgba(16,185,129,0.05)',
    shadowColor: C.success,
    shadowOpacity: 0.75,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  radarCircle1: {
    position: 'absolute',
    width: '35%',
    height: '35%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.65)',
    zIndex: 2,
  },
  radarCircle2: {
    position: 'absolute',
    width: '62%',
    height: '62%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.5)',
    zIndex: 2,
  },
  radarCircle3: {
    position: 'absolute',
    width: '88%',
    height: '88%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    zIndex: 2,
  },
  radarPerson: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.elevated,
    borderWidth: 2,
    borderColor: C.success,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    shadowColor: C.success,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  radarPersonCenter: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: C.accent,
    borderColor: '#FFFFFF',
    left: '50%',
    top: '50%',
    marginLeft: -33,
    marginTop: -33,
  },
  radarPersonTop: {
    left: '48%',
    top: '14%',
    marginLeft: -26,
  },
  radarPersonRight: {
    right: '22%',
    top: '45%',
    marginTop: -26,
  },
  radarPersonLeft: {
    left: '23%',
    top: '55%',
    marginTop: -26,
  },
  radarPersonBottom: {
    left: '54%',
    bottom: '20%',
    marginLeft: -26,
  },
  radarPersonAvatar: {
    fontSize: 24,
  },
  radarNearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  radarNearbyAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  radarNearbyName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  radarNearbyText: {
    fontSize: 13,
    color: C.textMut,
    marginTop: 3,
  },

  section: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  listName: { fontSize: 15, fontWeight: '600', color: C.text },

  createInput: { fontSize: 17, color: C.text, minHeight: 150, lineHeight: 24 },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishBtn: { backgroundColor: C.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  successBanner: { backgroundColor: C.success, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginBottom: 12 },

  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },

  profileHeader: { alignItems: 'center', padding: 24, borderBottomWidth: 0.5, borderBottomColor: C.border },
  profileAvatarLg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: C.accent,
  },
  profileName: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 4 },
  profileHandle: { fontSize: 16, color: C.accentLight, marginBottom: 16 },
  profileBio: {
    fontSize: 14,
    color: C.textSec,
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  profileStats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: 20 },
  profileStat: { alignItems: 'center' },
  profileStatNum: { fontSize: 18, fontWeight: '700', color: C.text },
  profileStatLabel: { fontSize: 12, color: C.textMut },
  editBtn: {
    backgroundColor: C.elevated,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  profileTabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.border },
  profileTab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  profileTabActive: { borderBottomWidth: 2, borderBottomColor: C.accent },
  profileTabText: { fontSize: 14, color: C.textMut, fontWeight: '600' },
  profileTabTextActive: { color: C.text },
  empty: { textAlign: 'center', color: C.textMut, fontSize: 15, marginTop: 40 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mediaItem: {
    width: (SCREEN_WIDTH - 40) / 3,
    height: (SCREEN_WIDTH - 40) / 3,
    backgroundColor: C.elevated,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },

  modalBottom: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalPanel: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderLight,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  closeBtn: { fontSize: 20, color: C.textMut, fontWeight: '300' },

  commentItem: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  commentName: { fontSize: 14, fontWeight: '700', color: C.text },
  commentTime: { fontSize: 12, color: C.textMut },
  commentText: { fontSize: 14, color: C.textSec, marginTop: 4, lineHeight: 20 },
  commentMeta: { fontSize: 13, color: C.textMut },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: C.input,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  followBtn: { backgroundColor: C.accent, paddingHorizontal: 40, paddingVertical: 12, borderRadius: 24, marginTop: 20 },
  followBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border },
  followingBtnText: { color: C.textSec },

  registerPanel: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  registerHint: {
    color: C.textSec,
    fontWeight: '700',
    marginBottom: 10,
  },
  registerLabel: {
    color: C.textSec,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  registerInput: {
    height: 46,
    borderRadius: 14,
    backgroundColor: C.input,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    color: C.text,
    fontWeight: '700',
  },
  registerInputError: {
    borderColor: C.like,
  },
  registerInfoBox: {
    marginTop: 14,
    backgroundColor: C.elevated,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  registerInfoTitle: {
    color: C.text,
    fontWeight: '900',
  },
  registerInfoText: {
    marginTop: 4,
    color: C.textSec,
    fontWeight: '700',
    lineHeight: 18,
  },
  registerBtn: {
    marginTop: 16,
    backgroundColor: C.accent,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },

  citySelectBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: C.input,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  citySelectText: {
    color: C.text,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  citySelectPlaceholder: {
    color: C.textMut,
  },
  citySelectArrow: {
    color: C.textSec,
    fontSize: 18,
    marginLeft: 10,
  },
  cityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  cityModalCard: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.72,
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  cityModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cityModalTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '900',
  },
  cityOption: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  cityOptionText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
