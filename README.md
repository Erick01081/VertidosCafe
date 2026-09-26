# Cafetal — diario de café filtrado

Aplicación web en español para guardar cafés, leer empaques con OCR local, calcular recetas de vertido y registrar preparaciones. Está configurada como un espacio personal sin cuentas ni contraseña.

## Requisitos

- Node.js 20 o superior.
- Un proyecto Supabase (el plan gratuito sirve para comenzar).

## Configuración de Supabase

1. En el dashboard de Supabase, abre **SQL Editor**, pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql). Crea las tablas `coffees`, `brews`, el bucket `coffee-photos` y políticas RLS de acceso anónimo.
2. En **Project Settings → API**, copia la Project URL y la clave pública `anon`/publishable. Nunca pongas una `service_role` en variables `NEXT_PUBLIC_*`.
3. Copia `.env.example` a `.env.local` y rellena:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica
   ```

No hace falta configurar Authentication ni crear una cuenta.

Las fotos se convierten a JPEG, se reducen a un máximo de 1600 px y se comprimen antes de subirlas. Quedan en el bucket público `coffee-photos`. Cada archivo tiene límite de 5 MB.

**Importante:** el acceso anónimo permite a cualquiera que encuentre el dominio de la app o la URL pública de Supabase leer, crear, editar y borrar los cafés, las preparaciones y las fotos. La clave `publishable` es pública y no protege por sí sola la base de datos. Este modo es cómodo para una app de uso personal/local, pero no mantiene privados los datos al publicarla en Vercel. No guardes información sensible.

## Instalar y ejecutar

```bash
npm install
cp .env.example .env.local
# completa las dos variables de Supabase
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Para compilar: `npm run build`; para servir la compilación: `npm start`.

## Vercel

Importa este repositorio en Vercel y configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No requiere servidor OCR, API de pago ni clave secreta. La app y los registros quedarán abiertos como se explica arriba.

El diseño evita servicios OCR de pago y puede empezar en planes gratuitos: Supabase Free incluye cuotas limitadas (entre ellas 500 MB de base de datos, 1 GB de archivos y 50.000 usuarios activos mensuales) y puede pausar proyectos inactivos durante una semana. Vercel Hobby es gratis para uso personal/no comercial y limita el uso mensual. Consulta [cuotas actuales de Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase) y [condiciones actuales de Vercel Hobby](https://vercel.com/docs/plans/hobby): los planes y topes pueden cambiar. Fotos grandes o muchos usuarios pueden superar los topes; limita las imágenes al formato JPEG optimizado que usa la app y vigila el uso en ambos paneles.

## Reconocimiento de etiquetas

Tesseract.js ejecuta OCR en el navegador con modelos español e inglés. El primer uso descarga los modelos; esto puede tardar y depende de la conexión y del dispositivo. La app no envía la imagen a un proveedor OCR. La rotación y el recorte ayudan con etiquetas inclinadas, pero el motor puede fallar con reflejos, desenfoque, tipografías decorativas, poco contraste o texto pequeño. La detección de campos es una propuesta heurística y no comprende perfectamente diseños desconocidos: inspecciona cada campo, corrígelo y guarda solo cuando estés conforme. Los campos no reconocidos quedan vacíos; el OCR no usa una lista de tus cafés de ejemplo para inventar resultados.

## Datos y privacidad

Los registros viven en PostgreSQL de tu proyecto Supabase y las imágenes en el bucket público. El archivo de exportación JSON contiene cafés y preparaciones, pero no incluye las fotos; vuelve a cargarlas si las necesitas tras importar. La importación crea copias nuevas. Configura políticas de respaldo en tu proyecto si necesitas recuperación adicional. Los datos de ejemplo no se cargan automáticamente.

## Funciones

- Acceso directo sin registro ni inicio de sesión.
- Catálogo con búsqueda y fichas individuales.
- Añadir, editar y borrar cafés y preparaciones (con confirmación al borrar).
- OCR local en español/inglés, propuestas de campos editables, recorte, zoom, giro de 90° y giro fino.
- Calculadora con gramos, ratio, bloom 1:2/1:3/1:4, 1–12 vertidos después del bloom y peso acumulado.
- Receta copiada en cada preparación para que los cambios posteriores no alteren el historial.
- Repetir una preparación como base, editar resultados y registrar dripper, molienda, temperatura, tiempo y notas.
- Importación/exportación JSON.
