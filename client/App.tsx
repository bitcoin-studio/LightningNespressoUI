import React from 'react';
import { Container, Row, Alert, } from 'reactstrap';
import Coffees from 'components/Coffee';
import './style.scss';
import api from 'lib/api'

interface Props {}

interface State {
  isConnecting: boolean;
  error: Error | null;
}

// Starting state, can be used for "resetting" as well
const INITIAL_STATE: State = {
  isConnecting: true,
  error: null,
};

export default class App extends React.Component<Props, State> {
  state: State = { ...INITIAL_STATE };

  // Connect websocket immediately
  componentDidMount() {
    this.connect();
  }

  // Reset our state, connect websocket, and update state on new data or error
  private connect = () => {
    console.log('Connect to websocket..')
    this.setState({ ...INITIAL_STATE });
    const socket = api.getCoffeesWebSocket();

    // Mark isConnecting false once connected
    socket.addEventListener('open', () => {
      this.setState({ isConnecting: false });
      console.log('WS connected')
    });


    // Log every message
    socket.addEventListener('message', ev => {
      try {
        // Do something with a specific event
        //const msg = JSON.parse(ev.data.toString());
        //if (msg && msg.type === 'invoice-settlement') {}

        console.log(ev)
      } catch(err) {
        console.error(err);
      }
    })

    // Handle closes and errors
    socket.addEventListener('close', () => {
      this.setState({ error: new Error('Connection to server closed unexpectedly.') });
    });
    socket.addEventListener('error', (ev) => {
      this.setState({ error: new Error('There was an error, see your console for more information.') });
      console.error(ev);
    });
  }

  render() {
    const { error } = this.state;

    let content;

    if (error) {
      content = (
        <Alert color="danger">
          <h4 className="alert-heading">Something went wrong!</h4>
          <p>{error.message}</p>
        </Alert>
      )
    } else {
      content = (
        <>
         <Coffees/>
        </>
      );
    }

    return (
      <div className="App">
        <Container>
          <h1 className="App-title">CHOOSE YOUR COFFEE</h1>
          <Row className="justify-content-between">
              {content}
          </Row>
        </Container>
      </div>
    )
  }
}