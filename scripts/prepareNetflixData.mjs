/**
 *
 * secrea archivos derivados separados.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const meses = {
  january: 1, february: 2, march: 3, april: 4,
  may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
};

const texto = (valor) => String(valor ?? '').trim();

// El CSV separa las etiquetas múltiples mediante comas.
// Set elimina repeticiones DENTRO de un mismo título, sin cambiar la etiqueta.
function etiquetas(valor) {
  return [...new Set(texto(valor).split(',').map((v) => v.trim()).filter(Boolean))];
}

function fechaISO(valor) {
  const cadena = texto(valor);
  if (!cadena) return null;
  const m = /^([a-z]+)\s+(\d{1,2}),\s*(\d{4})$/i.exec(cadena);
  if (!m) return null;
  const mes = meses[m[1].toLowerCase()];
  const dia = Number(m[2]);
  const anio = Number(m[3]);
  if (!mes) return null;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
    return null;
  }
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function cuantil(ordenados, fraccion) {
  if (!ordenados.length) return null;
  const indice = (ordenados.length - 1) * fraccion;
  const inferior = Math.floor(indice);
  const superior = Math.ceil(indice);
  return ordenados[inferior] + (ordenados[superior] - ordenados[inferior]) * (indice - inferior);
}

export function prepararRegistros(filas) {
  const ids = new Set();
  const incidencias = {
    idsVacios: [], idsDuplicados: [], titulosVacios: [],
    fechasInvalidas: [], aniosInvalidos: [], duracionesInvalidas: [],
    duracionesRecuperadas: [], etiquetasRepetidas: [],
  };

  const registros = filas.map((fila, indice) => {
    const id = texto(fila.show_id);
    const titulo = texto(fila.title);
    const tipo = texto(fila.type);
    if (!id) incidencias.idsVacios.push(indice + 2);
    else if (ids.has(id)) incidencias.idsDuplicados.push(id);
    ids.add(id);
    if (!titulo) incidencias.titulosVacios.push(id || `fila ${indice + 2}`);

    const directores = etiquetas(fila.director);
    const paises = etiquetas(fila.country);
    const generos = etiquetas(fila.listed_in);
    const reparto = etiquetas(fila.cast);
    for (const [columna, lista] of [
      ['director', directores], ['country', paises],
      ['listed_in', generos], ['cast', reparto],
    ]) {
      const antes = texto(fila[columna]).split(',').map((s) => s.trim()).filter(Boolean);
      if (antes.length > lista.length) incidencias.etiquetasRepetidas.push({ id, columna });
    }

    const fechaOriginal = texto(fila.date_added);
    const fecha = fechaISO(fechaOriginal);
    if (fechaOriginal && !fecha) incidencias.fechasInvalidas.push(id);

    const anioOriginal = texto(fila.release_year);
    const anio = /^\d{4}$/.test(anioOriginal) ? Number(anioOriginal) : null;
    if (anio === null) incidencias.aniosInvalidos.push(id);

    let clasificacion = texto(fila.rating) || null;
    let duracion = texto(fila.duration) || null;
    // Anomalía confirmada: en tres películas el valor "NN min" aparece en rating.
    if (!duracion && tipo === 'Movie' && /^\d+\s*min$/i.test(clasificacion || '')) {
      duracion = clasificacion;
      clasificacion = null; // No conocemos su clasificación real: NO se inventa.
      incidencias.duracionesRecuperadas.push(id);
    }

    const match = /^(\d+)\s*(min|Seasons?)$/i.exec(duracion || '');
    const cantidad = match ? Number(match[1]) : null;
    const unidad = match ? (match[2].toLowerCase() === 'min' ? 'min' : 'season') : null;
    const valida = cantidad !== null && cantidad > 0 &&
      ((tipo === 'Movie' && unidad === 'min') || (tipo === 'TV Show' && unidad === 'season'));
    if (!valida) incidencias.duracionesInvalidas.push(id);

    return {
      show_id: id,
      type: tipo,
      title: titulo,
      directors: directores,
      cast: reparto,
      countries: paises,
      date_added: fecha,
      year_added: fecha ? Number(fecha.slice(0, 4)) : null,
      release_year: anio,
      rating: clasificacion,
      duration: valida ? duracion : null,
      duration_value: valida ? cantidad : null,
      duration_unit: valida ? unidad : null,
      genres: generos,
      description: texto(fila.description),
      is_duration_outlier: false,
    };
  });

  // Los atípicos se MARCAN, nunca se eliminan automáticamente.
  const limitesAtipicos = {};
  for (const [tipo, etiqueta] of [['Movie', 'peliculas'], ['TV Show', 'series']]) {
    const valores = registros
      .filter((r) => r.type === tipo && r.duration_value !== null)
      .map((r) => r.duration_value).sort((a, b) => a - b);
    const q1 = cuantil(valores, 0.25);
    const q3 = cuantil(valores, 0.75);
    const inferior = q1 === null ? null : q1 - 1.5 * (q3 - q1);
    const superior = q3 === null ? null : q3 + 1.5 * (q3 - q1);
    for (const registro of registros) {
      if (registro.type === tipo && registro.duration_value !== null &&
          (registro.duration_value < inferior || registro.duration_value > superior)) {
        registro.is_duration_outlier = true;
      }
    }
    limitesAtipicos[etiqueta] = {
      q1, q3, limite_inferior: inferior, limite_superior: superior,
      registros_marcados: registros.filter((r) => r.type === tipo && r.is_duration_outlier).length,
    };
  }

  const reporte = {
    fuente: 'netflix_titles.csv (sin modificar)',
    registros_originales: filas.length,
    registros_procesados: registros.length,
    titulos_unicos: ids.size,
    peliculas: registros.filter((r) => r.type === 'Movie').length,
    series: registros.filter((r) => r.type === 'TV Show').length,
    datos_faltantes_sin_inventar: {
      pais: registros.filter((r) => r.countries.length === 0).length,
      director: registros.filter((r) => r.directors.length === 0).length,
      fecha_incorporacion: registros.filter((r) => r.date_added === null).length,
      clasificacion: registros.filter((r) => r.rating === null).length,
      duracion: registros.filter((r) => r.duration_value === null).length,
    },
    incidencias,
    limites_atipicos_por_formato: limitesAtipicos,
  };
  return { registros, reporte };
}

async function main() {
  const Papa = (await import('papaparse')).default;
  const rutaBase = path.resolve('public', 'data');
  const csvOriginal = path.join(rutaBase, 'netflix_titles.csv');
  const contenido = await fs.readFile(csvOriginal, 'utf8');
  const analisis = Papa.parse(contenido, { header: true, skipEmptyLines: 'greedy' });
  if (analisis.errors.length) {
    throw new Error(`El CSV contiene errores de lectura: ${JSON.stringify(analisis.errors.slice(0, 3))}`);
  }
  const columnasNecesarias = ['show_id', 'type', 'title', 'director', 'cast', 'country',
    'date_added', 'release_year', 'rating', 'duration', 'listed_in', 'description'];
  const cabeceras = Object.keys(analisis.data[0] || {});
  if (!columnasNecesarias.every((c) => cabeceras.includes(c))) {
    throw new Error('El CSV no contiene las 12 columnas esperadas. Comprueba el archivo original.');
  }

  const { registros, reporte } = prepararRegistros(analisis.data);
  if (reporte.incidencias.idsVacios.length || reporte.incidencias.idsDuplicados.length) {
    throw new Error('Hay IDs vacíos o duplicados. Revisar reporte antes de usar los datos.');
  }

  const csvLimpio = registros.map((r) => ({
    show_id: r.show_id, type: r.type, title: r.title,
    director: r.directors.join(' | '), cast: r.cast.join(' | '),
    country: r.countries.join(' | '), date_added: r.date_added ?? '',
    year_added: r.year_added ?? '', release_year: r.release_year ?? '',
    rating: r.rating ?? '', duration: r.duration ?? '',
    duration_value: r.duration_value ?? '', duration_unit: r.duration_unit ?? '',
    listed_in: r.genres.join(' | '), description: r.description,
    is_duration_outlier: r.is_duration_outlier,
  }));

  await Promise.all([
    fs.writeFile(path.join(rutaBase, 'netflix_clean.json'), JSON.stringify(registros), 'utf8'),
    fs.writeFile(path.join(rutaBase, 'netflix_clean.csv'), '\uFEFF' + Papa.unparse(csvLimpio), 'utf8'),
    fs.writeFile(path.join(rutaBase, 'reporte_limpieza.json'), JSON.stringify(reporte, null, 2), 'utf8'),
  ]);
  console.log('Procesamiento terminado:', {
    titulos: reporte.registros_procesados,
    peliculas: reporte.peliculas,
    series: reporte.series,
    duraciones_recuperadas: reporte.incidencias.duracionesRecuperadas,
    faltan_fechas: reporte.datos_faltantes_sin_inventar.fecha_incorporacion,
    atipicos: reporte.limites_atipicos_por_formato,
  });
  console.log('Se crearon netflix_clean.json, netflix_clean.csv y reporte_limpieza.json');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error('Error durante la preparación:', error.message);
    process.exitCode = 1;
  });
}
