import React, { useEffect, useRef } from "react";
import { Network } from "vis-network/standalone"; // Import the actual library

const VisGraph = ({ graph, options }) => {
  // A ref to hold the <div> for vis.js to attach to
  const container = useRef(null);

  useEffect(() => {
    // We only run this effect if the container div exists
    if (container.current) {
      // Create a new Network
      const network = new Network(container.current, graph, options);
    }
    // We re-run this effect if the graph data or options change
  }, [container, graph, options]);

  // Render a <div> and attach the ref to it
  // The library will use this div to draw the graph
  return <div ref={container} style={{ height: "600px" }} />;
};

export default VisGraph;
