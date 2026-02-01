import '../assets/styles/contact.css'

const contactMeta= [
    {
        ariaLabel: "Join Discord",
        contactLabel: "Community",
        contactValue: "Official Discord",
        href: "#"
    },
    {
        ariaLabel: "Support Mail",
        contactLabel: "Support",
        contactValue: "support@ogserver.kr",
        href: "mailto:support@ogserver.kr"
    }
]

export default function ContactPage() {
    return (
        <div className="contact-page">
            <div className="contact-bg" />
            <div className="contact-overlay" />

            <main className="contact-main">
                <section className="contact-hero">
                    <h1 className="contact-title">CONTACT</h1>
                    <h3 className="contact-subtitle">Get in Touch</h3>
                    <p className="contact-desc">
                        서버 접속 문의 및 건의사항
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
                                    <span className="link-arrow">↗</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
