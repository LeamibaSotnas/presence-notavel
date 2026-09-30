import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Inbox,
  LogOut,
  Type,
} from "lucide-react";
import { useSite } from "@/contexts/SiteContext";
import { useAdminAuth } from "./AdminAuthContext";

const NAV = [
  { href: "/admin", label: "Conteúdo", icon: FileText },
  { href: "/admin/midia", label: "Fotos e vídeos", icon: ImageIcon },
  { href: "/admin/contatos", label: "Contatos", icon: Inbox },
  { href: "/admin/tipografia", label: "Tipografia", icon: Type },
];

export function AdminLayout({
  children,
  unreadLeads,
}: {
  children: ReactNode;
  unreadLeads?: number;
}) {
  const site = useSite();
  const { user, logout } = useAdminAuth();
  const [path] = useLocation();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">{site.identity.initials}</span>
          <span>
            {site.identity.name}
            <small>Painel</small>
          </span>
        </div>

        <nav>
          {NAV.map(item => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? path === "/admin"
                : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : undefined}
              >
                <Icon size={16} />
                {item.label}
                {item.href === "/admin/contatos" && unreadLeads ? (
                  <span className="admin-badge">{unreadLeads}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-foot">
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Ver o site
          </a>
          <button type="button" onClick={() => void logout()}>
            <LogOut size={14} /> Sair
          </button>
          {user && <small>{user.email}</small>}
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}

/** Cabeçalho de página, com a barra de ações à direita. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}
