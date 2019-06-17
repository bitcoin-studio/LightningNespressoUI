import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import { render } from 'react-dom';
import { hot } from 'react-hot-loader';
import App from './App';

const HotApp = hot(module)(() => (
  // @ts-ignore
  <App />
));

render(
  <HotApp />,
  document.getElementById('root'),
);