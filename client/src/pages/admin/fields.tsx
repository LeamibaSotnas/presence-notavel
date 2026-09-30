import { useState, type ReactNode } from "react";
import { ChevronDown, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { MediaPicker, MediaThumb } from "./MediaPicker";
import type { MediaItem } from "@/lib/api";

// ─── Campos simples ─────────────────────────────────────────────────────────

type BaseProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
};

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  maxLength = 300,
}: BaseProps) {
  return (
    <label className="admin-field">
      <span className="admin-field-label">{label}</span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  placeholder,
  rows = 3,
  maxLength = 2000,
}: BaseProps & { rows?: number }) {
  return (
    <label className="admin-field">
      <span className="admin-field-label">{label}</span>
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function SwitchField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="admin-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

// ─── Campo de imagem/vídeo ──────────────────────────────────────────────────

export function MediaField({
  label,
  value,
  onChange,
  kind = "image",
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind?: "image" | "video";
  hint?: string;
}) {
  const [picking, setPicking] = useState(false);
  const isRemote = value.startsWith("http");

  return (
    <div className="admin-field">
      <span className="admin-field-label">{label}</span>

      <div className="admin-media-field">
        <div className="admin-media-preview">
          {value ? (
            kind === "video" ? (
              <video src={value} muted playsInline preload="metadata" />
            ) : (
              <img src={value} alt="" />
            )
          ) : (
            <span className="admin-media-empty">
              <ImagePlus size={18} />
            </span>
          )}
        </div>

        <div className="admin-media-controls">
          <button
            type="button"
            className="admin-btn"
            onClick={() => setPicking(true)}
          >
            <ImagePlus size={14} /> {value ? "Trocar" : "Escolher"}
          </button>
          {value && (
            <button
              type="button"
              className="admin-btn ghost"
              onClick={() => onChange("")}
            >
              <X size={14} /> Remover
            </button>
          )}
          {isRemote && (
            <small className="admin-warn">
              Arquivo externo — envie uma cópia para a biblioteca antes de
              publicar.
            </small>
          )}
          {hint && !isRemote && <small>{hint}</small>}
        </div>
      </div>

      <MediaPicker
        open={picking}
        kind={kind}
        onSelect={(item: MediaItem) => onChange(item.url)}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}

// ─── Seção recolhível ───────────────────────────────────────────────────────

export function Fieldset({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`admin-fieldset ${open ? "open" : ""}`}>
      <button
        type="button"
        className="admin-fieldset-head"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
      >
        <span>
          {title}
          {description && <small>{description}</small>}
        </span>
        <ChevronDown size={18} />
      </button>
      {open && <div className="admin-fieldset-body">{children}</div>}
    </section>
  );
}

// ─── Editor de lista ────────────────────────────────────────────────────────

/**
 * Lista editável genérica (portfólio, eventos, galeria, notas).
 * `renderItem` desenha os campos de um item; a mecânica de adicionar, remover
 * e reordenar fica aqui, uma vez só.
 */
export function ListEditor<T>({
  items,
  onChange,
  renderItem,
  makeEmpty,
  itemLabel,
  addLabel,
  max = 24,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (
    item: T,
    update: (patch: Partial<T>) => void,
    index: number
  ) => ReactNode;
  makeEmpty: () => T;
  itemLabel: (item: T, index: number) => string;
  addLabel: string;
  max?: number;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const update = (index: number, patch: Partial<T>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setOpenIndex(null);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setOpenIndex(target);
  };

  return (
    <div className="admin-list">
      {items.map((item, index) => (
        <div
          className={`admin-list-item ${openIndex === index ? "open" : ""}`}
          key={index}
        >
          <div className="admin-list-head">
            <button
              type="button"
              className="admin-list-title"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              aria-expanded={openIndex === index}
            >
              <span className="admin-list-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              {itemLabel(item, index) || "(sem título)"}
              <ChevronDown size={16} />
            </button>

            <div className="admin-list-tools">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Mover para cima"
                title="Mover para cima"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label="Mover para baixo"
                title="Mover para baixo"
              >
                ↓
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (
                    window.confirm(
                      "Remover este item? A ação não pode ser desfeita."
                    )
                  ) {
                    remove(index);
                  }
                }}
                aria-label="Remover"
                title="Remover"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {openIndex === index && (
            <div className="admin-list-body">
              {renderItem(item, patch => update(index, patch), index)}
            </div>
          )}
        </div>
      ))}

      {items.length < max ? (
        <button
          type="button"
          className="admin-btn dashed"
          onClick={() => {
            onChange([...items, makeEmpty()]);
            setOpenIndex(items.length);
          }}
        >
          <Plus size={14} /> {addLabel}
        </button>
      ) : (
        <small className="admin-hint">Limite de {max} itens atingido.</small>
      )}
    </div>
  );
}

export { MediaThumb };
