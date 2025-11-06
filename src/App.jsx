import { useEffect, useState } from 'react'
import './App.css'
import OpenAI from 'openai';
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = "en-US"; 

function App() {
  const [isListening,setIsListening] = useState(false);
  const [transcript,setTranscript] = useState('');
  const [feedbackLoadingStatus,setFeedbackLoadingStatus] = useState(false);
  const [feedback,setFeedback] = useState(null)
  const [question,setQuestion] = useState("");
  const [isQuestion,setIsquestion] = useState(false);
  const [language,setLanguage] = useState("javascript");

  const handlestartListening = () => {
    setIsListening(true);
    recognition.start();
  }

  const handleStopListening = async() => {
    setIsListening(false);
    recognition.stop();
    await getFeedback();
  }

  useEffect(()=>{
      const fetchQuestion = async() => {
        await getQuestion();
     }
     fetchQuestion();
      recognition.onresult = (e) => {
      const current = e.resultIndex;
      const speechText = e.results[current][0].transcript;
      setTranscript(speechText);
    }

    if(isListening){
      recognition.start();
    }
  },[language]);

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser:true
  })

   const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  }

  const getQuestion = async() => {
    setIsquestion(true);
    try{
      const completion = await openai.chat.completions.create({
        messages: [
          {
           role: "system",
           content: "You are an AI interview coach.User will use it to practice interviews, just generate the question no additional information. "                      
          },
          {
            role: "user",
            content: `Give me random question in ${language}`
          }
        ],
        model: 'chatgpt-4o-latest',
      })
      const gptQuestion = completion.choices[0].message.content;
      setQuestion(gptQuestion);
      setIsquestion(false);
      setFeedback(null);
      setTranscript('');
    }
    catch(e){
      console.log("error",e);
    }
    finally{
      setIsquestion(false);
    }
  }

  const getFeedback = async() => {
    setFeedbackLoadingStatus(true);
    try{
      const completion = await openai.chat.completions.create({
        messages: [
          {
           role: "system",
           content: "You are an interview coach. The answer you'll review are from speech to text transcription. Ignore minior speech recognition errors, filler words, or slight grammatical issues that are common in spoken responses. You must response with a JSON object containing exactly three fields:correctness(0-5)(how relevant the answer was) if the answer is not relevant do give 0, completeness(0-5)(how complete the answer was) if the answer is not relevant do give 0, and feedbackLoadingStatus(string)"                      
          },
          {
            role: "user",
            content: `${question} 
                      Answer: ${transcript}
                      Provide your evaluation as a JSON object with this exact structure: 
                      {
                        "correctness": <number 0-5>,
                        "completeness": <number 0-5>,
                        "feedback": <your detailed feedback in max 150 words>"
                      }`
          }
        ],
        model: 'chatgpt-4o-latest',
        response_format: {type: "json_object"}
      })
      const gptFeedback = completion.choices[0].message.content;
      console.log(gptFeedback);
      setFeedback(JSON.parse(gptFeedback));
    }
    catch(e){
      console.log("error",e);
    }
    finally{
      setFeedbackLoadingStatus(false);
    }
  }

  const handleReattempt = () => {
    setFeedback(null);
    setTranscript('');
    handlestartListening();
  }

  return (
    <>
      <div className='w-full h-screen overflow-hidden'>
        {/* <div className='max-w-4xl mx-auto my-24 flex'> */}
        <div className='flex py-6 justify-center gap-5'>
            <div>
                <p className='text-lg'>Select which Language you have to practice :  </p>
            </div>
            <div>
            <select className='focus:outline-none' id="language" name="language" value={language} onChange={handleLanguageChange} >
            <option value="react">React</option>
            <option value="javascript">Javascript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            </select>
            </div>
        </div>
        <div className={`transition-all ${feedbackLoadingStatus || feedback ? 'flex w-full h-screen p-5' : 'max-w-xl mx-auto'}`}>
            <div className='max-w-xl text-center'>
                <h1 className='text-xl my-3'>{isQuestion ? "Loading Question..." : question }</h1>
                <p className='text-lg my-3'>Record your answer</p>
                <p>Try to answer the question in accurate manner and to the point in max 2 minutes and then assistant will analyze your answer and give you feedback.</p>
                <div className='flex gap-2'>
                    <button onClick={isListening ? handleStopListening : handlestartListening} className={`${feedback ?  "hidden" : "bg-blue-500 px-6 py-2 my-3 text-white rounded-full cursor-pointer focus:outline-none"}`}>{isListening? "Submit answer" : "Record answer"}</button>
                    <button onClick={handleReattempt} className={`${feedback ? "bg-neutral-100 px-6 py-2 cursor-pointer" : ""}`}>{feedback? "Re Attempt Question" : ""}</button>
                    <button onClick={getQuestion} className={`${feedback ? "bg-blue-400 py-2 px-6 text-white cursor-pointer" : "" }`}>{feedback ? "Next Question" : ""}</button>
                </div>
                <p className='text-blue-600'>{transcript}</p>
            </div>
            <div className={`transition-all ${feedbackLoadingStatus || feedback ? 'w-1/2 border-l h-screen p-5' : "w-0" }`}> 
              {feedback && (
                <div className=''>
                    <p>{feedbackLoadingStatus ? "Let's see how you answered!" : ''}</p>
                    <div className='border p-3 rounded-lg'>
                    <div className='flex items-center justify-between'>
                      <p>Correctness</p>
                      <p>{feedback.correctness}/5</p>
                    </div>
                    <div className='flex gap-1 mt-2'> 
                        {[...Array(5)].map((_,i)=>{
                          return <div key={i} className={`h-1 flex-1 rounded-full ${i<Number(feedback.correctness)?'bg-blue-600' : 'bg-neutral-200'}`}>
                              
                          </div>
                        })}
                    </div>
                    </div>
                    <div className='border p-3 rounded-lg my-3'>
                    <div className='flex items-center justify-between'>
                      <p>Completeness</p>
                      <p>{feedback.completeness}/5</p>
                    </div>
                    <div className='flex gap-1 mt-2'> 
                        {[...Array(5)].map((_,i)=>{
                          return <div key={i} className={`h-1 flex-1 rounded-full ${i<Number(feedback.completeness)?'bg-blue-600' : 'bg-neutral-200'}`}>
                              
                          </div>
                        })}
                    </div>
                    </div>
                    <div className="text-left">{feedback.feedback}</div>
                </div>
              )}
            </div>
        </div>
      </div>
    </>
  )
}

export default App;
