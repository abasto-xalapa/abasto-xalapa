import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abasto Xalapa · Almacén",
  description: "Inventario, compras y abastecimiento a cocinas de Corporativo LOIS.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
