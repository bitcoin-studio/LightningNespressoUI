import React from 'react';
import { Container, Row, Alert, } from 'reactstrap';
import ReactWebLNFallback from 'react-webln-fallback-reactstrap';
import Coffees from 'components/Coffee';
import './style.scss';

interface State {
  error: Error | null;
}

// Starting state, can be used for "resetting" as well
const INITIAL_STATE: State = {
  error: null,
};

export default class App extends React.Component<State> {
  state: State = { ...INITIAL_STATE };

  // Connect websocket immediately
  componentDidMount() {
    //this.connect();
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
        <ReactWebLNFallback />
      </div>
    )
  }
}