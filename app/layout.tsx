import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hub personale",
  description:
    "Inbox, task, note e calendario, con un assistente che propone e non decide.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
