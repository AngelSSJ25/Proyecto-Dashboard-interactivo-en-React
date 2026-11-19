
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const ROJO = "#E50914";
const GRIS = "#626262";

const tooltipStyle = {
  backgroundColor: "#252525",
  border: "1px solid #444",
  borderRadius: 8,
  color: "#fff",
};

// Cuenta los títulos asociados con cada categoría.
function obtenerTop(titulos, campo) {
  const conteos = new Map();

  titulos.forEach((titulo) => {
    const etiquetas = titulo[campo] || [];

    etiquetas.forEach((etiqueta) => {
      conteos.set(etiqueta, (conteos.get(etiqueta) || 0) + 1);
    });
  });

  return Array.from(conteos, ([nombre, total]) => ({
    nombre,
    total,
  }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.nombre.localeCompare(b.nombre)
    )
    .slice(0, 5);
}

// Reutilizamos el mismo gráfico para distintos rankings.
function GraficoRanking({ datos }) {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart
        data={datos}
        layout="vertical"
        margin={{ top: 5, right: 25, left: 5, bottom: 5 }}
      >
        <CartesianGrid
          stroke="#363636"
          strokeDasharray="3 3"
          horizontal={false}
        />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: "#B3B3B3", fontSize: 11 }}
        />
        <YAxis
          dataKey="nombre"
          type="category"
          width={155}
          tick={{ fill: "#ddd", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(valor) => [valor, "Títulos"]}
        />
        <Bar
          dataKey="total"
          fill={ROJO}
          radius={[0, 5, 5, 0]}
          maxBarSize={25}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function NetflixCharts({ titulos }) {
  const [modoTemporal, setModoTemporal] = useState("year_added");

  const generos = useMemo(
    () => obtenerTop(titulos, "genres"),
    [titulos]
  );

  const directores = useMemo(
    () => obtenerTop(titulos, "directors"),
    [titulos]
  );

  const paises = useMemo(
    () => obtenerTop(titulos, "countries"),
    [titulos]
  );

  const datosTemporales = useMemo(() => {
    const conteos = new Map();

    titulos.forEach((titulo) => {
      const anio = titulo[modoTemporal];

      if (!Number.isInteger(anio)) return;

      conteos.set(anio, (conteos.get(anio) || 0) + 1);
    });

    return Array.from(conteos, ([anio, total]) => ({
      anio,
      total,
    })).sort((a, b) => a.anio - b.anio);
  }, [titulos, modoTemporal]);

  const formatos = useMemo(() => {
    const peliculas = titulos.filter(
      (t) => t.type === "Movie"
    ).length;

    const series = titulos.filter(
      (t) => t.type === "TV Show"
    ).length;

    return [
      { nombre: "Películas", total: peliculas },
      { nombre: "Series", total: series },
    ];
  }, [titulos]);

  return (
    <section className="graficos-grid">

      <div className="grafico-card grafico-ancho">
        <div className="grafico-encabezado">
          <div>
            <h2>Evolución del catálogo</h2>
            <p>Distribución temporal de los títulos</p>
          </div>

          <select
            value={modoTemporal}
            onChange={(e) => setModoTemporal(e.target.value)}
            className="grafico-select"
          >
            <option value="year_added">
              Año de incorporación
            </option>
            <option value="release_year">
              Año de estreno
            </option>
          </select>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={datosTemporales}>
            <CartesianGrid
              stroke="#333"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="anio"
              tick={{ fill: "#B3B3B3", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#B3B3B3", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(valor) => [valor, "Títulos"]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke={ROJO}
              fill={ROJO}
              fillOpacity={0.18}
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>

        <p className="grafico-nota">
          {modoTemporal === "year_added"
            ? "Las incorporaciones de 2021 solo están registradas hasta septiembre."
            : "Se muestran los años de estreno de los títulos presentes en el archivo."}
        </p>
      </div>

      <div className="grafico-card">
        <h2>Top 5 géneros</h2>
        <p>Géneros con mayor presencia en el catálogo</p>
        <GraficoRanking datos={generos} />
      </div>

      <div className="grafico-card">
        <h2>Top 5 directores</h2>
        <p>Directores con más títulos acreditados</p>
        <GraficoRanking datos={directores} />
      </div>

      <div className="grafico-card">
        <h2>Películas vs. series</h2>
        <p>Distribución por formato de contenido</p>

        <ResponsiveContainer width="100%" height={290}>
          <PieChart>
            <Pie
              data={formatos}
              dataKey="total"
              nameKey="nombre"
              cx="50%"
              cy="45%"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={3}
            >
              <Cell fill={ROJO} />
              <Cell fill={GRIS} />
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              verticalAlign="bottom"
              formatter={(valor) => (
                <span style={{ color: "#ddd" }}>{valor}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-card">
        <h2>Top 5 países</h2>
        <p>Países asociados con más producciones</p>
        <GraficoRanking datos={paises} />
      </div>

    </section>
  );
}
