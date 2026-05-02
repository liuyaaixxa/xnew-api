import { useEffect, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import { useNavigate } from 'react-router-dom';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

const FALLBACK_SLIDES = [
  {
    id: 0,
    name: '618新人注册活动',
    description: '限时福利，1000万Token赠送',
    color: '#0a0a0f',
    route_path: '/affiliate-618',
  },
  {
    id: 1,
    name: '推广联盟',
    description: '邀请好友使用AI，终身赚取30%佣金',
    color: '#1a1a2e',
    route_path: '/affiliate',
  },
];

export default function StoreCarousel() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [defaultAff, setDefaultAff] = useState('');
  const navigate = useNavigate();
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch('/api/affiliate/public-promotions')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          if (data.data.default_aff_code) {
            setDefaultAff(data.data.default_aff_code);
          }
          const list = data.data.promotions || data.data;
          if (Array.isArray(list) && list.length > 0) {
            const active = list.filter((p) => p.enabled);
            if (active.length > 0) setSlides(active);
          }
        }
      })
      .catch(() => {
        // keep fallback slides
      });
  }, []);

  const handleSlideClick = (path) => {
    if (!path) return;
    let url = path;
    if (defaultAff && !url.includes('?aff=')) {
      url += (url.includes('?') ? '&' : '?') + 'aff=' + defaultAff;
    }
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      navigate(url);
    }
  };

  return (
    <div className="store-carousel-wrapper">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        autoplay={{ delay: 3500, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop={slides.length > 1}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={600}
        className="store-carousel"
      >
        {slides.map((slide, idx) => (
          <SwiperSlide key={slide.id || idx}>
            <div
              className="store-carousel-slide"
              style={{ '--slide-color': slide.color }}
              onClick={() => handleSlideClick(slide.route_path)}
            >
              <div className="store-carousel-badge">
                {slide.route_path?.includes('618') ? '限时活动' : '推广活动'}
              </div>
              <h2 className="store-carousel-title">{slide.name}</h2>
              <p className="store-carousel-desc">{slide.description}</p>
              <button className="store-carousel-cta">
                {slide.route_path?.includes('618') ? '立即领取 →' : '了解更多 →'}
              </button>
              <div className="store-carousel-shape s1" />
              <div className="store-carousel-shape s2" />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
