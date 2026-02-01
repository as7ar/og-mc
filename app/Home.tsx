import styles from "@/app/assets/styles/home.module.css";
import Image from "next/image";
import logo from "./assets/images/og.png";

export default function Home() {
    return (
        <div className={styles.page}>
            <div className={styles.bg} />
            <div className={styles.overlay} />

            <main className={styles.main}>
                <div className={styles.hero}>
                    <span className={styles.heroBadge}>EST. 2026</span>
                    <div className={styles.imageWrap}>
                        <Image
                            src={logo}
                            alt="OG LOGO"
                            width={320} height={320}
                            className={styles.logo}
                        />
                        <div className={styles.glow}/>
                    </div>

                    <div className={styles.textBox}>
                        <h2 className={styles.title}>OG SERVER</h2>
                        <p className={styles.desc}>
                            보다 더 새롭고, 의미있는 경험을 위해
                        </p>
                    </div>
                </div>

                <div className={styles.heroActions}>
                    <a href="#about" className={`${styles.btn} ${styles.btnPrimary}`}>서버 소개 보기</a>
                    <a href="/contact" className={`${styles.btn} ${styles.btnSecondary}`}>CONTACT</a>
                </div>

                <section id={`about`} className={`${styles.section}`}>
                    <div className={styles.container}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>About Server</h2>
                            <p className={styles.sectionDesc}>우리가 지향하는 세 가지 핵심 가치입니다.</p>
                        </div>

                        <div className={styles.grid3}>
                            <div className={styles.card}>
                                <div className={`${styles.cardIcon} ${styles.iconStable}`}></div>
                                <h3 className={styles.cardTitle}>안정적인 운영</h3>
                                <p className={styles.cardText}>끊김 없는 환경과 최적화된 서버 코어로 쾌적한 플레이를 보장합니다.</p>
                            </div>

                            <div className={styles.card}>
                                <div className={`${styles.cardIcon} ${styles.iconStable}`}></div>
                                <h3 className={styles.cardTitle}>커뮤니티 중심</h3>
                                <p className={styles.cardText}>유저와 운영진이 수평적으로 소통하며 함께 문화를 만들어갑니다.</p>
                            </div>

                            <div className={styles.card}>
                                <div className={`${styles.cardIcon} ${styles.iconStable}`}></div>
                                <h3 className={styles.cardTitle}>공정한 규칙</h3>
                                <p className={styles.cardText}>예외 없는 규정 적용과 투명한 운영으로 신뢰를 최우선으로 합니다.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
