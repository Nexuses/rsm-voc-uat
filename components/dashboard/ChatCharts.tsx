"use client";

import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHAT_CHART_COLORS,
  type ChatBarChart,
  type ChatChart,
  type ChatDonutChart,
  type ChatLineChart,
} from "@/lib/chat-charts";
import styles from "./dashboard.module.css";

export default function ChatCharts({ charts }: { charts: ChatChart[] }) {
  if (!charts.length) return null;

  return (
    <div className={styles.chatCharts} aria-label="Data visualizations">
      {charts.map((chart, index) => (
        <article key={`${chart.type}-${chart.title}-${index}`} className={styles.chatChartCard}>
          <header className={styles.chatChartHeader}>
            <h3>{chart.title}</h3>
            {chart.subtitle ? <p>{chart.subtitle}</p> : null}
          </header>
          {chart.type === "line" ? (
            <ChatLineChart chart={chart} />
          ) : chart.type === "bar" ? (
            <ChatBarChart chart={chart} />
          ) : (
            <ChatDonutChart chart={chart} />
          )}
        </article>
      ))}
    </div>
  );
}

function ChatLineChart({ chart }: { chart: ChatLineChart }) {
  const data = chart.labels.map((label, index) => {
    const row: Record<string, string | number> = { label };
    for (const series of chart.series) {
      row[series.name] = series.values[index] ?? 0;
    }
    return row;
  });

  return (
    <div className={styles.chatChartCanvas} role="img" aria-label={chart.title}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#63666a", fontSize: 10 }}
            axisLine={{ stroke: "#d1d3d4" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#63666a", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip />
          {chart.series.map((series, index) => (
            <Line
              key={series.name}
              type="monotone"
              dataKey={series.name}
              stroke={CHAT_CHART_COLORS[index % CHAT_CHART_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 3, fill: CHAT_CHART_COLORS[index % CHAT_CHART_COLORS.length] }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChatBarChart({ chart }: { chart: ChatBarChart }) {
  const data = chart.labels.map((label, index) => ({
    label,
    value: chart.values[index] ?? 0,
    fill: CHAT_CHART_COLORS[index % CHAT_CHART_COLORS.length],
  }));
  const horizontal = shouldUseHorizontalBars(chart.labels);
  const chartHeight = horizontal
    ? Math.min(360, Math.max(200, chart.labels.length * 34 + 24))
    : 180;
  const yAxisWidth = horizontal
    ? Math.min(
        168,
        Math.max(96, ...chart.labels.map((label) => Math.min(label.length * 5.8, 160)))
      )
    : 28;

  return (
    <div
      className={
        horizontal
          ? `${styles.chatChartCanvas} ${styles.chatChartCanvasHorizontal}`
          : styles.chatChartCanvas
      }
      role="img"
      aria-label={chart.title}
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        {horizontal ? (
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
          >
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: "#63666a", fontSize: 10 }}
              axisLine={{ stroke: "#d1d3d4" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={yAxisWidth}
              tick={{ fill: "#63666a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [value ?? 0, chart.valueLabel ?? "Value"]}
              labelFormatter={(label) => String(label)}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#63666a", fontSize: 10 }}
              axisLine={{ stroke: "#d1d3d4" }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#63666a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              formatter={(value) => [value ?? 0, chart.valueLabel ?? "Value"]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function shouldUseHorizontalBars(labels: string[]) {
  if (labels.length > 4) return true;
  return labels.some((label) => label.length > 10);
}

function ChatDonutChart({ chart }: { chart: ChatDonutChart }) {
  const total = chart.segments.reduce((sum, segment) => sum + segment.value, 0);
  const data = chart.segments.map((segment, index) => ({
    ...segment,
    fill: CHAT_CHART_COLORS[index % CHAT_CHART_COLORS.length],
    percent: total > 0 ? Math.round((segment.value / total) * 100) : 0,
  }));

  return (
    <div className={styles.chatDonutLayout}>
      <div className={styles.chatChartCanvas} role="img" aria-label={chart.title}>
        <ResponsiveContainer width="100%" height={168}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={46}
              outerRadius={68}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const payload = item?.payload as { percent?: number } | undefined;
                return [`${value ?? 0} (${payload?.percent ?? 0}%)`, "Count"];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className={styles.chatDonutLegend}>
        {data.map((segment) => (
          <li key={segment.label}>
            <i style={{ background: segment.fill }} aria-hidden="true" />
            <span>{segment.label}</span>
            <strong>{segment.percent}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
