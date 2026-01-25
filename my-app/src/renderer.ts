import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import "./index.css";

type PortionRecord = {
  id: string;
  category: 'Sauce' | 'Cheese' | 'Topping' | 'Pasta';
  crust: string;
  item: string;
  size: string;
  amount: number;
  detail?: string;
  note?: string;
  unit?: string;
  toppingLabel?: string;
};

type OrderModifier = {
  id: string;
  label: string;
  target: 'sauce' | 'pizza-cheese' | 'provolone' | null;
  multiplier: number;
  description: string;
};

type PizzaOrder = {
  kind: 'Pizza';
  crust: string;
  dataCrust: string;
  size: string;
  toppings: string[];
  toppingLabel: string | null;
  sauce: PortionRecord;
  cheeses: PortionRecord[];
  toppingRecords: PortionRecord[];
  modifier: OrderModifier;
  specialtyName?: string;
};

type PastaOrder = {
  kind: 'Pasta';
  recipe: string;
  size: string;
  records: PortionRecord[];
};

type GameOrder = PizzaOrder | PastaOrder;

type AppView = 'menu' | 'game' | 'leaderboard' | 'reference' | 'about' | 'finish';

type QuizField = {
  id: string;
  expected: number;
  record: PortionRecord;
  label: string;
  hint: string;
  input: HTMLInputElement;
  container: HTMLDivElement;
  result: HTMLSpanElement;
};

const HAND_TOSSED_SIZES = ['10"', '12"', '14"'] as const;
const THIN_CRUST_SIZES = ['12"', '14"'] as const;
const GLUTEN_FREE_SIZES = ['10"'] as const;
const NEW_YORK_SIZES = ['12"', '14"', '16"'] as const;
const PAN_SIZE = ['12"'] as const;
const PASTA_SIZE = ['Tin'] as const;
const TOPPING_LABELS = ['1 topping', '2 toppings', '3 toppings', '4+ toppings'] as const;
type ToppingBandKey = 'single' | 'twoThree' | 'fourPlus';

const TOPPING_BAND_LABEL: Record<ToppingBandKey, string> = {
  single: '1 topping portion',
  twoThree: '2-3 topping portion',
  fourPlus: '4+ topping portion',
};

const TOPPING_PORTION_SIZES = ['10"', '12"', '14"', '16"'] as const;

const buildToppingSizeMap = (values: [number, number, number, number]): Record<string, number> => ({
  '10"': values[0],
  '12"': values[1],
  '14"': values[2],
  '16"': values[3],
});

type ToppingCategoryData = {
  name: string;
  toppings: string[];
  ounces: Record<ToppingBandKey, Record<string, number>>;
};

const TOPPING_CATEGORIES: ToppingCategoryData[] = [
  {
    name: 'Philly Steak & Bacon',
    toppings: ['Philly Steak', 'Bacon'],
    ounces: {
      single: buildToppingSizeMap([2.0, 2.5, 3.5, 5.0]),
      twoThree: buildToppingSizeMap([1.5, 2.0, 2.5, 3.5]),
      fourPlus: buildToppingSizeMap([1.0, 1.5, 2.0, 2.5]),
    },
  },
  {
    name: 'Sausage / Beef / Chicken / Mushroom / Pineapple / Tomato',
    toppings: ['Sausage', 'Beef', 'Chicken', 'Mushroom', 'Pineapple', 'Tomato'],
    ounces: {
      single: buildToppingSizeMap([2.5, 3.5, 5.0, 6.5]),
      twoThree: buildToppingSizeMap([1.5, 2.5, 3.5, 4.5]),
      fourPlus: buildToppingSizeMap([1.0, 1.5, 2.0, 2.5]),
    },
  },
  {
    name: 'Onion / Green Pepper / Black Olives / Banana Pepper / Jalapeno',
    toppings: ['Onion', 'Green Pepper', 'Black Olives', 'Banana Pepper', 'Jalapeno'],
    ounces: {
      single: buildToppingSizeMap([1.5, 2.0, 3.0, 4.0]),
      twoThree: buildToppingSizeMap([1.0, 1.5, 2.0, 2.5]),
      fourPlus: buildToppingSizeMap([0.5, 1.0, 1.5, 2.0]),
    },
  },
];

const TOPPING_CATEGORY_LOOKUP = new Map<string, ToppingCategoryData>();
TOPPING_CATEGORIES.forEach((category) => {
  category.toppings.forEach((topping) => {
    TOPPING_CATEGORY_LOOKUP.set(topping, category);
  });
});

const TOPPING_LIBRARY = Array.from(TOPPING_CATEGORY_LOOKUP.keys());

const ORDER_MODIFIERS: OrderModifier[] = [
  {
    id: 'standard',
    label: 'Bake it standard',
    target: null,
    multiplier: 1,
    description: 'No changes - follow the normal chart.',
  },
  {
    id: 'extra-sauce',
    label: 'Extra sauce',
    target: 'sauce',
    multiplier: 1.5,
    description: 'Add 50% more sauce than standard.',
  },
  {
    id: 'light-sauce',
    label: 'Light sauce',
    target: 'sauce',
    multiplier: 0.5,
    description: 'Use 50% less sauce than standard.',
  },
  {
    id: 'extra-cheese',
    label: 'Extra pizza cheese',
    target: 'pizza-cheese',
    multiplier: 1.5,
    description: 'Add 50% more pizza cheese on every layer.',
  },
  {
    id: 'light-cheese',
    label: 'Light pizza cheese',
    target: 'pizza-cheese',
    multiplier: 0.5,
    description: 'Use 50% less pizza cheese.',
  },
  {
    id: 'extra-provolone',
    label: 'Extra provolone',
    target: 'provolone',
    multiplier: 1.5,
    description: 'Add 50% more shredded provolone.',
  },
];

const formatAmount = (amount: number) =>
  Number.isInteger(amount) ? amount.toString() : amount.toFixed(1);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const LEADERBOARD_TABLE = 'leaderboard_entries';
const PLAYER_NAME_KEY = 'dominos.playerName';
const BEST_SCORE_KEY = 'dominos.bestScore';
const BEST_STREAK_KEY = 'dominos.bestStreak';
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 18;
const NAME_PATTERN = /^[a-z0-9 ]+$/i;
const BANNED_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'ass',
  'dick',
  'pussy',
  'cunt',
];
const LEADERBOARD_LIMIT = 10;
const MAX_ORDERS = 20;

const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const sampleUnique = (count: number, pool: string[]): string[] => {
  const copy = [...pool];
  const out: string[] = [];
  for (let i = 0; i < count && copy.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * copy.length);
    const [value] = copy.splice(idx, 1);
    out.push(value);
  }
  return out;
};

const getToppingLabel = (count: number): string | null => {
  if (count <= 0) return null;
  if (count === 1) return '1 topping';
  if (count === 2) return '2 toppings';
  if (count === 3) return '3 toppings';
  return '4+ toppings';
};

const sanitizeId = (value: string) =>
  value.replace(/"/g, 'inch').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const loadNumber = (key: string) => {
  const raw = localStorage.getItem(key);
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const loadName = () => localStorage.getItem(PLAYER_NAME_KEY) ?? '';

const isNameClean = (value: string) => {
  const normalized = normalizeName(value);
  return !BANNED_WORDS.some((word) => normalized.includes(word));
};

const validatePlayerName = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length < NAME_MIN_LENGTH || trimmed.length > NAME_MAX_LENGTH) {
    return `Name must be ${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} characters.`;
  }
  if (!NAME_PATTERN.test(trimmed)) {
    return 'Use letters, numbers, and spaces only.';
  }
  if (!isNameClean(trimmed)) {
    return 'Choose a different name.';
  }
  return null;
};

const getRedirectUrl = () => new URL('.', location.href).href;

type BuildPortionOptions = {
  category: PortionRecord['category'];
  crust: string;
  item: string;
  detail?: string;
  sizes: readonly string[];
  amounts: number[];
  note?: string;
  unit?: string;
  crustType?: 'hand-tossed' | 'thin' | 'new-york' | 'pan' | 'gluten-free';
};

