import Billboards from "@/three/Billboards";
import { useEffect, useRef, useState } from "react";
import Questionnaire from "@/components/forms/Questionnaire";
import Portal from "@/components/Portal";
import Intro from "@/three/Intro";
import RateReviewIcon from "@mui/icons-material/RateReview";

export default function BillboardsPage() {
  const sceneRef = useRef();
  const introRef = useRef();

  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [form, setForm] = useState(0);

  useEffect(() => {
    if (!sceneRef.current) {
      if (introRef.current) {
        return;
      }
      introRef.current = new Intro();
      if (sceneRef.current) {
        return;
      } else {
        setTimeout(() => {
          sceneRef.current = new Billboards();
          // Set the initial question
          sceneRef.current.setCurrentStation(form);
        }, 500);
      }
    } else {
      // Update the question when form changes
      sceneRef.current.setCurrentStation(form);
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
  }, [form]);

  return (
    <>
      <div id="intro"></div>
      <Portal>
        <div
          style={{
            height: "200px",
            width: "200px",
            display: "flex",
            justifyContent: "start",
            alignItems: "start",
            position: "absolute",
            top: "20%",
            color: "black",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/*} <p>{`Email sending: ${emailSending}`}</p>
          <p>{`Email sent: ${emailSent}`}</p>
          <p>{`Form: ${form}`}</p>
          <p id="errors">ERR</p>
        */}
          <p id="currentStation"></p>
        </div>
        <Questionnaire
          onEmailSending={setEmailSending}
          onEmailSent={setEmailSent}
          onForm={setForm}
        />
        <button id="ueqs-button">
          {/*<RateReviewIcon />*/}Nutzungserlebnis bewerten
        </button>
      </Portal>
      <h1>
        <span>Glyph</span>
        <span>Quest</span>
      </h1>
    </>
  );
}
