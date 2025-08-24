import Header from "@/components/Header";
import { UserProvider } from "@/contexts/UserContext";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// This runs on the server during rendering
async function getLayoutData() {
  // Fetch any data you need for the layout
  return {
    title: "TouchGrass DC",
    description: "Server-side rendered app",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getLayoutData();

  return {
    title: data.title,
    description: data.description,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <Header />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
