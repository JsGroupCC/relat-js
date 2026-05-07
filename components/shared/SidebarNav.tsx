import Link from "next/link"
import {
  BriefcaseIcon,
  Building2Icon,
  CalendarClockIcon,
  FileTextIcon,
  HomeIcon,
  type LucideIcon,
  Settings2Icon,
  UploadCloudIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/upload", label: "Upload", icon: UploadCloudIcon },
  { href: "/relatorios", label: "Relatórios", icon: FileTextIcon },
  { href: "/empresas", label: "Empresas", icon: Building2Icon },
  { href: "/carteira", label: "Carteira", icon: BriefcaseIcon },
  { href: "/vencimentos", label: "Vencimentos", icon: CalendarClockIcon },
  { href: "/configuracoes", label: "Configurações", icon: Settings2Icon },
]

/**
 * Lista de links de navegação. Usada tanto no sidebar desktop quanto
 * no drawer mobile. `onNavigate` é chamado depois do clique (mobile fecha
 * o drawer; desktop não usa).
 */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </>
  )
}
