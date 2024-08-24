import React from "react";
import CalendarComponent from "./components/Calendar";

function App() {
  return (
    <div
      className=" bg-cover bg-center min-h-screen w-screen relative overflow-hidden"
      style={{
        backgroundImage: "url('/wp.jpg')",
        overflow: "hidden",
      }}
    >
      <div className="absolute inset-0 bg-black opacity-50 z-0 overflow-hidden" />
      <div className="relative z-10  items-center justify-center overflow-hidden">
        <h1 className="text-white text-center pt-5 font-bold">
          Dynamic Calendar App
        </h1>
        <CalendarComponent />
      </div>
    </div>
  );
}

export default App;
