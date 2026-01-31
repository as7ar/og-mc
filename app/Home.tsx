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
                    <div className={styles.imageWrap}>
                        <Image
                            src={logo}
                            alt="OG LOGO"
                            width={320} height={320}
                            className={styles.logo}
                        />
                        <div className={styles.glow} />
                    </div>

                    <div className={styles.textBox}>
                        <h2 className={styles.title}>OG SERVER</h2>
                        <p className={styles.desc}>
                            Shorts Server Description
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
