import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { StoreProvider } from "./context/StoreContext"
import { AdminAuthProvider } from "./context/AdminAuthContext"
import "./styles.css"

class AppErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error("Application render error", { name: error?.name || "Error" })
  }

  render() {
    if (this.state.hasError) return <div className="route-loading"><div className="empty-state"><h1>Something went wrong</h1><p>Refresh the page to continue shopping.</p><button className="primary-button" type="button" onClick={() => window.location.reload()}>Refresh</button></div></div>
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <StoreProvider>
          <AppErrorBoundary><App /></AppErrorBoundary>
        </StoreProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
