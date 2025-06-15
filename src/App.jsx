import { useState } from 'react'
import LandingPage from './LandingPage'
import { Simulation } from './Simulation'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <LandingPage/> 
    <Simulation/>
    </>
  )
}

export default App
