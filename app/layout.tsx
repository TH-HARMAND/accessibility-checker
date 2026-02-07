import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accessibility Checker",
  description: "Analysez l'accessibilité de votre site web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
