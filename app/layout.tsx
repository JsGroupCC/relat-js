import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme/ThemeProvider"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "JsGroup — Análise fiscal automatizada",
    template: "%s · JsGroup",
  },
  description:
    "Análise automatizada de relatórios fiscais brasileiros (Receita Federal, PGFN). Por JsGroup.",
  applicationName: "JsGroup",
  authors: [{ name: "JsGroup" }],
  icons: {
    icon: [
      { url: "/logo-mark.jpg", type: "image/jpeg" },
    ],
    apple: "/logo-mark.jpg",
  },
  openGraph: {
    title: "JsGroup — Análise fiscal automatizada",
    description:
      "Da extração do PDF da Receita Federal até o texto pronto pro cliente.",
    images: ["/logo-mark.jpg"],
    type: "website",
    locale: "pt_BR",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
