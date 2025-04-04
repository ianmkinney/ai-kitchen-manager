import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcoChef AI",
  description: "Your personalized AI kitchen manager",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow bg-gradient-to-b from-primary-50 to-white">
            {children}
          </main>
          <footer className="bg-primary-800 text-white py-4 text-center text-sm">
            <div className="container mx-auto">
              EcoChef AI - Sustainable cooking powered by artificial intelligence
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
} 