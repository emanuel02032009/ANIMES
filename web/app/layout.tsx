import type { ReactNode } from "react";

export const metadata = {
  title: "VHS/CRT Anime Converter",
  description: "Aplica um filtro estético VHS/CRT nos seus episódios e comprime o resultado.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#111", color: "#eee" }}>
        {children}
      </body>
    </html>
  );
}
