import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CubbyScore Converter",
  description: "PDF to MusicXML converter with OMR technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
