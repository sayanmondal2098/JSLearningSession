
'use strict';

const $ = (s) => document.querySelector(s);

// Screens
const scrStart = $('#screen-start');
const scrQuiz = $('#screen-quiz');
const scrResult = $('#screen-result');
const scrReview = $('#screen-review');

// Start elements
const secEl = $('#sec');
const btnStart = $('#btnStart');
const btnDemo = $('#btnDemo');

// Quiz elements
const qtext = $('#qtext');
const choicesEl = $('#choices');
const progressBar = $('#progressBar');
const counter = $('#counter');
const timerEl = $('#timer');
const skipBtn = $('#skip');
const nextBtn = $('#next');
const statusEl = $('#status');

// Results elements
const summaryEl = $('#summary');
const reviewBtn = $('#review');
const restartBtn = $('#restart');

// Review
const reviewList = $('#reviewList');
const backToResultsBtn = $('#backToResults');
const restart2Btn = $('#restart2');

let QUESTIONS = [];
let order = [];
let idx = 0;
let score = 0;
let perQuestionSec = 20;
let countdownId = null;
let timeLeft = 0;
let answered = [];

// Load questions
async function loadQuestions() {
  try {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error('Fetch failed');
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('Bad JSON shape');
    return json;
  } catch (e) {
    const embedded = document.getElementById('quiz-data')?.textContent;
    if (embedded) {
      try { return JSON.parse(embedded); } catch {}
    }
    throw new Error('Unable to load questions');
  }
}

