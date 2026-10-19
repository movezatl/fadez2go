import type { Level, WeightClass } from './types';

export const SPORTS = [
  { slug: 'boxing', name: 'Boxing' },
  { slug: 'muay_thai', name: 'Muay Thai' },
  { slug: 'kickboxing', name: 'Kickboxing' },
  { slug: 'bjj_gi', name: 'BJJ (gi)' },
  { slug: 'bjj_nogi', name: 'BJJ (no-gi)' },
  { slug: 'wrestling', name: 'Wrestling' },
  { slug: 'mma', name: 'MMA' },
  { slug: 'judo', name: 'Judo' },
  { slug: 'karate', name: 'Karate' },
  { slug: 'taekwondo', name: 'Taekwondo' },
  { slug: 'sambo', name: 'Sambo' },
  { slug: 'sanda', name: 'Kung Fu / Sanda' },
  { slug: 'other', name: 'Other' },
] as const;

export const sportName = (slug: string) => SPORTS.find((s) => s.slug === slug)?.name ?? slug;

export const LEVELS: { value: Level; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: '1-3', label: '1–3 yrs' },
  { value: '3+', label: '3+ yrs' },
  { value: 'amateur', label: 'Amateur competitor' },
  { value: 'pro', label: 'Pro' },
];

export const levelLabel = (v: string) => LEVELS.find((l) => l.value === v)?.label ?? v;

export const WEIGHT_CLASSES: { value: WeightClass; label: string; range: string }[] = [
  { value: 'flyweight', label: 'Flyweight', range: 'up to 125 lb' },
  { value: 'bantamweight', label: 'Bantamweight', range: '126–135 lb' },
  { value: 'featherweight', label: 'Featherweight', range: '136–145 lb' },
  { value: 'lightweight', label: 'Lightweight', range: '146–155 lb' },
  { value: 'welterweight', label: 'Welterweight', range: '156–170 lb' },
  { value: 'middleweight', label: 'Middleweight', range: '171–185 lb' },
  { value: 'light_heavyweight', label: 'Light heavyweight', range: '186–205 lb' },
  { value: 'heavyweight', label: 'Heavyweight', range: '206 lb and up' },
];

export const weightLabel = (v: string | null) => WEIGHT_CLASSES.find((w) => w.value === v)?.label ?? '';

export const SESSIONS = [
  { value: 'technical', label: 'Technical' },
  { value: 'hard_sparring', label: 'Hard sparring' },
  { value: 'drilling', label: 'Drilling' },
  { value: 'hobby', label: 'Hobby rounds' },
] as const;

export const sessionLabel = (v: string) => SESSIONS.find((s) => s.value === v)?.label ?? v;

export const INTENSITIES = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const;

export const intensityLabel = (v: string) => INTENSITIES.find((s) => s.value === v)?.label ?? v;

export const GEAR = [
  { value: 'gloves', label: 'Gloves' },
  { value: 'headgear', label: 'Headgear' },
  { value: 'mouthguard', label: 'Mouthguard' },
  { value: 'shin_guards', label: 'Shin guards' },
  { value: 'groin_guard', label: 'Groin guard' },
  { value: 'rash_guard', label: 'Rash guard' },
  { value: 'gi', label: 'Gi' },
] as const;

export const gearLabel = (v: string) => GEAR.find((g) => g.value === v)?.label ?? v;

export const GOALS = [
  { value: 'technique', label: 'Technique' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'fight_prep', label: 'Fight prep' },
  { value: 'hobby', label: 'Hobby' },
] as const;

export const goalLabel = (v: string) => GOALS.find((g) => g.value === v)?.label ?? v;

export const DISTANCES_MI = [5, 15, 30, 50] as const;

export const REPORT_REASONS = [
  { value: 'threats', label: 'Threats or violence outside training' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'unsafe_conduct', label: 'Unsafe behavior' },
  { value: 'injury_or_assault', label: 'Injury or assault' },
  { value: 'money_or_betting', label: 'Money or betting' },
  { value: 'minor', label: 'Under 18' },
  { value: 'intimate_images', label: 'Intimate images' },
  { value: 'fake_gym', label: 'Fake gym or profile' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Something else' },
] as const;
