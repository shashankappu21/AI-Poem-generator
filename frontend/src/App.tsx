import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './App.css'
import logo from '../public/logo.png'
import settings from '../public/settings.png'
import { Edit, ArrowUp, RotateCcw } from 'lucide-react';
import speaker from '../public/speaker.png'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const socket = io('https://54.66.194.77:5000'); // Connect to the Flask server

function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [displayedPoem, setDisplayedPoem] = useState<string>('');
  const setEmotions = useState<{ [key: string]: number }>({})[1];
  const [chartData, setChartData] = useState<any>({});
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showChart, setShowChart] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [poemGenerated, setPoemGenerated] = useState<boolean>(false);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(true);
  const setIsEditing = useState<boolean>(false)[1];

  // Emotion Sliders
  const [joy, setJoy] = useState<number>(50);
  const [sadness, setSadness] = useState<number>(50);
  const [neutral, setNeutral] = useState<number>(50);
  const [disgust, setDisgust] = useState<number>(50);
  const [fear, setFear] = useState<number>(50);
  const [anger, setAnger] = useState<number>(50);
  const [surprise, setSurprise] = useState<number>(50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDisplayedPoem('');
    setEmotions({});
    setIsTyping(true);
    setShowChart(true);
    setPoemGenerated(true);
    setIsEditing(false);
    setShowAdvanced(false);

    const emotionVector = [joy, sadness, neutral, disgust, fear, anger, surprise];
    socket.emit('send_prompt', { prompt, emotionVector });
  };

  const handleButtonClick = (label: string) => {
    setPrompt(label);
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  const toggleReadAloud = () => {
    if (isReading) {
      stopReading();
    } else {
      startReading();
    }
  };

  const startReading = () => {
    setIsReading(true);
    const utterance = new SpeechSynthesisUtterance(displayedPoem);
    utterance.onend = () => setIsReading(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopReading = () => {
    setIsReading(false);
    window.speechSynthesis.cancel();
  };

  const handleEdit = () => {
    setIsEditing(true);
    setPoemGenerated(false);
    setShowOptions(true);
  };

  useEffect(() => {
    socket.on('receive_poem_stream', ({ poem_chunk, emotions }) => {
      if (poem_chunk) {
        setDisplayedPoem((prev) => prev + poem_chunk);
        setIsTyping(false);
        setShowOptions(false);
      }
  
      if (Object.keys(emotions).length > 0) {
        const updatedEmotions = { ...emotions };
        setEmotions(updatedEmotions);
  
        const labels = Object.keys(updatedEmotions);
        const data = Object.values(updatedEmotions);
  
        const colorMapping : Record<string, string> = {
          joy: '#22C55E',
          sad: '#3B82F6',
          neutral: '#9CA3AF',
          disgust: '#4338CA',
          fear: '#F97316',
          anger: '#DC2626',
          surprise: '#F59E0B',
        };
  
        const backgroundColor = labels.map((label) => colorMapping[label]);
  
        setChartData({
          labels,
          datasets: [
            {
              label: 'Emotion Analysis',
              data,
              backgroundColor,
              borderColor: backgroundColor,
              borderWidth: 1,
            },
          ],
        });
      }
    });
  }, [socket]);

  return (
    <div className='mb-4'>
      <Navbar />
      <div className="container mx-auto mt-8">
        {!poemGenerated ? (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-start-2 col-span-8">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg py-2 px-4 pr-10"
                  placeholder="Enter the topic..."
                />
                <button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 ">
                  <ArrowUp className="h-8 w-8 p-1 hover:bg-gray-200 rounded-full transition-colors" />
                </button>
              </form>
            </div>
            <div className="col-span-2 flex justify-start items-center">
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
                <img src={settings} alt="Settings" className="h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 items-center mb-4">
            <div className="col-start-2 col-span-4">
              <div className="bg-gray-100 rounded-lg py-2 px-4 inline-block mb-2">
                Topic: {prompt}
              </div>
            </div>
            <div className="col-span-6 flex justify-start space-x-2">
              <button
                onClick={handleEdit}
                className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                aria-label="Edit topic"
              >
                <Edit size={20} />
              </button>
              <button
                onClick={toggleReadAloud}
                className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
              >
                <img src={speaker} alt="Speaker" className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
              >
                <img src={settings} alt="Settings" className="h-5 w-5" />
              </button>
              <button 
                onClick={handleSubmit} 
                className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>
        )}

        {showAdvanced && (
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-start-3 col-span-6">
            {showAdvanced && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="block text-md font-medium text-gray-700">Joy: {joy}</label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={joy}
                          onChange={(e) => setJoy(Number(e.target.value))}
                          className="w-full appearance-none bg-transparent 
                                    [&::-webkit-slider-runnable-track]:rounded-full 
                                    [&::-webkit-slider-runnable-track]:bg-gradient-to-r 
                                    [&::-webkit-slider-runnable-track]:from-gray-300
                                    [&::-webkit-slider-runnable-track]:to-green-500
                                    [&::-webkit-slider-runnable-track]:h-2
                                    [&::-webkit-slider-thumb]:appearance-none 
                                    [&::-webkit-slider-thumb]:h-[16px] 
                                    [&::-webkit-slider-thumb]:w-[16px] 
                                    [&::-webkit-slider-thumb]:-mt-[4px] 
                                    [&::-webkit-slider-thumb]:rounded-full 
                                    [&::-webkit-slider-thumb]:bg-green-500 
                                    [&::-moz-range-track]:bg-none"
                        />
                      </div>
                      <div>
                        <label className="block text-md font-medium text-gray-700">Sadness: {sadness}</label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={sadness}
                          onChange={(e) => setSadness(Number(e.target.value))}
                          className="w-full appearance-none bg-transparent 
                            [&::-webkit-slider-runnable-track]:rounded-full 
                            [&::-webkit-slider-runnable-track]:bg-gradient-to-r 
                            [&::-webkit-slider-runnable-track]:from-gray-300
                            [&::-webkit-slider-runnable-track]:to-blue-500
                            [&::-webkit-slider-runnable-track]:h-2
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:h-[16px] 
                            [&::-webkit-slider-thumb]:w-[16px] 
                            [&::-webkit-slider-thumb]:-mt-[4px] 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-blue-500 
                            [&::-moz-range-track]:bg-none"
                        />
                      </div>
                      <div>
                        <label className="block text-md font-medium text-gray-700">Neutral: {neutral}</label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={neutral}
                          onChange={(e) => setNeutral(Number(e.target.value))}
                          className="w-full appearance-none bg-transparent 
                            [&::-webkit-slider-runnable-track]:rounded-full 
                            [&::-webkit-slider-runnable-track]:bg-gradient-to-r 
                            [&::-webkit-slider-runnable-track]:from-gray-300
                            [&::-webkit-slider-runnable-track]:to-gray-400
                            [&::-webkit-slider-runnable-track]:h-2
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:h-[16px] 
                            [&::-webkit-slider-thumb]:w-[16px] 
                            [&::-webkit-slider-thumb]:-mt-[4px] 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-gray-500 
                            [&::-moz-range-track]:bg-none"
                        />
                      </div>
                      <div>
                        <label className="block text-md font-medium text-gray-700">Disgust: {disgust}</label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={disgust}
                          onChange={(e) => setDisgust(Number(e.target.value))}
                          className="w-full appearance-none bg-transparent 
                            [&::-webkit-slider-runnable-track]:rounded-full 
                            [&::-webkit-slider-runnable-track]:bg-gradient-to-r 
                            [&::-webkit-slider-runnable-track]:from-gray-300
                            [&::-webkit-slider-runnable-track]:to-indigo-700
                            [&::-webkit-slider-runnable-track]:h-2
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:h-[16px] 
                            [&::-webkit-slider-thumb]:w-[16px] 
                            [&::-webkit-slider-thumb]:-mt-[4px] 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-indigo-600 
                            [&::-moz-range-track]:bg-none"
                        />
                      </div>
                      <div>
                        <label className="block text-md font-medium text-gray-700">Fear: {fear}</label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={fear}
                          onChange={(e) => setFear(Number(e.target.value))}
                          className="w-full appearance-none bg-transparent 
                            [&::-webkit-slider-runnable-track]:rounded-full 
                            [&::-webkit-slider-runnable-track]:bg-gradient-to-r 
                            [&::-webkit-slider-runnable-track]:from-gray-300
                            [&::-webkit-slider-runnable-track]:to-orange-500
                            [&::-webkit-slider-runnable-track]:h-2
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:h-[16px] 
                            [&::-webkit-slider-thumb]:w-[16px] 
                            [&::-webkit-slider-thumb]:-mt-[4px] 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-orange-500 
                            [&::-moz-range-track]:bg-none"
                        />
                      </div>
                      <div>
                        <label className="block text-md font-medium text-gray-700">Anger: {anger}</label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={anger}
                          onChange={(e) => setAnger(Number(e.target.value))}
                          className="w-full appearance-none bg-transparent 
                            [&::-webkit-slider-runnable-track]:rounded-full 
                            [&::-webkit-slider-runnable-track]:bg-gradient-to-r 
                            [&::-webkit-slider-runnable-track]:from-gray-300
                            [&::-webkit-slider-runnable-track]:to-red-600
                            [&::-webkit-slider-runnable-track]:h-2
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:h-[16px] 
                            [&::-webkit-slider-thumb]:w-[16px] 
                            [&::-webkit-slider-thumb]:-mt-[4px] 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-red-600 
                            [&::-moz-range-track]:bg-none"
                        />
                      </div>
                      <div>
                        <label className="block text-md font-medium text-gray-700">Surprise: {surprise}</label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={surprise}
                          onChange={(e) => setSurprise(Number(e.target.value))}
                          className="w-full appearance-none bg-transparent 
                            [&::-webkit-slider-runnable-track]:rounded-full 
                            [&::-webkit-slider-runnable-track]:bg-gradient-to-r 
                            [&::-webkit-slider-runnable-track]:from-gray-300
                            [&::-webkit-slider-runnable-track]:to-yellow-500
                            [&::-webkit-slider-runnable-track]:h-2
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:h-[16px] 
                            [&::-webkit-slider-thumb]:w-[16px] 
                            [&::-webkit-slider-thumb]:-mt-[4px] 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-yellow-500 
                            [&::-moz-range-track]:bg-none"
                        />
                      </div>
                    </div>
                  )}
            </div>
          </div>
        )}

        {poemGenerated && (
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-start-2 col-span-6 relative">
              {isTyping ? (
                <p>Generating poem...</p>
              ) : (
                <>
                  <div className="bg-gray-100 rounded-lg p-4 whitespace-pre-wrap text-center">
                    {displayedPoem}
                  </div>
                </>
              )}
            </div>
            <div className='col-span-4'>
            {showChart && chartData.labels && (
            <div className="w-full ml-4 flex flex-col items-center">
              <div className="bg-gray-100 rounded-xl p-6 w-full h-64">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 1,
                      },
                    },
                  }}
                />
              </div>
              {/* <div>Want to visualise emotions line by line?</div> */}
            </div>
          )}
            </div>
          </div>
        )}

        {!poemGenerated && showOptions && (
          <div className="grid grid-cols-12 gap-4 mt-8">
            <div className="col-start-2 col-span-8">
              <div className="grid grid-cols-3 gap-4">
                <button
                  className="border border-gray-300 rounded-lg py-4 px-6 text-lg hover:bg-gray-100"
                  onClick={() => handleButtonClick('Life')}
                >
                  Life
                </button>
                <button
                  className="border border-gray-300 rounded-lg py-4 px-6 text-lg hover:bg-gray-100"
                  onClick={() => handleButtonClick('Mahatma Gandhi')}
                >
                  Mahatma Gandhi
                </button>
                <button
                  className="border border-gray-300 rounded-lg py-4 px-6 text-lg hover:bg-gray-100"
                  onClick={() => handleButtonClick('India')}
                >
                  India
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Navbar() {
  const refreshPage = () => {
    window.location.reload();
  };
  return (
    <nav className="bg-slate-100 p-4 border-b-2">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center">
          <img src={logo} className="h-8 w-8 mr-3 cursor-pointer" onClick={refreshPage} alt="Logo" />
          <span className="text-black text-3xl font-quantify cursor-pointer" onClick={refreshPage}>
            PoemGen.AI
          </span>
        </div>
      </div>
    </nav>
  );
}

export default App;
// Now correct it in this
