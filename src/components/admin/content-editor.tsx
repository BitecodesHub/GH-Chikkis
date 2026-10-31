"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  LoaderCircle,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { saveContentAction, type ContentFormState } from "@/app/admin/content/actions";
import type { ContentFieldDef, ContentPageDef } from "@/lib/content-schema";
import { cn } from "@/lib/cn";
import type {
  ContentFaq,
  ContentSection,
  ContentStep,
  PageContent,
} from "@/lib/types";

const EMPTY_STATE: ContentFormState = { ok: false };

function textValue(content: PageContent, key: string): string {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function paragraphsValue(content: PageContent, key: string): string[] {
  const value = content[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function sectionsValue(content: PageContent, key: string): ContentSection[] {
  const value = content[key];
  return Array.isArray(value) ? (value as ContentSection[]) : [];
}

function faqsValue(content: PageContent, key: string): ContentFaq[] {
  const value = content[key];
  return Array.isArray(value) ? (value as ContentFaq[]) : [];
}

function stepsValue(content: PageContent, key: string): ContentStep[] {
  const value = content[key];
  return Array.isArray(value) ? (value as ContentStep[]) : [];
}

function moved<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

const TYPE_HELP: Record<string, string> = {
  paragraphs: "Separate paragraphs with a blank line.",
  sections: "Each section has a heading and body paragraphs.",
  faqs: "Question and answer pairs. The first question should be the most common one.",
  steps: "Steps are numbered automatically on the page.",
};

function RowControls({
  label,
  index,
  count,
  onMove,
  onRemove,
}: {
  label: string;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="meta mr-1">{label} {index + 1}</span>
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        className="btn btn-quiet btn-sm px-2"
        aria-label={`Move ${label.toLowerCase()} ${index + 1} up`}
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === count - 1}
        className="btn btn-quiet btn-sm px-2"
        aria-label={`Move ${label.toLowerCase()} ${index + 1} down`}
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="btn btn-quiet btn-sm px-2 text-terracotta"
        aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function ContentEditor({
  page,
  draft,
  published,
  canPublish,
}: {
  page: ContentPageDef;
  draft: PageContent;
  published: PageContent;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<ContentFormState>(EMPTY_STATE);
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState<PageContent>(draft);
  const [savedContent, setSavedContent] = useState<PageContent>(draft);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(draft));
  const [publishedSnapshot, setPublishedSnapshot] = useState(() =>
    JSON.stringify(published),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | null;
    formData.set(
      "intent",
      submitter && submitter.value === "publish" ? "publish" : "save",
    );

    startTransition(async () => {
      const result = await saveContentAction(state, formData);
      setState(result);
      if (!result.ok || !result.savedContent) return;
      setContent(result.savedContent);
      setSavedContent(result.savedContent);
      setSavedSnapshot(result.savedSnapshot ?? JSON.stringify(result.savedContent));
      if (result.publishedContent) {
        setPublishedSnapshot(JSON.stringify(result.publishedContent));
      }
      router.refresh();
    });
  }

  function setValue(key: string, value: string | string[] | ContentSection[] | ContentFaq[] | ContentStep[]) {
    setContent((current) => ({ ...current, [key]: value }));
  }

  const dirty = JSON.stringify(content) !== savedSnapshot;
  const unpublished = savedSnapshot !== publishedSnapshot;

  function renderField(field: ContentFieldDef) {
    const inputId = `${page.key}-${field.key}`;
    const help = field.help ?? TYPE_HELP[field.type];

    if (field.type === "text") {
      return (
        <div key={field.key} className="p-5">
          <label htmlFor={inputId} className="label">
            {field.label}
          </label>
          <input
            id={inputId}
            value={textValue(content, field.key)}
            onChange={(event) => setValue(field.key, event.target.value)}
            maxLength={300}
            className="field"
          />
          {help ? <p className="help">{help}</p> : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.key} className="p-5">
          <label htmlFor={inputId} className="label">
            {field.label}
          </label>
          <textarea
            id={inputId}
            value={textValue(content, field.key)}
            onChange={(event) => setValue(field.key, event.target.value)}
            maxLength={5000}
            rows={4}
            className="field"
          />
          {help ? <p className="help">{help}</p> : null}
        </div>
      );
    }

    if (field.type === "paragraphs") {
      return (
        <div key={field.key} className="p-5">
          <label htmlFor={inputId} className="label">
            {field.label}
          </label>
          <textarea
            id={inputId}
            value={paragraphsValue(content, field.key).join("\n\n")}
            onChange={(event) =>
              setValue(field.key, event.target.value.split(/\n\s*\n/))
            }
            maxLength={20000}
            rows={6}
            className="field"
          />
          {help ? <p className="help">{help}</p> : null}
        </div>
      );
    }

    if (field.type === "sections") {
      const sections = sectionsValue(content, field.key);
      return (
        <div key={field.key} className="p-5">
          <p className="label">{field.label}</p>
          {help ? <p className="help mb-3">{help}</p> : null}
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div key={index} className="border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="meta">Section {index + 1}</span>
                  <RowControls
                    label="Section"
                    index={index}
                    count={sections.length}
                    onMove={(direction) =>
                      setValue(
                        field.key,
                        moved(sections, index, direction),
                      )
                    }
                    onRemove={() =>
                      setValue(
                        field.key,
                        sections.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  />
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label
                      htmlFor={`${inputId}-heading-${index}`}
                      className="label"
                    >
                      Heading
                    </label>
                    <input
                      id={`${inputId}-heading-${index}`}
                      value={section.heading}
                      onChange={(event) =>
                        setValue(
                          field.key,
                          sections.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, heading: event.target.value }
                              : item,
                          ),
                        )
                      }
                      maxLength={200}
                      className="field"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${inputId}-body-${index}`}
                      className="label"
                    >
                      Body
                    </label>
                    <textarea
                      id={`${inputId}-body-${index}`}
                      value={section.body.join("\n\n")}
                      onChange={(event) =>
                        setValue(
                          field.key,
                          sections.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  body: event.target.value.split(/\n\s*\n/),
                                }
                              : item,
                          ),
                        )
                      }
                      maxLength={16000}
                      rows={4}
                      className="field"
                    />
                    <p className="help">Separate paragraphs with a blank line.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setValue(field.key, [...sections, { heading: "", body: [] }])
            }
            className="btn btn-outline btn-sm mt-4"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add section
          </button>
        </div>
      );
    }

    if (field.type === "faqs") {
      const faqs = faqsValue(content, field.key);
      return (
        <div key={field.key} className="p-5">
          <p className="label">{field.label}</p>
          {help ? <p className="help mb-3">{help}</p> : null}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="meta">Question {index + 1}</span>
                  <RowControls
                    label="Question"
                    index={index}
                    count={faqs.length}
                    onMove={(direction) => setValue(field.key, moved(faqs, index, direction))}
                    onRemove={() =>
                      setValue(
                        field.key,
                        faqs.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  />
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label
                      htmlFor={`${inputId}-question-${index}`}
                      className="label"
                    >
                      Question
                    </label>
                    <input
                      id={`${inputId}-question-${index}`}
                      value={faq.question}
                      onChange={(event) =>
                        setValue(
                          field.key,
                          faqs.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, question: event.target.value }
                              : item,
                          ),
                        )
                      }
                      maxLength={300}
                      className="field"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${inputId}-answer-${index}`}
                      className="label"
                    >
                      Answer
                    </label>
                    <textarea
                      id={`${inputId}-answer-${index}`}
                      value={faq.answer}
                      onChange={(event) =>
                        setValue(
                          field.key,
                          faqs.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, answer: event.target.value }
                              : item,
                          ),
                        )
                      }
                      maxLength={2500}
                      rows={4}
                      className="field"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setValue(field.key, [...faqs, { question: "", answer: "" }])
            }
            className="btn btn-outline btn-sm mt-4"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add question
          </button>
        </div>
      );
    }

    const steps = stepsValue(content, field.key);
    return (
      <div key={field.key} className="p-5">
        <p className="label">{field.label}</p>
        {help ? <p className="help mb-3">{help}</p> : null}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="meta">Step {index + 1}</span>
                <RowControls
                  label="Step"
                  index={index}
                  count={steps.length}
                  onMove={(direction) => setValue(field.key, moved(steps, index, direction))}
                  onRemove={() =>
                    setValue(
                      field.key,
                      steps.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                />
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor={`${inputId}-title-${index}`} className="label">
                    Title
                  </label>
                  <input
                    id={`${inputId}-title-${index}`}
                    value={step.title}
                    onChange={(event) =>
                      setValue(
                        field.key,
                        steps.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      )
                    }
                    maxLength={200}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor={`${inputId}-body-${index}`} className="label">
                    Body
                  </label>
                  <textarea
                    id={`${inputId}-body-${index}`}
                    value={step.body}
                    onChange={(event) =>
                      setValue(
                        field.key,
                        steps.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, body: event.target.value }
                            : item,
                        ),
                      )
                    }
                    maxLength={2500}
                    rows={3}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor={`${inputId}-note-${index}`} className="label">
                    Note (optional)
                  </label>
                  <input
                    id={`${inputId}-note-${index}`}
                    value={step.note ?? ""}
                    onChange={(event) =>
                      setValue(
                        field.key,
                        steps.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, note: event.target.value }
                            : item,
                        ),
                      )
                    }
                    maxLength={500}
                    className="field"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setValue(field.key, [...steps, { title: "", body: "", note: "" }])
          }
          className="btn btn-outline btn-sm mt-4"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add step
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="page" value={page.key} />
      <input type="hidden" name="content" value={JSON.stringify(content)} />

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "pill",
            unpublished ? "border-brass text-brass" : "border-olive-soft text-olive",
          )}
        >
          {unpublished ? "Saved draft is ahead of the live page" : "Live page up to date"}
        </span>
        {dirty ? (
          <span className="pill border-terracotta text-terracotta">Unsaved edits</span>
        ) : null}
        <button
          type="button"
          onClick={() => setContent(savedContent)}
          disabled={!dirty}
          className="btn btn-quiet btn-sm ml-auto"
        >
          Discard unsaved edits
        </button>
      </div>

      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={cn(
            "border px-4 py-3 text-[0.875rem]",
            state.ok
              ? "border-olive bg-paper-raised text-ink"
              : "border-terracotta bg-paper-raised text-ink",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Page fields</h2>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">
            Edits are saved to a draft. The public site only changes when the Owner
            publishes.
          </p>
        </div>
        <div className="divide-y divide-line">{page.fields.map(renderField)}</div>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/95 py-3 backdrop-blur">
        <p aria-live="polite" className="text-[0.8125rem] text-ink-muted">
          {pending
            ? "Saving…"
            : state.ok
              ? state.message
              : canPublish
                ? "Publishing replaces the live page immediately."
                : "Only the Owner can publish. Save your work as a draft."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="intent" value="save" disabled={pending} className="btn btn-outline btn-sm">
            {pending ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="size-4" />
            )}
            Save draft
          </button>
          {canPublish ? (
            <button
              type="submit"
              name="intent"
              value="publish"
              disabled={pending}
              className="btn btn-solid btn-sm"
            >
              <Send aria-hidden="true" className="size-4" />
              Publish
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
