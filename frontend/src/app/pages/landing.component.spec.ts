import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { LandingComponent } from './landing.component';

describe('Homepage media and repeatable scroll effects', () => {
  beforeEach(async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('uses silent looping inline autoplay without playback buttons', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(video.defaultMuted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.controls).toBe(false);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.video-toggle')).toBeNull();
  });
  it('retries playback when a paused video returns to a visible tab', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'paused', { configurable: true, value: true });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play).toHaveBeenCalledOnce();
  });
  it('handles a browser refusal without an unhandled playback error', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('Autoplay blocked'));
    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('video')).not.toBeNull();
  });
  it('replays the reveal effect after leaving and entering from either direction', () => {
    let notify!: IntersectionObserverCallback;
    let disconnected = false;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
        observe() {}
        disconnect() {
          disconnected = true;
        }
      },
    );
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector('.reveal') as HTMLElement;
    expect(fixture.nativeElement.querySelector('section.reveal')).toBeNull();
    const enter = (isIntersecting: boolean) =>
      notify(
        [
          {
            target: section,
            isIntersecting,
            time: 0,
            rootBounds: null,
            boundingClientRect: section.getBoundingClientRect(),
            intersectionRect: section.getBoundingClientRect(),
            intersectionRatio: isIntersecting ? 1 : 0,
          },
        ],
        {} as IntersectionObserver,
      );
    enter(true);
    expect(section.classList.contains('is-visible')).toBe(true);
    const cards = Array.from(
      fixture.nativeElement.querySelectorAll('.principles-grid article'),
    ) as HTMLElement[];
    notify(
      [cards[2], cards[0], cards[1]].map((target) => ({
        target,
        isIntersecting: true,
        time: 0,
        rootBounds: null,
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        intersectionRatio: 1,
      })),
      {} as IntersectionObserver,
    );
    expect(cards.map((card) => card.style.getPropertyValue('--reveal-delay'))).toEqual([
      '0ms',
      '140ms',
      '280ms',
    ]);
    enter(false);
    expect(section.classList.contains('is-visible')).toBe(false);
    enter(true);
    expect(section.classList.contains('is-visible')).toBe(true);
    fixture.destroy();
    expect(disconnected).toBe(true);
  });
});
