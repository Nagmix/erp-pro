'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocComments, useAddDocComment } from '@/lib/client/hooks';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type DocumentCommentsProps = {
  doctype: string;
  docname: string;
  className?: string;
};

// ============================================================
// Relative time in Arabic
// ============================================================

function relativeTimeAr(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return dateStr;
  const diffMs = now - then;
  if (diffMs < 0) return 'الآن';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'الآن';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : minutes < 11 ? 'دقائق' : 'دقيقة'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ${hours === 1 ? 'ساعة' : hours < 11 ? 'ساعات' : 'ساعة'}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} ${days === 1 ? 'يوم' : days < 11 ? 'أيام' : 'يوم'}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} ${months === 1 ? 'شهر' : months < 11 ? 'أشهر' : 'شهر'}`;
  const years = Math.floor(months / 12);
  return `منذ ${years} ${years === 1 ? 'سنة' : years < 11 ? 'سنوات' : 'سنة'}`;
}

// ============================================================
// Format date in Arabic-friendly format
// ============================================================

function formatDateAr(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ============================================================
// Get initials from a name
// ============================================================

function getInitials(name?: string): string {
  if (!name) return '؟';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

// ============================================================
// Avatar color from name hash
// ============================================================

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-cyan-600',
  'bg-teal-600',
  'bg-pink-600',
  'bg-orange-600',
];

function avatarColor(name?: string): string {
  if (!name) return AVATAR_COLORS[0]!;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

// ============================================================
// Comment Item
// ============================================================

function CommentItem({ comment }: { comment: import('@/lib/client/api').DocComment }) {
  const author = comment.comment_by || comment.sender || 'مستخدم';
  const initials = getInitials(author);
  const colorClass = avatarColor(author);
  const relTime = relativeTimeAr(comment.creation);
  const fullDate = formatDateAr(comment.creation);

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className={cn(colorClass, 'text-white text-[10px] font-semibold')}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{author}</span>
          <span
            className="text-[10px] text-muted-foreground"
            title={fullDate}
          >
            {relTime}
          </span>
        </div>
        <div
          className="mt-1 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: comment.content || '' }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Loading skeleton
// ============================================================

function CommentsSkeleton() {
  return (
    <div className="space-y-4 p-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function DocumentComments({ doctype, docname, className }: DocumentCommentsProps) {
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const comments = useDocComments(doctype, docname);
  const addComment = useAddDocComment(doctype, docname);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.data?.length]);

  const handleSubmit = useCallback(() => {
    const text = newComment.trim();
    if (!text) return;
    addComment.mutate(text, {
      onSuccess: () => {
        setNewComment('');
        toast({ title: 'تم إضافة التعليق' });
        // Re-focus the input
        inputRef.current?.focus();
      },
      onError: (err) => {
        toast({
          title: 'فشل إضافة التعليق',
          description: (err as Error).message,
          variant: 'destructive',
        });
      },
    });
  }, [newComment, addComment, toast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send, Shift+Enter for newline
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const isEmpty = !comments.isLoading && (!comments.data || comments.data.length === 0);

  return (
    <Card className={cn('border-border/40', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          التعليقات
          {comments.data && comments.data.length > 0 && (
            <span className="text-[10px] font-normal text-muted-foreground">
              ({comments.data.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Comments list */}
        <ScrollArea className="max-h-96" ref={scrollRef}>
          <div className="ps-1 pe-3">
            {comments.isLoading && <CommentsSkeleton />}

            {comments.isError && (
              <div className="text-center py-6">
                <p className="text-sm text-destructive">
                  تعذر تحميل التعليقات
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => void comments.refetch()}
                >
                  إعادة المحاولة
                </Button>
              </div>
            )}

            {isEmpty && (
              <div className="text-center py-8">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground mt-2">
                  لا توجد تعليقات بعد
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  كن أول من يعلّق على هذا المستند
                </p>
              </div>
            )}

            {comments.data && comments.data.length > 0 && (
              <div className="divide-y divide-border/30">
                {comments.data.map((c) => (
                  <CommentItem key={c.name} comment={c} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* New comment input */}
        <div className="flex gap-2 items-end pt-2 border-t border-border/30">
          <Textarea
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب تعليقاً… (Enter للإرسال، Shift+Enter لسطر جديد)"
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
            dir="rtl"
            disabled={addComment.isPending}
          />
          <Button
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={handleSubmit}
            disabled={!newComment.trim() || addComment.isPending}
          >
            {addComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
