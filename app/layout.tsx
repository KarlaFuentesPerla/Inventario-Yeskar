import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tallercito — Productos y entregas",
  description: "Administra productos, ventas, ganancias y entregas desde un calendario sencillo.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
