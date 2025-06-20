import './index.css';
import Sidebar from './Sidebar.jsx';
import Dashboard from './Dashboard.jsx';

export function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
