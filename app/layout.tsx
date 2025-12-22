import "./globals.css";

export const metadata = {
  title: "Quick Open",
  description: "Minimal I'm Feeling Lucky router powered by Exa"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
