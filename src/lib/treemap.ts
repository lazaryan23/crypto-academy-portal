export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TreemapInput<T> {
  value: number;
  data: T;
}

export type TreemapTile<T> = Rect & { data: T };

type Sized<T> = { area: number; data: T };

function worstRatio(row: { area: number }[], side: number) {
  let sum = 0;
  let max = 0;
  let min = Infinity;
  for (const item of row) {
    sum += item.area;
    max = Math.max(max, item.area);
    min = Math.min(min, item.area);
  }
  const sum2 = sum * sum;
  const side2 = side * side;
  return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
}

function placeRow<T>(row: Sized<T>[], rect: Rect, out: TreemapTile<T>[]): Rect {
  const rowArea = row.reduce((total, item) => total + item.area, 0);
  if (rect.w >= rect.h) {
    const width = rowArea / rect.h;
    let y = rect.y;
    for (const item of row) {
      const height = item.area / width;
      out.push({ x: rect.x, y, w: width, h: height, data: item.data });
      y += height;
    }
    return { x: rect.x + width, y: rect.y, w: rect.w - width, h: rect.h };
  }
  const height = rowArea / rect.w;
  let x = rect.x;
  for (const item of row) {
    const width = item.area / height;
    out.push({ x, y: rect.y, w: width, h: height, data: item.data });
    x += width;
  }
  return { x: rect.x, y: rect.y + height, w: rect.w, h: rect.h - height };
}

export function squarify<T>(inputs: TreemapInput<T>[], bounds: Rect): TreemapTile<T>[] {
  const positive = inputs.filter((input) => input.value > 0 && Number.isFinite(input.value));
  const total = positive.reduce((sum, input) => sum + input.value, 0);
  if (!total || bounds.w <= 0 || bounds.h <= 0) return [];

  const scale = (bounds.w * bounds.h) / total;
  const queue: Sized<T>[] = positive
    .map((input) => ({ area: input.value * scale, data: input.data }))
    .sort((a, b) => b.area - a.area);

  const out: TreemapTile<T>[] = [];
  let rect = { ...bounds };
  let row: Sized<T>[] = [];

  while (queue.length) {
    const next = queue[0];
    const side = Math.min(rect.w, rect.h);
    if (!row.length || worstRatio([...row, next], side) <= worstRatio(row, side)) {
      row.push(next);
      queue.shift();
    } else {
      rect = placeRow(row, rect, out);
      row = [];
    }
  }
  if (row.length) placeRow(row, rect, out);
  return out;
}
