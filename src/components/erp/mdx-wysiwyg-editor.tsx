'use client';

import { useMemo } from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  ListsToggle,
  InsertTable,
  InsertThematicBreak,
  BlockTypeSelect,
  CreateLink,
  Separator,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

type Props = {
  markdown: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
};

export function MdxWysiwygEditor({ markdown, onChange, placeholder, className }: Props) {
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      markdownShortcutPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      tablePlugin(),
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <UndoRedo />
            <Separator />
            <BoldItalicUnderlineToggles />
            <Separator />
            <ListsToggle />
            <Separator />
            <BlockTypeSelect />
            <Separator />
            <CreateLink />
            <InsertTable />
            <InsertThematicBreak />
          </>
        ),
      }),
    ],
    []
  );

  return (
    <div className={className} dir="ltr">
      <MDXEditor
        markdown={markdown}
        onChange={onChange}
        placeholder={placeholder}
        plugins={plugins}
        contentEditableClassName="max-w-none min-h-[280px] px-3 py-2 text-sm leading-relaxed"
      />
    </div>
  );
}
