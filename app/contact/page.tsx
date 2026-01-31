import '../assets/styles/contact.css'

export default function ContactPage() {
    return (
        <div className="contact-page">
            <div className="contact-bg" />
            <div className="contact-overlay" />

            <main className="contact-main">
                <section className="contact-hero">
                    <h1 className="contact-title">CONTACT</h1>
                    <p className="contact-desc">
                        Contact-description
                    </p>

                    <div className="contact-info">
                        <p>Discord: discord id</p>
                        <p>Email: email?</p>
                    </div>
                </section>
            </main>
        </div>
    );
}
