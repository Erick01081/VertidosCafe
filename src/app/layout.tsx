import './globals.css';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'Cafetal — tu diario de café',description:'Guarda cafés, prepara recetas y aprende taza a taza.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
