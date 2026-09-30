import { Check, Loader2, RotateCcw, Save } from "lucide-react";
import type { NoteItem } from "@/config/site.config";
import { AdminLayout, AdminPageHeader } from "./AdminLayout";
import {
  Fieldset,
  ListEditor,
  MediaField,
  SwitchField,
  TextArea,
  TextField,
} from "./fields";
import { useContentDraft, useUnsavedGuard } from "./useContentDraft";

export default function AdminContent() {
  const {
    draft,
    patch,
    patchField,
    save,
    discard,
    dirty,
    saving,
    error,
    savedAt,
  } = useContentDraft();
  useUnsavedGuard(dirty);

  if (!draft) {
    return (
      <AdminLayout>
        <p className="admin-hint">Carregando conteúdo…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Conteúdo"
        description="Tudo o que aparece no site. As alterações só vão ao ar quando você salvar."
        actions={
          <>
            {dirty && (
              <button
                type="button"
                className="admin-btn ghost"
                onClick={discard}
              >
                <RotateCcw size={14} /> Descartar
              </button>
            )}
            <button
              type="button"
              className="admin-btn primary"
              onClick={() => void save()}
              disabled={!dirty || saving}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="spin" /> Salvando
                </>
              ) : savedAt && !dirty ? (
                <>
                  <Check size={14} /> Salvo
                </>
              ) : (
                <>
                  <Save size={14} /> Publicar alterações
                </>
              )}
            </button>
          </>
        }
      />

      {error && <p className="admin-error">{error}</p>}
      {dirty && (
        <p className="admin-dirty-bar">Você tem alterações não publicadas.</p>
      )}

      {/* ── Identidade ── */}
      <Fieldset
        title="Identidade"
        description="Nome, função e localização"
        defaultOpen
      >
        <div className="admin-grid-2">
          <TextField
            label="Nome completo"
            value={draft.identity.name}
            onChange={value => patchField("identity", "name", value)}
          />
          <TextField
            label="Iniciais (logotipo)"
            value={draft.identity.initials}
            maxLength={4}
            hint="2 a 3 letras"
            onChange={value => patchField("identity", "initials", value)}
          />
          <TextField
            label="Primeiro nome"
            value={draft.identity.firstName}
            onChange={value => patchField("identity", "firstName", value)}
          />
          <TextField
            label="Sobrenome"
            value={draft.identity.lastName}
            onChange={value => patchField("identity", "lastName", value)}
          />
          <TextField
            label="Função"
            value={draft.identity.role}
            onChange={value => patchField("identity", "role", value)}
          />
          <TextField
            label="Localização"
            value={draft.identity.location}
            onChange={value => patchField("identity", "location", value)}
          />
        </div>
        <TextArea
          label="Frase de apresentação"
          value={draft.identity.tagline}
          rows={2}
          hint="Aparece no topo, abaixo do título principal."
          onChange={value => patchField("identity", "tagline", value)}
        />
        <SwitchField
          label="Marcar como conteúdo demonstrativo"
          hint="Ligado, o site exibe avisos de que o conteúdo é de exemplo. Desligue ao publicar com conteúdo real."
          checked={draft.isDemo}
          onChange={value => patch("isDemo", value)}
        />
      </Fieldset>

      {/* ── Contato ── */}
      <Fieldset
        title="Canais de contato"
        description="WhatsApp, Instagram, e-mail"
      >
        <p className="admin-note">
          Sem o WhatsApp preenchido, os botões de contato do site mostram um
          aviso em vez de abrir a conversa.
        </p>
        <div className="admin-grid-2">
          <TextField
            label="WhatsApp"
            value={draft.contact.whatsapp}
            placeholder="5511900000000"
            hint="Só números, com 55 na frente."
            onChange={value =>
              patchField("contact", "whatsapp", value.replace(/\D/g, ""))
            }
          />
          <TextField
            label="Instagram"
            value={draft.contact.instagram}
            placeholder="@usuario"
            onChange={value => patchField("contact", "instagram", value)}
          />
          <TextField
            label="E-mail"
            value={draft.contact.email}
            placeholder="contato@dominio.com"
            onChange={value => patchField("contact", "email", value)}
          />
          <TextField
            label="Telefone (exibição)"
            value={draft.contact.phone}
            onChange={value => patchField("contact", "phone", value)}
          />
        </div>
        <TextArea
          label="Mensagem inicial do WhatsApp"
          value={draft.contact.whatsappMessage}
          rows={2}
          hint="Texto que já vem digitado quando a pessoa abre a conversa."
          onChange={value => patchField("contact", "whatsappMessage", value)}
        />
      </Fieldset>

      {/* ── Topo ── */}
      <Fieldset title="Topo da página" description="Imagem de fundo e chamada">
        <MediaField
          label="Imagem de fundo"
          value={draft.hero.image}
          onChange={value => patchField("hero", "image", value)}
        />
        <TextField
          label="Rótulo acima do título"
          value={draft.hero.eyebrow}
          onChange={value => patchField("hero", "eyebrow", value)}
        />
        <div className="admin-grid-2">
          <TextField
            label="Título — primeira linha"
            value={draft.hero.titleLead}
            onChange={value => patchField("hero", "titleLead", value)}
          />
          <TextField
            label="Título — linha em destaque"
            value={draft.hero.titleAccent}
            hint="Aparece em itálico e na cor de destaque."
            onChange={value => patchField("hero", "titleAccent", value)}
          />
          <TextField
            label="Etiqueta lateral esquerda"
            value={draft.hero.labelLeft}
            onChange={value => patchField("hero", "labelLeft", value)}
          />
          <TextField
            label="Etiqueta lateral direita"
            value={draft.hero.labelRight}
            onChange={value => patchField("hero", "labelRight", value)}
          />
        </div>
      </Fieldset>

      {/* ── Sobre ── */}
      <Fieldset title="Sobre" description="Texto institucional e citação">
        <div className="admin-grid-2">
          <TextField
            label="Rótulo da seção"
            value={draft.about.kicker}
            onChange={value => patchField("about", "kicker", value)}
          />
          <TextField
            label="Título — primeira linha"
            value={draft.about.titleLead}
            onChange={value => patchField("about", "titleLead", value)}
          />
          <TextField
            label="Título — linha em destaque"
            value={draft.about.titleAccent}
            onChange={value => patchField("about", "titleAccent", value)}
          />
        </div>
        <TextArea
          label="Parágrafo principal"
          value={draft.about.lead}
          rows={4}
          onChange={value => patchField("about", "lead", value)}
        />
        <TextArea
          label="Parágrafo secundário"
          value={draft.about.body}
          rows={3}
          onChange={value => patchField("about", "body", value)}
        />
        <TextArea
          label="Citação em destaque"
          value={draft.about.quote}
          rows={2}
          onChange={value => patchField("about", "quote", value)}
        />
      </Fieldset>

      {/* ── Portfólio ── */}
      <Fieldset
        title="Portfólio"
        description={`${draft.portfolio.items.length} trabalhos`}
      >
        <div className="admin-grid-2">
          <TextField
            label="Rótulo da seção"
            value={draft.portfolio.kicker}
            onChange={value => patchField("portfolio", "kicker", value)}
          />
          <TextField
            label="Título — primeira linha"
            value={draft.portfolio.titleLead}
            onChange={value => patchField("portfolio", "titleLead", value)}
          />
          <TextField
            label="Título — linha em destaque"
            value={draft.portfolio.titleAccent}
            onChange={value => patchField("portfolio", "titleAccent", value)}
          />
        </div>
        <TextArea
          label="Texto de apoio"
          value={draft.portfolio.intro}
          rows={2}
          onChange={value => patchField("portfolio", "intro", value)}
        />

        <ListEditor
          items={draft.portfolio.items}
          onChange={items => patchField("portfolio", "items", items)}
          itemLabel={item => item.title}
          addLabel="Adicionar trabalho"
          makeEmpty={() => ({
            id: `p${Date.now()}`,
            title: "",
            category: "Editorial",
            description: "",
            image: "",
            year: String(new Date().getFullYear()),
            badge: "",
          })}
          renderItem={(item, update) => (
            <>
              <MediaField
                label="Imagem"
                value={item.image}
                onChange={value => update({ image: value })}
              />
              <div className="admin-grid-2">
                <TextField
                  label="Título"
                  value={item.title}
                  onChange={value => update({ title: value })}
                />
                <TextField
                  label="Categoria"
                  value={item.category}
                  hint="Alimenta os filtros da seção."
                  onChange={value => update({ category: value })}
                />
                <TextField
                  label="Ano"
                  value={item.year}
                  maxLength={4}
                  onChange={value => update({ year: value })}
                />
                <TextField
                  label="Selo sobre a imagem"
                  value={item.badge}
                  onChange={value => update({ badge: value })}
                />
              </div>
              <TextArea
                label="Descrição"
                value={item.description}
                rows={3}
                onChange={value => update({ description: value })}
              />
            </>
          )}
        />
      </Fieldset>

      {/* ── Agenda ── */}
      <Fieldset
        title="Agenda"
        description={`${draft.events.items.length} eventos`}
      >
        <div className="admin-grid-2">
          <TextField
            label="Rótulo da seção"
            value={draft.events.kicker}
            onChange={value => patchField("events", "kicker", value)}
          />
          <TextField
            label="Chamada do rodapé da seção"
            value={draft.events.ctaLabel}
            onChange={value => patchField("events", "ctaLabel", value)}
          />
          <TextField
            label="Título — primeira linha"
            value={draft.events.titleLead}
            onChange={value => patchField("events", "titleLead", value)}
          />
          <TextField
            label="Título — linha em destaque"
            value={draft.events.titleAccent}
            onChange={value => patchField("events", "titleAccent", value)}
          />
        </div>
        <TextArea
          label="Texto de apoio"
          value={draft.events.intro}
          rows={2}
          onChange={value => patchField("events", "intro", value)}
        />

        <ListEditor
          items={draft.events.items}
          onChange={items => patchField("events", "items", items)}
          itemLabel={item => `${item.date} · ${item.title}`}
          addLabel="Adicionar evento"
          makeEmpty={() => ({
            date: "01.01",
            title: "",
            place: "",
            description: "",
            image: "",
          })}
          renderItem={(item, update) => (
            <>
              <MediaField
                label="Imagem"
                value={item.image}
                onChange={value => update({ image: value })}
              />
              <div className="admin-grid-2">
                <TextField
                  label="Data"
                  value={item.date}
                  maxLength={5}
                  hint='Formato "DD.MM" — ex.: 18.10'
                  onChange={value => update({ date: value })}
                />
                <TextField
                  label="Local"
                  value={item.place}
                  onChange={value => update({ place: value })}
                />
              </div>
              <TextField
                label="Título"
                value={item.title}
                onChange={value => update({ title: value })}
              />
              <TextArea
                label="Descrição"
                value={item.description}
                rows={2}
                onChange={value => update({ description: value })}
              />
            </>
          )}
        />
      </Fieldset>

      {/* ── Galeria ── */}
      <Fieldset
        title="Galeria"
        description={`${draft.gallery.items.length} imagens`}
      >
        <div className="admin-grid-2">
          <TextField
            label="Rótulo da seção"
            value={draft.gallery.kicker}
            onChange={value => patchField("gallery", "kicker", value)}
          />
          <TextField
            label="Título — primeira linha"
            value={draft.gallery.titleLead}
            onChange={value => patchField("gallery", "titleLead", value)}
          />
          <TextField
            label="Título — linha em destaque"
            value={draft.gallery.titleAccent}
            onChange={value => patchField("gallery", "titleAccent", value)}
          />
        </div>
        <TextArea
          label="Texto de apoio"
          value={draft.gallery.intro}
          rows={2}
          onChange={value => patchField("gallery", "intro", value)}
        />

        <ListEditor
          items={draft.gallery.items}
          onChange={items => patchField("gallery", "items", items)}
          itemLabel={item => item.label}
          addLabel="Adicionar imagem"
          max={12}
          makeEmpty={() => ({ image: "", label: "", tall: false })}
          renderItem={(item, update) => (
            <>
              <MediaField
                label="Imagem"
                value={item.image}
                onChange={value => update({ image: value })}
              />
              <TextField
                label="Legenda"
                value={item.label}
                hint="Também serve de texto alternativo para leitores de tela."
                onChange={value => update({ label: value })}
              />
              <SwitchField
                label="Ocupar altura dupla no mosaico"
                checked={item.tall}
                onChange={value => update({ tall: value })}
              />
            </>
          )}
        />
      </Fieldset>

      {/* ── Notas ── */}
      <Fieldset
        title="Notas"
        description="Publicações do diário — vazio oculta a seção"
      >
        <ListEditor<NoteItem>
          items={draft.notes.items}
          onChange={items => patchField("notes", "items", items)}
          itemLabel={item => item.title}
          addLabel="Adicionar nota"
          makeEmpty={() => ({
            category: "Diário",
            title: "",
            date: new Date().toLocaleDateString("pt-BR").replace(/\//g, "."),
          })}
          renderItem={(item, update) => (
            <div className="admin-grid-2">
              <TextField
                label="Título"
                value={item.title}
                onChange={value => update({ title: value })}
              />
              <TextField
                label="Categoria"
                value={item.category}
                onChange={value => update({ category: value })}
              />
              <TextField
                label="Data"
                value={item.date}
                hint='Formato "DD.MM.AAAA"'
                onChange={value => update({ date: value })}
              />
              <TextField
                label="Link (opcional)"
                value={item.href ?? ""}
                hint="Com link, o card fica clicável."
                onChange={value => update({ href: value || undefined })}
              />
            </div>
          )}
        />
      </Fieldset>

      {/* ── Campo de interesse ── */}
      <Fieldset
        title="Campo de interesse"
        description="O formulário que gera os contatos"
      >
        <div className="admin-grid-2">
          <TextField
            label="Rótulo da seção"
            value={draft.interest.kicker}
            onChange={value => patchField("interest", "kicker", value)}
          />
          <TextField
            label="Título — primeira linha"
            value={draft.interest.titleLead}
            onChange={value => patchField("interest", "titleLead", value)}
          />
          <TextField
            label="Título — linha em destaque"
            value={draft.interest.titleAccent}
            onChange={value => patchField("interest", "titleAccent", value)}
          />
        </div>
        <TextArea
          label="Texto de apoio"
          value={draft.interest.intro}
          rows={2}
          onChange={value => patchField("interest", "intro", value)}
        />
        <div className="admin-grid-2">
          <TextField
            label="Título da confirmação"
            value={draft.interest.successTitle}
            onChange={value => patchField("interest", "successTitle", value)}
          />
          <TextField
            label="Texto da confirmação"
            value={draft.interest.successBody}
            onChange={value => patchField("interest", "successBody", value)}
          />
        </div>
        <TextArea
          label="Aviso de privacidade (LGPD)"
          value={draft.interest.privacyNotice}
          rows={4}
          hint="Exibido ao lado da caixa de consentimento. Obrigatório por lei para coleta de dados."
          onChange={value => patchField("interest", "privacyNotice", value)}
        />
        <SwitchField
          label="Abrir o WhatsApp depois de enviar"
          hint="O contato é salvo no painel antes do redirecionamento, então nada se perde se a pessoa desistir."
          checked={draft.interest.redirectToWhatsApp}
          onChange={value =>
            patchField("interest", "redirectToWhatsApp", value)
          }
        />

        <ListEditor
          items={draft.interest.subjects}
          onChange={items => patchField("interest", "subjects", items)}
          itemLabel={item => item.label}
          addLabel="Adicionar assunto"
          max={10}
          makeEmpty={() => ({ value: `assunto-${Date.now()}`, label: "" })}
          renderItem={(item, update) => (
            <TextField
              label="Assunto"
              value={item.label}
              hint="Aparece na lista do formulário e junto do contato recebido."
              onChange={value => update({ label: value })}
            />
          )}
        />
      </Fieldset>

      {/* ── Rodapé ── */}
      <Fieldset title="Rodapé">
        <div className="admin-grid-2">
          <TextField
            label="Linha de assinatura"
            value={draft.footer.tagline}
            onChange={value => patchField("footer", "tagline", value)}
          />
          <TextField
            label="Direitos autorais"
            value={draft.footer.copyright}
            onChange={value => patchField("footer", "copyright", value)}
          />
          <TextField
            label="Frase de fechamento"
            value={draft.footer.closing}
            onChange={value => patchField("footer", "closing", value)}
          />
        </div>
      </Fieldset>
    </AdminLayout>
  );
}
