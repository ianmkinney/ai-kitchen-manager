import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import { AuthProvider } from "./lib/auth-context";
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcoChef AI",
  description: "Your personalized AI kitchen manager",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
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
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}