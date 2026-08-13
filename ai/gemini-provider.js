// gemini-provider.js — Proveedor concreto de IA: Google Gemini API (REST).
// Interfaz: { analizarProducto({ imagenBase64, mimeType, pista, categorias, model }) -> objeto JSON }
// La API key vive SOLO en variables de entorno del backend.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

function obtenerApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY no configurada en el servidor');
  return key;
}

function extraerTexto(respuestaJson) {
  const candidato = respuestaJson?.candidates?.[0];
  if (!candidato) throw new Error('Gemini no devolvió contenido');
  const parte = candidato.content?.parts?.find?.((p) => p && typeof p.text === 'string');
  if (parte) return parte.text.trim();
  throw new Error('Gemini no devolvió texto (finishReason: ' + (candidato.finishReason || '?') + ')');
}

function extraerJson(texto) {
  // Acepta JSON puro o envuelto en bloques ```json ... ```
  let t = String(texto || '').trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fence) t = fence[1].trim();

  const inicio = t.indexOf('{');
  const fin = t.lastIndexOf('}');
  if (inicio !== -1 && fin > inicio) t = t.slice(inicio, fin + 1);

  return JSON.parse(t);
}

async function llamarGemini(prompt, mime, base64, model) {
  const apiKey = obtenerApiKey();
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mime, data: base64 } }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.6,
      maxOutputTokens: 1600
    }
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (resp.status === 429) {
    throw new Error('RATE_LIMIT: Cuota de Gemini agotada. Intenta en unos minutos.');
  }
  if (!resp.ok) {
    const detalle = await resp.text().catch(() => '');
    throw new Error('Error de Gemini (HTTP ' + resp.status + '): ' + detalle.slice(0, 200));
  }

  const data = await resp.json();
  if (data?.error) throw new Error(data.error.message || 'Error de Gemini');
  return extraerJson(extraerTexto(data));
}

// Interfaz pública concreta del proveedor.
async function analizarProducto({ imagenBase64, mimeType, pista, categorias, model }) {
  const { construirPrompt } = require('./prompt');
  const prompt = construirPrompt({ pista, categorias });
  return llamarGemini(prompt, mimeType, imagenBase64, model || DEFAULT_MODEL);
}

module.exports = { analizarProducto, obtenerApiKey, GEMINI_BASE, DEFAULT_MODEL };