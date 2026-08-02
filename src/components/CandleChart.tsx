import { useEffect, useRef, useState } from "react";
import type { Candle } from "../lib/market";
import { formatCandleTime } from "../lib/market";
import { useTheme } from "../lib/themeStore";

export interface ChartOverlay {
  kind: "entry" | "sl" | "tp";
  price: number;
  index: number;
  direction: "Buy" | "Sell";
}

export interface CandleChartProps {
  candles: Candle[];
  focusIndex: number;
  interval: string;
  overlays?: ChartOverlay[];
  height?: number;
  replayMode?: boolean;
  onCandleClick?: (index: number) => void;
}

interface Crosshair {
  index: number;
  price: number;
}

const PAD_LEFT = 8;
const PAD_RIGHT = 64;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;
const VOL_HEIGHT = 44;

const UP = "#10b981";
const DOWN = "#f43f5e";
const TEXT = "#64748b";
const FOCUS = "#818cf8";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function CandleChart({
  candles,
  focusIndex,
  interval,
  overlays = [],
  height = 460,
  replayMode = false,
  onCandleClick,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  const gridColor = isDark ? "#1e293b" : "#cbd5e1";
  const crosshairColor = isDark ? "rgba(226,232,240,0.4)" : "rgba(71,85,105,0.5)";
  const legendBg = isDark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.9)";
  const legendText = isDark ? "#cbd5e1" : "#334155";
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [windowSize, setWindowSize] = useState(120);
  const [offset, setOffset] = useState(0);
  const [crosshair, setCrosshair] = useState<Crosshair | null>(null);
  const dragRef = useRef<{
    startX: number;
    startOffset: number;
    dragging: boolean;
  }>({ startX: 0, startOffset: 0, dragging: false });

  const win = Math.min(windowSize, Math.max(10, candles.length));
  const maxStart = Math.max(0, candles.length - win);
  let off = clamp(offset, 0, maxStart);
  if (focusIndex < off || focusIndex >= off + win) {
    off = clamp(focusIndex - win + 1, 0, maxStart);
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    const w = size.width;
    const h = size.height;
    const plotW = w - PAD_LEFT - PAD_RIGHT;
    const plotH = h - PAD_TOP - PAD_BOTTOM - VOL_HEIGHT;
    if (plotW <= 0 || plotH <= 0 || candles.length === 0) return;

    const visibleEnd = replayMode
      ? Math.min(focusIndex, off + win - 1)
      : off + win - 1;
    const visible = candles.slice(off, visibleEnd + 1);
    if (visible.length === 0) return;

    let minPrice = Math.min(...visible.map((c) => c.low));
    let maxPrice = Math.max(...visible.map((c) => c.high));
    const pad = (maxPrice - minPrice) * 0.04 || 1;
    minPrice -= pad;
    maxPrice += pad;
    const maxVol = Math.max(...visible.map((c) => c.volume), 1);

    const candleW = plotW / win;
    const xOf = (i: number) => PAD_LEFT + (i - off + 0.5) * candleW;
    const yOf = (p: number) =>
      PAD_TOP + plotH * (1 - (p - minPrice) / (maxPrice - minPrice));
    const volY0 = PAD_TOP + plotH;
    const volH = VOL_HEIGHT * 0.75;

    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";

    // Grid + y labels
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = TEXT;
    const rows = 5;
    for (let r = 0; r <= rows; r++) {
      const p = minPrice + ((maxPrice - minPrice) * r) / rows;
      const y = yOf(p);
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(PAD_LEFT + plotW, y);
      ctx.stroke();
      ctx.fillText(p.toFixed(p >= 100 ? 1 : 4), PAD_LEFT + plotW + 6, y + 3);
    }

    // Volume bars
    visible.forEach((c, k) => {
      const i = off + k;
      const x = xOf(i);
      const vh = (c.volume / maxVol) * volH;
      ctx.fillStyle = c.close >= c.open ? `${UP}66` : `${DOWN}66`;
      ctx.fillRect(x - candleW / 2 + 1, volY0 - vh, Math.max(1, candleW - 2), vh);
    });

    // Horizontal grid line separating volume
    ctx.strokeStyle = gridColor;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, volY0);
    ctx.lineTo(PAD_LEFT + plotW, volY0);
    ctx.stroke();

    // Candles
    visible.forEach((c, k) => {
      const i = off + k;
      const x = xOf(i);
      const up = c.close >= c.open;
      const color = up ? UP : DOWN;
      const bodyTop = yOf(Math.max(c.open, c.close));
      const bodyBottom = yOf(Math.min(c.open, c.close));
      const bodyH = Math.max(1, bodyBottom - bodyTop);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yOf(c.high));
      ctx.lineTo(x, yOf(c.low));
      ctx.stroke();
      ctx.fillRect(x - Math.max(1, candleW * 0.34), bodyTop, Math.max(2, candleW * 0.68), bodyH);
    });

    // Time labels
    ctx.fillStyle = TEXT;
    const labelEvery = Math.max(1, Math.ceil(win / 6));
    for (let k = 0; k < visible.length; k += labelEvery) {
      const i = off + k;
      const x = xOf(i);
      ctx.fillText(
        formatCandleTime(candles[i].time, interval),
        x - 30,
        PAD_TOP + plotH + VOL_HEIGHT + 15,
      );
    }

    // Overlays (entry / SL / TP)
    overlays.forEach((ov) => {
      const fromX = PAD_LEFT + (Math.max(ov.index, off) - off) * candleW;
      const color =
        ov.kind === "entry"
          ? "#22d3ee"
          : ov.kind === "sl"
            ? "#fb7185"
            : "#34d399";
      ctx.strokeStyle = color;
      ctx.setLineDash(ov.kind === "entry" ? [] : [5, 4]);
      ctx.beginPath();
      ctx.moveTo(fromX, yOf(ov.price));
      ctx.lineTo(PAD_LEFT + plotW, yOf(ov.price));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      const label = `${ov.kind.toUpperCase()} ${ov.price.toFixed(ov.price >= 100 ? 1 : 4)}`;
      ctx.fillText(label, fromX + 4, yOf(ov.price) - 4);
    });

    // Focus (replay cursor) line
    if (focusIndex >= off && focusIndex < off + win) {
      const x = xOf(focusIndex);
      ctx.strokeStyle = FOCUS;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP);
      ctx.lineTo(x, volY0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }

    // Crosshair
    if (crosshair && crosshair.index >= off && crosshair.index < off + win) {
      const c = candles[crosshair.index];
      const x = xOf(crosshair.index);
      const y = yOf(crosshair.price);
      ctx.strokeStyle = crosshairColor;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP);
      ctx.lineTo(x, volY0);
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(PAD_LEFT + plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      const up = c.close >= c.open;
      const legend = [
        `O ${c.open.toFixed(c.open >= 100 ? 1 : 4)}`,
        `H ${c.high.toFixed(c.high >= 100 ? 1 : 4)}`,
        `L ${c.low.toFixed(c.low >= 100 ? 1 : 4)}`,
        `C ${c.close.toFixed(c.close >= 100 ? 1 : 4)}`,
        `V ${c.volume >= 1000 ? (c.volume / 1000).toFixed(1) + "k" : c.volume.toFixed(0)}`,
      ];
      let lx = PAD_LEFT + 8;
      ctx.fillStyle = legendBg;
      ctx.fillRect(PAD_LEFT + 4, PAD_TOP + 4, legend.join("  ").length * 6.6 + 12, 18);
      legend.forEach((part) => {
        const isC = part.startsWith("C ");
        ctx.fillStyle = isC ? (up ? UP : DOWN) : legendText;
        ctx.fillText(part, lx, PAD_TOP + 17);
        lx += part.length * 6.6 + 8;
      });
    }
  }, [candles, off, win, crosshair, overlays, focusIndex, size, interval, replayMode, isDark, gridColor, crosshairColor, legendBg, legendText]);

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.18 : 1 / 1.18;
    const newWindow = clamp(Math.round(win * factor), 10, Math.max(10, candles.length));
    const rightEdge = off + win;
    const newOffset = clamp(rightEdge - newWindow, 0, Math.max(0, candles.length - newWindow));
    setWindowSize(newWindow);
    setOffset(newOffset);
  }

  function handleMouseDown(e: React.MouseEvent) {
    dragRef.current = { startX: e.clientX, startOffset: off, dragging: true };
  }

  function handleMouseMove(e: React.MouseEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const plotW = rect.width - PAD_LEFT - PAD_RIGHT;
    const plotH = rect.height - PAD_TOP - PAD_BOTTOM - VOL_HEIGHT;
    const candleW = plotW / win;
    const index = Math.floor((x - PAD_LEFT) / candleW) + off;

    if (index >= off && index < off + win && candles[index]) {
      const visible = candles.slice(off, off + win);
      const minPrice = Math.min(...visible.map((c) => c.low));
      const maxPrice = Math.max(...visible.map((c) => c.high));
      const p = Math.max(0, Math.min(1, (y - PAD_TOP) / plotH));
      const price = maxPrice - p * (maxPrice - minPrice);
      setCrosshair({ index, price });
    }

    if (dragRef.current.dragging) {
      const dx = e.clientX - dragRef.current.startX;
      const shift = Math.round(dx / candleW);
      const next = clamp(dragRef.current.startOffset - shift, 0, maxStart);
      setOffset(next);
    }
  }

  function handleMouseLeave() {
    dragRef.current.dragging = false;
    setCrosshair(null);
  }

  function handleMouseUp() {
    dragRef.current.dragging = false;
  }

  function handleClick(e: React.MouseEvent) {
    if (dragRef.current.dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const plotW = rect.width - PAD_LEFT - PAD_RIGHT;
    const plotH = rect.height - PAD_TOP - PAD_BOTTOM - VOL_HEIGHT;
    const candleW = plotW / win;
    const index = Math.floor((x - PAD_LEFT) / candleW) + off;
    if (index >= off && index < off + win && candles[index]) {
      const visible = candles.slice(off, off + win);
      const minPrice = Math.min(...visible.map((c) => c.low));
      const maxPrice = Math.max(...visible.map((c) => c.high));
      const p = Math.max(0, Math.min(1, (y - PAD_TOP) / plotH));
      const price = maxPrice - p * (maxPrice - minPrice);
      setCrosshair({ index, price });
      onCandleClick?.(index);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        style={{ height }}
        className="block w-full cursor-crosshair touch-none select-none rounded-lg"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      />
    </div>
  );
}
