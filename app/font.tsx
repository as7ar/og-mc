import localFont from "next/font/local";

export const pretendard = localFont({
    src: [
        {
            path: "./assets/fonts/mojangcraft.ttf",
            weight: "500",
            style: "normal",
        },
        {
            path: "./assets/fonts/Mojang-Regular.ttf",
            weight: "400",
            style: "normal",
        },
        {
            path: "./assets/fonts/Mojang-Bold.ttf",
            weight: "700",
            style: "normal"
        }
    ],
    variable: "--font-mojang",
    display: "swap",
})