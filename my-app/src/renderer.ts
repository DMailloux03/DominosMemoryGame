import "./index.css";

type PortionRecord = {
  id: string;
  category: 'Sauce' | 'Cheese';
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
  crust: string;
  dataCrust: string;
  size: string;
  toppings: string[];
  toppingLabel: string | null;
  sauce: PortionRecord;
  cheeses: PortionRecord[];
  modifier: OrderModifier;
};

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
const TOPPING_LABELS = ['1 topping', '2 toppings', '3 toppings', '4+ toppings'] as const;
const TOPPING_LIBRARY = [
  'Pepperoni',
  'Sausage',
  'Beef',
  'Ham',
  'Bacon',
  'Mushroom',
  'Onion',
  'Green Pepper',
  'Black Olive',
  'Spinach',
  'Tomato',
  'Jalapeño',
  'Banana Pepper',
  'Roasted Red Pepper',
  'Pineapple',
];

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

const generateOrder = (includeSpecialRequest: boolean): PizzaOrder => {
  const crustOption = randomItem(CRUST_OPTIONS);
  const size = randomItem([...crustOption.sizes]);
  const toppingCount = randomInt(0, 4);
  const toppings = toppingCount === 0 ? [] : sampleUnique(toppingCount, TOPPING_LIBRARY);
  const toppingLabel = getToppingLabel(toppingCount);
  const sauce = chooseSauceRecord(crustOption.dataCrust, size);
  const cheeses = getCheeseRecordsForOrder(crustOption.dataCrust, size, toppingLabel, toppingCount);
  const modifier = includeSpecialRequest ? pickModifier({ sauce, cheeses }) : ORDER_MODIFIERS[0];
  return {
    crust: crustOption.label,
    dataCrust: crustOption.dataCrust,
    size,
    toppings,
    toppingLabel,
    sauce,
    cheeses,
    modifier,
  };
};

const applyModifier = (record: PortionRecord, modifier: OrderModifier) => {
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

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Renderer root missing');
}

const shell = document.createElement('main');
shell.className = 'game-shell';
root.appendChild(shell);

const header = document.createElement('header');
header.className = 'game-header';
const title = document.createElement('h1');
title.textContent = "Domino's Portion Trainer";
const subtitle = document.createElement('p');
subtitle.textContent =
  'Build each pizza order by order. Start at 0 points and see how long you can hold the streak.';
const toppingsReminder = document.createElement('p');
toppingsReminder.className = 'topping-reminder';
toppingsReminder.textContent =
  'Remember: cheese never counts as a topping, and Gluten Free crust only comes in a 10" pizza.';
header.append(title, subtitle, toppingsReminder);
shell.appendChild(header);

const scoreboard = document.createElement('section');
scoreboard.className = 'scoreboard';

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

const pointsItem = createScoreItem('Points');
const bestItem = createScoreItem('Best Run');
const ordersItem = createScoreItem('Orders Checked');
scoreboard.append(pointsItem.wrapper, bestItem.wrapper, ordersItem.wrapper);
shell.appendChild(scoreboard);

const summarySection = document.createElement('section');
summarySection.className = 'order-summary';
const summaryTitle = document.createElement('h2');
summaryTitle.textContent = 'Build this order';
const specialToggle = document.createElement('button');
specialToggle.type = 'button';
specialToggle.className = 'toggle-btn';
specialToggle.textContent = 'Special requests: On';
const summaryList = document.createElement('ol');
summaryList.className = 'order-steps';
summarySection.append(summaryTitle, specialToggle, summaryList);
shell.appendChild(summarySection);

const card = document.createElement('section');
card.className = 'card';

const inputHeader = document.createElement('h3');
inputHeader.className = 'field-title';
inputHeader.textContent = 'Set the weights for every step:';

const fieldGrid = document.createElement('div');
fieldGrid.className = 'field-grid';

const buttonRow = document.createElement('div');
buttonRow.className = 'button-row';

const checkButton = document.createElement('button');
checkButton.className = 'primary-btn';
checkButton.type = 'button';
checkButton.textContent = 'Lock in portions';

const revealButton = document.createElement('button');
revealButton.className = 'ghost-btn';
revealButton.type = 'button';
revealButton.textContent = 'Show answers';

const nextButton = document.createElement('button');
nextButton.className = 'secondary-btn';
nextButton.type = 'button';
nextButton.textContent = 'Next order';
nextButton.disabled = true;

buttonRow.append(checkButton, revealButton, nextButton);

const feedbackEl = document.createElement('p');
feedbackEl.className = 'feedback is-neutral';
feedbackEl.textContent = 'Enter every amount and lock it in to score points.';

card.append(inputHeader, fieldGrid, buttonRow, feedbackEl);
shell.appendChild(card);

const cheatSection = document.createElement('section');
cheatSection.className = 'cheat-section';
const cheatDetails = document.createElement('details');
const cheatSummary = document.createElement('summary');
cheatSummary.textContent = 'Need the charts? Peek at the reference sheet.';
const cheatGrid = document.createElement('div');
cheatGrid.className = 'cheat-grid';
cheatDetails.append(cheatSummary, cheatGrid);
cheatSection.appendChild(cheatDetails);
shell.appendChild(cheatSection);