// Utils
function shuffle(a){
  const arr = a.slice();
  for (let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleChoices(q){
  const map = q.choices.map((c,i)=>({c,i}));
  const sh = shuffle(map);
  const correctIndex = sh.findIndex(x=>x.i===q.answerIndex);
  return { choices: sh.map(x=>x.c), correctIndex };
}

function showScreen(el){
  [scrStart, scrQuiz, scrResult, scrReview].forEach(s=>s.classList.add('hidden'));
  el.classList.remove('hidden');
}

function updateProgress(){
  const pct = (idx/order.length)*100;
  progressBar.style.width = pct+'%';
  counter.textContent = `Q ${idx+1}/${order.length}`;
}

function renderQuestion(){
  const q = QUESTIONS[order[idx]];
  const { choices, correctIndex } = shuffleChoices(q);

  qtext.textContent = q.question;
  choicesEl.innerHTML = '';
  statusEl.textContent = '';
  nextBtn.disabled = true;

  choices.forEach((text,i)=>{
    const li = document.createElement('li');
    li.className = 'choice';
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '0');
    li.dataset.index = String(i);
    li.innerHTML = `<span class="key">${i+1}</span> <span class="ctext">${text}</span>`;
    li.addEventListener('click', ()=> selectAnswer(i));
    li.addEventListener('keydown', (e)=>{
      if (e.key==='Enter' || e.key===' ') { e.preventDefault(); selectAnswer(i); }
      if (/^[1-9]$/.test(e.key)) {
        const k = parseInt(e.key,10)-1;
        if (k>=0 && k<choices.length) selectAnswer(k);
      }
    });
    choicesEl.appendChild(li);
  });

  window.onkeydown = (e) => {
    if (/^[1-9]$/.test(e.key)) {
      const k = parseInt(e.key,10)-1;
      if (k>=0 && k<choices.length) selectAnswer(k);
    }
  };

  timeLeft = perQuestionSec;
  timerEl.textContent = timeLeft+'s';
  if (countdownId) clearInterval(countdownId);
  countdownId = setInterval(()=>{
    timeLeft -= 1;
    timerEl.textContent = timeLeft+'s';
    if (timeLeft<=0){
      clearInterval(countdownId);
      lockQuestion(null, correctIndex, choices);
      statusEl.textContent = '⏰ Time\'s up!';
    }
  }, 1000);

  document.getElementById('skip').onclick = ()=>{
    clearInterval(countdownId);
    lockQuestion(null, correctIndex, choices);
    statusEl.textContent = '⏭️ Skipped.';
  };
  document.getElementById('next').onclick = ()=> nextQuestion();

  choicesEl.dataset.correctIndex = String(correctIndex);
  choicesEl.dataset.choices = JSON.stringify(choices);
}

function selectAnswer(i){
  if (nextBtn.disabled === false) return;
  const correctIndex = parseInt(choicesEl.dataset.correctIndex, 10);
  const choices = JSON.parse(choicesEl.dataset.choices);
  clearInterval(countdownId);
  lockQuestion(i, correctIndex, choices);
}

function lockQuestion(selected, correctIndex, choices){
  document.querySelectorAll('.choice').forEach((li, i)=>{
    li.classList.add('disabled');
    if (i===correctIndex) li.classList.add('correct');
    if (selected!==null && i===selected && i!==correctIndex) li.classList.add('wrong');
    if (selected!==null && i===selected) li.classList.add('selected');
  });

  const originalAnswerIndex = QUESTIONS[order[idx]].answerIndex;
  const isCorrect = selected === correctIndex;
  if (isCorrect) score += 1;

  answered[idx] = {
    qIndex: order[idx],
    selected,
    correctIndex,
    isCorrect,
    shuffledChoices: choices,
    originalAnswerIndex
  };

  statusEl.textContent = isCorrect ? '✅ Correct!' : (selected===null ? '—' : '❌ Incorrect.');
  nextBtn.disabled = false;
}

function nextQuestion(){
  idx += 1;
  if (idx >= order.length) finish();
  else { updateProgress(); renderQuestion(); }
}

function finish(){
  window.onkeydown = null;
  showScreen(scrResult);
  const total = order.length;
  const pct = Math.round((score/total)*100);
  summaryEl.innerHTML = `<div><strong>Score:</strong> ${score}/${total} (${pct}%)</div>
  <div class="small muted">Tip: You can review each question with the correct answer highlighted.</div>`;
}

function review(){
  showScreen(scrReview);
  const list = document.getElementById('reviewList');
  list.innerHTML = '';
  answered.forEach((entry, n)=>{
    const q = QUESTIONS[entry.qIndex];
    const item = document.createElement('li');
    item.className = 'rev';
    const tag = `<span class="tag ${entry.isCorrect ? 'ok' : 'bad'}">${entry.isCorrect ? 'Correct' : 'Wrong'}</span>`;
    item.innerHTML = `<div><strong>Q${n+1}.</strong> ${q.question} ${tag}</div>`;
    const ul = document.createElement('ul');
    ul.className = 'choices';
    entry.shuffledChoices.forEach((text,i)=>{
      const li = document.createElement('li');
      li.className = 'choice' + (i===entry.correctIndex ? ' correct' : (entry.selected===i ? ' wrong' : ''));
      li.innerHTML = `<span class="key">${i+1}</span> <span class="ctext">${text}</span>`;
      ul.appendChild(li);
    });
    item.appendChild(ul);
    if (q.explanation){
      const ex = document.createElement('div');
      ex.className = 'small muted';
      ex.style.marginTop = '6px';
      ex.innerHTML = `<em>Why:</em> ${q.explanation}`;
      item.appendChild(ex);
    }
    list.appendChild(item);
  });
}

// Start / restart
async function start(onlyOne=false){
  QUESTIONS = await loadQuestions();
  score = 0; idx = 0; answered = [];
  perQuestionSec = Math.max(5, Math.min(120, parseInt(secEl.value||'20',10)));
  const count = Math.min(10, QUESTIONS.length);
  order = shuffle([...Array(QUESTIONS.length).keys()]).slice(0, onlyOne ? 1 : count);
  showScreen(scrQuiz);
  updateProgress();
  renderQuestion();
}

btnStart.addEventListener('click', ()=> start(false));
btnDemo.addEventListener('click', ()=> start(true));

reviewBtn.addEventListener('click', review);
restartBtn.addEventListener('click', ()=> showScreen(scrStart));
document.getElementById('backToResults').addEventListener('click', ()=> showScreen(scrResult));
document.getElementById('restart2').addEventListener('click', ()=> showScreen(scrStart));

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('status').innerHTML = `Hint: press <kbd>1–4</kbd> to answer. <kbd>Enter</kbd>/<kbd>Space</kbd> also works when a choice is focused.`;
});
