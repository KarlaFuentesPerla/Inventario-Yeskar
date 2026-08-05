import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tallercito — Inventario y entregas",
  description: "Controla los productos y agenda las entregas de tu emprendimiento en un solo lugar.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
