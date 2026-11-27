import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  inject,
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

    <section class="landing-features" id="tinh-nang" aria-labelledby="features-title">
      <div class="features-heading">
        <div>
          <span class="landing-kicker reveal">MỘT NƠI, NHIỀU CÁCH CHĂM SÓC MÌNH</span>
          <h2 class="reveal" id="features-title">Những tiện ích cho mỗi bữa ăn</h2>
        </div>
        <p class="reveal">
          Từ chọn thực phẩm đến nhìn lại thói quen, bạn có thể bắt đầu với điều mình cần và bổ sung
          từng chút khi đã sẵn sàng.
        </p>
      </div>
      <div class="features-grid">
        <article class="feature-card reveal">
          <span class="feature-icon" aria-hidden="true"
            ><svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M12 21c-4-2-7-5-7-10a7 7 0 0 1 14 0c0 5-3 8-7 10ZM12 8v9m0-4 4-4m-4 6-4-4"
              /></svg
          ></span>
          <h3>Hiểu món ăn, chọn khẩu phần</h3>
          <p>
            Tra cứu thực phẩm trong thư viện chung hoặc thêm món riêng của bạn. Lượng calories và
            dinh dưỡng được tính theo số gram bạn chọn.
          </p>
          <div class="feature-tags">
            <span>Thư viện thực phẩm</span><span>Khẩu phần linh hoạt</span>
          </div>
        </article>
        <article class="feature-card reveal">
          <span class="feature-icon" aria-hidden="true"
            ><svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z" /></svg
          ></span>
          <h3>Thêm ý tưởng với trợ lý AI</h3>
          <p>
            Hỏi về thực phẩm, tìm gợi ý món ăn và xem trước thực đơn được đề xuất. Bạn kiểm tra nội
            dung và xác nhận trước khi lưu vào kế hoạch.
          </p>
          <div class="feature-tags">
            <span>Hỏi đáp dinh dưỡng</span><span>Xem trước đề xuất</span>
          </div>
        </article>
        <article class="feature-card reveal">
          <span class="feature-icon" aria-hidden="true"
            ><svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M4 4v16h16M8 15l4-5 4 3 4-7" /></svg
          ></span>
          <h3>Nhìn lại thói quen của bạn</h3>
          <p>
            Xem biểu đồ theo ngày hoặc tháng, báo cáo tuần và các lưu ý từ dữ liệu đã ghi. Mở thông
            báo để hiểu nguyên nhân cảnh báo và theo dõi phản hồi.
          </p>
          <div class="feature-tags">
            <span>Biểu đồ và báo cáo</span><span>Cảnh báo có căn cứ</span>
          </div>
        </article>
      </div>
      <div class="features-note reveal">
        <span aria-hidden="true">✳</span>
        <p>
          Kế hoạch là điều bạn dự định ăn. Nhật ký là những gì bạn đã thực sự ăn. Hai phần được theo
          dõi riêng để bạn dễ đối chiếu và điều chỉnh.
        </p>
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

    <section class="landing-faq" id="cau-hoi-thuong-gap" aria-labelledby="faq-title">
      <div class="faq-intro">
        <span class="landing-kicker reveal">HIỂU THÊM TRƯỚC KHI BẮT ĐẦU</span>
        <h2 class="reveal" id="faq-title">Một vài điều bạn có thể muốn biết</h2>
        <p class="reveal">
          Chọn cách sử dụng phù hợp với mình. Bạn không cần làm tất cả ngay trong ngày đầu tiên.
        </p>
        <a routerLink="/register" class="story-link reveal">Bắt đầu với tài khoản của bạn</a>
      </div>
      <div class="faq-list">
        <details class="reveal">
          <summary>Có bắt buộc hoàn thành khảo sát không?</summary>
          <p>
            Bạn có thể bỏ qua khảo sát để tự lập kế hoạch, ghi nhật ký và đặt mục tiêu thủ công. Khi
            muốn dùng mục tiêu ước tính từ thông tin cá nhân, bạn có thể quay lại hoàn thiện hồ sơ.
          </p>
        </details>
        <details class="reveal">
          <summary>Ứng dụng theo dõi những chất dinh dưỡng nào?</summary>
          <p>
            Bạn có thể theo dõi calories, protein, carbohydrate, chất béo và các thông tin chất xơ,
            đường tổng, natri khi thực phẩm có dữ liệu. Chỉ số chưa có được ghi rõ là thiếu dữ liệu,
            thay vì tự coi bằng 0.
          </p>
        </details>
        <details class="reveal">
          <summary>Thực phẩm tự thêm có hiển thị cho mọi người không?</summary>
          <p>
            Thực phẩm bạn tự thêm chỉ xuất hiện trong tài khoản của bạn. Những thực phẩm do Admin bổ
            sung vào thư viện chung sẽ hiển thị cho tất cả người dùng.
          </p>
        </details>
        <details class="reveal">
          <summary>Cảnh báo dinh dưỡng có ý nghĩa gì?</summary>
          <p>
            Cảnh báo giúp bạn xem lại lượng đã ghi, mục tiêu và các ràng buộc đã khai báo. Mỗi cảnh
            báo có mức độ, dữ liệu làm căn cứ và trạng thái xử lý; đây là thông tin hỗ trợ theo dõi,
            không phải kết luận chẩn đoán bệnh.
          </p>
        </details>
      </div>
    </section>

    <section class="landing-final">
      <div class="final-glow"></div>
      <span class="landing-kicker reveal">BẮT ĐẦU TỪ HÔM NAY</span>
      <h2 class="reveal">Một phiên bản khỏe hơn<br />đang chờ bạn.</h2>
      <p class="reveal">
        Bắt đầu với một bữa ăn đã ghi hoặc kế hoạch cho ngày mai. Bạn có thể hoàn thiện hồ sơ và mục
        tiêu theo thời gian.
      </p>
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
