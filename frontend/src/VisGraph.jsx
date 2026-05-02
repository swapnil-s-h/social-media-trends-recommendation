import React, { useEffect, useRef } from "react";
import { Network } from "vis-network/standalone"; // Import the actual library

const VisGraph = ({ graph, options }) => {
  const container = useRef(null);

  useEffect(() => {
    if (!container.current) {
      return undefined;
    }

    const networkInstance = new Network(container.current, graph, options);

    return () => {
      networkInstance.destroy();
    };
  }, [container, graph, options]);

  return <div ref={container} style={{ height: "600px" }} />;
};

export default VisGraph;
