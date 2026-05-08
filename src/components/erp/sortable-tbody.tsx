'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Props = {
  id: string;
  className?: string;
  /** يمرَّر دمج `attributes` و`listeners` لوضعها على مقبض السحب (زر/أيقونة). */
  children: (dragHandleProps: Record<string, unknown>) => ReactNode;
};

/** مجموعة صفوف داخل `<tbody>` قابلة للسحب — صالح كعدة `<tbody>` في `<table>` واحد. */
export function SortableTableBody({ id, className, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const dragHandleProps: Record<string, unknown> = {
    ...attributes,
    ...listeners,
  };
  return (
    <tbody
      ref={setNodeRef}
      style={style}
      className={`${className ?? ''} ${isDragging ? 'opacity-70' : ''}`.trim()}
    >
      {children(dragHandleProps)}
    </tbody>
  );
}