const buildPortionSet = (options: BuildPortionOptions): PortionRecord[] => {
  if (options.amounts.length !== options.sizes.length) {
    throw new Error(`Portion data mismatch for ${options.item}`);
  }

  return options.sizes.map((size, index) => ({
    id: sanitizeId(
      `${options.category}-${options.item}-${options.detail ?? 'standard'}-${size}-${options.crust}`,
    ),
    category: options.category,
    crust: options.crust,
    item: options.item,
    detail: options.detail,
    size,
    amount: Number(options.amounts[index]),
    note: options.note,
    unit: options.unit ?? 'oz',
  }));
};

const basePortionRecords: PortionRecord[] = [
  ...buildPortionSet({
    category: 'Sauce',
    crust: 'Hand Tossed / Thin',
    item: 'Pizza Sauce',
    sizes: HAND_TOSSED_SIZES,
    amounts: [3.0, 4.2, 6.0],
    note: 'Standard ladle weights for 10-14 inch dough.',
  }),
  ...buildPortionSet({
    category: 'Sauce',
    crust: 'Hand Tossed / Thin',
    item: 'Pacific Veggie Sauce',
    sizes: HAND_TOSSED_SIZES,
    amounts: [1.5, 3.0, 4.0],
  }),
  ...buildPortionSet({
    category: 'Sauce',
    crust: 'Hand Tossed / Thin',
    item: 'Honey BBQ Sauce',
    sizes: HAND_TOSSED_SIZES,
    amounts: [1.5, 2.5, 3.5],
  }),
  ...buildPortionSet({
    category: 'Sauce',
    crust: 'Hand Tossed / Thin',
    item: 'Alfredo / Garlic Parm / Ranch Sauce',
    sizes: HAND_TOSSED_SIZES,
    amounts: [1.5, 3.0, 4.0],
  }),
  ...buildPortionSet({
    category: 'Sauce',
    crust: 'New York Style',
    item: 'Pizza Sauce',
    sizes: NEW_YORK_SIZES,
    amounts: [4.2, 6.0, 8.0],
    note: 'Same ladle as standard dough stretched to NY size.',
  }),
  ...buildPortionSet({
    category: 'Sauce',
    crust: 'Pan',
    item: 'Pan Sauce',
    detail: 'Standard portion',
    sizes: PAN_SIZE,
    amounts: [3.0],
    note: 'Use the pan-ladle swirl without touching the edge.',
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'Pan',
    item: 'Shredded Provolone',
    detail: 'Pan standard',
    sizes: PAN_SIZE,
    amounts: [4.0],
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'Pan',
    item: 'Pizza Cheese',
    detail: 'With toppings - bottom layer (regular)',
    sizes: PAN_SIZE,
    amounts: [3.0],
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'Pan',
    item: 'Pizza Cheese',
    detail: 'With toppings - top add-on',
    sizes: PAN_SIZE,
    amounts: [1.5],
    note: 'Only added after toppings go on the pizza.',
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'Pan',
    item: 'Pizza Cheese',
    detail: 'Just cheese - bottom layer',
    sizes: PAN_SIZE,
    amounts: [4.5],
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'Pan',
    item: 'Pizza Cheese',
    detail: 'Just cheese - top add-on',
    sizes: PAN_SIZE,
    amounts: [3.0],
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'New York Style',
    item: 'Pizza Cheese',
    detail: 'Standard portion',
    sizes: NEW_YORK_SIZES,
    amounts: [2.5, 3.5, 4.5],
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'New York Style',
    item: 'Shredded Provolone',
    detail: 'Standard portion',
    sizes: NEW_YORK_SIZES,
    amounts: [3.0, 4.0, 5.5],
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'Hand Tossed / Thin',
    item: 'Pizza Cheese',
    detail: 'With toppings - bottom layer (regular)',
    sizes: HAND_TOSSED_SIZES,
    amounts: [3.5, 5.0, 7.0],
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'Hand Tossed / Thin',
    item: 'Pizza Cheese',
    detail: 'With toppings - top add-on',
    sizes: HAND_TOSSED_SIZES,
    amounts: [1.5, 2.5, 3.5],
    note: 'Top layer rides on top of toppings.',
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'Hand Tossed / Thin',
    item: 'Pizza Cheese',
    detail: 'Just cheese - bottom layer',
    sizes: HAND_TOSSED_SIZES,
    amounts: [5.0, 7.5, 10.5],
  }),
  ...buildPortionSet({
    category: 'Cheese',
    crust: 'Hand Tossed / Thin',
    item: 'Pizza Cheese',
    detail: 'Just cheese - top add-on',
    sizes: HAND_TOSSED_SIZES,
    amounts: [2.0, 2.5, 3.5],
  }),
];

const pastaPortionRecords: PortionRecord[] = [
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Chicken Alfredo',
    item: 'Chicken',
    sizes: PASTA_SIZE,
    amounts: [2.0],
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Chicken Alfredo',
    item: 'Alfredo Sauce',
    sizes: PASTA_SIZE,
    amounts: [4.0],
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Italian Sausage Marinara',
    item: 'Pizza Sauce',
    sizes: PASTA_SIZE,
    amounts: [4.0],
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Italian Sausage Marinara',
    item: 'Italian Sausage',
    sizes: PASTA_SIZE,
    amounts: [2.0],
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Italian Sausage Marinara',
    item: 'Shredded Provolone',
    sizes: PASTA_SIZE,
    amounts: [1.5],
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: '5-Cheese Mac & Cheese',
    item: 'Pasta',
    sizes: PASTA_SIZE,
    amounts: [5.5],
    note: 'Tin only.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: '5-Cheese Mac & Cheese',
    item: 'American Cheese',
    detail: 'slices',
    sizes: PASTA_SIZE,
    amounts: [2],
    unit: 'slices',
    note: 'Tin only.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: '5-Cheese Mac & Cheese',
    item: 'Shredded Parm Asiago',
    sizes: PASTA_SIZE,
    amounts: [0.2],
    note: 'Tin only.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: '5-Cheese Mac & Cheese',
    item: 'Cheddar Cheese Blend',
    sizes: PASTA_SIZE,
    amounts: [2.0],
    note: 'Tin only.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: '5-Cheese Mac & Cheese',
    item: 'Alfredo Sauce',
    sizes: PASTA_SIZE,
    amounts: [4.0],
    note: 'Tin only.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: '5-Cheese Mac & Cheese',
    item: 'Jalapeno',
    detail: 'Optional add-on',
    sizes: PASTA_SIZE,
    amounts: [0.7],
    note: 'Add after American cheese.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: '5-Cheese Mac & Cheese',
    item: 'Bacon',
    detail: 'Optional add-on',
    sizes: PASTA_SIZE,
    amounts: [1.0],
    note: 'Add after American cheese.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Spicy Buffalo 5-Cheese Mac & Cheese',
    item: 'Pasta',
    sizes: PASTA_SIZE,
    amounts: [5.5],
    note: 'Tin only.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Spicy Buffalo 5-Cheese Mac & Cheese',
    item: 'American Cheese',
    detail: 'slices',
    sizes: PASTA_SIZE,
    amounts: [2],
    unit: 'slices',
    note: 'Tin only.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Spicy Buffalo 5-Cheese Mac & Cheese',
    item: 'Shredded Parm Asiago',
    sizes: PASTA_SIZE,
    amounts: [0.2],
    note: 'Tin only.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Spicy Buffalo 5-Cheese Mac & Cheese',
    item: 'Cheddar Cheese Blend',
    sizes: PASTA_SIZE,
    amounts: [2.0],
    note: 'Tin only.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Spicy Buffalo 5-Cheese Mac & Cheese',
    item: 'Alfredo Sauce',
    sizes: PASTA_SIZE,
    amounts: [4.0],
    note: 'Tin only.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Spicy Buffalo 5-Cheese Mac & Cheese',
    item: 'Jalapeno',
    detail: 'Optional add-on',
    sizes: PASTA_SIZE,
    amounts: [0.7],
    note: 'Add after American cheese.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Spicy Buffalo 5-Cheese Mac & Cheese',
    item: 'Bacon',
    detail: 'Optional add-on',
    sizes: PASTA_SIZE,
    amounts: [1.0],
    note: 'Add after American cheese.',
  }),
  ...buildPortionSet({
    category: 'Pasta',
    crust: 'Spicy Buffalo 5-Cheese Mac & Cheese',
    item: 'Hot Buffalo',
    detail: 'Post bake',
    sizes: PASTA_SIZE,
    amounts: [0.5],
  }),
];

