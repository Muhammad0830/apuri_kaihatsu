"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Group from "@/types/group";
import { GroupTable } from "@/components/GroupTable";
import Student from "@/types/student";
import { StudentTable } from "@/components/StudentTable";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "@/navigation";
import ImageFile from "@/types/ImageFile";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import { toast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import Post from "@/types/post";

const formSchema = z.object({
  title: z.string().min(1),
  label: z.string().min(1),
  /* images: z.instanceof(FileList).optional(),*/
});

export default function SendMessagePage() {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("sendmessage");
  const tName = useTranslations("names");

  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      label: "",
      /*images: {} as FileList,*/
    },
  });
  const formValues = useWatch({ control: form.control });
  const router = useRouter();
  const { mutate, isPending } = useApiMutation<{ post: Post }>(
    `post/titleCreate`,
    "POST",
    ["sendMessage"],
    {
      onSuccess: (data) => {
        toast({
          title: t("messageSent"),
          description: data.post.title,
        });
        form.reset();
        router.push("/messages/create");
      },
    }
  );

  useEffect(() => {
    const savedFormData = localStorage.getItem("formData");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.setValue("title", parsedFormData.title);
      form.setValue("label", parsedFormData.label);
    }

    const subscription = form.watch((values) => {
      localStorage.setItem("formData", JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // const titleData = [
  //   { value: "IT", label: "IT" },
  //   { value: "Japanese", label: "Japanese" },
  // ];

  type TitleItem = {
    value: string;
    label: string;
  };

  const [titleData, setTitleData] = useState<TitleItem[]>(() =>
    JSON.parse(localStorage.getItem("titleData") || "[]")
  );

  const handleAddTitle = (value: string, label: string) => {
    setTitleData([...titleData, { value: value, label: value }]);
    localStorage.setItem("titleData", JSON.stringify(titleData));
  };

  const handleRemoveTitle = (value: string) => {
    setTitleData(titleData.filter((item) => item.value !== value));
    localStorage.setItem("titleData", JSON.stringify(titleData));
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) =>
            mutate({
              ...data,
            } as any)
          )}
          ref={formRef}
          className="space-y-4"
        >
          <div className="flex flex-row justify-between items-center">
            <h1 className="text-3xl font-bold">{t("sendMessage")}</h1>
            <div className="space-x-4">
              <Link href="/messages/create" passHref>
                <Button type="button" variant={"defaultBlack"}>
                  {t("back")}
                </Button>
              </Link>
            </div>
          </div>

          <FormField
            control={form.control}
            name="title"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("title")}</FormLabel>
                <div className="flex flex-row gap-2 justify-between items-center w-full">
                  <FormControl className="w-3/5">
                    <Input {...field} placeholder={t("typeTitle")} />
                  </FormControl>
                  <div className="w-2/5">
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("Sample Title List")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {titleData.length < 1 ? (
                            <div className="pl-8 text-sm">
                              There is no Title Sample
                            </div>
                          ) : (
                            <div>
                              <SelectLabel>{t("title")}</SelectLabel>
                              {titleData.map((item) => (
                                <div className="w-full h-[30px] flex flex-row justify-between items-center gap-2">
                                  <div className="w-4/5 pl-3 h-full">{item.label}</div>
                                  <SelectItem
                                    key={item.value}
                                    value={item.value}
                                    className="w-1/5 h-full pl-2 flex items-center justify-center"
                                  >
                                    <div>choose</div>
                                  </SelectItem>
                                  <Button variant={"default"} className="py-0 h-full" onClick={() => handleRemoveTitle(item.value)}>delete</Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <FormMessage>
                  {formState.errors.title &&
                    "Title is required. Title should be more than 5 characters"}
                </FormMessage>
              </FormItem>
            )}
          />

          <div>
            <Button
              variant={"default"}
              type="submit"
              disabled={isPending}
              onClick={() => {
                const currentTitle = form.getValues("title");
                handleAddTitle(currentTitle, currentTitle);
              }}
            >
              {isPending ? `${t("Saving")}...` : t("Save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
