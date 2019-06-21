import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import { render } from 'react-dom';
import { hot } from 'react-hot-loader';
import App from './App';

if (process.env.NODE_ENV !== 'production') {
  console.log('Looks like we are in development mode!');
} else {
  console.log('Looks like we are in production!');
}

const HotApp = hot(module)(() => (
  // @ts-ignore
  <App />
));

render(
  <HotApp />,
  document.getElementById('root'),
);