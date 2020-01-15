import {Server} from "mock-socket"

describe('WebSocket', function () {

  let mockSocket
  let mockServer

  before(function () {
    cy.visit('/', {
      onBeforeLoad(window) {
        cy.stub(window, 'WebSocket', (url) => {
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
  it('Close ws and close modal', () => {
    mockSocket.close()
    cy.contains('Something went wrong!')
    cy.contains('The connection to the server has closed unexpectedly')
    cy.get('.error-modal > :nth-child(4)').click()
  })
  it.skip('Close ws and reconnect', () => {
    mockSocket.close()
    cy.contains('Something went wrong!')
    cy.contains('The connection to the server has closed unexpectedly')
    cy.get('.error-modal > :nth-child(3)').click()
  })
})