/** The same static wedge, name and raw tally in both chart layouts. */
import { Show } from 'solid-js';
import { describeArc, sliceRadius, percentileTierVar, textAnchor, polarToCartesian } from '../../lib/charts/arc-math';
import { PAD_ANGLE, tallyFit, type PizzaChartStat, type TallyFit } from '../../lib/charts/pizza-geometry';
import { pizzaLabelRadius } from '../../lib/charts/pizza-label-layout';
import './PizzaChart.css';

const valueStr = (v: number | string): string => String(v ?? '—');

export default function PizzaSlice(props: {
  stat: PizzaChartStat;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  labelOffset: number;
  /** A comparison pair seats both names at the larger wedge's label radius. */
  labelPercentile?: number;
  missing?: boolean;
  outwardLabel?: boolean;
  labelPosition?: { x: number; y: number };
}) {
  const midAngle = () => (props.startAngle + props.endAngle) / 2;
  const fit = () => tallyFit(props.stat.value, props.stat.percentile,
    props.endAngle - props.startAngle, props.innerRadius, props.outerRadius);
  return (
    <g class="pizza-slice">
      <Show when={!props.missing}>
        <path
          class="pizza-slice-arc"
          d={describeArc(0, 0, props.innerRadius,
            sliceRadius(props.stat.percentile, props.innerRadius, props.outerRadius),
            props.startAngle, props.endAngle, PAD_ANGLE)}
          fill={percentileTierVar(props.stat.percentile)}
          fill-opacity="0.85"
          stroke="var(--chart-ring, #e5e5e5)"
          stroke-width="1"
        />
      </Show>
      <SliceLabel
        stat={props.stat}
        angle={midAngle()}
        showsTally={props.missing || !fit().fits}
        labelPercentile={props.labelPercentile ?? props.stat.percentile}
        outwardLabel={props.outwardLabel}
        position={props.labelPosition}
        innerRadius={props.innerRadius}
        outerRadius={props.outerRadius}
        labelOffset={props.labelOffset}
      />
      <Show when={!props.missing}>
        <TallyLabel stat={props.stat} angle={midAngle()} fit={fit()} />
      </Show>
    </g>
  );
}

function SliceLabel(props: {
  stat: PizzaChartStat;
  angle: number;
  showsTally: boolean;
  labelPercentile: number;
  outwardLabel?: boolean;
  position?: { x: number; y: number };
  innerRadius: number;
  outerRadius: number;
  labelOffset: number;
}) {
  // Short slices gain extra space; growing slices draw their labels closer.
  const pos = () => props.position ??
    polarToCartesian(
      0,
      0,
      pizzaLabelRadius(props.labelPercentile, props.innerRadius, props.outerRadius, props.labelOffset),
      props.angle,
    );
  const anchor = () => props.outwardLabel ? (pos().x < 0 ? 'end' : 'start') : textAnchor(pos().x);
  // Wedges too small to seat the tally carry it out here under the name
  // (tallyFit's floor rule); the rest hold it inside.

  return (
    <>
      <text
        x={pos().x}
        y={pos().y - (props.showsTally || props.outwardLabel ? 7 : 4)}
        text-anchor={anchor()}
        fill="var(--chart-label, #1a1a1a)"
        class="pizza-slice-label"
      >
        {props.stat.label}
      </text>
      <Show when={props.showsTally}>
        <text
          x={pos().x}
          y={pos().y + 9}
          text-anchor={anchor()}
          fill="var(--chart-sublabel, #666666)"
          class="pizza-slice-sublabel"
        >
          {valueStr(props.stat.value)}
        </text>
      </Show>
    </>
  );
}

function TallyLabel(props: {
  stat: PizzaChartStat;
  angle: number;
  fit: TallyFit;
}) {
  const pos = () => polarToCartesian(0, 0, props.fit.radius, props.angle);

  return (
    <Show when={props.fit.fits}>
      <text
        x={pos().x}
        y={pos().y + props.fit.font * 0.35}
        font-size={String(props.fit.font)}
        text-anchor="middle"
        fill="#ffffff"
        class="pizza-slice-tally"
      >
        {String(props.stat.value)}
      </text>
    </Show>
  );
}
