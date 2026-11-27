import { createHash } from 'node:crypto';

export const meals = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const;
export type AiItem = {
  foodId: number;
  meal: (typeof meals)[number];
  grams: number;
};
export type AiResult = {
  kind: 'ADVICE' | 'PROPOSAL' | 'ACTION';
  reply: string;
  items: AiItem[];
};
export const resultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'reply', 'items'],
  properties: {
    kind: { type: 'string', enum: ['ADVICE', 'PROPOSAL', 'ACTION'] },
    reply: { type: 'string', minLength: 1, maxLength: 4000 },
    items: {
      type: 'array',
      maxItems: 24,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['foodId', 'meal', 'grams'],
        properties: {
          foodId: { type: 'integer', minimum: 1 },
          meal: { type: 'string', enum: meals },
          grams: { type: 'number', minimum: 5, maximum: 1000 },
        },
      },
    },
  },
};

export function parseItems(value: unknown): AiItem[] {
  if (!Array.isArray(value) || !value.length || value.length > 24)
    throw new Error('Thực đơn phải có từ 1 đến 24 món.');
  const seen = new Set<string>();
  const result = value.map((x) => {
    if (
      !x ||
      typeof x !== 'object' ||
      Object.keys(x).sort().join() !== 'foodId,grams,meal' ||
      !Number.isSafeInteger(x.foodId) ||
      x.foodId < 1 ||
      !meals.includes(x.meal) ||
      typeof x.grams !== 'number' ||
      !Number.isFinite(x.grams) ||
      x.grams < 5 ||
      x.grams > 1000
    )
      throw new Error('Món ăn hoặc khẩu phần không hợp lệ (5–1000g/món).');
    const key = `${x.meal}:${x.foodId}`;
    if (seen.has(key)) throw new Error('Một thực phẩm bị lặp trong cùng bữa.');
    seen.add(key);
    return { foodId: x.foodId, meal: x.meal, grams: x.grams } as AiItem;
  });
  for (const meal of meals)
    if (result.filter((x) => x.meal === meal).reduce((a, x) => a + x.grams, 0) > 1500)
      throw new Error('Tổng khẩu phần một bữa vượt 1500g.');
  return result;
}
export function parseResult(content: string): AiResult {
  const x = JSON.parse(content);
  if (
    !x ||
    typeof x !== 'object' ||
    Object.keys(x).sort().join() !== 'items,kind,reply' ||
    !['ADVICE', 'PROPOSAL', 'ACTION'].includes(x.kind) ||
    typeof x.reply !== 'string' ||
    !x.reply.trim() ||
    x.reply.length > 4000 ||
    !Array.isArray(x.items)
  )
    throw new Error('Đầu ra không đúng cấu trúc JSON.');
  if (x.kind === 'PROPOSAL') return { ...x, items: parseItems(x.items) };
  if (x.items.length) throw new Error('Tư vấn và yêu cầu hành động không được chứa thực đơn mới.');
  return { ...x, reply: x.reply.trim() };
}
export function planHash(items: { foodId: number; meal: string; grams: unknown }[]) {
  return createHash('sha256')
    .update(
      JSON.stringify(
        items
          .map((x) => ({
            foodId: x.foodId,
            meal: x.meal,
            grams: Number(x.grams),
          }))
          .sort((a, b) => a.meal.localeCompare(b.meal) || a.foodId - b.foodId || a.grams - b.grams),
      ),
    )
    .digest('hex');
}
