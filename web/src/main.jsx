import { createRoot } from 'react-dom/client';
import 'lenis/dist/lenis.css';
import './styles.css';
import App from './App';

// Pas de <StrictMode> : son double montage en dev appelle loseContext() sur le
// canvas WebGL de l'Aurora (React Bits), qui reste ensuite blanc.
createRoot(document.getElementById('root')).render(<App />);
