// gemini-provider.js — Proveedor concreto de IA: Google Gemini API (REST).
// Interfaz: { analizarProducto({ imagenBase64, mimeType, pista, categorias, model }) -> objeto JSON }
// La API key vive SOLO en variables de entorno del backend.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.7-flash'];

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

async function llamarGeminiConModelo(prompt, mime, base64, model) {
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
      temperature: 0.4,
      maxOutputTokens: 4096
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
    throw new Error(`Error de Gemini (${model} HTTP ${resp.status}): ${detalle.slice(0, 200)}`);
  }

  const data = await resp.json();
  if (data?.error) throw new Error(data.error.message || 'Error de Gemini');
  return extraerJson(extraerTexto(data));
}

// Llama a Gemini con reintentos y fallback a modelos alternativos ante 503 u otros fallos
async function llamarGemini(prompt, mime, base64, modelInicial) {
  const modelosAProbar = [modelInicial || DEFAULT_MODEL, ...FALLBACK_MODELS.filter(m => m !== (modelInicial || DEFAULT_MODEL))];
  let ultimoError = null;

  for (const modelo of modelosAProbar) {
    try {
      return await llamarGeminiConModelo(prompt, mime, base64, modelo);
    } catch (err) {
      ultimoError = err;
      console.warn(`[AI WARN] Falló modelo ${modelo}: ${err.message}. Probando siguiente modelo si está disponible...`);
      // Si fue rate limit o error temporal, esperar 500ms antes de reintentar
      await new Promise(r => setTimeout(r, 500));
    }
  }

  throw ultimoError || new Error('No se pudo procesar la imagen con los modelos de IA disponibles');
}

// Interfaz pública concreta del proveedor.
async function analizarProducto({ imagenBase64, mimeType, pista, categorias, model }) {
  const { construirPrompt } = require('./prompt');
  const prompt = construirPrompt({ pista, categorias });
  return llamarGemini(prompt, mimeType, imagenBase64, model || DEFAULT_MODEL);
}

module.exports = { analizarProducto, obtenerApiKey, GEMINI_BASE, DEFAULT_MODEL, FALLBACK_MODELS };