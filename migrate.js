const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.qgsigjyjqxcaliqkptlk:128763248Dagb@aws-1-us-west-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

function slugify(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

(async () => {
  try {
    await client.connect();

    const add = {
      slug: 'TEXT',
      descripcion_corta: 'TEXT',
      descripcion_completa: 'TEXT',
      materiales: 'TEXT',
      tipo_piedra: 'TEXT',
      color: 'TEXT',
      peso: 'TEXT',
      medidas: 'TEXT',
      estado: "TEXT DEFAULT 'disponible'",
      imagenes: "JSONB DEFAULT '[]'::jsonb",
      imagen_compartir: 'TEXT',
      meta_title: 'TEXT',
      meta_descripcion: 'TEXT'
    };

    for (const [col, type] of Object.entries(add)) {
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log('column ok:', col);
    }

    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON products(slug)');
    console.log('unique index ok: products_slug_key');

    const { rows } = await client.query("SELECT id, nombre, slug FROM products ORDER BY id");
    const usados = new Map();
    let updated = 0;

    for (const p of rows) {
      if (p.slug && p.slug.trim()) { usados.set(p.slug, p.id); continue; }
      let base = slugify(p.nombre) || `producto-${p.id}`;
      if (!base) base = `producto-${p.id}`;
      let slug = base;
      let n = 2;
      while (usados.has(slug)) { slug = `${base}-${n++}`; }
      usados.set(slug, p.id);
      await client.query('UPDATE products SET slug=$1 WHERE id=$2', [slug, p.id]);
      updated++;
      console.log(`slug ok: id=${p.id} -> ${slug}`);
    }

    console.log(`\nMigración completada. Slugs generados: ${updated}. Total productos: ${rows.length}`);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();