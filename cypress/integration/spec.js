import {Server} from 'mock-socket'

it('Home page', function () {
  cy.fixture('data.json').as('coffees')
  cy.visit('/')
  // Bitcoin Studio Logo
  cy.get('#header').find('img').should('be.visible')
  // Display five coffees
  cy.get('#cardContainer .coffee').then(() => {
    this.coffees.map((coffee, i) => {
      cy.get(`:nth-child(${i + 1})`).find('img').should('be.visible')
      cy.get(`:nth-child(${i + 1}) > h2`).invoke('text').should('contain', coffee.name)
      cy.get(`:nth-child(${i + 1}) > p`).invoke('text').should('contain', coffee.description)
      cy.get(`:nth-child(${i + 1}) > .buttonBuy`).invoke('text').should('contain', 'Buy for 0.50€')
    })
  })
})

it('Payment screen coffee #1', function () {
  cy.visit('/')
  cy.get(':nth-child(1) > .buttonBuy').click()
  // Company logo
  cy.get('.paymentModal .col-2').find('img').should('be.visible')
  // Title
  cy.get('.titleModal > p').contains('Lightning Nespresso')
  // Progress bar
  cy.get('.progress-bar__text').contains('Awaiting Payment...')
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

it('Close payment screen', function () {
  cy.visit('/')
  // Select 4th coffee
  cy.get(':nth-child(4) > .buttonBuy').click()
  // Close modal
  cy.get(':nth-child(6) > .col-12 > .btn').click()
})

it('Node info screen', function () {
  cy.visit('/')
  cy.get(':nth-child(1) > .buttonBuy').click()
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


describe('WebSocket', () => {
  let mockSocket
  let mockServer
  before(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win, 'WebSocket', url => {
          console.log('url', url)
          mockServer = new Server(url)
          mockServer.on('connection', (socket) => {
            console.log('MockSocket connected!')
            mockSocket = socket
          })
          mockServer.on('close', (socket) => {
            console.log('MockSocket closed!')
            mockSocket = socket
          })

          return new WebSocket(url)
        })
      },
    })
  })
  after(() => {
    //mockSocket.close()
    //mockServer.stop()
  })

  it('Message invoice-settlement', () => {
    mockSocket.send(JSON.stringify({data: "settled!", type: "invoice-settlement"}))
    cy.contains('Enjoy Your Coffee!')
    cy.get('.invoice-settled').find('img').should('be.visible')
  })

  it('Message delivery-failure', () => {
    mockSocket.send(JSON.stringify({type: "delivery-failure"}))
    cy.contains('Something went wrong!')
    cy.contains('Sorry, we\'re unable to deliver your coffee. Please check that the machine is properly connected')
  })

  it('Message client-id', () => {
    mockSocket.send(JSON.stringify({data: 'a2b3', type: "client-id"}))
  })

  it('Close event', () => {
    mockSocket.close()
    cy.contains('Something went wrong!')
    cy.contains('The connection to the server has closed unexpectedly')
  })
})

it.skip('Close websocket', () => {
  cy.contains('Something went wrong!')
  cy.contains('The connection to the server has closed unexpectedly')
})