import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AiComponent } from './ai.component';

describe('AI confirmation flow', () => {
  let posts: { path: string; body: any }[];
  beforeEach(async () => {
    posts = [];
    await TestBed.configureTestingModule({
      imports: [AiComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            get: () => of([]),
            post: (path: string, body: any) => {
              posts.push({ path, body });
              return of({ action: body.action });
            },
          },
        },
      ],
    }).compileComponents();
  });
  function preview(component: AiComponent) {
    component.conversationId = 'conversation';
    component.draft = {
      id: 'draft',
      version: 3,
      date: '2026-11-19',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      items: [],
      warnings: [],
    };
  }
  it('requires a separate explicit confirmation before posting changes', () => {
    const fixture = TestBed.createComponent(AiComponent);
    const c = fixture.componentInstance;
    preview(c);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((x) => x.textContent?.includes('Lưu vào kế hoạch'))!.click();
    fixture.detectChanges();
    expect(posts.length).toBe(0);
    const confirm = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((x) => x.textContent?.includes('Tôi xác nhận'))!;
    confirm.click();
    expect(posts.length).toBe(1);
    expect(posts[0].body).toEqual({ confirmed: true, version: 3, action: 'SAVE_PLAN' });
    expect(posts[0].path).toContain('/drafts/draft/confirm');
  });
  it('expired and superseded drafts cannot be confirmed', () => {
    const fixture = TestBed.createComponent(AiComponent);
    const c = fixture.componentInstance;
    preview(c);
    c.confirmAction = 'SAVE_PLAN';
    c.draft.expiresAt = new Date(0).toISOString();
    c.confirm();
    expect(posts.length).toBe(0);
    c.draft.expiresAt = new Date(Date.now() + 60000).toISOString();
    c.draft.status = 'SUPERSEDED';
    c.confirm();
    expect(posts.length).toBe(0);
  });
  it('changing dates clears the preview and pending confirmation', () => {
    const fixture = TestBed.createComponent(AiComponent);
    const c = fixture.componentInstance;
    preview(c);
    c.confirmAction = 'SAVE_PLAN';
    c.changeDate('2026-11-20');
    expect(c.draft).toBeNull();
    expect(c.confirmAction).toBe('');
    expect(posts.length).toBe(0);
  });
});

describe('Immediate AI messages', () => {
  let response: Subject<any>;
  let post: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    response = new Subject();
    post = vi.fn((path: string) => path === '/ai/conversations' ? of({ id: 'new' }) : response);
    await TestBed.configureTestingModule({
      imports: [AiComponent],
      providers: [{ provide: ApiService, useValue: { get: () => of([]), post } }],
    }).compileComponents();
  });
  it('shows the question before creation/model requests finish and keeps the next typed message', () => {
    const fixture = TestBed.createComponent(AiComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.text = 'Hôm nay mình ăn đủ đạm chưa?';
    c.send();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(c.messages).toHaveLength(1);
    expect(c.messages[0].role).toBe('user');
    expect(c.text).toBe('');
    expect(c.sending).toBe(true);
    expect(root.querySelector('.typing')).not.toBeNull();
    expect(root.querySelector('.options')).toBeNull();
    c.text = 'Câu tiếp theo';
    c.send();
    expect(post).toHaveBeenCalledTimes(2);
    response.next({ reply: 'Đã kiểm tra nhật ký.' });
    expect(c.messages.map(x => x.role)).toEqual(['user', 'assistant']);
    expect(c.text).toBe('Câu tiếp theo');
    expect(c.sending).toBe(false);
  });
  it('retains failed messages and retries the same bubble without duplicating the question', () => {
    const fixture = TestBed.createComponent(AiComponent);
    const c = fixture.componentInstance;
    c.conversationId = 'existing';
    c.text = 'Tạo thực đơn một ngày';
    c.send();
    expect(post.mock.calls[0][1].mode).toBe('PROPOSAL');
    response.error(new Error('Connection lost'));
    expect(c.messages).toHaveLength(1);
    expect(c.messages[0].failed).toBe(true);
    expect(c.busy).toBe(false);
    response = new Subject();
    c.retry(c.messages[0]);
    response.next({ reply: 'Có bản nháp mới.' });
    expect(c.messages).toHaveLength(2);
    expect(c.messages.filter(x => x.role === 'user')).toHaveLength(1);
    expect(c.messages[0].failed).toBe(false);
  });
});
