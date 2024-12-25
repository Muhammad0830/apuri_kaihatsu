"use client";

import { useTranslations } from "next-intl";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "@/navigation";

import { PiStudent } from "react-icons/pi";
import { RiParentLine } from "react-icons/ri";
import { MdGroups, MdOutlineAdminPanelSettings } from "react-icons/md";
import { FaWpforms } from "react-icons/fa6";
import { LuMessagesSquare } from "react-icons/lu";
import { PieChartComponent } from "@/components/PieChart";
import { LineChartComponent } from "@/components/LineChart";
import { PieChartPercent_1_Component } from "@/components/PieChartPercent1";
import { PieChartPercent_2_Component } from "@/components/PieChartPercent2";
import { PieChartPercent_3_Component } from "@/components/PieChartPercent3";

type CardData = {
  id: number;
  title: string;
  description: string;
  href: string;
  dataNumber: number;
};

const cardData: CardData[] = [
  {
    id: 1,
    title: "Students",
    description: "The number of Students",
    href: "/students",
    dataNumber: 254,
  },
  {
    id: 2,
    title: "Parents",
    description: "The number of Parents",
    href: "/parents",
    dataNumber: 323,
  },
  {
    id: 3,
    title: "Groups",
    description: "The number of Groups",
    href: "/groups",
    dataNumber: 125,
  },
  {
    id: 4,
    title: "Admins",
    description: "The number of Admins",
    href: "/admins",
    dataNumber: 12,
  },
  {
    id: 5,
    title: "Forms",
    description: "The number of Forms",
    href: "/forms",
    dataNumber: 734,
  },
];

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  const icons = [
    PiStudent,
    RiParentLine,
    MdGroups,
    MdOutlineAdminPanelSettings,
    FaWpforms,
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-row">
        <h1 className="text-3xl w-2/4 font-bold">{t("Dashboard")}</h1>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 2xl:grid-cols-5">
        {cardData.map((data, index) => {
          const IconComponent = icons[index % icons.length];
          return (
            <Link key={index} href={data.href} passHref>
              <Card className="w-full h-full bg-gray-200 dark:bg-black dark:hover:bg-opacity-30">
                <CardHeader className="p-3 flex flex-row items-center gap-2">
                  <IconComponent className="w-8 h-8" />
                  <CardTitle className="text-xl font-bold break-words">
                    {t(data.title)}
                  </CardTitle>
                </CardHeader>
                <CardFooter className="px-3 flex flex-col items-start pb-4">
                  <p className="text-xs text-muted-foreground">
                    {t(data.description)}
                  </p>
                  <p className="text-2xl text-black dark:text-white font-bold">
                    {data.dataNumber}
                  </p>
                </CardFooter>
              </Card>
            </Link>
          );
        })}
      </div>
      <div>
        <Link href={"/messages"} passHref>
          <Card className="bg-gray-200 grid grid-cols-10 flex-grow gap-8 dark:bg-black dark:hover:bg-opacity-30">
            <div className="col-start-1 col-end-4">
              <CardHeader className="flex flex-row items-center gap-4 p-3">
                <LuMessagesSquare className="w-8 h-8" />
                <CardTitle className="font-bold text-xl">
                  {t("Messages")}
                </CardTitle>
              </CardHeader>
              <div className="flex flex-col bg-transparent shadow-none flex-grow items-center">
                <CardTitle className="text-sm">{t("The number of messages")}</CardTitle>
                <CardDescription className="text-xs">{t("January - June 2024")}</CardDescription>
                <PieChartComponent />
                <CardFooter className="flex flex-row gap-4 text-xs justify-center p-6">
                <div className='flex flex-row items-center gap-1'>
                    <div className='w-3 h-3 rounded-full bg-[hsl(var(--chart-1))]'></div>
                    <div>{t("high")}</div>
                </div>
                <div className='flex flex-row items-center gap-1'>
                    <div className='w-3 h-3 rounded-full bg-[hsl(var(--chart-2))]'></div>
                    <div>{t("medium")}</div>
                </div>
                <div className='flex flex-row items-center gap-1'>
                    <div className='w-3 h-3 rounded-full bg-[hsl(var(--chart-3))]'></div>
                    <div>{t("low")}</div>
                </div>
            </CardFooter>
              </div>
            </div>
            <div className="col-start-4 col-end-8">
              <div className="flex flex-row justify-between items-center pt-6 pb-3">
                <CardTitle>{t("Visitors Insights")}</CardTitle>
                <div>{t("January - June 2024")}</div>
              </div>
              <LineChartComponent />
            </div>
            <div className="col-start-8 col-end-11 flex flex-col justify-center gap-4">
              <div className="text-center font-bold text-sm">
                {t("Percentage of viewed messages")}
              </div>
              <div className="grid grid-cols-4 gap-0">
                <div className="col-start-2 col-end-4 flex items-end ">
                  <PieChartPercent_1_Component />
                </div>
                <div className="row-start-2 col-start-1 col-end-3 ">
                  <PieChartPercent_2_Component />
                </div>
                <div className="row-start-2 col-start-3 col-end-5 ">
                  <PieChartPercent_3_Component />
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
