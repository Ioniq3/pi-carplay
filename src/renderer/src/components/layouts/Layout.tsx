import { Outlet } from 'react-router-dom'

export const Layout = () => {
  return (
    <div id="main-root">
      <Outlet />
    </div>
  )
}
