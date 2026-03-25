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
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#f472b6', // pink-400
  '#fb923c', // orange-400
  '#a78bfa', // violet-400
  '#facc15', // yellow-400
  '#2dd4bf', // teal-400
];

interface Props {
  series: TimeSeriesPoint[];
  yAxes: string[];
  height?: number;
}

export function TimeSeriesChart({ series, yAxes, height = 200 }: Props) {
  // Recharts expects flat objects: { t, x, v, ... }
  const data = series.map((pt) => ({ t: pt.t, ...pt.values }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={{ stroke: '#475569' }}
          label={{ value: 't (s)', position: 'insideRight', offset: -4, fill: '#94a3b8', fontSize: 10 }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={{ stroke: '#475569' }}
          width={32}
        />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 11 }}
          labelStyle={{ color: '#94a3b8' }}
        />
        {yAxes.length > 1 && <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />}
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
