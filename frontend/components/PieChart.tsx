"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

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
  { priority: "high", visitors: 25, fill: "var(--color-high)" },
  { priority: "medium", visitors: 16, fill: "var(--color-medium)" },
  { priority: "low", visitors: 13, fill: "var(--color-low)" },
];

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  high: {
    label: "high",
    color: "hsl(var(--chart-1))",
  },
  medium: {
    label: "medium",
    color: "hsl(var(--chart-2))",
  },
  low: {
    label: "low",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function PieChartComponent() {
  const totalVisitors = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0);
  }, []);

  return (
    <div className="flex flex-col items-center w-full justify-center">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[250px] w-[60%]"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="visitors"
            nameKey="priority"
            innerRadius={60}
            outerRadius={75}
            strokeWidth={10}
            cornerRadius={5}
            paddingAngle={4}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {totalVisitors.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground"
                      >
                        Messages
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
}
