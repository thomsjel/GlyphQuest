import Comparison from "@/three/Comparison";
import { useEffect, useRef, useState } from "react";
import Portal from "@/components/Portal";
import RateReviewIcon from "@mui/icons-material/RateReview";

export default function MsdfPage() {
  const sceneRef = useRef();

  useEffect(() => {
    if (!sceneRef.current) {
      if (sceneRef.current) {
        return;
      } else {
        setTimeout(() => {
          sceneRef.current = new Comparison();
        }, 500);
      }
    }

    window.addEventListener("pageshow", function (event) {
      if (
        event.persisted ||
        (window.performance && window.performance.navigation.type == 2)
      ) {
        // The page was accessed through the history (back button)
        window.location.reload();
      }
    });
  }, []);

  return <></>;
}
