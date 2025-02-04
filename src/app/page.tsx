"use client";

import BarillaPlanner from "@/components/barillaplanner";
import { Login } from "@/components/login";
import { useEffect, useState } from "react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Clear any existing login state
    localStorage.removeItem("isLoggedIn");
    const loginStatus = localStorage.getItem("isLoggedIn");
    setIsLoggedIn(loginStatus === "true");
    setIsLoading(false);
  }, []);

  // For debugging
  useEffect(() => {
    console.log("Login state:", { isLoggedIn, isLoading });
  }, [isLoggedIn, isLoading]);

  if (isLoading) {
    return null;
  }

  if (!isLoggedIn) {
    console.log("Rendering login component");
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return <BarillaPlanner />;
}
