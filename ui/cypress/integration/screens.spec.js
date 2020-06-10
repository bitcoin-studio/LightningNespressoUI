describe('Screens', () => {
  beforeEach(() => {
    cy.visit('/')
    // Test the spinner
    cy.get('[role="status"]').should('be.visible')
    // Wait for the spinner to stop TODO: Can't find any better for now
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200)
    // Aliases
    cy.get('main')
      .children()
      .first()
      .find('button')
      .as('button-buy')
  })

  before(() => {
    // Fixtures
    cy.fixture('coffees.json').as('coffees')
    cy.fixture('payreq.json').as('payreq')
  })

  describe('Main', () => {
    it('Display five coffees', () => {
      // Bitcoin Studio Logo
      cy.get('header').find('img')
        .should('be.visible')
      // Display five coffees
      cy.get('main').children()
        .should('have.length', 5)
        .each(($coffee, i) => {
          cy.get('@coffees').then((_coffee) => {
            cy.wrap($coffee).find('img').should('be.visible')
            cy.wrap($coffee).contains(_coffee[i].name)
            cy.wrap($coffee).contains(_coffee[i].description)
            cy.wrap($coffee).find('button').contains('Buy for 0.50€')
          })
        })
    })
  })

  describe('Modals', () => {
    it('Payment screen coffee #1', () => {
      cy.get('@button-buy').click()
      // Company logo
      cy.get('[role="dialog"] [data-testid="app-modal__header"]').find('img').should('be.visible')
      // Title
      cy.get('[role="dialog"] [data-testid="app-modal__header"]').contains('Lightning Nespresso')
      // Progress bar
      cy.get('[role="progressbar"]').contains('Awaiting Payment...')
      // Chosen coffee
      cy.get('.invoiceInfo-col1 > p').contains('Master Origin Ethiopia')
      // Price
      cy.get('.invoiceInfo-col2 > :nth-child(1)').contains('1 Sats (0.50 EUR)')
      cy.get('.invoiceInfo-col2 > :nth-child(2)').contains('1 BTC = ')
      cy.get('.invoiceInfo-col2 > :nth-child(2) > span').invoke('text').should('be.above', 3000)
      cy.get('.invoiceInfo-col2 > :nth-child(2) > span').invoke('text').should('be.below', 30000)
      cy.get('.invoiceInfo-col2 > :nth-child(2)').contains('€ (EUR)')
      // QR code
      cy.get('.qrcodeWrapper').find('canvas').should('be.visible')
      // Payment request
      cy.contains('BOLT 11 INVOICE')
      cy.get('.col-12 > .monospace').invoke('text').should('have.length', 265)
    })

    it('Fail payment request', () => {
      // Stubs
      cy.server()
      cy.route({
        method: 'POST',
        url: 'api/generatePaymentRequest',
        response: [],
        status: 500,
      })

      cy.get('@button-buy').click()
      cy.contains('Something went wrong!')
      cy.contains('Sorry, the application failed to generate your invoice.')
      cy.contains('The merchant\'s Bitcoin node seems unavailable.')
    })

    it('Close payment screen', () => {
      cy.get('@button-buy').click()
      // Close modal
      cy.get(':nth-child(6) > .col-12 > .btn').click()
    })

    it('Node info screen', () => {
      cy.get('@button-buy').click()
      cy.get(':nth-child(7) > .col-12 > .btn').click()
      cy.contains('Node Alias')
      cy.contains('bitcoin-studio-fundroid')
      cy.contains('Node ID')
      cy.contains('022e0cbff0802ac1a7df0d614aa9636e5bb5c989368844ed70169b974dab55b25c@85.246.228.114:10001')
      cy.contains('Open A Direct Channel With This Node')
      cy.get('.qrcodeWrapper').find('canvas').should('be.visible')
      // Back to payment screen
      cy.get('.btn').contains('Go Back').click()
      // Check QR code
      cy.get('.qrcodeWrapper').find('canvas').should('be.visible')
      // Close modal
      cy.get(':nth-child(6) > .col-12 > .btn').click()
    })
  })
})
