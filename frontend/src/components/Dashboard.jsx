import { Line, Pie } from 'react-chartjs-2';
import 'chart.js/auto';

export default function Dashboard() {
  const lineData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      { label: 'Ingresos', data: [5000, 10000, 15000, 20000, 25000, 28000], borderColor: '#5b8c5a', tension: 0.4 },
      { label: 'Egresos',  data: [3000, 6000, 9000, 16000, 18000, 20000], borderColor: '#a5744b', tension: 0.4 },
    ],
  };

  const pieData = {
    labels: ['Sofás', 'Mesas', 'Sillas'],
    datasets: [{ data: [30, 23, 25], backgroundColor: ['#7a9c58', '#c09866', '#8b8c7a'] }],
  };

  // Opciones para que el canvas respete el alto del contenedor
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Ingresos" value="$25.000" />
        <Card title="Egresos" value="$12.000" />
        <Card title="Ventas del Mes" value="+8.5%" />
        <Card title="Muebles vendidos" value="150" />
      </div>

      {/* Gráficas: grid + items-start para que no se estiren igual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Line */}
        <div className="bg-white p-4 rounded-xl shadow-sm self-start">
          <h3 className="mb-3 text-base font-semibold">Ingresos vs Egresos</h3>
          {/* Alto controlado: ajusta h-56 / h-64 / h-72 a tu gusto */}
          <div className="h-56 md:h-64">
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>

        {/* Pie */}
        <div className="bg-white p-4 rounded-xl shadow-sm self-start">
          <h3 className="mb-3 text-base font-semibold">Ventas por Categoría</h3>
          <div className="h-56 md:h-64">
            <Pie data={pieData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h3 className="mb-3 text-base font-semibold">Movimientos Financieros</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="p-2">Fecha</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Descripción</th>
              <th className="p-2">Monto</th>
              <th className="p-2">Categoría</th>
            </tr>
          </thead>
          <tbody>
            <Row fecha="01/04/2024" tipo="Ingreso" desc="Venta de sofá" monto="3.000 €" cat="Ventas" />
            <Row fecha="30/03/2024" tipo="Egreso" desc="Compra de madera" monto="2.500 €" cat="Compras" />
            <Row fecha="15/03/2024" tipo="Ingreso" desc="Venta de mesa" monto="1.200 €" cat="Ventas" />
            <Row fecha="10/03/2024" tipo="Egreso" desc="Pago a proveedor" monto="300 €" cat="Gastos" />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h4 className="text-sm text-gray-600">{title}</h4>
      <p className="text-xl font-bold mt-2">{value}</p>
    </div>
  );
}

function Row({ fecha, tipo, desc, monto, cat }) {
  return (
    <tr className="border-b border-gray-200">
      <td className="p-2">{fecha}</td>
      <td className="p-2">{tipo}</td>
      <td className="p-2">{desc}</td>
      <td className="p-2">{monto}</td>
      <td className="p-2">{cat}</td>
    </tr>
  );
}