basePortionRecords.push(...pastaPortionRecords);

const PASTA_RECIPES = new Map<string, PortionRecord[]>();
pastaPortionRecords.forEach((record) => {
  const existing = PASTA_RECIPES.get(record.crust);
  if (existing) {
    existing.push(record);
  } else {
    PASTA_RECIPES.set(record.crust, [record]);
  }
});

const glutenFreeExpandedRecords = basePortionRecords.flatMap((record) => {
  const matchesHandTossedTenInch = record.size === '10"' && record.crust === 'Hand Tossed / Thin';
  if (!matchesHandTossedTenInch) {
    return [record];
  }
  const glutenFreeNote = 'Gluten free crust only comes as a 10" pizza.';
  const combinedNote = record.note ? `${record.note} ${glutenFreeNote}` : glutenFreeNote;
  return [
    record,
    {
      ...record,
      id: `${record.id}-gluten-free`,
      crust: 'Gluten Free',
      note: combinedNote,
    },
  ];
});

const portionRecords: PortionRecord[] = glutenFreeExpandedRecords.flatMap((record) => {
  const needsToppingBreakdown =
    record.item === 'Pizza Cheese' && record.detail && /with toppings/i.test(record.detail);
  if (!needsToppingBreakdown) {
    return [record];
  }

  return TOPPING_LABELS.map((label) => ({
    ...record,
    id: `${record.id}-${sanitizeId(label)}`,
    toppingLabel: label,
    note: record.note ?? 'Cheese never counts as a topping here.',
  }));
});

const findRecords = (predicate: (record: PortionRecord) => boolean) =>
  portionRecords.filter(predicate);

const getCheeseRecordsForOrder = (
  crust: string,
  size: string,
  toppingLabel: string | null,
  toppingCount: number,
): PortionRecord[] => {
  const hasToppings = toppingCount > 0;
  const pick = (matcher: (record: PortionRecord) => boolean) =>
    portionRecords.find((record) => matcher(record));

  if (crust === 'Hand Tossed / Thin' || crust === 'Gluten Free') {
    if (hasToppings && toppingLabel) {
      const bottom = pick(
        (record) =>
          record.crust === crust &&
          record.size === size &&
          record.item === 'Pizza Cheese' &&
          record.toppingLabel === toppingLabel &&
          record.detail?.includes('bottom layer (regular)'),
      );
      const top = pick(
        (record) =>
          record.crust === crust &&
          record.size === size &&
          record.item === 'Pizza Cheese' &&
          record.toppingLabel === toppingLabel &&
          record.detail?.includes('top add-on'),
      );
      return [bottom, top].filter(Boolean) as PortionRecord[];
    }

    const bottom = pick(
      (record) =>
        record.crust === crust &&
        record.size === size &&
        record.item === 'Pizza Cheese' &&
        record.detail?.includes('Just cheese - bottom layer'),
    );
    const top = pick(
      (record) =>
        record.crust === crust &&
        record.size === size &&
        record.item === 'Pizza Cheese' &&
        record.detail?.includes('Just cheese - top add-on'),
    );
    return [bottom, top].filter(Boolean) as PortionRecord[];
  }

  if (crust === 'Pan') {
    if (hasToppings && toppingLabel) {
      const bottom = pick(
        (record) =>
          record.crust === 'Pan' &&
          record.item === 'Pizza Cheese' &&
          record.toppingLabel === toppingLabel &&
          record.detail?.includes('bottom layer (regular)'),
      );
      const top = pick(
        (record) =>
          record.crust === 'Pan' &&
          record.item === 'Pizza Cheese' &&
          record.toppingLabel === toppingLabel &&
          record.detail?.includes('top add-on'),
      );
      const prov = pick(
        (record) => record.crust === 'Pan' && record.item === 'Shredded Provolone',
      );
      return [bottom, top, prov].filter(Boolean) as PortionRecord[];
    }

    const bottom = pick(
      (record) =>
        record.crust === 'Pan' &&
        record.item === 'Pizza Cheese' &&
        record.detail?.includes('Just cheese - bottom layer'),
    );
    const top = pick(
      (record) =>
        record.crust === 'Pan' &&
        record.item === 'Pizza Cheese' &&
        record.detail?.includes('Just cheese - top add-on'),
    );
    const prov = pick(
      (record) => record.crust === 'Pan' && record.item === 'Shredded Provolone',
    );
    return [bottom, top, prov].filter(Boolean) as PortionRecord[];
  }

  if (crust === 'New York Style') {
    return findRecords(
      (record) => record.crust === 'New York Style' && record.size === size && record.category === 'Cheese',
    );
  }

  return [];
};

const getToppingBandKey = (count: number): ToppingBandKey => {
  if (count <= 1) {
    return 'single';
  }
  if (count <= 3) {
    return 'twoThree';
  }
  return 'fourPlus';
};

const buildToppingRecords = (toppings: string[], size: string, toppingCount: number): PortionRecord[] => {
  if (toppingCount <= 0) {
    return [];
  }
  const bandKey = getToppingBandKey(toppingCount);
  return toppings
    .map((name) => {
      const category = TOPPING_CATEGORY_LOOKUP.get(name);
      if (!category) {
        console.warn(`Missing topping data for ${name}`);
        return null;
      }
      const amount = category.ounces[bandKey][size];
      if (typeof amount !== 'number') {
        console.warn(`Missing topping data for ${name} at size ${size}`);
        return null;
      }
      return {
        id: sanitizeId(`topping-${name}-${bandKey}-${size}`),
        category: 'Topping',
        crust: 'Topping portion',
        item: name,
        detail: TOPPING_BAND_LABEL[bandKey],
        size,
        amount,
        note: `${category.name} chart`,
      };
    })
    .filter((record): record is PortionRecord => Boolean(record));
};

const chooseSauceRecord = (crust: string, size: string): PortionRecord => {
  const exact = findRecords(
    (record) => record.category === 'Sauce' && record.crust === crust && record.size === size,
  );
  if (exact.length > 0) {
    return randomItem(exact);
  }
  const fallback = findRecords(
    (record) => record.category === 'Sauce' && record.crust === 'Hand Tossed / Thin' && record.size === size,
  );
  if (fallback.length === 0) {
    throw new Error(`No sauce data for ${crust} ${size}`);
  }
  return randomItem(fallback);
};

type CrustOption = {
  label: string;
  dataCrust: string;
  sizes: readonly string[];
};

const CRUST_OPTIONS: CrustOption[] = [
  { label: 'Hand Tossed', dataCrust: 'Hand Tossed / Thin', sizes: HAND_TOSSED_SIZES },
  { label: 'Thin Crust', dataCrust: 'Hand Tossed / Thin', sizes: THIN_CRUST_SIZES },
  { label: 'Gluten Free', dataCrust: 'Gluten Free', sizes: GLUTEN_FREE_SIZES },
  { label: 'New York Style', dataCrust: 'New York Style', sizes: NEW_YORK_SIZES },
  { label: 'Pan', dataCrust: 'Pan', sizes: PAN_SIZE },
];

const pickModifier = (orderParts: { sauce: PortionRecord; cheeses: PortionRecord[] }) => {
  const available = ORDER_MODIFIERS.filter((modifier) => {
    if (modifier.target === null) return true;
    if (modifier.target === 'sauce') {
      return Boolean(orderParts.sauce);
    }
    if (modifier.target === 'pizza-cheese') {
      return orderParts.cheeses.some((record) => record.item === 'Pizza Cheese');
    }
    if (modifier.target === 'provolone') {
      return orderParts.cheeses.some((record) => /provolone/i.test(record.item));
    }
    return false;
  });
  const special = available.filter((modifier) => modifier.target !== null);
  const useSpecial = special.length > 0 && Math.random() < 0.55;
  if (!useSpecial) {
    return ORDER_MODIFIERS[0];
  }
  return randomItem(special);
};

