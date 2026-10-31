"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

export function TrendChart({
  series,
  monthly = false,
}: {
  series: ReportSeriesPoint[];
  monthly?: boolean;
}) {
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label={
        monthly
          ? "Chart of sales revenue, payments, expenses and estimated profit for the last 12 months"
          : "Chart of sales revenue, payments, expenses and estimated profit for the selected period"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
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
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="revenuePaise" name="Sales revenue" fill="#46512f" radius={[2, 2, 0, 0]} />
          <Bar dataKey="expensesPaise" name="Expenses" fill="#b85c34" radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="profitPaise"
            name="Estimated profit"
            stroke="#8a6a2f"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentsChart({ data }: { data: ReportBreakdown[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-[0.875rem] text-ink-muted">
        No payments were recorded in this period.
      </p>
    );
  }
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="Chart of payments received by payment method"
    >
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
