"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
const chartData = [
  { month: "January", high: 6, neutrall: 3, low: 5 },
  { month: "February", high: 5, neutrall: 2, low: 2 },
  { month: "March", high: 7, neutrall: 3, low: 1 },
  { month: "April", high: 3, neutrall: 4, low: 2 },
  { month: "May", high: 6, neutrall: 5, low: 4 },
  { month: "June", high: 4, neutrall: 2, low: 1 },
];

const chartConfig = {
  high: {
    label: "high",
    color: "hsl(var(--chart-1))",
  },
  neutrall: {
    label: "neutrall",
    color: "hsl(var(--chart-2))",
  },
  low: {
    label: "low",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function LineChartComponent() {
  return (
    <Card className="bg-transparent shadow-none border-none gap-0">
      <CardContent className="p-4 bg-gray-300 rounded-lg scale-y-90 dark:bg-gray-200">
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
              color="var(--color-background)"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.toLocaleString()}
              width={12}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="high"
              type="monotone"
              stroke="var(--color-high)"
              strokeWidth={6}
              dot={false}
            />
            <Line
              dataKey="neutrall"
              type="monotone"
              stroke="var(--color-neutrall)"
              strokeWidth={6}
              dot={false}
            />
            <Line
              dataKey="low"
              type="monotone"
              stroke="var(--color-low)"
              strokeWidth={6}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