const generatePizzaOrder = (includeSpecialRequest: boolean): PizzaOrder => {
  const crustOption = randomItem(CRUST_OPTIONS);
  const size = randomItem([...crustOption.sizes]);
  const toppingCount = randomInt(0, 4);
  const toppings = toppingCount === 0 ? [] : sampleUnique(toppingCount, TOPPING_LIBRARY);
  const toppingLabel = getToppingLabel(toppingCount);
  const sauce = chooseSauceRecord(crustOption.dataCrust, size);
  const cheeses = getCheeseRecordsForOrder(crustOption.dataCrust, size, toppingLabel, toppingCount);
  const toppingRecords = buildToppingRecords(toppings, size, toppingCount);
  const modifier = includeSpecialRequest ? pickModifier({ sauce, cheeses }) : ORDER_MODIFIERS[0];
  return {
    kind: 'Pizza',
    crust: crustOption.label,
    dataCrust: crustOption.dataCrust,
    size,
    toppings,
    toppingLabel,
    sauce,
    cheeses,
    toppingRecords,
    modifier,
  };
};

const generatePastaOrder = (): PastaOrder => {
  const recipes = Array.from(PASTA_RECIPES.keys());
  const recipe = randomItem(recipes);
  const records = PASTA_RECIPES.get(recipe) ?? [];
  return {
    kind: 'Pasta',
    recipe,
    size: 'Tin',
    records,
  };
};

const generateOrder = (includeSpecialRequest: boolean): GameOrder => {
  const usePasta = PASTA_RECIPES.size > 0 && Math.random() < 0.25;
  return usePasta ? generatePastaOrder() : generatePizzaOrder(includeSpecialRequest);
};

const applyModifier = (record: PortionRecord, modifier: OrderModifier | null) => {
  if (!modifier || modifier.multiplier === 1) {
    return record.amount;
  }
  if (modifier.target === 'sauce' && record.category === 'Sauce') {
    return record.amount * modifier.multiplier;
  }
  if (modifier.target === 'pizza-cheese' && record.item === 'Pizza Cheese') {
    return record.amount * modifier.multiplier;
  }
  if (modifier.target === 'provolone' && /provolone/i.test(record.item)) {
    return record.amount * modifier.multiplier;
  }
  return record.amount;
};

const createButton = (text: string, className: string) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  return button;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Renderer root missing');
}

const shell = document.createElement('main');
shell.className = 'game-shell';
shell.dataset.view = 'menu';
root.appendChild(shell);

const header = document.createElement('header');
header.className = 'game-header';
const headerContent = document.createElement('div');
headerContent.className = 'header-content';
const headerTitleWrap = document.createElement('div');
headerTitleWrap.className = 'header-title';
const title = document.createElement('h1');
title.textContent = "Domino's Portion Trainer";
const subtitle = document.createElement('p');
subtitle.textContent =
  'Work through 20 orders and score points for speed and accuracy. Finish the set, then replay to beat your best.';
const toppingsReminder = document.createElement('p');
toppingsReminder.className = 'topping-reminder';
toppingsReminder.textContent =
  'If you have any feedback for the site or ounces please let me know.';
headerTitleWrap.append(title, subtitle, toppingsReminder);
headerContent.append(headerTitleWrap);
header.append(headerContent);
shell.appendChild(header);

const setView = (view: AppView) => {
  shell.dataset.view = view;
};

const topNav = document.createElement('nav');
topNav.className = 'top-nav';
const navMenuButton = createButton('Menu', 'ghost-btn small-btn');
const navGameButton = createButton('Game', 'ghost-btn small-btn');
const navLeaderboardButton = createButton('Leaderboard', 'ghost-btn small-btn');
const navReferenceButton = createButton('Reference', 'ghost-btn small-btn');
const navAboutButton = createButton('About', 'ghost-btn small-btn');
topNav.append(
  navMenuButton,
  navGameButton,
  navLeaderboardButton,
  navReferenceButton,
  navAboutButton,
);
shell.appendChild(topNav);

const menuSection = document.createElement('section');
menuSection.className = 'menu-section';
menuSection.dataset.view = 'menu';
const menuHeader = document.createElement('div');
menuHeader.className = 'menu-header';
const menuTitleWrap = document.createElement('div');
menuTitleWrap.className = 'menu-title';
const menuTitle = document.createElement('h2');
menuTitle.textContent = 'Ready to train?';
const menuCopy = document.createElement('p');
menuCopy.textContent =
  'Pick a mode to jump in, review the reference sheets, or check the global leaderboard.';
menuTitleWrap.append(menuTitle, menuCopy);
const menuAuth = document.createElement('div');
menuAuth.className = 'menu-auth';
const menuAuthLabel = document.createElement('span');
menuAuthLabel.className = 'menu-auth-label';
menuAuthLabel.textContent = 'Account';
const menuAuthButtons = document.createElement('div');
menuAuthButtons.className = 'menu-auth-buttons';
const menuAuthSignIn = createButton('Sign in / Create account', 'ghost-btn small-btn');
const menuAuthSignOut = createButton('Sign out', 'secondary-btn small-btn');
menuAuthButtons.append(menuAuthSignIn, menuAuthSignOut);
const menuAuthStatus = document.createElement('span');
menuAuthStatus.className = 'menu-auth-status';
const menuAuthDebug = document.createElement('span');
menuAuthDebug.className = 'menu-auth-debug';
menuAuth.append(menuAuthLabel, menuAuthButtons, menuAuthStatus, menuAuthDebug);
menuHeader.append(menuTitleWrap);
const menuGrid = document.createElement('div');
menuGrid.className = 'menu-grid';
const menuStart = createButton('Start Training', 'primary-btn menu-card');
const menuLeaderboard = createButton('View Leaderboard', 'secondary-btn menu-card');
const menuReference = createButton('Reference Sheet', 'ghost-btn menu-card');
const menuAbout = createButton('How to Play', 'ghost-btn menu-card');
menuGrid.append(menuStart, menuLeaderboard, menuReference, menuAbout);
menuSection.append(menuHeader, menuGrid);
const menuAuthSection = document.createElement('section');
menuAuthSection.className = 'menu-auth-section';
menuAuthSection.dataset.view = 'menu';
menuAuthSection.append(menuAuth);

shell.append(menuAuthSection, menuSection);

const scoreboard = document.createElement('section');
scoreboard.className = 'scoreboard';
scoreboard.dataset.view = 'game';

const createScoreItem = (label: string) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'scoreboard-item';
  const labelSpan = document.createElement('span');
  labelSpan.className = 'scoreboard-label';
  labelSpan.textContent = label;
  const valueSpan = document.createElement('span');
  valueSpan.className = 'scoreboard-value';
  valueSpan.textContent = '0';
  wrapper.append(labelSpan, valueSpan);
  return { wrapper, valueSpan };
};

const pointsItem = createScoreItem('Score');
const bestItem = createScoreItem('Best Streak');
const ordersItem = createScoreItem('Orders Checked');
scoreboard.append(pointsItem.wrapper, bestItem.wrapper, ordersItem.wrapper);
shell.appendChild(scoreboard);

const summarySection = document.createElement('section');
summarySection.className = 'order-summary';
summarySection.dataset.view = 'game';
const summaryTitle = document.createElement('h2');
summaryTitle.textContent = 'Build this order';
const specialToggle = createButton('Special requests: On', 'toggle-btn');
const orderMeta = document.createElement('div');
orderMeta.className = 'order-meta';

const createMetaItem = (label: string) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'meta-item';
  const labelEl = document.createElement('span');
  labelEl.className = 'meta-label';
  labelEl.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.className = 'meta-value';
  wrapper.append(labelEl, valueEl);
  return { wrapper, valueEl };
};

const metaOrder = createMetaItem('Order');
const metaFullName = createMetaItem('Full name');
const metaSize = createMetaItem('Size');
const metaCrust = createMetaItem('Crust / Recipe');
const metaToppings = createMetaItem('Toppings');
const metaRequest = createMetaItem('Request');
orderMeta.append(
  metaOrder.wrapper,
  metaFullName.wrapper,
  metaSize.wrapper,
  metaCrust.wrapper,
  metaToppings.wrapper,
  metaRequest.wrapper,
);
const summaryList = document.createElement('ol');
summaryList.className = 'order-steps';
summarySection.append(summaryTitle, specialToggle, orderMeta, summaryList);
shell.appendChild(summarySection);

