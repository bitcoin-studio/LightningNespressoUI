import 'bootstrap/dist/css/bootstrap.min.css'
import './style.scss'
import React from 'react'
import ReactDOM from 'react-dom'
import log from 'loglevel'
import {App} from './App'
import * as serviceWorker from './serviceWorker'

if (process.env.NODE_ENV === 'production') {
  log.setLevel('silent')
} else {
  log.setLevel('trace')
  log.info('Looks like we are in development mode!')
}

ReactDOM.render(
  <App/>,
  document.getElementById('root'),
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister()
