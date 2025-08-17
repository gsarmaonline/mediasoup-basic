"use client";
import { useEffect, useState } from "react";
import Streams from "@/app/streams/page";
import LoginPage from "@/app/login/page";

export default function Home() {
  const [hasEmail, setHasEmail] = useState<null | boolean>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasEmail(!!localStorage.getItem("email"));
    }
  }, []);

  if (hasEmail === null) {
    return null; // or a loading spinner
  }

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        {hasEmail ? <Streams /> : <LoginPage />}
      </main>
    </div>
  );
}
