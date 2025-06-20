import './Dashboard.css';
import { Line, Pie } from 'react-chartjs-2';
import 'chart.js/auto';

export default function Dashboard() {
  const lineData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Ingresos',
        data: [5000, 10000, 15000, 20000, 25000, 28000],
        borderColor: '#5b8c5a',
        tension: 0.4
      },
      {
        label: 'Egresos',
        data: [3000, 6000, 9000, 16000, 18000, 20000],
        borderColor: '#a5744b',
        tension: 0.4
      }
    ]
  };

  const pieData = {
    labels: ['Sofás', 'Mesas', 'Sillas'],
    datasets: [
      {
        data: [30, 23, 25],
        backgroundColor: ['#7a9c58', '#c09866', '#8b8c7a']
      }
    ]
  };

  return (
    <div className="dashboard">
      <div className="cards">
        <Card title="Ingresos" value="$25.000" />
        <Card title="Egresos" value="$12.000" />
        <Card title="Ventas del Mes" value="+8.5%" />
        <Card title="Muebles vendidos" value="150" />
      </div>

      <div className="charts">
        <div className="chart">
          <h3>Ingresos vs Egresos</h3>
          <Line data={lineData} />
        </div>
        <div className="chart">
          <h3>Ventas por Categoría</h3>
          <Pie data={pieData} />
        </div>
      </div>

      <div className="table-section">
        <h3>Movimientos Financieros</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Categoría</th>
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
    <div className="card">
      <h4>{title}</h4>
      <p>{value}</p>
    </div>
  );
}

function Row({ fecha, tipo, desc, monto, cat }) {
  return (
    <tr>
      <td>{fecha}</td>
      <td>{tipo}</td>
      <td>{desc}</td>
      <td>{monto}</td>
      <td>{cat}</td>
    </tr>
  );
}
