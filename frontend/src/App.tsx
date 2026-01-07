import { FactoryScene } from './components/DigitalTwin/FactoryScene';

function App() {
  return (
    // Arka planı siyah yapıp tam ekran kaplıyoruz
    <div style={{ 
      width: '100vw', 
      minHeight: '100vh', 
      backgroundColor: '#000', 
      padding: '20px', 
      boxSizing: 'border-box' 
    }}>
      {/* Yazdığımız Dijital İkiz Bileşenini Çağırıyoruz */}
      <FactoryScene />
    </div>
  );
}

export default App;