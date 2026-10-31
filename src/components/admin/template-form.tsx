"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Save } from "lucide-react";
import { saveTemplateAction, type TemplateFormState } from "@/app/admin/whatsapp/actions";
import type { MessageTemplate, TemplateStatus } from "@/lib/types";

const EMPTY: TemplateFormState = { ok: false };

export function TemplateForm({
  template,
  isOwner,
  statusOptions,
}: {
  template: MessageTemplate;
  isOwner: boolean;
  statusOptions: { value: TemplateStatus; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveTemplateAction, EMPTY);
  const [body, setBody] = useState(template.body);
  const overLimit = body.length > 1024;

  return (
    <form action={formAction} className="space-y-5 px-5 py-5">
      <input type="hidden" name="templateId" value={template.id} />

      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={`border px-4 py-3 text-[0.875rem] ${
            state.ok ? "border-olive text-ink" : "border-terracotta text-terracotta"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="template-name" className="label">
            Template name
          </label>
          <input
            id="template-name"
            name="name"
            required
            maxLength={120}
            defaultValue={template.name}
            className="field"
          />
          {state.errors?.name ? <p className="field-error">{state.errors.name}</p> : null}
        </div>
        <div>
          <label htmlFor="template-language" className="label">
            Language code
          </label>
          <input
            id="template-language"
            name="language"
            required
            maxLength={16}
            defaultValue={template.language}
            placeholder="en"
            className="field"
          />
          <p className="mt-1 text-[0.75rem] text-ink-muted">For example en or en_US.</p>
          {state.errors?.language ? <p className="field-error">{state.errors.language}</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor="meta-template-name" className="label">
          Meta template name
        </label>
        <input
          id="meta-template-name"
          name="metaTemplateName"
          maxLength={512}
          defaultValue={template.metaTemplateName ?? ""}
          placeholder="order_completed"
          className="field font-mono text-[0.875rem]"
        />
        <p className="mt-1 text-[0.75rem] text-ink-muted">
          The exact name of the approved template in Meta Business Manager. Lowercase letters,
          numbers and underscores only. Leave blank until Meta approves it.
        </p>
        {state.errors?.metaTemplateName ? (
          <p className="field-error">{state.errors.metaTemplateName}</p>
        ) : null}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="template-body" className="label">
            Message body
          </label>
          <span className={`text-[0.75rem] ${overLimit ? "text-terracotta" : "text-ink-muted"}`}>
            {body.length} / 1024 characters
          </span>
        </div>
        <textarea
          id="template-body"
          name="body"
          required
          rows={12}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="field font-mono text-[0.875rem] leading-relaxed"
        />
        {state.errors?.body ? <p className="field-error">{state.errors.body}</p> : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {template.placeholders.map((placeholder) => (
            <code
              key={placeholder}
              className="border border-line bg-paper-raised px-1.5 py-0.5 text-[0.75rem]"
            >
              {`{{${placeholder}}}`}
            </code>
          ))}
        </div>
        <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-muted">
          Every placeholder above must appear in the body. The customer&apos;s details are filled
          in when the message is prepared. Plain text only — no PDFs, images or links added
          automatically.
        </p>
      </div>

      {isOwner ? (
        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <div>
            <label htmlFor="template-status" className="label">
              Meta approval status
            </label>
            <select
              id="template-status"
              name="status"
              defaultValue={template.status}
              className="field"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[0.75rem] text-ink-muted">
              Set Approved only after Meta has approved this exact body.
            </p>
          </div>
          <label className="flex items-start gap-2 pt-6 text-[0.875rem]">
            <input
              type="checkbox"
              name="active"
              defaultChecked={template.active}
              className="mt-0.5 size-4 accent-olive"
            />
            <span>
              Template is switched on
              <span className="mt-0.5 block text-[0.75rem] text-ink-muted">
                Disabling stops new messages of this type. Queued messages go to review.
              </span>
            </span>
          </label>
        </div>
      ) : (
        <p className="border-t border-line pt-4 text-[0.8125rem] text-ink-soft">
          Only the Owner can change the Meta approval status or switch a template off.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="submit" disabled={pending} className="btn btn-solid btn-sm">
          <Save aria-hidden="true" className="size-4" />
          {pending ? "Saving…" : "Save template"}
        </button>
        <p className="flex items-center gap-1.5 text-[0.75rem] text-ink-muted">
          <AlertCircle aria-hidden="true" className="size-3.5" />
          Saving creates a new version. Existing queued messages keep their old version.
        </p>
      </div>
    </form>
  );
}
