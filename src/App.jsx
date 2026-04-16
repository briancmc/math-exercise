import { useState, useRef, useEffect } from 'react';
import { config } from './config';
import './index.css';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateNumber = (digits) => {
  const min = digits === 1 ? 0 : Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return randomInt(min, max);
};

const getCorrectAnswer = (num1, num2, op) => {
  if (op === '+') return num1 + num2;
  if (op === '-') return num1 - num2;
  if (op === '×') return num1 * num2;
  return 0;
};

// Generates an answer < 1000 and >= 0 limit
const generateOperationPair = (op) => {
  let num1, num2, digits1, digits2;
  let attempts = 0;
  
  const min1 = config.minOperand1 || 0;
  const min2 = config.minOperand2 || 0;
  
  const pickDigits = (minVal, maxDigits) => {
      const d = Math.max(1, minVal.toString().length);
      return d <= maxDigits ? randomInt(d, maxDigits) : maxDigits;
  };

  const generateBoundedNumber = (digits, minVal) => {
      let minLimit = digits === 1 ? 0 : Math.pow(10, digits - 1);
      minLimit = Math.max(minLimit, minVal);
      const maxLimit = Math.pow(10, digits) - 1;
      return minLimit <= maxLimit ? randomInt(minLimit, maxLimit) : maxLimit;
  };

  while (attempts < 1000) { 
    if (op === '+' || op === '-') {
      digits1 = pickDigits(min1, 3);
      digits2 = pickDigits(min2, 3);
      num1 = generateBoundedNumber(digits1, min1);
      num2 = generateBoundedNumber(digits2, min2);
      
      if (op === '-' && num1 < num2) {
        const temp = num1;
        num1 = num2;
        num2 = temp;
      }
      
      if (op === '+' && num1 + num2 >= 1000) {
        attempts++;
        continue;
      }
      break;
    } else if (op === '×') {
      digits1 = pickDigits(min1, 3);
      const maxDigits2 = Math.min(2, pickDigits(min2, digits1));
      digits2 = maxDigits2; // safely force multiplication bounds
      
      num1 = generateBoundedNumber(digits1, min1);
      num2 = generateBoundedNumber(digits2, min2);
      
      if (num1 * num2 >= 1000) {
        attempts++;
        continue;
      }
      break;
    }
  }
  return [num1, num2];
};

