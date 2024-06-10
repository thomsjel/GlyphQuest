import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaAngleRight, FaRegPaperPlane } from "react-icons/fa6";

const scale = {
  attractiveness: "attraktivität",
  perspicuity: "klarheit",
  efficiency: "effizienz",
  dependability: "zuverlässigkeit",
  stimulation: "stimulation",
  novelty: "Neuheit",
};

const questions = [
  {
    q: 1,
    label: "behindernd",
    opposite: "unterstützend",
  },
  {
    q: 2,
    label: "kompliziert",
    opposite: "einfach",
  },
  {
    q: 3,
    label: "ineffizient",
    opposite: "effizient",
  },
  {
    q: 4,
    label: "verwirrend",
    opposite: "übersichtlich",
  },
  {
    q: 5,
    label: "langweilig",
    opposite: "spannend",
  },
  {
    q: 6,
    label: "uninteressant",
    opposite: "interessant",
  },
  {
    q: 7,
    label: "konventionell",
    opposite: "originell",
  },
  {
    q: 8,
    label: "herkömmlich",
    opposite: "neuartig",
  },
];

function Questionnaire({ onEmailSending, onEmailSent, onForm, ...props }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentRadio, setCurrentRadio] = useState(0);

  const onSubmit = async (data) => {
    onEmailSending(true);
    onEmailSent(false);
    onForm((prev) => prev + 1);

    const promise = fetch("/api/sendEmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "it221506@fhstp.ac.at",
        subject: `UEQ Results for ${questions[currentQuestion].label}`,
        message: `name: ${
          questions[currentQuestion].label
        } \n\n ${JSON.stringify(data, null, 2)}`,
      }),
    });

    const response = await toast
      .promise(promise, {
        pending: "Ergebnisse werden gesendet... 🚀",
        success: "Ergebnisse erfolgreich gesendet 👌",
        error: "Etwas ist schief gelaufen 🤯",
      })
      .then(() => {
        onEmailSending(false);
        onEmailSent(true);
        setCurrentQuestion(0);
        setCurrentRadio(0);
        setTimeout(() => {
          onEmailSent(false);
        }, 5000);
        console.log("E-Mail wurde erfolgreich gesendet!");
      })
      .catch(() => {
        onEmailSending(false);
        onEmailSent(false);
        console.log("Etwas ist schief gelaufen! Probiere es noch einmal.");
      });
    console.log(response);
  };

  const handleNextQuestion = () => {
    setCurrentQuestion(currentQuestion + 1);
    setCurrentRadio(0);
  };

  const handleRadioClick = (e) => {
    setCurrentRadio(e.target.value);
  };

  return (
    <div id="ueq" className="questionnaire-root">
      <ToastContainer />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="questionnaire-progress">
          <progress value={currentQuestion + 1} max={questions.length} />
        </div>

        <div>
          <label>
            <div>{questions[currentQuestion].label}</div>
            <div>
              {[...Array(7)].map((_, i) => (
                <label key={i} className="questionnaire-radio">
                  <input
                    type="radio"
                    name={`question-${currentQuestion + 1}`}
                    value={i + 1}
                    {...register(`question-${currentQuestion + 1}`, {
                      required: true,
                    })}
                    onClick={handleRadioClick}
                  />
                  {i + 1}
                </label>
              ))}
            </div>
            <div>{questions[currentQuestion].opposite}</div>
          </label>
        </div>

        {currentQuestion !== questions.length - 1 ? (
          <button
            onClick={handleNextQuestion}
            disabled={
              currentRadio === 0 || currentQuestion === questions.length - 1
            }
          >
            Weiter{" "}
            <span style={{ display: "flex", marginLeft: ".15rem" }}>
              <FaAngleRight />
            </span>
          </button>
        ) : (
          <button
            className={`submit-button ${
              currentRadio !== 0 ? "active" : "disabled"
            }`}
          >
            Abschicken{" "}
            <span style={{ display: "flex", marginLeft: ".25rem" }}>
              <FaRegPaperPlane />
            </span>
          </button>
        )}
      </form>
    </div>
  );
}

export default Questionnaire;
