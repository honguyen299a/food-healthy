import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  HostListener,
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <section class="landing-hero">
      <div class="landing-hero-inner">
        <div class="landing-copy">
          <div class="landing-pill reveal">
            <span class="pill-spark">✳</span> CHĂM SÓC BẢN THÂN, THEO CÁCH DỄ DÀNG HƠN
          </div>
          <h1 class="reveal">Ăn lành mạnh.<br /><span>Sống thật vui.</span></h1>
          <p class="landing-lead reveal">
            Một không gian giúp bạn hiểu nhu cầu cơ thể, chọn bữa ăn cân bằng và duy trì thói quen
            tốt theo nhịp sống của riêng mình.
          </p>
          <div class="landing-actions reveal">
            <a routerLink="/register" class="landing-primary">Bắt đầu hành trình </a
            ><a href="#cach-hoat-dong" class="landing-secondary">Khám phá thêm </a>
          </div>
          <div class="landing-proof reveal">
            <span class="proof-line"></span><span>Từng bước nhỏ cho một cuộc sống khỏe hơn</span>
          </div>
        </div>
        <div class="hero-media-wrap reveal">
          <div class="hero-orbit orbit-one"></div>
          <div class="hero-orbit orbit-two"></div>
          <div class="hero-media">
            <video
              #heroVideo
              autoplay
              [muted]="true"
              loop
              playsinline
              preload="auto"
              (canplay)="startVideo()"
              poster="/media/colorful-meals-poster.webp"
              aria-label="Video các bữa ăn đầy màu sắc với trái cây và rau củ"
            >
              <source src="/media/colorful-meals-hero.mp4" type="video/mp4" />
            </video>
            <div class="video-gradient"></div>
            <div class="video-label">
              <span class="video-live-dot"></span
              ><span>Mỗi bữa ăn là một cơ hội để chăm sóc mình.</span>
            </div>
          </div>
          <div class="hero-stamp"><span>GOOD</span><b>FOOD</b><span>GOOD MOOD ✳</span></div>
        </div>
      </div>
      <div class="landing-scroll-hint"><span>CUỘN ĐỂ KHÁM PHÁ</span><i></i></div>
    </section>

    <section class="landing-principles" id="cach-hoat-dong">
      <div class="principles-intro">
        <span class="landing-kicker reveal">TỐT HƠN MỖI NGÀY</span>
        <h2 class="reveal">Không cần hoàn hảo.<br /><em>Chỉ cần bắt đầu.</em></h2>
        <p class="reveal">
          Ăn uống lành mạnh trở nên dễ duy trì khi bạn có một kế hoạch phù hợp, hiểu điều mình đã ăn
          và nhìn thấy tiến bộ theo thời gian.
        </p>
      </div>
      <div class="principles-grid">
        <article class="reveal">
          <span class="principle-number">01 / HIỂU MÌNH</span>
          <div class="principle-icon">◎</div>
          <h3>Biết cơ thể cần gì</h3>
          <p>Mục tiêu dinh dưỡng được tính từ thông tin cá nhân và mức vận động của bạn.</p>
        </article>
        <article class="reveal">
          <span class="principle-number">02 / CHỌN ĐÚNG</span>
          <div class="principle-icon">✦</div>
          <h3>Ăn ngon có chủ đích</h3>
          <p>Sắp xếp các bữa ăn linh hoạt, với gợi ý phù hợp phần dinh dưỡng còn thiếu.</p>
        </article>
        <article class="reveal">
          <span class="principle-number">03 / DUY TRÌ</span>
          <div class="principle-icon">⌁</div>
          <h3>Nhìn thấy thay đổi</h3>
          <p>Theo dõi những gì đã ăn và sự tiến bộ của bản thân, từng ngày một.</p>
        </article>
      </div>
    </section>

    <section class="landing-story">
      <div class="story-visual reveal">
        <img
          src="/media/healthy-table-original.webp"
          loading="lazy"
          alt="Bát cá hồi với rau xanh, bơ và ngũ cốc"
        />
        <div class="story-visual-caption">NOURISH YOUR EVERYDAY <span>✳</span></div>
      </div>
      <div class="story-content">
        <span class="landing-kicker reveal">MỘT HÀNH TRÌNH RẤT RIÊNG</span>
        <h2 class="reveal">
          <span class="story-title-line">Ăn tốt hơn,</span
          ><span class="story-title-line">theo nhịp sống của bạn.</span>
        </h2>
        <p class="reveal">
          Không có thực đơn nào phù hợp với tất cả mọi người. Healthy Diet Planner giúp bạn bắt đầu
          từ nhu cầu của chính mình, chọn món mình thích và điều chỉnh khi cuộc sống thay đổi.
        </p>
        <div class="story-points">
          <div class="reveal"><span>✓</span> Kế hoạch linh hoạt cho từng ngày</div>
          <div class="reveal"><span>✓</span> Ghi nhận bữa ăn thực tế rõ ràng</div>
          <div class="reveal"><span>✓</span> Gợi ý dựa trên quy tắc dinh dưỡng</div>
        </div>
        <a routerLink="/register" class="story-link reveal">Tạo tài khoản miễn phí </a>
      </div>
    </section>

    <section class="landing-final">
      <div class="final-glow"></div>
      <span class="landing-kicker reveal">BẮT ĐẦU TỪ HÔM NAY</span>
      <h2 class="reveal">Một phiên bản khỏe hơn<br />đang chờ bạn.</h2>
      <p class="reveal">Dành vài phút để tạo hồ sơ. Những bữa ăn tốt hơn bắt đầu từ đó.</p>
      <a routerLink="/register" class="landing-primary reveal">Bắt đầu ngay </a>
    </section>
    <footer class="landing-footer">
      <a routerLink="/" class="brand public-brand"
        ><span class="brand-mark">✳</span
        ><span>healthy<span class="brand-accent">daily</span></span></a
      ><small>Các chỉ số dinh dưỡng mang tính ước tính, không thay thế tư vấn y tế.</small
      ><small>© 2026 Healthy Diet Planner</small>
    </footer>
  `,
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;
  private root: ElementRef<HTMLElement> = inject(ElementRef);
  private observer?: IntersectionObserver;
  ngAfterViewInit() {
    const video = this.heroVideo?.nativeElement;
    if (video) {
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
      this.startVideo();
    }
    const sections = this.root.nativeElement.querySelectorAll<HTMLElement>('.reveal');
    const positions = new Map<Element, number>(Array.from(sections, (el, index) => [el, index]));
    if (
      'IntersectionObserver' in window &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.root.nativeElement.classList.add('scroll-ready');
      this.observer = new IntersectionObserver(
        (entries) => {
          // Only stagger elements entering together. Scrolling to a later object must not
          // wait for objects elsewhere on the page, and exit animations have no delay.
          entries
            .filter((entry) => !entry.isIntersecting)
            .forEach((entry) => {
              entry.target.classList.remove('is-visible');
            });
          entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => (positions.get(a.target) || 0) - (positions.get(b.target) || 0))
            .forEach((entry, index) => {
              (entry.target as HTMLElement).style.setProperty('--reveal-delay', `${index * 140}ms`);
              entry.target.classList.add('is-visible');
            });
        },
        { threshold: 0.08, rootMargin: '0px 0px -24px 0px' },
      );
      sections.forEach((el) => this.observer?.observe(el));
    } else sections.forEach((el) => el.classList.add('is-visible'));
  }
  @HostListener('document:visibilitychange')
  resumeVideo() {
    if (document.visibilityState === 'visible') this.startVideo();
  }
  startVideo() {
    const video = this.heroVideo?.nativeElement;
    if (!video || !video.paused) return;
    video.muted = true;
    video.play().catch(() => {});
  }
  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