const referenceGroups = new Map<string, { label: string; crust: string; records: PortionRecord[] }>();
portionRecords.forEach((record) => {
  const label = `${record.item}${record.detail ? ` – ${record.detail}` : ''}${
    record.toppingLabel ? ` – ${record.toppingLabel}` : ''
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

Array.from(referenceGroups.values())
  .sort((a, b) => a.label.localeCompare(b.label))
  .forEach((group) => {
    group.records.sort((a, b) => sizeToNumber(a.size) - sizeToNumber(b.size));
    const row = document.createElement('div');
    row.className = 'cheat-row';
    const infoCol = document.createElement('div');
    infoCol.className = 'cheat-info';
    const labelEl = document.createElement('span');
    labelEl.className = 'cheat-label';
    labelEl.textContent = group.label;
    const crustEl = document.createElement('span');
    crustEl.className = 'cheat-crust';
    crustEl.textContent = group.crust;
    infoCol.append(labelEl, crustEl);

    const valuesEl = document.createElement('span');
    valuesEl.className = 'cheat-values';
    valuesEl.textContent = group.records
      .map((record) => `${record.size}: ${formatAmount(record.amount)} ${record.unit ?? 'oz'}`)
      .join(' • ');

    row.append(infoCol, valuesEl);
    cheatGrid.appendChild(row);
  });

const score = { points: 0, best: 0, answered: 0 };
let currentOrder: PizzaOrder | null = null;
let currentFields: QuizField[] = [];
let answered = false;
let specialRequestsEnabled = true;

const updateScoreboard = () => {
  pointsItem.valueSpan.textContent = String(score.points);
  bestItem.valueSpan.textContent = String(score.best);
  ordersItem.valueSpan.textContent = String(score.answered);
};

const updateSpecialToggle = () => {
  specialToggle.textContent = `Special requests: ${specialRequestsEnabled ? 'On' : 'Off'}`;
  specialToggle.classList.toggle('is-off', !specialRequestsEnabled);
};

const setFeedback = (message: string, tone: 'neutral' | 'correct' | 'wrong') => {
  feedbackEl.className = `feedback ${tone === 'correct' ? 'is-correct' : tone === 'wrong' ? 'is-wrong' : 'is-neutral'}`;
  feedbackEl.textContent = message;
};

const describeToppings = (order: PizzaOrder) => {
  if (order.toppings.length === 0) {
    return 'Cheese-only pizza (no additional toppings).';
  }
  return `${order.toppings.length} topping${order.toppings.length > 1 ? 's' : ''}: ${order.toppings.join(', ')}.`;
};

const renderSummary = (order: PizzaOrder) => {
  summaryList.innerHTML = '';
  const sizeItem = document.createElement('li');
  sizeItem.innerHTML = `<span class="step">1. Size</span><strong>${order.size}</strong>`;

  const crustItem = document.createElement('li');
  crustItem.innerHTML = `<span class="step">2. Crust</span><strong>${order.crust}</strong>`;

  const toppingItem = document.createElement('li');
  toppingItem.className = 'topping-step';
  const toppingTitle = document.createElement('span');
  toppingTitle.className = 'step';
  toppingTitle.textContent = '3. Toppings';
  const toppingText = document.createElement('div');
  toppingText.className = 'topping-list';
  toppingText.textContent = describeToppings(order);
  toppingItem.append(toppingTitle, toppingText);

  const modifierItem = document.createElement('li');
  modifierItem.innerHTML = `<span class="step">4. Special request</span><strong>${order.modifier.label}</strong><p class="modifier-note">${order.modifier.description}</p>`;

  summaryList.append(sizeItem, crustItem, toppingItem, modifierItem);
};

const createFieldRow = (
  record: PortionRecord,
  modifier: OrderModifier,
): QuizField => {
  const container = document.createElement('div');
  container.className = 'field-row';
  const label = document.createElement('label');
  label.textContent = `${record.item}${record.detail ? ` (${record.detail})` : ''}`;
  const hint = document.createElement('span');
  hint.className = 'field-hint';
  const extra = record.toppingLabel ? ` • ${record.toppingLabel}` : '';
  hint.textContent = `${record.size} • ${record.crust}${extra}`;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '0.1';
  input.inputMode = 'decimal';
  input.placeholder = 'Ounces';
  const expected = applyModifier(record, modifier);
  const result = document.createElement('span');
  result.className = 'field-result';
  container.append(label, hint, input, result);
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

const buildFields = (order: PizzaOrder) => {
  fieldGrid.innerHTML = '';
  currentFields = [];
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

  recordsToRender.forEach((record) => {
    const field = createFieldRow(record, order.modifier);
    currentFields.push(field);
    fieldGrid.appendChild(field.container);
  });
};

const loadNextOrder = () => {
  currentOrder = generateOrder(specialRequestsEnabled);
  answered = false;
  renderSummary(currentOrder);
  buildFields(currentOrder);
  setFeedback('Enter every amount and lock it in to score points.', 'neutral');
  checkButton.disabled = false;
  revealButton.disabled = false;
  nextButton.disabled = true;
};

const tolerance = 0.05;

const handleCheck = () => {
  if (!currentOrder || answered) {
    return;
  }
  let missing = false;
  let incorrectCount = 0;
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

  if (incorrectCount === 0) {
    score.points += 1;
    score.best = Math.max(score.best, score.points);
    setFeedback('Perfect! All portions match the chart.', 'correct');
  } else {
    score.points = 0;
    setFeedback('Something was off — review the highlighted fields and try the next order.', 'wrong');
  }

  answered = true;
  checkButton.disabled = true;
  revealButton.disabled = true;
  nextButton.disabled = false;
  updateScoreboard();
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

checkButton.addEventListener('click', handleCheck);
revealButton.addEventListener('click', handleReveal);
nextButton.addEventListener('click', loadNextOrder);
specialToggle.addEventListener('click', () => {
  specialRequestsEnabled = !specialRequestsEnabled;
  updateSpecialToggle();
  loadNextOrder();
});

updateScoreboard();
updateSpecialToggle();
loadNextOrder();
