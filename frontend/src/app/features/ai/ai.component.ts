import { afterNextRender, Component, ElementRef, Injector, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/services/api.service';
import { mealNames, message, num, today } from '../../shared/utils/ui';

@Component({
  selector: 'app-ai',
  imports: [FormsModule, MatButtonModule],
  templateUrl: './ai.component.html',
  styleUrl: './ai.component.scss',
})
export class AiComponent implements OnInit {
  api = inject(ApiService);
  private injector = inject(Injector);
  @ViewChild('messageList') messageList?: ElementRef<HTMLElement>;
  sending = false;
  private followLatest = true;
  conversations: any[] = [];
  messages: any[] = [];
  shoppingLists: any[] = [];
  conversationId = '';
  date = today();
  mode = 'ADVICE';
  meal = '';
  text = '';
  busy = false;
  error = '';
  notice = '';
  draft: any = null;
  confirmAction = '';
  hasOlder = false;
  names: Record<string, string> = mealNames;
  mealKeys = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
  n = num;
  ngOnInit() {
    this.refresh();
    this.loadShopping();
  }
  refresh() {
    this.api.get<any[]>('/ai/conversations').subscribe({
      next: (r) => (this.conversations = r),
      error: (e) => (this.error = message(e)),
    });
  }
  loadShopping() {
    this.api.get<any[]>('/ai/shopping-lists').subscribe({
      next: (r) => (this.shoppingLists = r),
      error: (e) => (this.error = message(e)),
    });
  }
  create() {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    this.api.post<any>('/ai/conversations', {}).subscribe({
      next: (c) => {
        this.conversationId = c.id;
        this.conversations = [c, ...this.conversations];
        this.messages = [];
        this.draft = null;
        this.confirmAction = '';
        this.hasOlder = false;
        this.notice = '';
        this.busy = false;
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  open(id: string) {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    this.confirmAction = '';
    this.notice = '';
    this.api.get<any>('/ai/conversations/' + id).subscribe({
      next: (r) => {
        this.conversationId = id;
        this.messages = r.messages;
        this.hasOlder = r.messages.length === 30;
        this.draft = r.draft;
        if (r.draft) this.date = r.draft.date;
        this.busy = false;
        this.scrollLatest(true);
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  older() {
    if (this.busy || !this.messages.length) return;
    const element = this.messageList?.nativeElement;
    const previousHeight = element?.scrollHeight || 0;
    const previousTop = element?.scrollTop || 0;
    this.busy = true;
    this.api
      .get<any>(`/ai/conversations/${this.conversationId}?before=${this.messages[0].id}`)
      .subscribe({
        next: (r) => {
          this.messages = [...r.messages, ...this.messages];
          this.hasOlder = r.messages.length === 30;
          this.busy = false;
          afterNextRender(() => {
            if (element) element.scrollTop = previousTop + element.scrollHeight - previousHeight;
          }, { injector: this.injector });
        },
        error: (e) => {
          this.error = message(e);
          this.busy = false;
        },
      });
  }
  changeDate(value: string) {
    if (this.busy) return;
    this.date = value;
    this.draft = null;
    this.confirmAction = '';
  }
  example(mode: string, text: string) {
    this.mode = mode;
    this.text = text;
  }
  send() {
    if (this.busy || !this.text.trim()) return;
    const content = this.text.trim();
    this.text = '';
    const normalized = content.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
    const mode = /(tao|lam|lap|len|goi y|de xuat|thay|doi|dieu chinh).*(thuc don|bua(?: an)?|mon(?: an)?|ke hoach)/.test(normalized)
      ? 'PROPOSAL' : 'ADVICE';
    const pending = { role: 'user', content, failed: false, date: this.date, mode };
    this.messages = [...this.messages, pending];
    this.dispatch(pending);
  }
  retry(pending: any) {
    if (this.busy) return;
    pending.failed = false;
    this.dispatch(pending);
  }
  private dispatch(pending: any) {
    this.busy = true;
    this.sending = true;
    this.error = '';
    this.notice = '';
    this.confirmAction = '';
    this.scrollLatest(true);
    if (!this.conversationId) {
      this.api.post<any>('/ai/conversations', {}).subscribe({
        next: (c) => {
          this.conversationId = c.id;
          this.conversations = [c, ...this.conversations];
          this.submit(pending);
        },
        error: (e) => {
          this.error = message(e);
          this.busy = false;
          this.sending = false;
          pending.failed = true;
          this.scrollLatest();
        },
      });
    } else this.submit(pending);
  }
  private submit(pending: any) {
    this.api
      .post<any>(`/ai/conversations/${this.conversationId}/messages`, {
        message: pending.content,
        date: pending.date,
        mode: pending.mode,
      })
      .subscribe({
        next: (r) => {
          this.messages = [
            ...this.messages,
            { role: 'assistant', content: r.reply },
          ];
          if (r.draft) this.draft = r.draft;
          this.busy = false;
          this.sending = false;
          this.scrollLatest();
          this.refresh();
        },
        error: (e) => {
          this.error = message(e);
          this.busy = false;
          this.sending = false;
          pending.failed = true;
          this.scrollLatest();
        },
      });
  }
  onScroll() {
    const el = this.messageList?.nativeElement;
    if (el) this.followLatest = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }
  private scrollLatest(force = false) {
    if (force) this.followLatest = true;
    afterNextRender(() => {
      const el = this.messageList?.nativeElement;
      if (el && this.followLatest) el.scrollTop = el.scrollHeight;
    }, { injector: this.injector });
  }
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.send();
    }
  }
  get canConfirm() {
    return (
      this.draft &&
      ['PENDING', 'APPLIED'].includes(this.draft.status) &&
      new Date(this.draft.expiresAt).getTime() > Date.now()
    );
  }
  statusName(status: string) {
    return (
      (
        {
          PENDING: 'Chưa lưu',
          APPLIED: 'Đã lưu kế hoạch',
          SUPERSEDED: 'Đã được thay thế',
          INVALID: 'Cần tạo lại',
        } as Record<string, string>
      )[status] || status
    );
  }
  confirm() {
    if (!this.canConfirm || !this.confirmAction || this.busy) return;
    const action = this.confirmAction;
    this.busy = true;
    this.error = '';
    this.api
      .post<any>(`/ai/conversations/${this.conversationId}/drafts/${this.draft.id}/confirm`, {
        confirmed: true,
        version: this.draft.version,
        action,
      })
      .subscribe({
        next: (r) => {
          this.notice = r.alreadyApplied
            ? 'Thao tác này đã được thực hiện trước đó.'
            : action === 'SAVE_PLAN'
              ? 'Đã lưu thực đơn vào kế hoạch.'
              : 'Đã tạo danh sách mua sắm.';
          if (action === 'SAVE_PLAN') this.draft.status = 'APPLIED';
          this.confirmAction = '';
          this.busy = false;
          this.loadShopping();
        },
        error: (e) => {
          this.error = message(e);
          this.confirmAction = '';
          this.busy = false;
        },
      });
  }
}