const card = document.createElement('section');
card.className = 'card';
card.dataset.view = 'game';

const inputHeader = document.createElement('h3');
inputHeader.className = 'field-title';
inputHeader.textContent = 'Set the weights for every step:';

const fieldGrid = document.createElement('div');
fieldGrid.className = 'field-grid';

const buttonRow = document.createElement('div');
buttonRow.className = 'button-row';

const checkButton = createButton('Lock in portions', 'primary-btn');

const revealButton = createButton('Show answers', 'ghost-btn');

const nextButton = createButton('Next order', 'secondary-btn');
nextButton.disabled = true;

buttonRow.append(checkButton, revealButton, nextButton);

const feedbackEl = document.createElement('p');
feedbackEl.className = 'feedback is-neutral';
feedbackEl.textContent = 'Enter every amount and lock it in to score points.';

card.append(inputHeader, fieldGrid, buttonRow, feedbackEl);
shell.appendChild(card);

const leaderboardSection = document.createElement('section');
leaderboardSection.className = 'leaderboard';
leaderboardSection.dataset.view = 'leaderboard';
const leaderboardHeader = document.createElement('div');
leaderboardHeader.className = 'leaderboard-header';
const leaderboardTitle = document.createElement('h3');
leaderboardTitle.textContent = 'Leaderboard';
const leaderboardSubtitle = document.createElement('p');
leaderboardSubtitle.textContent = 'Top scores from the global board.';
leaderboardHeader.append(leaderboardTitle, leaderboardSubtitle);

const authSection = document.createElement('div');
authSection.className = 'auth-section';
const authTitle = document.createElement('h4');
authTitle.textContent = 'Sign in or create an account to submit scores';
const authActions = document.createElement('div');
authActions.className = 'auth-actions';
const authGoogle = createButton('Google', 'ghost-btn small-btn');
const authSignOut = createButton('Sign out', 'secondary-btn small-btn');
authActions.append(authGoogle, authSignOut);
const authStatus = document.createElement('p');
authStatus.className = 'leaderboard-status';
authSection.append(authTitle, authActions, authStatus);

const nameBlock = document.createElement('div');
nameBlock.className = 'leaderboard-name';
const nameLabel = document.createElement('label');
nameLabel.textContent = 'Display name';
nameLabel.htmlFor = 'player-name';
const nameInput = document.createElement('input');
nameInput.id = 'player-name';
nameInput.type = 'text';
nameInput.maxLength = NAME_MAX_LENGTH;
nameInput.placeholder = 'Enter name';
const nameActions = document.createElement('div');
nameActions.className = 'leaderboard-actions';
const saveNameButton = createButton('Save name', 'primary-btn small-btn');
const editNameButton = createButton('Change', 'ghost-btn small-btn');
nameActions.append(saveNameButton, editNameButton);
nameBlock.append(nameLabel, nameInput, nameActions);

const leaderboardStatus = document.createElement('p');
leaderboardStatus.className = 'leaderboard-status';
leaderboardStatus.textContent = supabase
  ? 'Sign in to submit scores, then save a display name.'
  : 'Add Supabase keys to enable the global leaderboard.';

const leaderboardList = document.createElement('div');
leaderboardList.className = 'leaderboard-list';

leaderboardSection.append(
  leaderboardHeader,
  authSection,
  nameBlock,
  leaderboardStatus,
  leaderboardList,
);
shell.appendChild(leaderboardSection);

const cheatSection = document.createElement('section');
cheatSection.className = 'cheat-section';
cheatSection.dataset.view = 'reference';
const cheatDetails = document.createElement('details');
const cheatSummary = document.createElement('summary');
cheatSummary.textContent = 'Need the charts? Peek at the reference sheet.';
const cheatGrid = document.createElement('div');
cheatGrid.className = 'cheat-grid';
cheatDetails.append(cheatSummary, cheatGrid);
cheatSection.appendChild(cheatDetails);
shell.appendChild(cheatSection);

const aboutSection = document.createElement('section');
aboutSection.className = 'about-section';
aboutSection.dataset.view = 'about';
const aboutTitle = document.createElement('h3');
aboutTitle.textContent = 'How to play';
const aboutText = document.createElement('p');
aboutText.textContent =
  'Start a round, read the order summary, and enter the correct portion amounts. ' +
  'You earn more points for speed and perfect streaks. Use the reference sheet to study.';
const aboutList = document.createElement('ul');
aboutList.className = 'about-list';
const aboutItems = [
  'Check answers to score points and keep your streak.',
  'Use the special request toggle to practice modifiers.',
  'Leaderboard syncs when you save a display name.',
];
aboutItems.forEach((text) => {
  const item = document.createElement('li');
  item.textContent = text;
  aboutList.appendChild(item);
});
const installTitle = document.createElement('h3');
installTitle.textContent = 'Install on your phone';
const installText = document.createElement('p');
installText.textContent =
  'Open this site on your phone and add it to your home screen for a full-screen app experience.';
const installList = document.createElement('ul');
installList.className = 'about-list';
const installItems = [
  'iPhone (Safari): Share button > Add to Home Screen.',
  'Android (Chrome): Menu > Add to Home screen.',
];
installItems.forEach((text) => {
  const item = document.createElement('li');
  item.textContent = text;
  installList.appendChild(item);
});
aboutSection.append(aboutTitle, aboutText, aboutList);
aboutSection.append(installTitle, installText, installList);
shell.appendChild(aboutSection);

const finishSection = document.createElement('section');
finishSection.className = 'finish-section';
finishSection.dataset.view = 'finish';
const finishTitle = document.createElement('h2');
finishTitle.textContent = 'Game complete';
const finishSummary = document.createElement('p');
finishSummary.className = 'finish-summary';
const finishStats = document.createElement('div');
finishStats.className = 'finish-stats';
const finishScore = createScoreItem('Final Score');
const finishBest = createScoreItem('Best Streak');
const finishOrders = createScoreItem('Orders Checked');
finishStats.append(finishScore.wrapper, finishBest.wrapper, finishOrders.wrapper);
const finishActions = document.createElement('div');
finishActions.className = 'button-row';
const finishRestart = createButton('Play again', 'primary-btn');
const finishLeaderboard = createButton('View Leaderboard', 'secondary-btn');
finishActions.append(finishRestart, finishLeaderboard);
finishSection.append(finishTitle, finishSummary, finishStats, finishActions);
shell.appendChild(finishSection);

const referenceGroups = new Map<string, { label: string; crust: string; records: PortionRecord[] }>();
portionRecords.forEach((record) => {
  const label = `${record.item}${record.detail ? ` - ${record.detail}` : ''}${
    record.toppingLabel ? ` - ${record.toppingLabel}` : ''
  }`;
  const key = `${record.crust}|${label}`;
  if (!referenceGroups.has(key)) {
    referenceGroups.set(key, { label, crust: record.crust, records: [] });
  }
  referenceGroups.get(key)?.records.push(record);
});

const sizeToNumber = (size: string) => {
  const numeric = Number(size.replace(/[^0-9.]/g, ''));
  return Number.isNaN(numeric) ? 0 : numeric;
};

const appendCheatRow = (labelText: string, crustText: string, valuesText: string) => {
  const row = document.createElement('div');
  row.className = 'cheat-row';
  const infoCol = document.createElement('div');
  infoCol.className = 'cheat-info';
  const labelEl = document.createElement('span');
  labelEl.className = 'cheat-label';
  labelEl.textContent = labelText;
  const crustEl = document.createElement('span');
  crustEl.className = 'cheat-crust';
  crustEl.textContent = crustText;
  infoCol.append(labelEl, crustEl);

  const valuesEl = document.createElement('span');
  valuesEl.className = 'cheat-values';
  valuesEl.textContent = valuesText;

  row.append(infoCol, valuesEl);
  cheatGrid.appendChild(row);
};

