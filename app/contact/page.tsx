import "../assets/styles/contact.css";

const contactMeta = [
  {
    ariaLabel: "Join Discord",
    contactLabel: "커뮤니티",
    contactValue: "공식 디스코드",
    href: "#",
  },
  {
    ariaLabel: "Support Mail",
    contactLabel: "지원",
    contactValue: "support@og.sudis.kr",
    href: "mailto:support@og.sudis.kr",
  },
];

export default function ContactPage() {
  return (
    <div className="contact-page">
      <div className="contact-bg" />
      <div className="contact-overlay" />

      <main className="contact-main">
        <section className="contact-hero">
          <h1 className="contact-title">CONTACT</h1>
          <h3 className="contact-subtitle">문의하기</h3>
          <p className="contact-desc">
            서버 이용 및 제휴 문의는 아래 채널을 통해 연락해주세요.
          </p>

          <div className="grid-2">
            {contactMeta.map((item, i) => (
              <a
                key={i}
                href={item.href}
                className="contact-card"
                aria-label={item.ariaLabel}
              >
                <div className="contact-content">
                  <span className="contact-label">{item.contactLabel}</span>
                  <h3 className="contact-value">{item.contactValue}</h3>
                  <span className="link-arrow">→</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
