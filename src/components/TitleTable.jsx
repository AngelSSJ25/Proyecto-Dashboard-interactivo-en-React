import { Fragment, useMemo, useState } from "react";
import "./TitleTable.css";

const PAGE_SIZE = 10;
const nf = new Intl.NumberFormat("es-MX");

const mostrarLista = (valores) =>
  Array.isArray(valores) && valores.length > 0
    ? valores.join(", ")
    : "Sin registrar";

export default function TitleTable({ titulos = [] }) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("estreno-desc");
  const [pagina, setPagina] = useState(1);
  const [expandido, setExpandido] = useState(null);

  const datos = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");

    const encontrados = titulos.filter((item) => {
      if (!termino) return true;
      const texto = [
        item.title || "",
        ...(item.directors || []),
        ...(item.countries || []),
        ...(item.genres || []),
      ]
        .join(" ")
        .toLocaleLowerCase("es");
      return texto.includes(termino);
    });

    return encontrados.sort((a, b) => {
      if (orden === "titulo-asc") {
        return (a.title || "").localeCompare(b.title || "", "es");
      }
      if (orden === "titulo-desc") {
        return (b.title || "").localeCompare(a.title || "", "es");
      }
      const aAnio = Number.isInteger(a.release_year) ? a.release_year : -Infinity;
      const bAnio = Number.isInteger(b.release_year) ? b.release_year : -Infinity;
      const diferencia = orden === "estreno-asc" ? aAnio - bAnio : bAnio - aAnio;
      return diferencia || (a.title || "").localeCompare(b.title || "", "es");
    });
  }, [titulos, busqueda, orden]);



  const paginas = Math.max(1, Math.ceil(datos.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, paginas);
  const inicio = (paginaActual - 1) * PAGE_SIZE;
  const visibles = datos.slice(inicio, inicio + PAGE_SIZE);

  const irPagina = (nuevaPagina) => {
    setPagina(Math.min(Math.max(nuevaPagina, 1), paginas));
    setExpandido(null);
  };

  return (
    <section className="tabla-titulos" aria-labelledby="titulo-tabla-netflix">
      <div className="tabla-titulos__header">
        <div>
          <h2 id="titulo-tabla-netflix">Explorar títulos</h2>
          <p>
            Consulta los registros detrás de los gráficos. Se respetan los filtros globales.
          </p>
        </div>
        <span className="tabla-titulos__contador">
          {nf.format(datos.length)} de {nf.format(titulos.length)} títulos
        </span>
      </div>

      <div className="tabla-titulos__controles">
        <label>
          <span>Buscar por título, país, género o director</span>
          <input
            type="search"
            value={busqueda}
            onChange={(event) => 
              {setBusqueda(event.target.value);
               setPagina(1);
               setExpandido(null); 
              }}
            placeholder="Ej. Stranger Things, México, Dramas..."
          />
        </label>
        <label>
          <span>Ordenar por</span>
          <select value={orden} onChange={(event) => {setOrden(event.target.value); setPagina(1); setExpandido(null);}}>
            <option value="estreno-desc">Estreno: más reciente</option>
            <option value="estreno-asc">Estreno: más antiguo</option>
            <option value="titulo-asc">Título: A a Z</option>
            <option value="titulo-desc">Título: Z a A</option>
          </select>
        </label>
      </div>

      <div className="tabla-titulos__scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Título</th>
              <th scope="col">Formato</th>
              <th scope="col">Estreno</th>
              <th scope="col">Países</th>
              <th scope="col">Géneros</th>
              <th scope="col">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((item) => (
              <Fragment key={item.show_id}>
                <tr>
                  <td className="tabla-titulos__nombre">{item.title}</td>
                  <td>{item.type === "Movie" ? "Película" : "Serie"}</td>
                  <td>{item.release_year ?? "—"}</td>
                  <td>{mostrarLista(item.countries)}</td>
                  <td>{mostrarLista(item.genres)}</td>
                  <td>
                    <button
                      className="tabla-titulos__detalle"
                      type="button"
                      aria-expanded={expandido === item.show_id}
                      onClick={() => setExpandido((actual) => actual === item.show_id ? null : item.show_id)}
                    >
                      {expandido === item.show_id ? "Cerrar" : "Ver más"}
                    </button>
                  </td>
                </tr>
                {expandido === item.show_id && (
                  <tr key={`${item.show_id}-detalle`} className="tabla-titulos__detalle-fila">
                    <td colSpan={6}>
                      <strong>Sinopsis:</strong> {item.description || "Sin descripción"}
                      <div className="tabla-titulos__metadatos">
                        <span><strong>Director(es):</strong> {mostrarLista(item.directors)}</span>
                        <span><strong>Duración:</strong> {item.duration || "Sin registrar"}</span>
                        <span><strong>Incorporación:</strong> {item.date_added || "Sin fecha"}</span>
                        <span><strong>Clasificación:</strong> {item.rating || "Sin registrar"}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {datos.length === 0 && (
          <div className="tabla-titulos__vacio" role="status">
            No se encontraron títulos. Cambia la búsqueda o los filtros globales.
          </div>
        )}
      </div>

      <div className="tabla-titulos__footer">
        <span>
          {datos.length === 0 ? "0 resultados" : `${nf.format(inicio + 1)}–${nf.format(Math.min(inicio + PAGE_SIZE, datos.length))} de ${nf.format(datos.length)}`}
        </span>
        <div className="tabla-titulos__paginas">
          <button type="button" disabled={paginaActual <= 1} onClick={() => irPagina(paginaActual - 1)}>
            Anterior
          </button>
          <span>Página {paginaActual} de {paginas}</span>
          <button type="button" disabled={paginaActual >= paginas} onClick={() => irPagina(paginaActual + 1)}>
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}
