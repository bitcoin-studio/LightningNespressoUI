// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

import '@cypress/code-coverage/support'

// Polyfill Fetch because Cypress doesn't support it yet
// TODO: Watch issue https://github.com/cypress-io/cypress/issues/95
let polyfill
before(() => {
  cy.readFile('node_modules/whatwg-fetch/dist/fetch.umd.js')
    .then((contents) => polyfill = contents)
  Cypress.on('window:before:load', (win) => {
    delete win.fetch
    win.eval(polyfill)
  })
})