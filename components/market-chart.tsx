"use client";

import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChartData {
  time: string;
  value: number;
}

interface MarketChartProps {
  data: ChartData[];
  contestants?: { name: string; color: string; data: ChartData[] }[];
}

const timeRanges = ["live", "day", "week", "month", "all"] as const;

export function MarketChart({ data, contestants }: MarketChartProps) {
  const t = useTranslations("time");
  const [activeRange, setActiveRange] = useState<(typeof timeRanges)[number]>("live");

  // If single line, use data directly
  // If multiple contestants, show all lines
  const chartData = contestants
    ? data.map((point, i) => ({
        time: point.time,
        ...contestants.reduce(
          (acc, c) => ({ ...acc, [c.name]: c.data[i]?.value ?? 0 }),
          {}
        ),
      }))
    : data;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Time Range Tabs */}
      <div className="mb-4 flex items-center gap-1">
        {timeRanges.map((range) => (
          <button
            key={range}
            onClick={() => setActiveRange(range)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeRange === range
                ? "bg-foreground text-background"
                : "text-foreground-muted hover:bg-muted hover:text-foreground"
            )}
          >
            {t(range)}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
              tickFormatter={(value) => `${value}%`}
              width={40}
            />
            <ReferenceLine
              y={50}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
                      <p className="text-xs text-foreground-muted">{label}</p>
                      {payload.map((entry, index) => (
                        <p
                          key={index}
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: entry.color }}
                        >
                          {entry.name}: {Number(entry.value).toFixed(1)}%
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            {contestants ? (
              contestants.map((contestant) => (
                <Line
                  key={contestant.name}
                  type="monotone"
                  dataKey={contestant.name}
                  stroke={contestant.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--primary)" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
