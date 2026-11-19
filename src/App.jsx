import { useEffect, useMemo, useState } from "react";
import GlobalFilters from "./components/GlobalFilters";
import CountryMap from "./components/CountryMap";
import NetflixCharts from "./components/NetflixCharts";
import TitleTable from "./components/TitleTable";

const FILTROS_INICIALES = {
  pais: "",
  genero: "",
  tipo: "",
  campoAnio: "release_year",
  desde: "",
  hasta: "",
};

const FORMATO = new Intl.NumberFormat("es-MX");

function App() {
  const [titulos, setTitulos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState({ ...FILTROS_INICIALES });

  useEffect(() => {
    const controlador = new AbortController();
    async function cargarDatos() {
      try {
        const respuesta = await fetch("/data/netflix_clean.json", {
          signal: controlador.signal,
        });
        if (!respuesta.ok) throw new Error("No se pudo cargar el dataset procesado");
        const datos = await respuesta.json();
        if (!Array.isArray(datos)) throw new Error("El JSON no contiene una lista de títulos");
        setTitulos(datos);
        setError("");
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }
    cargarDatos();
    return () => controlador.abort();
  }, []);

  // Todos los indicadores utilizan exactamente el mismo subconjunto de títulos.
  // Un título se cuenta una sola vez, aunque esté asociado con varios países/géneros.
  const titulosFiltrados = useMemo(() => {
    return titulos.filter((titulo) => {
      if (filtros.pais && !(titulo.countries ?? []).includes(filtros.pais)) return false;
      if (filtros.genero && !(titulo.genres ?? []).includes(filtros.genero)) return false;
      if (filtros.tipo && titulo.type !== filtros.tipo) return false;
      const anio = titulo[filtros.campoAnio];
      if (filtros.desde && (!Number.isInteger(anio) || anio < Number(filtros.desde))) return false;
      if (filtros.hasta && (!Number.isInteger(anio) || anio > Number(filtros.hasta))) return false;
      return true;
    });
  }, [titulos, filtros]);

  const total = titulosFiltrados.length;
  const peliculas = titulosFiltrados.filter((t) => t.type === "Movie").length;
  const series = titulosFiltrados.filter((t) => t.type === "TV Show").length;
  const porcentaje = total ? ((peliculas / total) * 100).toFixed(1) : "0.0";

  // El mapa puede establecer el filtro por país; hacer clic otra vez lo desactiva.
  function seleccionarPais(pais) {
    setFiltros((prev) => ({ ...prev, pais: prev.pais === pais ? "" : (pais ?? "") }));
  }

  // Fuerza a Leaflet a volver a crear las capas GeoJSON cuando cambia cualquier filtro.
  const claveMapa = JSON.stringify(filtros);

  return (
    <main className="dashboard">
      <header className="header">
        <div>
          <span className="etiqueta">NETFLIX ANALYTICS</span>
          <h1>Análisis del catálogo</h1>
          <p>La economía del entretenimiento y las tendencias globales</p>
        </div>
        <span className="estado">Datos históricos</span>
      </header>

      {cargando ? (
        <p>Cargando catálogo de Netflix...</p>
      ) : error ? (
        <p role="alert">Error al cargar los datos: {error}</p>
      ) : (
        <>
          <section className="kpis" style={{ marginTop: 25 }}>
            <div className="tarjeta">
              <span>Total de títulos</span>
              <strong>{FORMATO.format(total)}</strong>
              <small>Registros que cumplen los filtros</small>
            </div>
            <div className="tarjeta">
              <span>Películas</span>
              <strong>{FORMATO.format(peliculas)}</strong>
              <small>Formato Movie</small>
            </div>
            <div className="tarjeta">
              <span>Series</span>
              <strong>{FORMATO.format(series)}</strong>
              <small>Formato TV Show</small>
            </div>
            <div className="tarjeta">
              <span>Proporción de películas</span>
              <strong>{porcentaje}%</strong>
              <small>Del total filtrado</small>
            </div>
          </section>

          <GlobalFilters
            titulos={titulos}
            filtros={filtros}
            onChange={setFiltros}
            onReset={() => setFiltros({ ...FILTROS_INICIALES })}
            resultados={total}
          />

          {total === 0 && (
            <div className="panel" role="status">
              <h2>No hay títulos para esta combinación</h2>
              <p>Prueba a quitar alguno de los filtros o cambiar el intervalo de años.</p>
            </div>
          )}

          <CountryMap
            titulos={titulosFiltrados}
            selectedCountry={filtros.pais}
            onSelectCountry={seleccionarPais}
            filterKey={claveMapa}
          />
          <NetflixCharts titulos={titulosFiltrados} />
          <TitleTable
           key={claveMapa}
           titulos={titulosFiltrados} />
        </>
      )}
    </main>
  );
}

export default App;
