"use client";

import { Link } from "@/navigation";
import { Bell, CircleUser, Menu, Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ToggleMode } from "@/components/toggle-mode";
import { useTranslations } from "next-intl";
import { signIn, signOut, useSession } from "next-auth/react";
import { User } from "next-auth";
import NavLinks from "@/components/NavLinks";
import LanguageSelect from "@/components/LanguageSelect";
import { useState, useRef } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const currentWidth = ref.current?.scrollWidth;
    if (ref.current) {
      ref.current.style.width = `${currentWidth}px`; // Set to `auto` width
      setTimeout(() => setIsHovered(true), 1); // Trigger hover state
    }
  };

  const handleMouseLeave = () => setIsHovered(false);

  const { data: session } = useSession({
    required: true,
  });
  const t = useTranslations("app");
  const tName = useTranslations("names");

  const user = session?.user as User;

  if (session?.error === "RefreshAccessTokenError") signIn();

  return (
    <div className="grid min-h-screen w-full relative dark:bg-[#222222]">
      {" "}
      <header className="flex h-14 items-center z-50 gap-4 border-b bg-background pr-4 lg:h-[60px] lg:pr-6 sticky top-0 dark:bg-[#222222] dark:border-gray-500">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t("menu")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col">
            <nav className="grid gap-2 text-lg font-medium">
              <Link
                href="#"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <Package2 className="h-6 w-6" />
                <span className="sr-only">{session?.schoolName}</span>
              </Link>
              <NavLinks user={user} />
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex w-auto h-full items-center border-r bg-gray-200 dark:bg-black">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold leading-none w-full h-full px-4 md:w-[220px] lg:w-[300px]"
          >
            <Package2 className="h-6 w-6" />
            <p className="flex-1">{session && session?.schoolName}</p>
          </Link>
        </div>
        <div className="sm:flex gap-2 hidden">
          <LanguageSelect />
          <ToggleMode />
        </div>
        <div className="flex items-center justify-end w-full gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2">
                <span className="cursor-pointer">
                  {user && tName("name", { ...user })}
                </span>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full dark:bg-white"
                >
                  <CircleUser className="h-5 w-5 dark:text-black" />
                  <span className="sr-only">{t("account")}</span>
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark:bg-[#222222] dark:border-gray-500">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <div>{t("account")}</div>
                  <div className="text-gray-600 dark:text-gray-400">{user?.email}</div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t("settings")}</DropdownMenuItem>
              <DropdownMenuItem>{t("support")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => await signOut()}>
                {t("logout")}
              </DropdownMenuItem>
              <div className="sm:hidden">
                <DropdownMenuSeparator />
                <div className="flex gap-2">
                  <LanguageSelect />
                  <ToggleMode />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="min-h-screen w-full z-40 flex justify-end">
        <div
          className={
            "group left-0 top-[3.7rem] z-50 fixed border-t hidden border-r h-full bg-gray-200 md:block hover:shadow-gray-600 shadow-gray-100 shadow-lg transition-all duration-300 ease-in-out overflow-hidden dark:bg-black"
          }
          style={{ width: isHovered ? "300px" : "70px" }}
          ref={ref}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex h-full w-full max-h-screen flex-col gap-2 sticky top-0 z-50 pt-2 transition-colors duration-300">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <NavLinks user={user} />
            </nav>
          </div>
        </div>
        <main className="flex w-[calc(100%-70px)] flex-col gap-4 p-4 lg:gap-6 absolute r-0 lg:p-6 z-20 dark:bg-[#222222]">
          {children}
        </main>
      </div>
    </div>
  );
}
