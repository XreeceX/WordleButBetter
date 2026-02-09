import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wordle But Better",
  description: "A Wordle-style word guessing game with 5–7 letter words",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased bg-[#121213] text-white">
        {children}
      </body>
    </html>
  );
}