function App() {
  const [exercises, setExercises] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [answers, setAnswers] = useState(['', '', '']); // [hundreds, tens, ones]
  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect' | 'reveal' | null
  const [stats, setStats] = useState([]); 
  const [heartsLeft, setHeartsLeft] = useState(0);

  const inputRef0 = useRef(null);
  const inputRef1 = useRef(null);
  const inputRef2 = useRef(null);
  const inputRefs = [inputRef0, inputRef1, inputRef2];

  const startExercise = () => {
    const newExercises = [];
    const ops = ['+', '-', '×'];

    for (let i = 0; i < config.numberOfQuestions; i++) {
      const operation = ops[randomInt(0, ops.length - 1)];
      const [num1, num2] = generateOperationPair(operation);

      newExercises.push({ 
        id: i, 
        num1, 
        num2, 
        operation, 
        correctAnswer: getCorrectAnswer(num1, num2, operation),
        tries: 0,
        isFail: false,
        attemptedAnswers: []
      });
    }

    setExercises(newExercises);
    setCurrentIndex(0);
    setAnswers(['', '', '']);
    setFeedback(null);
    setStats(newExercises);
    setHeartsLeft(config.maxAttempts);
  };

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < exercises.length) {
      // Upon transitioning to a new question or resetting from failed timeout, ensure focus is at 0 natively
      if (feedback === null) {
        setTimeout(() => {
            if (inputRefs[2].current && !inputRefs[2].current.disabled) {
                inputRefs[2].current.focus();
            }
        }, 50); // slight delay to guarantee DOM renders without disabled attributes
      }
    }
  }, [currentIndex, feedback]); // Trigger when question changes or feedback lifts

  const handleInputChange = (index, value) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(-1);
    const newAnswers = [...answers];
    newAnswers[index] = sanitized;
    setAnswers(newAnswers);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs[index - 1].current.focus();
    } else if (e.key === 'ArrowRight' && index < 2) {
      e.preventDefault();
      inputRefs[index + 1].current.focus();
    } else if (e.key === 'Backspace' && !answers[index] && index > 0) {
      e.preventDefault();
      inputRefs[index - 1].current.focus();
    }
  };

  const calculateUserValue = () => {
    const h = parseInt(answers[0] || '0', 10);
    const t = parseInt(answers[1] || '0', 10);
    const o = parseInt(answers[2] || '0', 10);
    return (h * 100) + (t * 10) + o;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (feedback !== null) return; 

    const currentEx = exercises[currentIndex];
    const userVal = calculateUserValue();
    const isCorrect = userVal === currentEx.correctAnswer;
    
    // Check if empty
    if (answers.every(a => a === '')) return;

    const newStats = [...stats];
    newStats[currentIndex].tries += 1;
    newStats[currentIndex].attemptedAnswers.push(userVal);
    
    let isFinalAnswer = false;
    let newHeartsLeft = heartsLeft;

    if (isCorrect) {
      isFinalAnswer = true;
    } else if (config.maxAttempts !== -1) {
      newHeartsLeft -= 1;
      if (newHeartsLeft <= 0) {
        isFinalAnswer = true;
      }
    }

    if (isFinalAnswer) {
      const d = new Date();
      const dateOnly = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
      
      const url = "https://script.google.com/macros/s/AKfycbwciXrI8pM76raOciKebNowtHtEVNgab4El6IIfBXRVRLfszVPEcEsb1BvseWSYWcLW/exec";
      fetch(url, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          date: dateOnly,
          question: `${currentEx.num1} ${currentEx.operation} ${currentEx.num2}`,
          expected: currentEx.correctAnswer,
          tries: newStats[currentIndex].tries,
          userAnswer: JSON.stringify(newStats[currentIndex].attemptedAnswers), // list of attempted answers
          userCorrect: isCorrect
        })
      }).catch(err => console.error("Sheet Logging Error: ", err));
    }

    if (isCorrect) {
      setFeedback('correct');
      setStats(newStats);
      setTimeout(() => {
        setFeedback(null);
        setAnswers(['', '', '']);
        setCurrentIndex(prev => prev + 1);
        setHeartsLeft(config.maxAttempts); // reset hearts on new question load implicitly or explicitly
      }, 1000);
    } else {
      if (config.maxAttempts !== -1) {
        setHeartsLeft(newHeartsLeft);
      }

      if (config.maxAttempts !== -1 && newHeartsLeft <= 0) { 
        setFeedback('reveal');
        newStats[currentIndex].isFail = true;
        
        let ansStr = currentEx.correctAnswer.toString().padStart(3, ' ');
        setAnswers([
          ansStr[0] === ' ' ? '' : ansStr[0], 
          ansStr[1] === ' ' ? '' : ansStr[1], 
          ansStr[2]
        ]);

        setStats(newStats);
        setTimeout(() => {
          setFeedback(null);
          setAnswers(['', '', '']);
          setCurrentIndex(prev => prev + 1);
          setHeartsLeft(config.maxAttempts); 
        }, 2000); 
      } else {
        setFeedback('incorrect');
        setStats(newStats);
        setTimeout(() => {
          setFeedback(null);
          setAnswers(['', '', '']);
        }, 800);
      }
    }
  };

  // Helper method for 100% precise rendering aligned to input fields!
  const renderOperand = (num) => {
      const str = String(num).padStart(3, ' ');
      return (
          <div className="operand-row">
              {str.split('').map((char, idx) => (
                  <span key={idx} className="operand-digit">
                      {char.trim() ? char : '\u00A0'}
                  </span>
              ))}
          </div>
      );
  }

  // -------------------------------------------------------------
  // RENDERING SCREENS
  // -------------------------------------------------------------

  if (currentIndex === -1) {
    return (
      <div className="app-container">
        <h1>Math Magic! ✨</h1>
        <div className="card start-card">
          <h2>Ready for an adventure?</h2>
          <p>You will have {config.numberOfQuestions} questions to solve.</p>
          <button className="generate-btn" onClick={startExercise}>
            Start Exercise 🚀
          </button>
        </div>
      </div>
    );
  }

  if (currentIndex === exercises.length) {
    return (
      <div className="app-container">
        <h1>Great Job! 🎉</h1>
        <div className="card end-card">
          <h2>Here is how you did:</h2>
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Tries to Solve</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((ex, i) => (
                  <tr key={ex.id} className={ex.isFail ? 'failed-row' : ''}>
                    <td>{`Q${i + 1}: ${ex.num1} ${ex.operation} ${ex.num2}`}</td>
                    <td>
                      {ex.isFail ? `Failed 💀 (Ans: ${ex.correctAnswer})` : `${ex.tries} ${ex.tries === 1 ? '🥇' : ''}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="generate-btn" onClick={startExercise}>
            Play Again 🔄
          </button>
        </div>
      </div>
    );
  }

  const currentEx = exercises[currentIndex];

  return (
    <div className="app-container focused-run">
      
      <div className="header-info">
        <div className="progress-bar">
          <span>Question {currentIndex + 1} / {exercises.length}</span>
        </div>
        {config.maxAttempts !== -1 && (
          <div className="hearts-display">
            {Array.from({ length: config.maxAttempts }).map((_, i) => (
              <span key={i} className={`heart ${i >= heartsLeft ? 'lost' : ''}`}>❤️</span>
            ))}
          </div>
        )}
      </div>

      <div className={`exercise-card full-size ${feedback ? feedback : ''}`}>
        <div className="vertical-math">
          {renderOperand(currentEx.num1)}
          
          <div className="bottom-row">
             <span className="operator">{currentEx.operation}</span>
             {renderOperand(currentEx.num2)}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="answer-form">
          <div className="digit-inputs-container">
            {answers.map((val, idx) => (
              <input 
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={`digit-input box-${idx}`}
                value={val}
                onChange={(e) => handleInputChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                disabled={feedback === 'correct' || feedback === 'reveal'}
                placeholder=""
                maxLength={1}
                autoComplete="off"
              />
            ))}
          </div>
          
          <button type="submit" className="submit-answer-btn" disabled={answers.every(a => a === '')}>Submit ✅</button>
        </form>
      </div>
    </div>
  );
}

export default App;