Array.from(referenceGroups.values())
  .sort((a, b) => a.label.localeCompare(b.label))
  .forEach((group) => {
    group.records.sort((a, b) => sizeToNumber(a.size) - sizeToNumber(b.size));
    const values = group.records
      .map((record) => `${record.size}: ${formatAmount(record.amount)} ${record.unit ?? 'oz'}`)
      .join(' * ');
    appendCheatRow(group.label, group.crust, values);
  });

TOPPING_CATEGORIES.forEach((category) => {
  (['single', 'twoThree', 'fourPlus'] as ToppingBandKey[]).forEach((bandKey) => {
    const values = TOPPING_PORTION_SIZES.map(
      (size) => `${size}: ${formatAmount(category.ounces[bandKey][size])} oz`,
    ).join(' * ');
    appendCheatRow(`${category.name} - ${TOPPING_BAND_LABEL[bandKey]}`, 'Topping portions', values);
  });
});

const score = { points: 0, streak: 0, best: 0, answered: 0 };
let currentOrder: GameOrder | null = null;
let currentFields: QuizField[] = [];
let answered = false;
let specialRequestsEnabled = true;
let orderStartedAt = 0;
let currentUser: User | null = null;

const goToGame = () => {
  if (!currentOrder) {
    loadNextOrder();
  }
  setView('game');
};

const goToLeaderboard = () => {
  setView('leaderboard');
};

const goToReference = () => {
  setView('reference');
};

const goToAbout = () => {
  setView('about');
};

const startGame = () => {
  score.points = 0;
  score.streak = 0;
  score.best = 0;
  score.answered = 0;
  updateScoreboard();
  loadNextOrder();
  setView('game');
};

const updateScoreboard = () => {
  pointsItem.valueSpan.textContent = String(score.points);
  bestItem.valueSpan.textContent = String(score.best);
  ordersItem.valueSpan.textContent = String(score.answered);
};

type LeaderboardEntry = {
  display_name: string;
  best_score: number;
  best_streak: number;
};

const setNameEditing = (isEditing: boolean) => {
  const hasAuth = Boolean(currentUser);
  nameInput.disabled = !isEditing || !hasAuth;
  saveNameButton.disabled = !isEditing || !hasAuth;
  editNameButton.disabled = isEditing || !hasAuth;
  if (isEditing) {
    nameInput.focus();
  }
};

const setAuthButtonsEnabled = (enabled: boolean) => {
  authGoogle.disabled = !enabled;
  menuAuthSignIn.disabled = !enabled;
};

const updateAuthUI = (user: User | null) => {
  currentUser = user;
  const hasAuth = Boolean(user);
  authSignOut.disabled = !hasAuth;
  menuAuthSignOut.disabled = !hasAuth;
  setAuthButtonsEnabled(!hasAuth && Boolean(supabase));
  menuAuthSignIn.hidden = hasAuth;
  menuAuthSignOut.hidden = !hasAuth;

  if (!supabase) {
    authStatus.textContent = 'Add Supabase keys to enable sign in.';
    menuAuthStatus.textContent = 'Supabase keys required';
    menuAuthDebug.textContent = 'Supabase URL: missing';
  } else if (hasAuth) {
    const display = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? 'Signed in';
    authStatus.textContent = `Signed in as ${display}.`;
    menuAuthStatus.textContent = display;
    menuAuthDebug.textContent = `Supabase URL: ${SUPABASE_URL ? 'loaded' : 'missing'}`;
  } else {
    authStatus.textContent = 'Sign in to submit scores to the global leaderboard.';
    menuAuthStatus.textContent = 'Not signed in';
    menuAuthDebug.textContent = `Supabase URL: ${SUPABASE_URL ? 'loaded' : 'missing'}`;
  }

  if (hasAuth) {
    const savedName = loadName();
    if (!savedName) {
      const candidate =
        user?.user_metadata?.full_name ??
        user?.user_metadata?.name ??
        user?.user_metadata?.preferred_username ??
        user?.email ??
        '';
      if (candidate) {
        nameInput.value = candidate;
        localStorage.setItem(PLAYER_NAME_KEY, candidate);
      }
    }
  }

  if (!hasAuth) {
    setNameEditing(false);
  } else {
    const savedName = loadName();
    if (savedName) {
      nameInput.value = savedName;
      setNameEditing(false);
    } else {
      setNameEditing(true);
    }
  }
};

const renderLeaderboard = (entries: LeaderboardEntry[]) => {
  leaderboardList.innerHTML = '';
  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'leaderboard-empty';
    empty.textContent = 'No scores yet.';
    leaderboardList.appendChild(empty);
    return;
  }

  const header = document.createElement('div');
  header.className = 'leaderboard-row is-header';
  const headerRank = document.createElement('span');
  headerRank.className = 'leaderboard-rank';
  headerRank.textContent = '#';
  const headerName = document.createElement('span');
  headerName.className = 'leaderboard-player';
  headerName.textContent = 'Player';
  const headerScore = document.createElement('span');
  headerScore.className = 'leaderboard-score';
  headerScore.textContent = 'Score';
  const headerStreak = document.createElement('span');
  headerStreak.className = 'leaderboard-streak';
  headerStreak.textContent = 'Streak';
  header.append(headerRank, headerName, headerScore, headerStreak);
  leaderboardList.appendChild(header);

  entries.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    const rank = document.createElement('span');
    rank.className = 'leaderboard-rank';
    rank.textContent = `#${index + 1}`;
    const name = document.createElement('span');
    name.className = 'leaderboard-player';
    name.textContent = entry.display_name;
    const scoreValue = document.createElement('span');
    scoreValue.className = 'leaderboard-score';
    scoreValue.textContent = `${entry.best_score}`;
    const streakValue = document.createElement('span');
    streakValue.className = 'leaderboard-streak';
    streakValue.textContent = `${entry.best_streak}`;
    row.append(rank, name, scoreValue, streakValue);
    leaderboardList.appendChild(row);
  });
};

