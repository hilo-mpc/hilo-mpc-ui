import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TimeSeriesPoint } from '../../types/simulation';

const COLORS = [
  '#fb7185', // rose-400
  '#fbbf24', // amber-400
  '#fb923c', // orange-400
  '#fda4af', // rose-300
  '#fcd34d', // amber-300
  '#fdba74', // orange-300
  '#f9a8d4', // pink-300
];

interface Props {
  series: TimeSeriesPoint[];
  yAxes: string[];
  height?: number;
}

export function TimeSeriesChart({ series, yAxes, height = 200 }: Props) {
  const data = series.map((pt) => ({ t: pt.t, ...pt.values }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 10, fill: '#a8a29e' }}
          tickLine={false}
          axisLine={{ stroke: '#57534e' }}
          label={{ value: 't (s)', position: 'insideRight', offset: -4, fill: '#a8a29e', fontSize: 10 }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#a8a29e' }}
          tickLine={false}
          axisLine={{ stroke: '#57534e' }}
          width={32}
        />
        <Tooltip
          contentStyle={{ background: '#292524', border: '1px solid #44403c', fontSize: 11 }}
          labelStyle={{ color: '#a8a29e' }}
        />
        {yAxes.length > 1 && <Legend wrapperStyle={{ fontSize: 10, color: '#a8a29e' }} />}
        {yAxes.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLORS[i % COLORS.length]}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
