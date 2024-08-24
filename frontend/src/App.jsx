import React from "react";
import CalendarComponent from "./components/Calendar";

function App() {
  return (
    <div
      className="App bg-cover bg-center h-screen w-screen relative"
      style={{
        backgroundImage: "url('/img.jpg')",
      }}
    >
      <div className="absolute inset-0 bg-black opacity-50 z-0" />
      <div className="relative z-10">
        <h1 className="text-white text-center pt-5">Dynamic Calendar App</h1>
        <CalendarComponent />
      </div>
    </div>
  );
}

export default App;
