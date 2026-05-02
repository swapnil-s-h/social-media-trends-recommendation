import React, { useEffect, useRef, useState } from "react";
import { Network } from "vis-network/standalone";

const VisGraph = ({ graph, options }) => {
  const container = useRef(null);
  const [fontReady, setFontReady] = useState(false);

  // Wait for Font Awesome to load before vis-network draws on canvas
  useEffect(() => {
    document.fonts.load("900 16px 'Font Awesome 6 Free'").then(() => {
      setFontReady(true);
    });
  }, []);

  useEffect(() => {
    if (!container.current || !fontReady) {
      return undefined;
    }

    const networkInstance = new Network(container.current, graph, options);

    return () => {
      networkInstance.destroy();
    };
  }, [container, graph, options, fontReady]);

  return <div ref={container} style={{ height: "600px" }} />;
};

export default VisGraph;
