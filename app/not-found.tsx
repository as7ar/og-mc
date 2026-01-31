import GlitchText from "@/app/components/GlitchText";

export default function ErrorPage() {

    return (
        <div className={`error-page`}>
            <div className={`error-main`}>
                <GlitchText
                    speed={1}
                    enableShadows={true}
                    enableOnHover={false}
                >404</GlitchText>
                <p className="error-desc">
                    죄송합니다 해당 페이지를 찾을 수 없습니다.
                </p>
            </div>
        </div>
    )
}