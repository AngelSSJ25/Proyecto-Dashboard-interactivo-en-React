import { useMemo } from "react";
import "./GlobalFilters.css";

const FORMATO = new Intl.NumberFormat("es-MX");

export default function GlobalFilters({ titulos, filtros, onChange, onReset, resultados }) {
  // Las opciones se construyen con el dataset completo, no con el subconjunto filtrado.
  // Así las opciones no desaparecen al seleccionar otra categoría.
  const { paises, generos, anios } = useMemo(() => {
    const paisesSet = new Set();
    const generosSet = new Set();
    const aniosSet = new Set();

    for (const titulo of titulos) {
      (titulo.countries ?? []).forEach((pais) => paisesSet.add(pais));
      (titulo.genres ?? []).forEach((genero) => generosSet.add(genero));
      const anio = titulo[filtros.campoAnio];
      if (Number.isInteger(anio)) aniosSet.add(anio);
    }

    const ordenar = (a, b) => a.localeCompare(b, "es", { sensitivity: "base" });
    return {
      paises: [...paisesSet].sort(ordenar),
      generos: [...generosSet].sort(ordenar),
      anios: [...aniosSet].sort((a, b) => a - b),
    };
  }, [titulos, filtros.campoAnio]);

  const filtrosActivos = [
    filtros.pais,
    filtros.genero,
    filtros.tipo,
    filtros.desde,
    filtros.hasta,
  ].filter((v) => v !== "").length;

  const actualizar = (clave, valor) => onChange((prev) => ({ ...prev, [clave]: valor }));

  return (
    <section className="filtros-panel" aria-label="Filtros globales del catálogo">
      <div className="filtros-cabecera">
        <div>
          <h2>Explorar el catálogo</h2>
          <p>Los filtros actualizan los indicadores, las gráficas y el mapa.</p>
        </div>
        <button className="filtros-limpiar" type="button" onClick={onReset} disabled={filtrosActivos === 0 && filtros.campoAnio === "release_year"}>
          Limpiar filtros
        </button>
      </div>
      <div className="filtros-controles">
        <label className="filtros-campo">
          <span>País de producción</span>
          <select value={filtros.pais} onChange={(e) => actualizar("pais", e.target.value)}>
            <option value="">Todos los países</option>
            {paises.map((pais) => <option value={pais} key={pais}>{pais}</option>)}
          </select>
        </label>
        <label className="filtros-campo">
          <span>Género</span>
          <select value={filtros.genero} onChange={(e) => actualizar("genero", e.target.value)}>
            <option value="">Todos los géneros</option>
            {generos.map((genero) => <option value={genero} key={genero}>{genero}</option>)}
          </select>
        </label>
        <label className="filtros-campo">
          <span>Formato</span>
          <select value={filtros.tipo} onChange={(e) => actualizar("tipo", e.target.value)}>
            <option value="">Películas y series</option>
            <option value="Movie">Películas</option>
            <option value="TV Show">Series</option>
          </select>
        </label>
        <label className="filtros-campo">
          <span>Periodo por</span>
          <select value={filtros.campoAnio} onChange={(e) => onChange((prev) => ({ ...prev, campoAnio: e.target.value, desde: "", hasta: "" }))}>
            <option value="release_year">Año de estreno</option>
            <option value="year_added">Año de incorporación</option>
          </select>
        </label>
        <label className="filtros-campo">
          <span>Desde</span>
          <select value={filtros.desde} onChange={(e) => actualizar("desde", e.target.value)}>
            <option value="">Cualquier año</option>
            {anios.map((anio) => <option key={anio} value={String(anio)}>{anio}</option>)}
          </select>
        </label>
        <label className="filtros-campo">
          <span>Hasta</span>
          <select value={filtros.hasta} onChange={(e) => actualizar("hasta", e.target.value)}>
            <option value="">Cualquier año</option>
            {anios.map((anio) => <option key={anio} value={String(anio)}>{anio}</option>)}
          </select>
        </label>
      </div>
      <p className="filtros-resumen" aria-live="polite">
        Mostrando <strong>{FORMATO.format(resultados)}</strong> de {FORMATO.format(titulos.length)} títulos
        {filtrosActivos > 0 ? ` · ${filtrosActivos} filtro(s) aplicado(s)` : " · Sin filtros aplicados"}.
      </p>
      {(filtros.desde && filtros.hasta && Number(filtros.desde) > Number(filtros.hasta)) && (
        <p className="filtros-aviso" role="alert">El año inicial es posterior al año final. Ajusta el rango.</p>
      )}
      {filtros.campoAnio === "year_added" && (filtros.desde || filtros.hasta) && (
        <p className="filtros-aclaracion">Los títulos sin fecha de incorporación quedan fuera cuando filtras por ese periodo.</p>
      )}
    </section>
  );
}
