import GlyphQuest from "@/three/GlyphQuest";
import { useEffect, useRef, useState } from "react";
import Questionnaire from "@/components/forms/Questionnaire";
import Portal from "@/components/Portal";

export default function TestPage() {
  const sceneRef = useRef();

  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [form, setForm] = useState(0);

  useEffect(() => {
    if (sceneRef.current) {
      return;
    }

    sceneRef.current = new GlyphQuest();
    const arButton = document.getElementById("ar-button");
    arButton.addEventListener("click", async () => {
      await sceneRef.current.activateXR();
    });
  }, []);

  return (
    <>
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
          <p>{`Email sending: ${emailSending}`}</p>
          <p>{`Email sent: ${emailSent}`}</p>
          <p>{`Form: ${form}`}</p>
          <p id="errors">ERR</p>
        </div>
        <Questionnaire
          onEmailSending={setEmailSending}
          onEmailSent={setEmailSent}
          onForm={setForm}
        />
        {/*<button id="shadow-button">SHADOW</button>*/}
      </Portal>

      <button id="ar-button">Start</button>
    </>
  );
}
