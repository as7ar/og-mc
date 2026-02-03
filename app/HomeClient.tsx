"use client";

import styles from "@/app/assets/styles/home.module.css";
import Image from "next/image";
import logo from "./assets/images/og.png";
import { useEffect, useRef, useState } from "react";

export default function HomeClient() {
  const [pageLoaded, setPageLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setPageLoaded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const elements = Array.from(root.querySelectorAll("[data-reveal]"));
    if (elements.length === 0) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      elements.forEach((el) => el.classList.add(styles.revealVisible));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.page} data-loaded={pageLoaded} ref={rootRef}>
      <div className={styles.bg} />
      <div className={styles.overlay} />

      <main className={styles.main}>
        <div className={`${styles.hero} ${styles.reveal}`} data-reveal>
          <span className={styles.heroBadge}>EST. 2025</span>
          <div className={`${styles.imageWrap} ${styles.reveal}`} data-reveal>
            <Image
              src={logo}
              alt="OG LOGO"
              width={320}
              height={320}
              className={styles.logo}
            />
            <div className={styles.glow} />
          </div>

          <div className={`${styles.textBox} ${styles.reveal}`} data-reveal>
            <h2 className={styles.title}>OG SERVER</h2>
            <p className={styles.desc}>
              더 나은 경험과 함께하는 커뮤니티
            </p>
          </div>
        </div>

        <div className={`${styles.heroActions} ${styles.reveal}`} data-reveal>
          <a href="#about" className={`${styles.btn} ${styles.btnPrimary}`}>서버 소개 보기</a>
          <a href="/contact" className={`${styles.btn} ${styles.btnSecondary}`}>CONTACT</a>
        </div>

        <section id="about" className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>About Server</h2>
              <p className={styles.sectionDesc}>안정적인 운영과 공정한 규칙을 최우선으로 합니다.</p>
            </div>

            <div className={styles.grid3}>
              <div className={`${styles.card} ${styles.reveal}`} data-reveal>
                <div className={`${styles.cardIcon} ${styles.iconStable}`}></div>
                <h3 className={styles.cardTitle}>안정적인 운영</h3>
                <p className={styles.cardText}>최적화된 인프라와 체계적인 업데이트로 안정성을 지킵니다.</p>
              </div>

              <div className={`${styles.card} ${styles.reveal}`} data-reveal>
                <div className={`${styles.cardIcon} ${styles.iconStable}`}></div>
                <h3 className={styles.cardTitle}>커뮤니티 중심</h3>
                <p className={styles.cardText}>서로 존중하는 문화를 만들고 활발한 소통을 지원합니다.</p>
              </div>

              <div className={`${styles.card} ${styles.reveal}`} data-reveal>
                <div className={`${styles.cardIcon} ${styles.iconStable}`}></div>
                <h3 className={styles.cardTitle}>공정한 규칙</h3>
                <p className={styles.cardText}>투명한 정책과 일관된 운영으로 균형을 유지합니다.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
