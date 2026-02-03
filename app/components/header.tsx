"use client"

import StaggeredMenu from "@/app/components/StaggeredMenu";

export default function Header() {
    const menuItems = [
        { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
        { label: 'Contact', ariaLabel: 'Get in touch', link: '/contact' }
    ];
    return (
        <>
            <div style={{ height: '0vh', background: '#1a1a1a' }}>
                <StaggeredMenu
                    position="left"
                    items={menuItems}
                    displaySocials
                    displayItemNumbering={true}
                    menuButtonColor="#cbd5e1"
                    openMenuButtonColor="#f4d7b0"
                    changeMenuColorOnOpen={true}
                    colors={['#a2ef9e', '#7f522a']}
                    accentColor="#7f522a"
                    onMenuOpen={() => console.log('Menu opened')}
                    onMenuClose={() => console.log('Menu closed')}
                />
            </div>

        </>
    );
}
