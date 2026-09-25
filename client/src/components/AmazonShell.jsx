import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import GlobalHeader from "./GlobalHeader"
import SecondaryNav from "./SecondaryNav"
import SideDrawer from "./SideDrawer"
import Footer from "./Footer"

export default function AmazonShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const open = () => setDrawerOpen(true)
    window.addEventListener("amazon:open-drawer", open)
    return () => window.removeEventListener("amazon:open-drawer", open)
  }, [])

  useEffect(() => setDrawerOpen(false), [location.pathname])

  return (
    <div className="amazon-app">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <GlobalHeader />
      <SecondaryNav />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main id="main-content" className="site-main"><Outlet /></main>
      <Footer />
    </div>
  )
}
