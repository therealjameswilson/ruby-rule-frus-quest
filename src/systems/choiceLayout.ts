import { pixelFontMetrics } from "./pixelFontMetrics";

export function wrapChoiceText(value: string, columns: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    let rest = word;
    if (line && line.length + 1 + rest.length > columns) {
      lines.push(line);
      line = "";
    }
    while (rest.length > columns) {
      lines.push(rest.slice(0, columns));
      rest = rest.slice(columns);
    }
    line = line ? `${line} ${rest}` : rest;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, columns - 3).trimEnd()}...`;
  }
  return lines.join("\n");
}

export function choiceLayout(title: string, options: readonly { key: string; label: string }[], contextFontSize: 6 | 8 = 6) {
  const [question = "", ...context] = title.split(/\n\s*\n/);
  const layoutAt = (fontSize: 6 | 8) => {
    const advance = pixelFontMetrics(fontSize).advance;
    const questionText = wrapChoiceText(question, Math.floor(216 / advance), fontSize === 8 ? 4 : 3);
    const contextText = wrapChoiceText(context.join(" "), Math.floor(216 / pixelFontMetrics(contextFontSize).advance), 3);
    const textHeight = (text: string, size: number) => text ? text.split("\n").length * (size + 2) - 2 : 0;
    let y = 10;
    const questionY = y;
    y += textHeight(questionText, fontSize) + 8;
    const contextY = y;
    if (contextText) y += textHeight(contextText, contextFontSize) + 8;
    const rows = options.map((option) => {
      const text = wrapChoiceText(`[${option.key}] ${option.label}`, Math.floor(206 / advance), fontSize === 8 ? 3 : 2);
      const height = Math.max(22, textHeight(text, fontSize) + 8);
      const row = { text, y, height };
      y += height + 3;
      return row;
    });
    const height = y + 7;
    return { fontSize, contextFontSize, questionText, contextText, questionY, contextY, rows, height, top: Math.round(120 - height / 2) };
  };
  const regular = layoutAt(8);
  return regular.height <= 180 ? regular : layoutAt(6);
}