const loadLeaderboard = async () => {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from(LEADERBOARD_TABLE)
    .select('display_name,best_score,best_streak')
    .order('best_score', { ascending: false })
    .order('best_streak', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(LEADERBOARD_LIMIT);

  if (error) {
    console.error(error);
    leaderboardStatus.textContent = 'Leaderboard unavailable. Try again later.';
    return;
  }

  renderLeaderboard(data ?? []);
};

const submitLeaderboard = async (bestScore: number, bestStreak: number) => {
  if (!supabase) {
    leaderboardStatus.textContent = 'Add Supabase keys to enable the global leaderboard.';
    return;
  }
  if (!currentUser) {
    leaderboardStatus.textContent = 'Sign in to submit your score.';
    return;
  }
  const displayName = loadName();
  if (!displayName) {
    return;
  }
  const normalized = normalizeName(displayName);
  const { error } = await supabase
    .from(LEADERBOARD_TABLE)
    .upsert(
      {
        user_id: currentUser.id,
        display_name: displayName,
        name_normalized: normalized,
        best_score: bestScore,
        best_streak: bestStreak,
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error(error);
    leaderboardStatus.textContent = 'Score could not be submitted.';
    return;
  }

  leaderboardStatus.textContent = 'Leaderboard updated.';
  await loadLeaderboard();
};

const maybeSubmitLeaderboard = async () => {
  const displayName = loadName();
  if (!displayName) {
    return;
  }
  const previousBestScore = loadNumber(BEST_SCORE_KEY);
  const previousBestStreak = loadNumber(BEST_STREAK_KEY);
  const nextBestScore = Math.max(previousBestScore, score.points);
  const nextBestStreak = Math.max(previousBestStreak, score.best);
  if (nextBestScore === previousBestScore && nextBestStreak === previousBestStreak) {
    return;
  }
  localStorage.setItem(BEST_SCORE_KEY, String(nextBestScore));
  localStorage.setItem(BEST_STREAK_KEY, String(nextBestStreak));
  await submitLeaderboard(nextBestScore, nextBestStreak);
};

const updateSpecialToggle = () => {
  specialToggle.textContent = `Special requests: ${specialRequestsEnabled ? 'On' : 'Off'}`;
  specialToggle.classList.toggle('is-off', !specialRequestsEnabled);
};

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  if (import.meta.env.DEV) {
    return;
  }
  if (!location.protocol.startsWith('http')) {
    return;
  }
  const baseUrl = import.meta.env.BASE_URL ?? '/';
  navigator.serviceWorker.register(`${baseUrl}sw.js`).catch((error) => {
    console.warn('Service worker registration failed', error);
  });
};

const setFeedback = (message: string, tone: 'neutral' | 'correct' | 'wrong') => {
  feedbackEl.className = `feedback ${tone === 'correct' ? 'is-correct' : tone === 'wrong' ? 'is-wrong' : 'is-neutral'}`;
  feedbackEl.textContent = message;
};

const applySavedName = () => {
  const savedName = loadName();
  if (savedName) {
    nameInput.value = savedName;
    if (currentUser) {
      setNameEditing(false);
    }
  } else {
    if (currentUser) {
      setNameEditing(true);
    }
  }
};

const handleSaveName = async () => {
  if (!currentUser) {
    leaderboardStatus.textContent = 'Sign in before saving a name.';
    return;
  }
  const errorMessage = validatePlayerName(nameInput.value);
  if (errorMessage) {
    leaderboardStatus.textContent = errorMessage;
    return;
  }
  const displayName = nameInput.value.trim();
  localStorage.setItem(PLAYER_NAME_KEY, displayName);
  setNameEditing(false);
  leaderboardStatus.textContent = 'Name saved. Best scores will sync.';
  await maybeSubmitLeaderboard();
};

const handleEditName = () => {
  if (!currentUser) {
    leaderboardStatus.textContent = 'Sign in before editing your name.';
    return;
  }
  setNameEditing(true);
  leaderboardStatus.textContent = 'Update your name and save.';
};

const describeToppings = (order: PizzaOrder) => {
  if (order.toppings.length === 0) {
    return 'Cheese-only pizza (no additional toppings).';
  }
  return `${order.toppings.length} topping${order.toppings.length > 1 ? 's' : ''}: ${order.toppings.join(', ')}.`;
};

const renderSummary = (order: GameOrder) => {
  summaryList.innerHTML = '';
  metaOrder.valueEl.textContent = `#${score.answered + 1}`;
  if (order.kind === 'Pasta') {
    metaFullName.valueEl.textContent = `${order.recipe} - ${order.size}`;
    metaSize.valueEl.textContent = order.size;
    metaCrust.valueEl.textContent = order.recipe;
    metaToppings.valueEl.textContent = 'Pasta';
    metaRequest.valueEl.textContent = 'Standard';

    const dishItem = document.createElement('li');
    dishItem.innerHTML = `<span class="step">1. Dish</span><strong>${order.recipe}</strong>`;

    const sizeItem = document.createElement('li');
    sizeItem.innerHTML = `<span class="step">2. Size</span><strong>${order.size}</strong>`;

    const notesItem = document.createElement('li');
    notesItem.innerHTML =
      '<span class="step">3. Notes</span><strong>Tin-only portions</strong><p class="modifier-note">Follow the pasta chart portions for each ingredient.</p>';

    summaryList.append(dishItem, sizeItem, notesItem);
    return;
  }

  metaSize.valueEl.textContent = order.size;
  metaCrust.valueEl.textContent = order.crust;
  metaToppings.valueEl.textContent =
    order.toppings.length === 0
      ? 'Cheese only'
      : `${order.toppings.length} topping${order.toppings.length > 1 ? 's' : ''}`;
  metaRequest.valueEl.textContent = order.modifier.label;
  const toppingDesc =
    order.toppings.length === 0
      ? 'Cheese only'
      : `${order.toppings.length} topping${order.toppings.length > 1 ? 's' : ''}`;
  if (order.specialtyName) {
    metaFullName.valueEl.textContent = `${order.size} ${order.specialtyName} ${order.crust}`;
  } else {
    metaFullName.valueEl.textContent = `${order.size} ${order.crust} - ${toppingDesc}`;
  }
  const sizeItem = document.createElement('li');
  sizeItem.innerHTML = `<span class="step">1. Size</span><strong>${order.size}</strong>`;

  const crustItem = document.createElement('li');
  crustItem.innerHTML = `<span class="step">2. Crust</span><strong>${order.crust}</strong>`;

  const toppingItem = document.createElement('li');
  toppingItem.className = 'topping-step';
  const toppingTitle = document.createElement('span');
  toppingTitle.className = 'step';
  toppingTitle.textContent = '4. Toppings';
  const toppingText = document.createElement('div');
  toppingText.className = 'topping-list';
  toppingText.textContent = describeToppings(order);
  toppingItem.append(toppingTitle, toppingText);

  const modifierItem = document.createElement('li');
  modifierItem.innerHTML = `<span class="step">3. Special request</span><strong>${order.modifier.label}</strong><p class="modifier-note">${order.modifier.description}</p>`;

  summaryList.append(sizeItem, crustItem, modifierItem, toppingItem);
};

const getModifierNote = (record: PortionRecord, modifier: OrderModifier | null) => {
  if (!modifier || modifier.multiplier === 1) {
    return null;
  }
  if (modifier.target === 'sauce' && record.category === 'Sauce') {
    return `Adjusted for ${modifier.label}.`;
  }
  if (modifier.target === 'pizza-cheese' && record.item === 'Pizza Cheese') {
    return `Adjusted for ${modifier.label}.`;
  }
  if (modifier.target === 'provolone' && /provolone/i.test(record.item)) {
    return `Adjusted for ${modifier.label}.`;
  }
  return null;
};

const createFieldRow = (
  record: PortionRecord,
  modifier: OrderModifier | null,
): QuizField => {
  const container = document.createElement('div');
  container.className = 'field-row';
  const label = document.createElement('label');
  label.textContent = `${record.item}${record.detail ? ` (${record.detail})` : ''}`;
  const hint = document.createElement('span');
  hint.className = 'field-hint';
  const extra = record.toppingLabel ? ` * ${record.toppingLabel}` : '';
  hint.textContent = `${record.size} * ${record.crust}${extra}`;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '0.1';
  input.inputMode = 'decimal';
  input.placeholder = record.unit && record.unit !== 'oz' ? `Amount (${record.unit})` : 'Ounces';
  const expected = applyModifier(record, modifier);
  const result = document.createElement('span');
  result.className = 'field-result';

  const modifierNote = getModifierNote(record, modifier);
  const metaPieces: HTMLElement[] = [];
  if (record.note) {
    const note = document.createElement('span');
    note.className = 'field-note';
    note.textContent = record.note;
    metaPieces.push(note);
  }
  if (modifierNote) {
    const modifierSpan = document.createElement('span');
    modifierSpan.className = 'field-modifier';
    modifierSpan.textContent = modifierNote;
    metaPieces.push(modifierSpan);
  }
  if (metaPieces.length > 0) {
    const meta = document.createElement('div');
    meta.className = 'field-meta';
    meta.append(...metaPieces);
    container.append(label, hint, input, meta, result);
  } else {
    container.append(label, hint, input, result);
  }
  return {
    id: record.id,
    expected,
    record,
    label: label.textContent,
    hint: hint.textContent,
    input,
    container,
    result,
  };
};

const buildFields = (order: GameOrder) => {
  fieldGrid.innerHTML = '';
  currentFields = [];
  if (order.kind === 'Pasta') {
    order.records.forEach((record) => {
      const field = createFieldRow(record, null);
      currentFields.push(field);
      fieldGrid.appendChild(field.container);
    });
    return;
  }

  const recordsToRender: PortionRecord[] = [order.sauce];

  if (order.dataCrust === 'New York Style') {
    recordsToRender.push(...order.cheeses);
  } else {
    const rawPizzaCheeseRecords = order.cheeses.filter((record) => record.item === 'Pizza Cheese');
    const hasBottomLayerVariant = rawPizzaCheeseRecords.some((record) =>
      record.detail?.toLowerCase().includes('bottom layer'),
    );
    const pizzaCheeseRecords = hasBottomLayerVariant
      ? rawPizzaCheeseRecords.filter((record) => record.detail?.toLowerCase().includes('bottom layer'))
      : rawPizzaCheeseRecords;
    const otherCheeseRecords = order.cheeses.filter((record) => record.item !== 'Pizza Cheese');

    if (pizzaCheeseRecords.length > 0) {
      if (pizzaCheeseRecords.length === 1 && !hasBottomLayerVariant) {
        recordsToRender.push(pizzaCheeseRecords[0]);
      } else {
        const baseRecord = pizzaCheeseRecords[0];
        const totalAmount = pizzaCheeseRecords.reduce((sum, record) => sum + record.amount, 0);
        const scenarioLabel = order.toppings.length > 0 ? 'with toppings' : 'cheese only';
        recordsToRender.push({
          ...baseRecord,
          id: `${baseRecord.id}-total`,
          detail: `Total pizza cheese (${scenarioLabel})`,
          amount: totalAmount,
          note: order.toppings.length > 0
            ? 'Regular cheese with toppings uses only the base layer measurements.'
            : 'Cheese-only pies use just the base layer unless extra cheese is requested.',
        });
      }
    }

    recordsToRender.push(...otherCheeseRecords);
  }

  if (order.toppingRecords.length > 0) {
    recordsToRender.push(...order.toppingRecords);
  }

  recordsToRender.forEach((record) => {
    const field = createFieldRow(record, order.modifier);
    currentFields.push(field);
    fieldGrid.appendChild(field.container);
  });
};

const loadNextOrder = () => {
  if (score.answered >= MAX_ORDERS) {
    finishSummary.textContent =
      `You finished ${MAX_ORDERS} orders. Final score: ${score.points}.`;
    finishScore.valueSpan.textContent = String(score.points);
    finishBest.valueSpan.textContent = String(score.best);
    finishOrders.valueSpan.textContent = String(score.answered);
    setView('finish');
    return;
  }
  currentOrder = generateOrder(specialRequestsEnabled);
  answered = false;
  orderStartedAt = performance.now();
  renderSummary(currentOrder);
  buildFields(currentOrder);
  setFeedback('Enter every amount and lock it in to score points.', 'neutral');
  checkButton.disabled = false;
  revealButton.disabled = false;
  nextButton.disabled = true;
};

const tolerance = 0.05;
const POINTS_PER_CORRECT = 8;
const POINTS_PER_WRONG = 4;
const MAX_SPEED_BONUS = 20;
const FAST_TIME_SECONDS = 20;
const SLOW_TIME_SECONDS = 90;

const getSpeedBonus = (elapsedSeconds: number) => {
  if (elapsedSeconds <= FAST_TIME_SECONDS) {
    return MAX_SPEED_BONUS;
  }
  if (elapsedSeconds >= SLOW_TIME_SECONDS) {
    return 0;
  }
  const progress = (elapsedSeconds - FAST_TIME_SECONDS) / (SLOW_TIME_SECONDS - FAST_TIME_SECONDS);
  return Math.round(MAX_SPEED_BONUS * (1 - progress));
};

const handleCheck = () => {
  if (!currentOrder || answered) {
    return;
  }
  let missing = false;
  let incorrectCount = 0;
  let correctCount = 0;
  currentFields.forEach((field) => {
    const container = field.container;
    container.classList.remove('is-correct', 'is-wrong');
    const value = Number(field.input.value);
    field.result.textContent = '';
    if (Number.isNaN(value)) {
      missing = true;
      container.classList.add('is-wrong');
      return;
    }
    if (Math.abs(value - field.expected) <= tolerance) {
      container.classList.add('is-correct');
      correctCount += 1;
    } else {
      incorrectCount += 1;
      container.classList.add('is-wrong');
      field.result.textContent = `Correct: ${formatAmount(field.expected)} ${field.record.unit ?? 'oz'}`;
    }
  });

  if (missing) {
    setFeedback('Fill in every field before checking.', 'neutral');
    return;
  }

  score.answered += 1;
  const elapsedSeconds = (performance.now() - orderStartedAt) / 1000;
  const rawSpeedBonus = getSpeedBonus(elapsedSeconds);
  const speedBonus =
    currentFields.length > 0
      ? Math.round(rawSpeedBonus * (correctCount / currentFields.length))
      : 0;
  const basePoints = correctCount * POINTS_PER_CORRECT - incorrectCount * POINTS_PER_WRONG;
  const earnedPoints = Math.max(0, basePoints + speedBonus);
  score.points += earnedPoints;

  if (incorrectCount === 0) {
    score.streak += 1;
    score.best = Math.max(score.best, score.streak);
    setFeedback(
      `Perfect! +${earnedPoints} points (${speedBonus} speed bonus).`,
      'correct',
    );
  } else {
    score.streak = 0;
    const bonusText = speedBonus > 0 ? `, ${speedBonus} speed bonus` : '';
    setFeedback(
      `+${earnedPoints} points (${correctCount} correct, ${incorrectCount} wrong${bonusText}).`,
      'wrong',
    );
  }

  answered = true;
  checkButton.disabled = true;
  revealButton.disabled = true;
  nextButton.disabled = false;
  updateScoreboard();
  void maybeSubmitLeaderboard();
  if (score.answered >= MAX_ORDERS) {
    finishSummary.textContent =
      `You finished ${MAX_ORDERS} orders. Final score: ${score.points}.`;
    finishScore.valueSpan.textContent = String(score.points);
    finishBest.valueSpan.textContent = String(score.best);
    finishOrders.valueSpan.textContent = String(score.answered);
    setView('finish');
  }
};

const handleReveal = () => {
  if (!currentOrder || answered) {
    return;
  }
  currentFields.forEach((field) => {
    field.input.value = formatAmount(field.expected);
    field.container.classList.remove('is-wrong');
    field.container.classList.add('is-correct');
    field.result.textContent = `Correct: ${formatAmount(field.expected)} ${field.record.unit ?? 'oz'}`;
  });
  setFeedback('Answers revealed. Study them, then move on.', 'neutral');
  answered = true;
  checkButton.disabled = true;
  revealButton.disabled = true;
  nextButton.disabled = false;
};

const signInWithProvider = async (provider: 'google') => {
  if (!supabase) {
    authStatus.textContent = 'Add Supabase keys to enable sign in.';
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getRedirectUrl(),
    },
  });
  if (error) {
    console.error(error);
    authStatus.textContent = 'Sign in failed. Please try again.';
  }
};

