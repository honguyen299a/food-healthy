import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../core/services/api.service';
import { DatePickerComponent } from '../core/date-picker.component';
import { mealNames, message, num, today } from '../core/ui';

@Component({
  selector: 'app-ai',
  imports: [FormsModule, MatButtonModule, DatePickerComponent],
  templateUrl: './ai.component.html',
  styleUrl: './ai.component.scss',
})
export class AiComponent implements OnInit {
  api = inject(ApiService);
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
    this.api
      .get<any[]>('/ai/conversations')
      .subscribe({
        next: (r) => (this.conversations = r),
        error: (e) => (this.error = message(e)),
      });
  }
  loadShopping() {
    this.api
      .get<any[]>('/ai/shopping-lists')
      .subscribe({
        next: (r) => (this.shoppingLists = r),
        error: (e) => (this.error = message(e)),
      });
  }
  create() {
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
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  older() {
    if (!this.messages.length) return;
    this.busy = true;
    this.api
      .get<any>(`/ai/conversations/${this.conversationId}?before=${this.messages[0].id}`)
      .subscribe({
        next: (r) => {
          this.messages = [...r.messages, ...this.messages];
          this.hasOlder = r.messages.length === 30;
          this.busy = false;
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
    this.busy = true;
    this.error = '';
    this.notice = '';
    this.confirmAction = '';
    if (!this.conversationId) {
      this.api.post<any>('/ai/conversations', {}).subscribe({
        next: (c) => {
          this.conversationId = c.id;
          this.conversations = [c, ...this.conversations];
          this.submit();
        },
        error: (e) => {
          this.error = message(e);
          this.busy = false;
        },
      });
    } else this.submit();
  }
  private submit() {
    const content = this.text.trim();
    this.api
      .post<any>(`/ai/conversations/${this.conversationId}/messages`, {
        message: content,
        date: this.date,
        mode: this.mode,
        ...(this.mode === 'PROPOSAL' && this.meal ? { meal: this.meal } : {}),
      })
      .subscribe({
        next: (r) => {
          this.messages = [
            ...this.messages,
            { role: 'user', content },
            { role: 'assistant', content: r.reply },
          ];
          if (r.draft) this.draft = r.draft;
          this.text = '';
          this.busy = false;
          this.refresh();
        },
        error: (e) => {
          this.error = message(e);
          this.busy = false;
        },
      });
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
