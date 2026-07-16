-- ================================================
-- PRODUCTOS DE PRUEBA - Joyeria AZ
-- Ejecutar en Supabase SQL Editor
-- ================================================

INSERT INTO products (nombre, precio, stock, descripcion, categoria, imagen, destacado, activo, "createdAt", "updatedAt") VALUES

-- ANILLOS
('Anillo Solitario Oro 18k con Esmeralda', 2850000, 5,
 'Anillo de oro 18k con esmeralda colombiana de Muzo de 1.2 quilates. Diseno solitario clasico, elaborado completamente a mano por maestros joyeros.',
 'Anillos', 'https://picsum.photos/seed/anillo-esmeralda/600/400', true, true, NOW(), NOW()),

('Alianza Matrimonial Oro 18k - Pareja', 1200000, 12,
 'Par de alianzas matrimoniales en oro 18k, acabado mate cepillado. Disponibles en tallas 8 al 22. Grabado personalizado incluido.',
 'Anillos', 'https://picsum.photos/seed/alianza-pareja/600/400', false, true, NOW(), NOW()),

-- COLLARES
('Collar Cadena Oro 18k con Colgante Esmeralda', 4200000, 3,
 'Collar de cadena de oro 18k de 45cm con colgante de esmeralda colombiana ovalada de 2.1 quilates. Cierre de seguridad tipo lobster.',
 'Collares', 'https://picsum.photos/seed/collar-esmeralda/600/400', true, true, NOW(), NOW()),

('Collar Plata 925 con Esmeralda', 890000, 7,
 'Collar de plata sterling 925 con esmeralda colombiana cabujon de 0.8 quilates. Cadena de eslabon saltador de 50cm con cierre tipo cangrejo.',
 'Collares', 'https://picsum.photos/seed/collar-plata/600/400', false, true, NOW(), NOW()),

-- ARETES
('Aretes Cascada Oro con Esmeraldas', 1950000, 8,
 'Aretes tipo cascada en oro 18k con tres esmeraldas colombianas en escalera. Caida de 3.5cm, cierre de tornillo.',
 'Aretes', 'https://picsum.photos/seed/aretes-cascada/600/400', false, true, NOW(), NOW()),

-- PULSERAS
('Pulsera Tennis Oro 18k con Esmeraldas', 6500000, 2,
 'Pulsera tennis en oro 18k con 28 esmeraldas colombianas calibradas, total 8.4 quilates. Cierre de seguridad con doble seguro.',
 'Pulseras', 'https://picsum.photos/seed/pulsera-tennis/600/400', true, true, NOW(), NOW()),

-- ESMERALDAS SUELTAS
('Esmeralda Suelta Muzo - Rectangular', 3800000, 4,
 'Esmeralda colombiana de la mina de Muzo, corte rectangular (emerald cut), 3.2 quilates. Color verde intenso, claridad excellent. Incluye certificado de origen.',
 'Esmeraldas', 'https://picsum.photos/seed/esmeralda-muzo/600/400', true, true, NOW(), NOW()),

('Esmeralda Suelta Chivor - Oval', 2400000, 6,
 'Esmeralda colombiana de la mina de Chivor, corte oval, 1.8 quilates. Tono verde azulado caracteristico de Chivor. Certificado de autenticidad incluido.',
 'Esmeraldas', 'https://picsum.photos/seed/esmeralda-chivor/600/400', false, true, NOW(), NOW()),

-- BROCHES
('Broche Flor de Oro con Esmeraldas', 1650000, 4,
 'Broche flor en oro 18k con 5 esmeraldas colombianas como petalos y un diamante central. Diametro de 3.2cm, cierre de gancho.',
 'Broches', 'https://picsum.photos/seed/broche-flor/600/400', false, true, NOW(), NOW()),

-- CONJUNTOS
('Conjunto Esmeralda: Aretes + Collar', 5800000, 2,
 'Set de joyeria en oro 18k con esmeraldas colombianas. Collar con esmeralda princess de 2.5ct y aretes a juego con esmeraldas de 0.8ct cada uno. Pieza unica.',
 'Conjuntos', 'https://picsum.photos/seed/conjunto-esmeralda/600/400', true, true, NOW(), NOW());
