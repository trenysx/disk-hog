export function squarify(items, x, y, w, h) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const rects = [];
  if (total <= 0 || w <= 0 || h <= 0) return rects;

  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  let remaining = sorted.slice();
  let cx = x;
  let cy = y;
  let cw = w;
  let ch = h;
  let areaLeft = w * h;
  let valueLeft = total;

  while (remaining.length > 0 && areaLeft > 0 && cw > 0 && ch > 0) {
    const vertical = cw < ch;
    const side = vertical ? ch : cw;
    const row = [];
    let rowValue = 0;
    let bestRatio = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidateValue = rowValue + remaining[i].value;
      const candidateArea = (candidateValue / valueLeft) * areaLeft;
      const thickness = candidateArea / side;
      const ratio = worstRatio(row, remaining[i], candidateValue, valueLeft, areaLeft, side);
      if (row.length === 0 || ratio <= bestRatio) {
        row.push(remaining[i]);
        rowValue = candidateValue;
        bestRatio = ratio;
      } else {
        break;
      }
    }

    const rowArea = (rowValue / valueLeft) * areaLeft;
    const thickness = rowArea / side;

    let offset = 0;
    for (const item of row) {
      const itemArea = (item.value / rowValue) * rowArea;
      const len = itemArea / thickness;
      if (vertical) {
        rects.push({ ...item, x: cx, y: cy + offset, w: thickness, h: len });
      } else {
        rects.push({ ...item, x: cx + offset, y: cy, w: len, h: thickness });
      }
      offset += len;
    }

    if (vertical) {
      cx += thickness;
      cw -= thickness;
    } else {
      cy += thickness;
      ch -= thickness;
    }
    areaLeft -= rowArea;
    valueLeft -= rowValue;
    remaining = remaining.slice(row.length);
  }
  return rects;
}

function worstRatio(row, nextItem, rowValue, valueLeft, areaLeft, side) {
  const all = [...row, nextItem];
  const rowArea = (rowValue / valueLeft) * areaLeft;
  const thickness = rowArea / side;
  if (thickness <= 0) return Infinity;
  let worst = 0;
  for (const item of all) {
    const len = ((item.value / rowValue) * rowArea) / thickness;
    if (len <= 0) return Infinity;
    worst = Math.max(worst, Math.max(len / thickness, thickness / len));
  }
  return worst;
}
