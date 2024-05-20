import React, { useState } from "react";
import Questionnaire from "@/components/forms/Questionnaire";

export default function QuestionnairePage() {
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [form, setForm] = useState(0);

  return (
    <div style={{ background: "gray", height: "100svh", width: "100%" }}>
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
      </div>
      <Questionnaire
        name="Billboard1"
        onEmailSending={setEmailSending}
        onEmailSent={setEmailSent}
        onForm={setForm}
      />
    </div>
  );
}
