import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AiComponent } from './ai.component';
import { ApiService } from '../core/services/api.service';

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
