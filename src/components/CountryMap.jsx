import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./CountryMap.css";

const FORMATO_NUMERO = new Intl.NumberFormat("es-MX");
const NIVELES = [
  { min: 1000, color: "#E50914", texto: "1,000 o más" },
  { min: 500, color: "#BC101A", texto: "500–999" },
  { min: 100, color: "#8E1B25", texto: "100–499" },
  { min: 20, color: "#68232B", texto: "20–99" },
  { min: 1, color: "#44272D", texto: "1–19" },
  { min: 0, color: "#30343A", texto: "Sin registros" },
];

function colorPorCantidad(cantidad) {
  return NIVELES.find((nivel) => cantidad >= nivel.min).color;
}

// Encaja el mundo en el espacio disponible, incluso al cambiar de pantalla.
function AjustarVista() {
  const mapa = useMap();

  useEffect(() => {
    const actualizar = () => {
      mapa.invalidateSize();
      mapa.fitBounds(
        [[-58, -170], [82, 180]],
        { padding: [14, 14], animate: false }
      );
    };
    actualizar();
    const observador = new ResizeObserver(actualizar);
    observador.observe(mapa.getContainer());
    return () => observador.disconnect();
  }, [mapa]);

  return null;
}

export default function CountryMap({ titulos, selectedCountry = "", onSelectCountry, filterKey = "" }) {
  const [geografia, setGeografia] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    fetch("/data/world_countries.geojson")
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("No se encontró world_countries.geojson");
        return respuesta.json();
      })
      .then((data) => { if (activo) setGeografia(data); })
      .catch((err) => { if (activo) setError(err.message); });
    return () => { activo = false; };
  }, []);

  // Cada título cuenta una sola vez por cada país, aunque sea coproducción.
  const conteos = useMemo(() => {
    const resultado = new Map();
    for (const titulo of titulos) {
      for (const pais of new Set(titulo.countries ?? [])) {
        resultado.set(pais, (resultado.get(pais) ?? 0) + 1);
      }
    }
    return resultado;
  }, [titulos]);

  const sinPais = useMemo(
    () => titulos.filter((t) => !t.countries?.length).length,
    [titulos]
  );

  function estiloPais(feature) {
    const nombre = feature.properties.netflix_name;
    const cantidad = nombre ? conteos.get(nombre) ?? 0 : 0;
    const resaltado = selectedCountry === nombre && cantidad > 0;
    return {
      color: resaltado ? "#FFFFFF" : "#52565B",
      weight: resaltado ? 2.4 : 0.65,
      fillColor: colorPorCantidad(cantidad),
      fillOpacity: resaltado ? 1 : 0.93,
    };
  }

  function eventosPais(feature, capa) {
    const { name, netflix_name: nombreCsv } = feature.properties;
    const cantidad = nombreCsv ? conteos.get(nombreCsv) ?? 0 : 0;
    const nombreVisible = nombreCsv || name;
    capa.bindTooltip(
      `${nombreVisible}: ${FORMATO_NUMERO.format(cantidad)} títulos`,
      { sticky: true, direction: "top" }
    );
    capa.on({
      mouseover: (evento) => {
        evento.target.setStyle({ color: "#FFFFFF", weight: 1.8, fillOpacity: 1 });
        evento.target.bringToFront();
      },
      mouseout: (evento) => evento.target.setStyle(estiloPais(feature)),
      click: () => {
        if (!nombreCsv) return;
        onSelectCountry?.(nombreCsv);
      },
    });
  }

  return (
    <section className="mapa-card">
      <div className="mapa-encabezado">
        <div>
          <h2>Distribución geográfica del catálogo</h2>
          <p>Países asociados con la producción de cada título</p>
        </div>
        <span className="mapa-etiqueta">Mapa interactivo</span>
      </div>

      {error ? (
        <p className="mapa-error">Error al cargar el mapa: {error}</p>
      ) : !geografia ? (
        <p className="mapa-cargando">Cargando límites geográficos...</p>
      ) : (
        <div className="mapa-marco">
          <MapContainer
            center={[15, 0]}
            zoom={2}
            minZoom={1}
            maxZoom={6}
            zoomControl={true}
            scrollWheelZoom={false}
            attributionControl={false}
            className="netflix-leaflet"
          >
            <AjustarVista />
            <GeoJSON
              key={`${filterKey}|${selectedCountry}`}
              data={geografia}
              style={estiloPais}
              onEachFeature={eventosPais}
            />
          </MapContainer>
        </div>
      )}

      <div className="mapa-leyenda">
        {NIVELES.map((nivel) => (
          <div className="mapa-nivel" key={nivel.texto}>
            <span className="mapa-color" style={{ backgroundColor: nivel.color }} />
            <span>{nivel.texto}</span>
          </div>
        ))}
      </div>

      {selectedCountry && (
        <div className="mapa-seleccion">
          <div>
            <span className="mapa-subtitulo">País seleccionado</span>
            <strong>{selectedCountry}</strong>
          </div>
          <div>
            <span className="mapa-subtitulo">Títulos asociados</span>
            <strong>{FORMATO_NUMERO.format(conteos.get(selectedCountry) ?? 0)}</strong>
          </div>
          <button type="button" onClick={() => onSelectCountry?.(null)}>Quitar selección</button>
        </div>
      )}

      <p className="mapa-nota">
        Cada coproducción se cuenta una vez en cada país asociado. Hay {FORMATO_NUMERO.format(sinPais)} títulos sin país registrado.
        La geometría simplificada no dibuja todos los territorios pequeños (por ejemplo, Hong Kong y Singapur),
        aunque sus registros sí permanecen en el dataset y en las demás gráficas.
      </p>
      <p className="mapa-fuente">Geometría: Natural Earth, escala 1:110m. Datos: Netflix Titles (Kaggle).</p>
    </section>
  );
}
