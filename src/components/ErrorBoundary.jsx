import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Erreur capturée par ErrorBoundary :', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Un problème est survenu</h2>
          <p>Recharge la page. Si le problème persiste, réessaie dans quelques instants.</p>
          <button onClick={() => window.location.reload()}>Recharger la page</button>
        </div>
      )
    }
    return this.props.children
  }
}
