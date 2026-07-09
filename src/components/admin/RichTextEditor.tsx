"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { MediaPicker } from "./MediaLibrary";
import type { MediaAsset } from "@/lib/content-api";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  dir?: "rtl" | "ltr";
  placeholder?: string;
};

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-[13px] font-bold transition-colors ${
        active ? "bg-brown-500 text-creamy-100" : "text-brown-500 hover:bg-creamy-300"
      }`}
    >
      {children}
    </button>
  );
}

/** Brand-styled TipTap editor: headings, emphasis, lists, quote, link, media images. */
export default function RichTextEditor({ value, onChange, dir = "rtl", placeholder }: RichTextEditorProps) {
  const t = useTranslations("admin.editor");
  const [pickerOpen, setPickerOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        link: false,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value || "",
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
    editorProps: {
      attributes: {
        dir,
        class:
          "rte-body min-h-72 rounded-b-2xl bg-creamy-50 px-5 py-4 font-serif text-[16px] leading-[1.9] text-brown-900 focus:outline-none",
      },
    },
  });

  // External value swap (language tab switch) without stealing the caret mid-typing.
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return <div className="min-h-72 animate-pulse rounded-2xl bg-creamy-300" />;
  }

  function setLink(current: Editor) {
    const existing = current.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("linkPrompt"), existing ?? "https://");
    if (url === null) return;
    if (url === "") {
      current.chain().focus().unsetLink().run();
      return;
    }
    current.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="rounded-2xl border border-line">
      <div className="flex flex-wrap items-center gap-1 rounded-t-2xl border-b border-line bg-card px-2 py-1.5" role="toolbar" aria-label={t("toolbar")}>
        <ToolbarButton label={t("h2")} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </ToolbarButton>
        <ToolbarButton label={t("h3")} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <ToolbarButton label={t("bold")} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton label={t("italic")} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em className="font-serif">I</em>
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <ToolbarButton label={t("bulletList")} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          ••
        </ToolbarButton>
        <ToolbarButton label={t("orderedList")} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          ١٢
        </ToolbarButton>
        <ToolbarButton label={t("quote")} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          ❝
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <ToolbarButton label={t("link")} active={editor.isActive("link")} onClick={() => setLink(editor)}>
          🔗
        </ToolbarButton>
        <ToolbarButton label={t("image")} onClick={() => setPickerOpen(true)}>
          🖼
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <ToolbarButton label={t("undo")} onClick={() => editor.chain().focus().undo().run()}>
          ↩
        </ToolbarButton>
        <ToolbarButton label={t("redo")} onClick={() => editor.chain().focus().redo().run()}>
          ↪
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      {pickerOpen ? (
        <MediaPicker
          onClose={() => setPickerOpen(false)}
          onPick={(asset: MediaAsset) => {
            editor.chain().focus().setImage({ src: asset.url, alt: asset.alt_ar }).run();
            setPickerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
