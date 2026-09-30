import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  Download,
  Inbox,
  Mail,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { AdminLayout, AdminPageHeader } from "./AdminLayout";
import {
  ApiError,
  leads as leadsApi,
  type Lead,
  type LeadSummary,
} from "@/lib/api";

const FILTERS: [Lead["status"] | "all", string][] = [
  ["new", "Novos"],
  ["read", "Lidos"],
  ["archived", "Arquivados"],
  ["all", "Todos"],
];

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminLeads() {
  const [filter, setFilter] = useState<Lead["status"] | "all">("new");
  const [items, setItems] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary>({
    new: 0,
    read: 0,
    archived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await leadsApi.list(filter === "all" ? undefined : filter);
      setItems(result.leads);
      setSummary(result.summary);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível carregar os contatos."
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(lead: Lead, status: Lead["status"]) {
    try {
      await leadsApi.setStatus(lead.id, status);
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Falha ao atualizar."
      );
    }
  }

  async function remove(lead: Lead) {
    if (
      !window.confirm(
        `Excluir o contato de ${lead.name}? A ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    try {
      await leadsApi.remove(lead.id);
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Falha ao excluir."
      );
    }
  }

  return (
    <AdminLayout unreadLeads={summary.new}>
      <AdminPageHeader
        title="Contatos"
        description="Mensagens deixadas no campo de interesse do site."
        actions={
          <a className="admin-btn" href={leadsApi.exportUrl} download>
            <Download size={14} /> Exportar CSV
          </a>
        }
      />

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-tabs">
        {FILTERS.map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={filter === value ? "active" : undefined}
            onClick={() => setFilter(value)}
          >
            {label}
            {value !== "all" && summary[value] > 0 ? (
              <span className="admin-badge">{summary[value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-hint">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="admin-empty">
          <Inbox size={22} />
          <p>
            {filter === "new"
              ? "Nenhum contato novo. Tudo em dia."
              : "Nada nesta caixa."}
          </p>
        </div>
      ) : (
        <ul className="lead-list">
          {items.map(lead => (
            <li key={lead.id} className={`lead-card status-${lead.status}`}>
              <div className="lead-head">
                <div>
                  <strong>{lead.name}</strong>
                  {lead.subject && (
                    <span className="lead-tag">{lead.subject}</span>
                  )}
                  {lead.status === "new" && (
                    <span className="lead-new">novo</span>
                  )}
                </div>
                <time>{formatDate(lead.createdAt)}</time>
              </div>

              <p className="lead-message">{lead.message}</p>

              <div className="lead-foot">
                <a
                  className="admin-btn primary"
                  href={lead.replyUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    if (lead.status === "new") void setStatus(lead, "read");
                  }}
                >
                  {lead.contactKind === "phone" ? (
                    <MessageCircle size={14} />
                  ) : (
                    <Mail size={14} />
                  )}
                  Responder · {lead.contact}
                </a>

                {lead.status !== "read" && (
                  <button
                    type="button"
                    className="admin-btn ghost"
                    onClick={() => void setStatus(lead, "read")}
                  >
                    Marcar como lido
                  </button>
                )}

                {lead.status !== "archived" && (
                  <button
                    type="button"
                    className="admin-btn ghost"
                    onClick={() => void setStatus(lead, "archived")}
                  >
                    <Archive size={14} /> Arquivar
                  </button>
                )}

                <button
                  type="button"
                  className="admin-btn ghost danger"
                  onClick={() => void remove(lead)}
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
