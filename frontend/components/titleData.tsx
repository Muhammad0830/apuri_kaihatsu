import React, { createContext, useContext } from "react";

// Kontekst yaratish
const TitleDataContext = createContext([]);

// Provider funksiyasini eksport qilish
export const TitleDataProvider = ({ children }: { children: React.ReactNode }) => {
  const titleData = [
    { value: "IT", label: "IT" },
    { value: "Japanese", label: "Japanese" },
  ];

  return (
    <TitleDataContext.Provider value={titleData}>
      {children}
    </TitleDataContext.Provider>
  );
};

// Custom hook - ma'lumotni olish uchun
export const useTitleData = () => useContext(TitleDataContext);

