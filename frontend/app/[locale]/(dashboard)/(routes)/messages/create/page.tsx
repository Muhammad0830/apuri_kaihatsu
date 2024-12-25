"use client";
import React, { useState, useEffect, use } from "react";
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
  description: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  /* images: z.instanceof(FileList).optional(),*/
});

export default function SendMessagePage() {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("sendmessage");
  const tName = useTranslations("names");
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "low",
      /*images: {} as FileList,*/
    },
  });
  const formValues = useWatch({ control: form.control });
  const router = useRouter();
  const { mutate, isPending } = useApiMutation<{ post: Post }>(
    `post/create`,
    "POST",
    ["sendMessage"],
    {
      onSuccess: (data) => {
        toast({
          title: t("messageSent"),
          description: data.post.title,
        });
        form.reset();
        setSelectedStudents([]);
        setSelectedGroups([]);
        setSelectedImages([]);
        router.push("/messages");
      },
    }
  );

  useEffect(() => {
    const savedFormData = localStorage.getItem("formData");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.setValue("title", parsedFormData.title);
      form.setValue("description", parsedFormData.description);
      form.setValue("priority", parsedFormData.priority);
    }

    const subscription = form.watch((values) => {
      localStorage.setItem("formData", JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = Array.from(event.target.files ?? []) as File[];
  //   const imageUrls = files.map((file) => ({
  //     url: URL.createObjectURL(file),
  //     file,
  //   }));
  //   setSelectedImages((prevImages) => [...prevImages, ...imageUrls]);
  // };

  // const handleRemoveImage = (imageUrl: string) => {
  //   setSelectedImages((prevImages) =>
  //     prevImages.filter((image) => image.url !== imageUrl)
  //   );
  // };

  const [titleData, setTitleData] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    setTitleData(
      localStorage.getItem("titleData")
        ? JSON.parse(localStorage.getItem("titleData")!)
        : []
    );
  }, []);

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) =>
            mutate({
              ...data,
              students: selectedStudents.map((student) => student.id),
              groups: selectedGroups.map((group) => group.id),
            } as any)
          )}
          ref={formRef}
          className="space-y-4"
        >
          <div className="flex flex-row justify-between items-center">
            <h1 className="text-3xl font-bold">{t("sendMessage")}</h1>
            <div className="space-x-4">
              <Link href="/messages" passHref>
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
                <div className="flex flex-row gap-2 justify-between items-center">
                  <FormControl className="w-4/5">
                    <Input {...field} placeholder={t("typeTitle")} />
                  </FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="w-1/5">
                      <SelectValue placeholder={t("chooseTitle")} />
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
                              <SelectItem
                                key={item.value}
                                value={item.value}
                              >
                                <div>{item.label}</div>
                              </SelectItem>
                            ))}
                          </div>
                        )}
                        <Link href={"/messages/create/title"} passHref>
                          <Button variant={"default"} className="w-full mt-2">
                            Make a title
                          </Button>
                        </Link>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <FormMessage>
                  {formState.errors.title &&
                    "Title is required. Title should be more than 5 characters"}
                </FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("yourMessage")}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder={t("typeMessage")}
                    {...field}
                  />
                </FormControl>
                <FormMessage>
                  {formState.errors.description &&
                    "Message is required. Message should be more than 10 characters"}
                </FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("choosePriority")}</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t("choosePriority")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{t("priority")}</SelectLabel>
                        <SelectItem value="high">{t("high")}</SelectItem>
                        <SelectItem value="medium">{t("medium")}</SelectItem>
                        <SelectItem value="low">{t("low")}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage>
                  {formState.errors.priority &&
                    "You should select one priority"}
                </FormMessage>
              </FormItem>
            )}
          />

          {/* <FormField
            control={form.control}
            name="images"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("picture")}</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple={true}
                    disabled={form.formState.isSubmitting}
                    {...form.register("images")}
                    onChange={(event) => {
                      handleImageChange(event);
                      // Triggered when user uploaded a new file
                      // FileList is immutable, so we need to create a new one
                      const dataTransfer = new DataTransfer();
                      const images = formValues.images;

                      // Add old images
                      if (images) {
                        Array.from(images).forEach((image) =>
                          dataTransfer.items.add(image)
                        );
                      }

                      // Add newly uploaded images
                      Array.from(event.target.files!).forEach((image) =>
                        dataTransfer.items.add(image)
                      );

                      // Validate and update uploaded file
                      const newFiles = dataTransfer.files;
                      field.onChange(newFiles);
                    }}
                  />
                </FormControl>
                <FormMessage>
                  {formState.errors.images &&
                    "Only .jpg, .jpeg, .png and .webp formats are supported."}
                </FormMessage>
                <div className="grid grid-cols-3 gap-4">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative w-full h-auto">
                      <Image
                        src={image.url}
                        alt={`Selected image ${index + 1}`}
                        width={200}
                        height={100}
                        className="rounded object-cover w-full h-full"
                      />
                      <button
                        onClick={() => handleRemoveImage(image.url)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  ))}
                </div>
              </FormItem>
            )}
          /> */}

          <Tabs defaultValue="group">
            <TabsList className="dark:bg-white">
              <TabsTrigger value="group">{t("groups")}</TabsTrigger>
              <TabsTrigger value="student">{t("students")}</TabsTrigger>
            </TabsList>
            <TabsContent value="group">
              <GroupTable
                selectedGroups={selectedGroups}
                setSelectedGroups={setSelectedGroups}
              />
            </TabsContent>
            <TabsContent value="student">
              <StudentTable
                selectedStudents={selectedStudents}
                setSelectedStudents={setSelectedStudents}
              />
            </TabsContent>
          </Tabs>

          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" disabled={isPending}>
                {isPending ? `${t("sendMessage")}...` : t("sendMessage")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[80%]">
              <div className="sm:flex gap-4 sm:h-[60vh]">
                <DialogHeader className="w-full items-center break-words break-all whitespace-pre-wrap">
                  <DialogTitle>{formValues.title}</DialogTitle>
                  <DialogDescription>
                    {formValues.description}
                  </DialogDescription>
                  <div className="flex w-full">
                    <div className="bg-slate-500 px-4 py-1 rounded ">
                      {t("priority")}:{" "}
                      {formValues.priority && t(formValues.priority)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 w-full">
                    {/* {selectedImages.map((image, index) => (
                      <div key={index} className="relative w-full h-auto ">
                        <Image
                          src={image.url}
                          alt={`Selected image ${index + 1}`}
                          width={300}
                          height={200}
                          className="rounded object-cover w-full h-full"
                        />
                      </div>
                    ))} */}
                  </div>
                </DialogHeader>
                <div className="sm:w-1 sm:h-full bg-slate-600"></div>
                <div className="flex flex-wrap gap-4 items-start content-start sm:max-w-[40%]">
                  <div className="flex flex-col gap-1">
                    <b>{t("groups")}</b>
                    <div className="flex flex-wrap gap-2 items-start content-start ">
                      {selectedGroups.map((group) => (
                        <Badge key={group.id}>{group?.name}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <b>{t("students")}</b>
                    <div className="flex flex-wrap gap-2 items-start content-start">
                      {selectedStudents.map((e) => (
                        <Badge key={e.id}>
                          {tName("name", { ...e, parents: "" })}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    {t("close")}
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    type="submit"
                    onClick={() => {
                      if (formRef.current) {
                        formRef.current.dispatchEvent(
                          new Event("submit", { bubbles: true })
                        );
                      }
                    }}
                  >
                    {t("confirm")}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>
      </Form>
    </div>
  );
}
