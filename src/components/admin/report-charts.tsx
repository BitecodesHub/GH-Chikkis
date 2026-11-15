"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart2, LineChart as LineChartIcon } from "lucide-react";
import { formatINR } from "@/lib/money";
import type { ReportBreakdown, ReportSeriesPoint } from "@/lib/types";

const PALETTE = ["#46512f", "#8a6a2f", "#b85c34", "#6b6353", "#2b3320", "#a08c5b"];

function compactINR(paise: number): string {
  const value = paise / 100;
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(0)}k`;
  return `₹${Math.round(value)}`;
}

const tooltipStyle = {
  background: "#f6f1e6",
  border: "1px solid #d9cdb4",
  fontSize: 12,
  color: "#221d16",
};

function ChartToggle({
  type,
  onChange,
  size = "md",
}: {
  type: "bar" | "line";
  onChange: (t: "bar" | "line") => void;
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";
  return (
    <div
      className="inline-flex rounded-md border border-line bg-paper-sunken p-0.5"
      role="group"
      aria-label="Chart type toggle"
    >
      <button
        type="button"
        onClick={() => onChange("bar")}
        className={`inline-flex items-center gap-1 rounded font-medium transition-colors ${
          isSm ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-[0.75rem]"
        } ${
          type === "bar"
            ? "bg-paper-raised text-ink shadow-xs"
            : "text-ink-muted hover:text-ink"
        }`}
        aria-pressed={type === "bar"}
      >
        <BarChart2 className={isSm ? "size-3" : "size-3.5"} />
        Bars
      </button>
      <button
        type="button"
        onClick={() => onChange("line")}
        className={`inline-flex items-center gap-1 rounded font-medium transition-colors ${
          isSm ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-[0.75rem]"
        } ${
          type === "line"
            ? "bg-paper-raised text-ink shadow-xs"
            : "text-ink-muted hover:text-ink"
        }`}
        aria-pressed={type === "line"}
      >
        <LineChartIcon className={isSm ? "size-3" : "size-3.5"} />
        Line
      </button>
    </div>
  );
}

export function TrendChart({ series }: { series: ReportSeriesPoint[] }) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const toggleSeries = (dataKey?: string) => {
    if (!dataKey) return;
    setHidden((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  return (
    <div
      className="w-full"
      role="img"
      aria-label="Chart of sales revenue, payments, expenses and estimated profit for the selected period"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[0.75rem] text-ink-muted">
          Click legend items to toggle series
        </span>
        <ChartToggle type={chartType} onChange={setChartType} />
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart
              data={series}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="#d9cdb4" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={compactINR}
                tick={{ fontSize: 11, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(value) => formatINR(Number(value))}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#57503f" }}
              />
              <Legend
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, cursor: "pointer", userSelect: "none" }}
                onClick={(e) => toggleSeries(e.dataKey as string)}
              />
              <Bar
                dataKey="revenuePaise"
                name="Sales revenue"
                fill="#46512f"
                radius={[2, 2, 0, 0]}
                hide={Boolean(hidden["revenuePaise"])}
              />
              <Bar
                dataKey="expensesPaise"
                name="Expenses"
                fill="#b85c34"
                radius={[2, 2, 0, 0]}
                hide={Boolean(hidden["expensesPaise"])}
              />
              <Bar
                dataKey="profitPaise"
                name="Estimated profit"
                fill="#8a6a2f"
                radius={[2, 2, 0, 0]}
                hide={Boolean(hidden["profitPaise"])}
              />
            </BarChart>
          ) : (
            <LineChart
              data={series}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="#d9cdb4" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={compactINR}
                tick={{ fontSize: 11, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(value) => formatINR(Number(value))}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#57503f" }}
              />
              <Legend
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, cursor: "pointer", userSelect: "none" }}
                onClick={(e) => toggleSeries(e.dataKey as string)}
              />
              <Line
                type="linear"
                dataKey="revenuePaise"
                name="Sales revenue"
                stroke="#46512f"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4.5 }}
                hide={Boolean(hidden["revenuePaise"])}
              />
              <Line
                type="linear"
                dataKey="expensesPaise"
                name="Expenses"
                stroke="#b85c34"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4.5 }}
                hide={Boolean(hidden["expensesPaise"])}
              />
              <Line
                type="linear"
                dataKey="profitPaise"
                name="Estimated profit"
                stroke="#8a6a2f"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4.5 }}
                hide={Boolean(hidden["profitPaise"])}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PaymentsChart({ data }: { data: ReportBreakdown[] }) {
  return (
    <Donut
      data={data}
      ariaLabel="Chart of payments received by payment method"
      empty="No payments were recorded in this period."
    />
  );
}

export function ExpenseDonut({ data }: { data: ReportBreakdown[] }) {
  return (
    <Donut
      data={data}
      ariaLabel="Chart of expenses by category"
      empty="No expenses were recorded in this period."
    />
  );
}

function Donut({
  data,
  ariaLabel,
  empty,
}: {
  data: ReportBreakdown[];
  ariaLabel: string;
  empty: string;
}) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-[0.875rem] text-ink-muted">{empty}</p>;
  }
  return (
    <div className="h-72 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer>
          <Pie
            data={data}
            dataKey="amountPaise"
            nameKey="label"
            innerRadius={52}
            outerRadius={92}
            paddingAngle={2}
            stroke="#f6f1e6"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.key} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatINR(Number(value))}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#57503f" }}
          />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars of revenue per product, tallest first. */
export function ProductMixChart({ data }: { data: ReportBreakdown[] }) {
  const rows = data.slice(0, 8);
  if (rows.length === 0) {
    return <p className="py-12 text-center text-[0.875rem] text-ink-muted">No sales in this period.</p>;
  }
  return (
    <div
      className="w-full"
      style={{ height: Math.max(160, rows.length * 44) }}
      role="img"
      aria-label="Bar chart of sales revenue by product"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          accessibilityLayer
        >
          <CartesianGrid horizontal={false} stroke="#d9cdb4" strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickFormatter={compactINR}
            tick={{ fontSize: 11, fill: "#6b6353" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={132}
            tick={{ fontSize: 11, fill: "#57503f" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => formatINR(Number(value))}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#57503f" }}
            cursor={{ fill: "rgba(217,205,180,0.25)" }}
          />
          <Bar dataKey="amountPaise" name="Revenue" fill="#46512f" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Month-by-month revenue and profit for longer ranges. */
export function MonthlyTrendChart({ series }: { series: ReportSeriesPoint[] }) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const toggleSeries = (dataKey?: string) => {
    if (!dataKey) return;
    setHidden((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  return (
    <div
      className="w-full"
      role="img"
      aria-label="Chart of monthly sales revenue and estimated profit"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[0.75rem] text-ink-muted">
          Click legend items to toggle series
        </span>
        <ChartToggle type={chartType} onChange={setChartType} />
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart
              data={series}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="#d9cdb4" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={compactINR}
                tick={{ fontSize: 11, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(value) => formatINR(Number(value))}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#57503f" }}
              />
              <Legend
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, cursor: "pointer", userSelect: "none" }}
                onClick={(e) => toggleSeries(e.dataKey as string)}
              />
              <Bar
                dataKey="revenuePaise"
                name="Sales revenue"
                fill="#46512f"
                radius={[2, 2, 0, 0]}
                hide={Boolean(hidden["revenuePaise"])}
              />
              <Bar
                dataKey="profitPaise"
                name="Estimated profit"
                fill="#8a6a2f"
                radius={[2, 2, 0, 0]}
                hide={Boolean(hidden["profitPaise"])}
              />
            </BarChart>
          ) : (
            <LineChart
              data={series}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="#d9cdb4" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={compactINR}
                tick={{ fontSize: 11, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(value) => formatINR(Number(value))}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#57503f" }}
              />
              <Legend
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, cursor: "pointer", userSelect: "none" }}
                onClick={(e) => toggleSeries(e.dataKey as string)}
              />
              <Line
                type="linear"
                dataKey="revenuePaise"
                name="Sales revenue"
                stroke="#46512f"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4.5 }}
                hide={Boolean(hidden["revenuePaise"])}
              />
              <Line
                type="linear"
                dataKey="profitPaise"
                name="Estimated profit"
                stroke="#8a6a2f"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4.5 }}
                hide={Boolean(hidden["profitPaise"])}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Compact daily revenue + profit strip for the dashboard. */
export function DashboardTrend({ series }: { series: ReportSeriesPoint[] }) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const toggleSeries = (key: string) => {
    setHidden((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      className="w-full"
      role="img"
      aria-label="Chart of daily sales revenue and estimated profit over the last two weeks"
    >
      <div className="mb-2.5 flex items-center justify-between text-[0.75rem]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleSeries("revenuePaise")}
            className={`inline-flex items-center gap-1.5 transition-opacity ${
              hidden["revenuePaise"] ? "opacity-35 line-through" : "text-ink"
            }`}
          >
            <span className="size-2.5 rounded-xs bg-[#46512f]" />
            <span className="font-medium text-[0.75rem]">Revenue</span>
          </button>
          <button
            type="button"
            onClick={() => toggleSeries("profitPaise")}
            className={`inline-flex items-center gap-1.5 transition-opacity ${
              hidden["profitPaise"] ? "opacity-35 line-through" : "text-ink"
            }`}
          >
            <span className="size-2.5 rounded-xs bg-[#8a6a2f]" />
            <span className="font-medium text-[0.75rem]">Profit</span>
          </button>
        </div>

        <ChartToggle type={chartType} onChange={setChartType} size="sm" />
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart
              data={series}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="#d9cdb4" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={compactINR}
                tick={{ fontSize: 10, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value) => formatINR(Number(value))}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#57503f" }}
              />
              <Bar
                dataKey="revenuePaise"
                name="Sales revenue"
                fill="#46512f"
                radius={[3, 3, 0, 0]}
                hide={Boolean(hidden["revenuePaise"])}
              />
              <Bar
                dataKey="profitPaise"
                name="Estimated profit"
                fill="#8a6a2f"
                radius={[3, 3, 0, 0]}
                hide={Boolean(hidden["profitPaise"])}
              />
            </BarChart>
          ) : (
            <LineChart
              data={series}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="#d9cdb4" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={compactINR}
                tick={{ fontSize: 10, fill: "#6b6353" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value) => formatINR(Number(value))}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#57503f" }}
              />
              <Line
                type="linear"
                dataKey="revenuePaise"
                name="Sales revenue"
                stroke="#46512f"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4.5 }}
                hide={Boolean(hidden["revenuePaise"])}
              />
              <Line
                type="linear"
                dataKey="profitPaise"
                name="Estimated profit"
                stroke="#8a6a2f"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4.5 }}
                hide={Boolean(hidden["profitPaise"])}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