const handleSignOut = async () => {
  if (!supabase) {
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error(error);
    authStatus.textContent = 'Sign out failed. Clearing local session...';
    localStorage.removeItem(PLAYER_NAME_KEY);
    localStorage.removeItem(BEST_SCORE_KEY);
    localStorage.removeItem(BEST_STREAK_KEY);
    updateAuthUI(null);
    leaderboardStatus.textContent = 'Signed out locally.';
  }
};

checkButton.addEventListener('click', handleCheck);
revealButton.addEventListener('click', handleReveal);
nextButton.addEventListener('click', loadNextOrder);
saveNameButton.addEventListener('click', handleSaveName);
editNameButton.addEventListener('click', handleEditName);
authGoogle.addEventListener('click', () => signInWithProvider('google'));
authSignOut.addEventListener('click', handleSignOut);
menuAuthSignIn.addEventListener('click', () => signInWithProvider('google'));
menuAuthSignOut.addEventListener('click', handleSignOut);
navMenuButton.addEventListener('click', () => setView('menu'));
navGameButton.addEventListener('click', goToGame);
navLeaderboardButton.addEventListener('click', goToLeaderboard);
navReferenceButton.addEventListener('click', goToReference);
navAboutButton.addEventListener('click', goToAbout);
menuStart.addEventListener('click', startGame);
menuLeaderboard.addEventListener('click', goToLeaderboard);
menuReference.addEventListener('click', goToReference);
menuAbout.addEventListener('click', goToAbout);
finishRestart.addEventListener('click', startGame);
finishLeaderboard.addEventListener('click', goToLeaderboard);
nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleSaveName();
  }
});
specialToggle.addEventListener('click', () => {
  specialRequestsEnabled = !specialRequestsEnabled;
  updateSpecialToggle();
  loadNextOrder();
});

updateScoreboard();
updateSpecialToggle();
loadLeaderboard();
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    updateAuthUI(data.session?.user ?? null);
  }).catch((error) => {
    console.error(error);
    updateAuthUI(null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session?.user ?? null);
  });
} else {
  updateAuthUI(null);
}
applySavedName();
setView('menu');
registerServiceWorker();
