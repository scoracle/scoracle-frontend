import { fireEvent, render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ButterflyChart, { type ButterflyStat } from './ButterflyChart';

const names = ['xG For', 'Creation', 'Cards', 'Clean Sheets', 'Goals Against', 'Goals For', 'Tackling', 'xG Against'];
const stats = (): ButterflyStat[] => names.map((label, i) => ({
  key: label, label, leftValue: 1000 + i, rightValue: 2000 + i,
  leftPercentile: i * 14, rightPercentile: 100 - i * 14,
}));

function measure(width: number, height = 460) {
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: (entries: unknown[]) => void) {}
    observe() { this.callback([{ contentRect: { width, height } }]); }
    disconnect() {}
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('ButterflyChart', () => {
  it('keeps paired names mirrored and within narrow and full card cells', () => {
    for (const width of [240, 300, 374]) {
      measure(width);
      const { container, unmount } = render(() => <ButterflyChart stats={stats()} />);
      expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(`${-width / 2} -230 ${width} 460`);
      for (const pair of container.querySelectorAll('.butterfly-pair')) {
        const labels = pair.querySelectorAll('.pizza-slice-label');
        expect(labels).toHaveLength(2);
        expect(labels[0].textContent).toBe(labels[1].textContent);
        expect(Number(labels[0].getAttribute('x'))).toBeCloseTo(-Number(labels[1].getAttribute('x')));
        for (const label of labels) {
          const x = Number(label.getAttribute('x'));
          const textWidth = (label.textContent?.length ?? 0) * 13 * 0.55;
          expect(Math.abs(x) + textWidth).toBeLessThanOrEqual(width / 2 - 7.9);
          expect(Math.abs(Number(label.getAttribute('y')))).toBeLessThan(222);
          expect(label.getAttribute('text-anchor')).toBe(x < 0 ? 'end' : 'start');
        }
      }
      unmount();
    }
  });

  it('renders raw values with no geometry or label changes on hover', () => {
    measure(374);
    const data = stats();
    const { container } = render(() => <ButterflyChart stats={data} />);
    for (const stat of data) {
      expect(container.textContent).toContain(String(stat.leftValue));
      expect(container.textContent).toContain(String(stat.rightValue));
    }
    const before = container.innerHTML;
    const pair = container.querySelector('.butterfly-pair')!;
    fireEvent.mouseEnter(pair);
    expect(container.innerHTML).toBe(before);
    fireEvent.mouseLeave(pair);
    expect(container.innerHTML).toBe(before);
    expect(container.querySelector('path[fill="transparent"]')).toBeNull();
  });

  it('separates the labels in a dense combined team stat list', () => {
    measure(374, 510);
    const names = ['Big Chances Allowed', 'Interceptions', 'SoT Allowed', 'Goals For',
      'Creation', 'Injuries', 'Cards', 'Clean Sheets', 'xG For', 'Tackling',
      'Shooting', 'xG Against', 'Progression', 'Goals Against', 'Possession Lost'];
    const { container } = render(() => <ButterflyChart stats={names.map((label, i) => ({
      key: label, label, leftValue: 1000 + i, rightValue: 2000 + i,
      leftPercentile: 100 - i * 6, rightPercentile: i * 6,
    }))} />);
    const ys = [...container.querySelectorAll('.butterfly-side-right .pizza-slice-label')]
      .map((label) => Number(label.getAttribute('y')));
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(29.9);
    expect(ys[0]).toBeGreaterThan(-255 + 12);
    expect(ys.at(-1)).toBeLessThan(255 - 20);
  });

  it('distinguishes missing data from zero and updates when comparison data changes', () => {
    measure(374);
    const [data, setData] = createSignal<ButterflyStat[]>([
      { key: 'goals', label: 'Goals', leftValue: null, leftPercentile: null, rightValue: 0, rightPercentile: 0 },
      { key: 'shots', label: 'Shots', leftValue: 7, leftPercentile: 50, rightValue: 9, rightPercentile: 80 },
    ]);
    const { container } = render(() => <ButterflyChart stats={data()} />);
    const side = (name: string) => [...container.querySelectorAll(`.butterfly-side-${name}`)]
      .find((el) => el.textContent?.includes('Goals'))!;
    expect(side('left').querySelector('.pizza-slice-arc')).toBeNull();
    expect(side('left').textContent).toContain('—');
    expect(side('right').querySelector('.pizza-slice-arc')).not.toBeNull();
    expect(side('right').textContent).toContain('0');
    setData((prev) => prev.map((s) => s.key === 'goals' ? { ...s, leftValue: 42, leftPercentile: 95 } : s));
    expect(side('left').querySelector('.pizza-slice-arc')).not.toBeNull();
    expect(side('left').textContent).toContain('42');
    expect(side('left').textContent).not.toContain('—');
  });
});
