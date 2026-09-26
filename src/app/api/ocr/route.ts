import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Falta configurar OCR_SPACE_API_KEY en el servidor.' }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const image = form.get('file');
    if (!(image instanceof File) || !image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Adjunta una imagen válida de la etiqueta.' }, { status: 400 });
    }
    // OCR.space Free accepts images up to 1 MB. Leave room for multipart overhead.
    if (image.size > 900 * 1024) {
      return NextResponse.json({ error: 'La imagen supera el límite de 900 KB. Recorta más cerca de la etiqueta e inténtalo de nuevo.' }, { status: 413 });
    }

    const payload = new FormData();
    payload.append('file', image, 'etiqueta.jpg');
    payload.append('language', 'spa');
    payload.append('isOverlayRequired', 'false');
    payload.append('OCREngine', '3');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: apiKey },
      body: payload,
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: `El servicio OCR respondió con error (${response.status}). Inténtalo de nuevo.` }, { status: 502 });
    }
    const result = await response.json();
    if (result.IsErroredOnProcessing || result.OCRExitCode !== 1) {
      const detail = Array.isArray(result.ErrorMessage) ? result.ErrorMessage.join(' ') : result.ErrorMessage;
      return NextResponse.json({ error: detail || 'OCR.space no pudo leer esta imagen. Prueba con más luz o recorta la etiqueta.' }, { status: 422 });
    }
    const text = (result.ParsedResults || []).map((item: { ParsedText?: string }) => item.ParsedText || '').join('\n').trim();
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'El reconocimiento tardó demasiado. Inténtalo de nuevo.'
      : 'No se pudo procesar la imagen. Revisa la conexión e inténtalo de nuevo.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
