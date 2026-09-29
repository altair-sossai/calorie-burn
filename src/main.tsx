import { render } from 'preact';
import { createRuntime } from './app/runtime';
import { App } from './components/App';
import './global.css';

render(<App runtime={createRuntime()} />, document.getElementById('app')!);
