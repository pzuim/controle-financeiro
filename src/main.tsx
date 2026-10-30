import { render } from 'preact';
import './styles.css';
import { App } from './ui/App';

render(<App />, document.getElementById('app')!);

// Pede ao navegador para não apagar os dados automaticamente quando faltar espaço.
void navigator.storage?.persist?.().catch(() => undefined);
