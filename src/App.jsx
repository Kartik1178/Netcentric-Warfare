import { useState } from 'react'
import LandingPage from './LandingPage'
import { Simulation } from './Simulation'
import { Router,Route, Routes } from 'react-router-dom'
import './App.css'

function App() {

  return (
    <>
 
      <Routes>
   <Route path="/" element={<LandingPage/>}/> 
    <Route path="/simulation" element={<Simulation/>}/>
    </Routes>
  
    </>
  )
}

export default App
