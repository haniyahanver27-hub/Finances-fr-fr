import { useMemo, useState } from 'react';
import { Check, Gamepad2, RotateCcw, Sparkles, Volume2, X } from 'lucide-react';
import { blockShapes, lessonDeck } from '../data/demoContent';
import { apiAudio, apiJson } from '../api';

const size = 8;
const emptyGrid = () => Array.from({ length: size * size }, () => null);
const starterGrid = () => {
  const initial = emptyGrid();
  [2, 10, 18, 27, 28, 45, 46, 47].forEach((index) => {
    initial[index] = '#1f9d8a';
  });
  return initial;
};

const InfoCenterPage = () => {
  const [mode, setMode] = useState('blocks');
  const [grid, setGrid] = useState(starterGrid);
  const [score, setScore] = useState(0);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [selectedShapeName, setSelectedShapeName] = useState(blockShapes[0]?.name);
  const [boardMessage, setBoardMessage] = useState('Pick a block, then choose its top-left landing square.');
  const [quizTopic, setQuizTopic] = useState('diversification');
  const [difficulty, setDifficulty] = useState('starter');
  const [quiz, setQuiz] = useState(null);
  const [quizStatus, setQuizStatus] = useState('idle');
  const [quizError, setQuizError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);

  const unlockedLesson = lessonDeck[Math.min(lessonIndex, lessonDeck.length - 1)];

  const nextShapes = useMemo(() => blockShapes, []);
  const selectedShape = nextShapes.find((shape) => shape.name === selectedShapeName) || nextShapes[0];
  const activeQuestion = quiz?.questions?.[currentQuestion];
  const answered = selectedOption !== null;
  const isCorrect = answered && selectedOption === activeQuestion?.answerIndex;

  const canPlace = (shape, row, col, board) => shape.cells.every(([x, y]) => {
    const targetRow = row + y;
    const targetCol = col + x;
    if (targetRow < 0 || targetCol < 0 || targetRow >= size || targetCol >= size) return false;
    return !board[targetRow * size + targetCol];
  });

  const clearLines = (board) => {
    const rowsToClear = [];
    const colsToClear = [];

    for (let row = 0; row < size; row += 1) {
      if (board.slice(row * size, row * size + size).every(Boolean)) rowsToClear.push(row);
    }

    for (let col = 0; col < size; col += 1) {
      if (Array.from({ length: size }).every((_, row) => board[row * size + col])) colsToClear.push(col);
    }

    if (!rowsToClear.length && !colsToClear.length) return { board, cleared: 0 };

    const next = [...board];
    rowsToClear.forEach((row) => {
      for (let col = 0; col < size; col += 1) next[row * size + col] = null;
    });
    colsToClear.forEach((col) => {
      for (let row = 0; row < size; row += 1) next[row * size + col] = null;
    });

    return { board: next, cleared: rowsToClear.length + colsToClear.length };
  };

  const placeShape = (index) => {
    if (!selectedShape) return;

    const row = Math.floor(index / size);
    const col = index % size;
    if (!canPlace(selectedShape, row, col, grid)) {
      setBoardMessage('Blocked square. Try another landing spot before the board claps back.');
      return;
    }

    const next = [...grid];
    selectedShape.cells.forEach(([x, y]) => {
      next[(row + y) * size + col + x] = selectedShape.color;
    });

    const result = clearLines(next);
    setGrid(result.board);
    setScore((current) => current + selectedShape.cells.length * 10 + result.cleared * 100);
    setBoardMessage(result.cleared ? `Line clear! ${result.cleared * 100} bonus XP unlocked.` : `${selectedShape.name} placed. Keep building clean lanes.`);
    if (result.cleared) {
      setLessonIndex((current) => Math.min(current + result.cleared, lessonDeck.length - 1));
    }
  };

  const resetBoard = () => {
    setGrid(starterGrid());
    setScore(0);
    setLessonIndex(0);
    setSelectedShapeName(blockShapes[0]?.name);
    setBoardMessage('Board reset. Pick a block, then choose its top-left landing square.');
  };

  const loadQuiz = async () => {
    setQuizStatus('loading');
    setQuizError('');
    setSelectedOption(null);
    setCurrentQuestion(0);

    try {
      const data = await apiJson('/api/ai/quiz', {
        method: 'POST',
        body: JSON.stringify({ topic: quizTopic, difficulty })
      });
      if (!Array.isArray(data.questions) || !data.questions.length) throw new Error('Quiz has no questions');
      setQuiz(data);
      setQuizStatus('ready');
    } catch {
      setQuizError('Alpha Meow could not load a quiz right now.');
      setQuizStatus('idle');
    }
  };

  const readAloud = async (text) => {
    try {
      const blob = await apiAudio('/api/sfx/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
      await audio.play();
    } catch {
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text));
    }
  };

  const nextQuestion = () => {
    if (!quiz?.questions?.length) return;
    setSelectedOption(null);
    setCurrentQuestion((current) => (current + 1) % quiz.questions.length);
  };

  return (
    <div className="info-page animate-fade-in">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Info Center</p>
          <h2>Practice Arena</h2>
        </div>
        <button className="btn btn-secondary icon-only" type="button" onClick={resetBoard} aria-label="Reset board">
          <RotateCcw size={18} />
        </button>
      </header>

      <div className="mode-switch" role="tablist" aria-label="Info Center mode">
        <button className={mode === 'blocks' ? 'active' : ''} type="button" onClick={() => setMode('blocks')}>
          <Gamepad2 size={18} />
          <span>Block Blast</span>
        </button>
        <button className={mode === 'quiz' ? 'active' : ''} type="button" onClick={() => setMode('quiz')}>
          <Sparkles size={18} />
          <span>Quiz</span>
        </button>
      </div>

      <section className="lesson-panel">
        <div>
          <span>Score {score}</span>
          <h3>{unlockedLesson.title}</h3>
          <p>{unlockedLesson.body}</p>
        </div>
      </section>

      {mode === 'blocks' && (
        <section className="puzzle-layout">
          <div className="block-grid" aria-label="Puzzle grid">
            {grid.map((cell, index) => (
              <button
                key={index}
                type="button"
                className="block-cell"
                style={{ background: cell || 'var(--bg-tertiary)' }}
                onClick={() => placeShape(index)}
                aria-label={`Place ${selectedShape?.name || 'block'} at square ${index + 1}`}
              />
            ))}
          </div>

          <div className="shape-tray" aria-label="Available blocks">
            <p className="tray-note">{boardMessage}</p>
            {nextShapes.map((shape) => (
              <button
                key={shape.name}
                type="button"
                className={`shape-button ${selectedShapeName === shape.name ? 'active' : ''}`}
                onClick={() => {
                  setSelectedShapeName(shape.name);
                  setBoardMessage(`${shape.name} selected. Click the grid where its top-left tile should land.`);
                }}
              >
                <span>{shape.name}</span>
                <div className="shape-preview">
                  {Array.from({ length: 9 }).map((_, previewIndex) => {
                    const x = previewIndex % 3;
                    const y = Math.floor(previewIndex / 3);
                    const filled = shape.cells.some(([cellX, cellY]) => cellX === x && cellY === y);
                    return <i key={previewIndex} style={{ background: filled ? shape.color : 'transparent' }} />;
                  })}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'quiz' && (
        <section className="quiz-layout">
          <div className="quiz-controls">
            <label>
              <span>Topic</span>
              <input value={quizTopic} onChange={(event) => setQuizTopic(event.target.value)} placeholder="diversification" maxLength={80} />
            </label>
            <label>
              <span>Difficulty</span>
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                <option value="starter">Starter</option>
                <option value="intermediate">Intermediate</option>
                <option value="challenge">Challenge</option>
              </select>
            </label>
            <button className="btn btn-primary" type="button" onClick={loadQuiz} disabled={quizStatus === 'loading'}>
              <Sparkles size={18} />
              <span>{quizStatus === 'loading' ? 'Loading' : 'Generate Quiz'}</span>
            </button>
          </div>

          {quizError && <div className="delay-note">{quizError}</div>}

          {activeQuestion ? (
            <article className="quiz-card">
              <div className="quiz-card-header">
                <div>
                  <span className="delay-pill">{quiz.provider === 'gemini' ? 'Gemini powered' : 'Local warmup'}</span>
                  <h3>{quiz.title}</h3>
                </div>
                <button className="icon-button" type="button" onClick={() => readAloud(activeQuestion.question)} aria-label="Read question aloud">
                  <Volume2 size={18} />
                </button>
              </div>

              <p className="quiz-question">{activeQuestion.question}</p>

              <div className="quiz-options">
                {activeQuestion.options.map((option, index) => {
                  const optionState = answered && index === activeQuestion.answerIndex ? 'correct' : answered && index === selectedOption ? 'wrong' : '';
                  return (
                    <button key={option} className={optionState} type="button" onClick={() => setSelectedOption(index)} disabled={answered}>
                      {optionState === 'correct' && <Check size={16} />}
                      {optionState === 'wrong' && <X size={16} />}
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              {answered && (
                <div className={`quiz-result ${isCorrect ? 'correct' : 'wrong'}`}>
                  <strong>{isCorrect ? 'Clean play.' : 'Not the move yet.'}</strong>
                  <span>{activeQuestion.explanation}</span>
                  <button className="btn btn-secondary" type="button" onClick={() => readAloud(activeQuestion.explanation)}>
                    <Volume2 size={18} />
                    <span>Alpha Meow</span>
                  </button>
                </div>
              )}

              <button className="btn btn-secondary" type="button" onClick={nextQuestion}>
                Next Question
              </button>
            </article>
          ) : (
            <div className="empty-state">Generate a quiz to start Alpha Meow practice mode.</div>
          )}
        </section>
      )}
    </div>
  );
};

export default InfoCenterPage;
