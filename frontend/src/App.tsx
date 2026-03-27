import { FactoryScene } from './components/DigitalTwin/FactoryScene';

function App() {
  return (
    // Black background and full screen
    <div style={{ 
      width: '100vw', 
      minHeight: '100vh', 
      backgroundColor: '#000', 
      padding: '20px', 
      boxSizing: 'border-box' 
    }}>
      {/* Import Digital Twin Component */}
      <FactoryScene />
    </div>
  );
}

export default App;